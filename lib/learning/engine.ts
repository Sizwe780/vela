import { Prisma } from "@prisma/client";
import { randomUUID, randomInt } from "node:crypto";
import { z } from "zod";
import type { Database, QueryDatabase } from "../ingest/repository";
import { IngestError } from "../ingest/errors";
import { conceptGraph, conceptModelVersion, conceptParameters, type ConceptNode } from "./graph";
import { conceptProblem } from "./problems";
import { updateBKT, bktParameters } from "./bkt";
const payloadSchema = z.object({
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  correctId: z.string(),
  explanation: z.string(),
  itemKey: z.string(),
  parameters: bktParameters,
});
type CheckRow = {
  id: string;
  studentId: string;
  moduleId: string;
  studyUnitId: string;
  conceptId: string;
  modelVersion: string;
  itemKey: string;
  payload: z.infer<typeof payloadSchema>;
  expiresAt: Date;
  expired: boolean;
  expiresAtISO: string;
  result: unknown;
};
export function createConceptEngine(db: Database) {
  async function lock(tx: QueryDatabase, studentId: string) {
    await tx.query(
      Prisma.sql`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${"concept:" + studentId},0))) gate`,
    );
  }
  async function access(tx: QueryDatabase, studentId: string, moduleId: string, unitId: string) {
    await tx.query(
      Prisma.sql`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${studentId + ":" + moduleId},0))) enrollment_gate`,
    );
    const rows = await tx.query(
      Prisma.sql`SELECT u.id FROM "StudyUnit" u JOIN "Enrollment" e ON e."moduleId"=u."moduleId" WHERE u.id=${unitId} AND u."moduleId"=${moduleId} AND e."studentId"=${studentId} AND e.status IN ('active','completed') LIMIT 1`,
    );
    if (!rows.length)
      throw new IngestError(
        403,
        "ENROLLMENT_REQUIRED",
        "Enroll in the current module before practicing.",
      );
  }
  return {
    async issue(studentId: string, node: ConceptNode, moduleId: string, unitId: string) {
      return db.transaction(async (tx) => {
        await lock(tx, studentId);
        await access(tx, studentId, moduleId, unitId);
        const modelVersion = conceptModelVersion(node);
        const active = await tx.query<CheckRow>(
          Prisma.sql`SELECT *, "expiresAt" < CURRENT_TIMESTAMP AS expired, to_char("expiresAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAtISO" FROM "ConceptCheck" WHERE "studentId"=${studentId} AND "conceptId"=${node.id} AND "modelVersion"=${modelVersion} AND "moduleId"=${moduleId} AND "submittedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP ORDER BY "createdAt" DESC LIMIT 1`,
        );
        let row = active[0];
        if (!row) {
          const [rate] = await tx.query<{ count: number }>(
            Prisma.sql`SELECT count(*)::int AS count FROM "ConceptCheck" WHERE "studentId"=${studentId} AND "createdAt">CURRENT_TIMESTAMP-INTERVAL '1 hour'`,
          );
          if (rate.count >= 24)
            throw new IngestError(
              429,
              "CHECK_LIMIT",
              "Pause before starting more concept checks. Your previous feedback is saved.",
            );
          const id = randomUUID(),
            expiresAt = new Date(Date.now() + 30 * 60000),
            problem = conceptProblem(node.probeKind, randomInt(0, 0xffffffff));
          [row] = await tx.query<CheckRow>(
            Prisma.sql`INSERT INTO "ConceptCheck" (id,"studentId","moduleId","studyUnitId","conceptId","modelVersion","itemKey",payload,"expiresAt") VALUES (${id},${studentId},${moduleId},${unitId},${node.id},${modelVersion},${problem.itemKey},${JSON.stringify({ ...problem, parameters: conceptParameters(node) })}::jsonb,${expiresAt}) RETURNING *,to_char("expiresAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAtISO"`,
          );
        }
        const payload = payloadSchema.parse(row.payload);
        return {
          id: row.id,
          conceptId: row.conceptId,
          prompt: payload.prompt,
          options: payload.options,
          expiresAt: row.expiresAtISO,
        };
      });
    },
    async submit(studentId: string, checkId: string, choice: string) {
      return db.transaction(async (tx) => {
        await lock(tx, studentId);
        const [row] = await tx.query<CheckRow>(
          Prisma.sql`SELECT *, "expiresAt" < CURRENT_TIMESTAMP AS expired, to_char("expiresAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAtISO" FROM "ConceptCheck" WHERE id=${checkId} AND "studentId"=${studentId} FOR UPDATE`,
        );
        if (!row)
          throw new IngestError(
            404,
            "CHECK_NOT_FOUND",
            "This check was not found for your account.",
          );
        await access(tx, studentId, row.moduleId, row.studyUnitId);
        if (row.result) return row.result;
        const node = conceptGraph.nodes.find((n) => n.id === row.conceptId);
        if (!node || conceptModelVersion(node) !== row.modelVersion || row.expired)
          throw new IngestError(
            410,
            "CHECK_EXPIRED",
            "Start a fresh check; this one expired or its definition changed.",
          );
        const p = payloadSchema.parse(row.payload);
        if (!p.options.some((o) => o.id === choice))
          throw new IngestError(400, "INVALID_CHOICE", "Select one of this check's options.");
        const [repeated] = await tx.query<{ count: number }>(
          Prisma.sql`SELECT count(*)::int AS count FROM "ConceptCheck" WHERE "studentId"=${studentId} AND "conceptId"=${row.conceptId} AND "modelVersion"=${row.modelVersion} AND "itemKey"=${row.itemKey} AND "submittedAt" IS NOT NULL`,
        );
        const [old] = await tx.query<{ probability: number; observations: number }>(
          Prisma.sql`SELECT probability,observations FROM "LearningConceptState" WHERE "studentId"=${studentId} AND "conceptId"=${row.conceptId} AND "modelVersion"=${row.modelVersion}`,
        );
        const correct = choice === p.correctId,
          credited = repeated.count === 0,
          prior = old?.probability ?? p.parameters.prior;
        const update = credited
          ? updateBKT(prior, correct, p.parameters)
          : { probability: prior, posterior: null };
        if (credited)
          await tx.query(
            Prisma.sql`INSERT INTO "LearningConceptState" ("studentId","conceptId","modelVersion",probability,observations) VALUES (${studentId},${row.conceptId},${row.modelVersion},${update.probability},1) ON CONFLICT ("studentId","conceptId","modelVersion") DO UPDATE SET probability=EXCLUDED.probability,observations="LearningConceptState".observations+1,"updatedAt"=CURRENT_TIMESTAMP RETURNING "studentId"`,
          );
        const result = {
          correct,
          answer: p.options.find((o) => o.id === p.correctId)!.text,
          explanation: p.explanation,
          conceptId: row.conceptId,
          probability: update.probability,
          posterior: update.posterior,
          observations: (old?.observations ?? 0) + (credited ? 1 : 0),
          credited,
          notice: credited
            ? "Provisional estimate from this directly assessed concept only. No other prerequisite was marked correct or incorrect."
            : "This exact item was already submitted. Feedback is available, but it adds no new BKT observation.",
        };
        await tx.query(
          Prisma.sql`UPDATE "ConceptCheck" SET "submittedAt"=CURRENT_TIMESTAMP,result=${JSON.stringify(result)}::jsonb WHERE id=${checkId} RETURNING id`,
        );
        return result;
      });
    },
  };
}
