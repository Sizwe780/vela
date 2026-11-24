import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { CHUNK_SIZE, OVERLAP, TOKENIZER } from "./chunker";
import { assertCurriculumScope } from "../content/curriculum-scope";
import { IngestError } from "./errors";
import type { ParsedInput } from "./input";
import type { Context, IngestionRepository, Receipt, SaveInput } from "./service";

// The small SQL boundary also allows the exact statements to be tested against
// PostgreSQL/pgvector in PGlite without a separately installed database server.
export interface QueryDatabase {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
}
export interface Database extends QueryDatabase {
  transaction<T>(callback: (tx: QueryDatabase) => Promise<T>): Promise<T>;
}

async function resolveContext(
  db: QueryDatabase,
  input: ParsedInput,
  institution: string,
): Promise<Context> {
  const rows = await db.query<Context & { unitCode: string; unitPosition: number }>(Prisma.sql`
    SELECT m."code" AS "moduleCode", q."saqaId", lo."id" AS "learningOutcomeId",
           ac."id" AS "assessmentCriterionId", su."code" AS "unitCode", su."position" AS "unitPosition"
    FROM "LearningOutcome" lo
    JOIN "StudyUnit" su ON su."id" = lo."studyUnitId"
    JOIN "Module" m ON m."id" = su."moduleId"
    JOIN "_OutcomeCriteria" mapping ON mapping."B" = lo."id"
    JOIN "AssessmentCriterion" ac ON ac."id" = mapping."A"
    JOIN "Qualification" q ON q."id" = ac."qualificationId"
    JOIN "QualificationModule" qm ON qm."qualificationId" = q."id" AND qm."moduleId" = m."id"
    WHERE lo."id" = ${input.learningOutcomeId} AND su."id" = ${input.studyUnitId}
      AND m."institution" = ${institution} AND m."code" = ${input.moduleCode}
      AND ac."id" = ${input.assessmentCriterionId}
  `);
  if (!rows[0])
    throw new IngestError(
      422,
      "INVALID_CURRICULUM_MAPPING",
      "The study unit, learning outcome, module and curated assessment criterion must belong to the same curriculum and have an approved outcome–criterion mapping.",
    );
  const { unitCode, unitPosition, ...context } = rows[0];
  assertCurriculumScope(institution, context.moduleCode, unitCode, unitPosition);
  return context;
}

async function find(db: QueryDatabase, fingerprint: string): Promise<Receipt | null> {
  const rows = await db.query<Receipt>(Prisma.sql`
    SELECT i."id" AS "ingestionId", count(c."id")::int AS "chunkCount"
    FROM "Ingestion" i JOIN "ContentChunk" c ON c."ingestionId" = i."id"
    WHERE i."fingerprint" = ${fingerprint} GROUP BY i."id"
  `);
  return rows[0] ?? null;
}

export function createIngestionRepository(
  db: Database,
  institution = "UNISA",
): IngestionRepository {
  return {
    resolveContext: (input) => resolveContext(db, input, institution),
    find: (fingerprint) => find(db, fingerprint),
    save: (data: SaveInput) =>
      db.transaction(async (tx) => {
        // Serialize ingestions for an outcome so concurrent ingestion requests
        // cannot race for the same ordered positions.
        await tx.query(
          Prisma.sql`SELECT "id" FROM "LearningOutcome" WHERE "id" = ${data.input.learningOutcomeId} FOR UPDATE`,
        );
        await resolveContext(tx, data.input, institution);
        const existing = await find(tx, data.fingerprint);
        if (existing) return { ...existing, reused: true };
        const ingestionId = randomUUID();
        const space = data.embeddingSpace;
        await tx.query(Prisma.sql`
        INSERT INTO "Ingestion" ("id", "fingerprint", "learningOutcomeId", "assessmentCriterionId", "sourceName", "sourceKind", "sourceText", "structuredContent", "embeddingModel", "embeddingProvider", "embeddingDimensions", "embeddingBaseUrl", "tokenizer", "chunkSize", "overlap")
        VALUES (${ingestionId}, ${data.fingerprint}, ${data.input.learningOutcomeId}, ${data.input.assessmentCriterionId}, ${data.input.sourceName ?? null}, ${data.input.sourceKind}, ${data.input.sourceText}, ${data.input.structuredContent ? JSON.stringify(data.input.structuredContent) : null}::jsonb, ${space.model}, ${space.provider}, ${space.dimensions}, ${space.baseUrl}, ${TOKENIZER}, ${CHUNK_SIZE}, ${OVERLAP})
      `);
        const positions = await tx.query<{ max: number }>(
          Prisma.sql`SELECT COALESCE(MAX("position"), 0)::int AS "max" FROM "ContentChunk" WHERE "learningOutcomeId" = ${data.input.learningOutcomeId}`,
        );
        const base = positions[0].max;
        // SQL identifiers come only from this fixed schema whitelist.
        const vectorColumn = Prisma.raw(
          space.dimensions === 768 ? '"embedding768"' : '"embedding"',
        );
        for (const [index, chunk] of data.chunks.entries()) {
          // Only validated, finite floats reach the cast. Values remain bound SQL
          // parameters; text, IDs, module codes and vector data are never SQL code.
          const vector = `[${data.vectors[index].join(",")}]`;
          await tx.query(Prisma.sql`
          INSERT INTO "ContentChunk" ("id", "learningOutcomeId", "title", "kind", "body", "position", "updatedAt", "ingestionId", "assessmentCriterionId", "chunkIndex", "tokenStart", "tokenEnd", "tokenCount", "sourceByteStart", "sourceByteEnd", ${vectorColumn})
          VALUES (${randomUUID()}, ${data.input.learningOutcomeId}, ${`${data.input.sourceName ?? data.input.moduleCode} · chunk ${index + 1}`}, 'TEXT', ${chunk.body}, ${base + index + 1}, CURRENT_TIMESTAMP, ${ingestionId}, ${data.input.assessmentCriterionId}, ${chunk.index}, ${chunk.tokenStart}, ${chunk.tokenEnd}, ${chunk.tokenCount}, ${chunk.sourceByteStart}, ${chunk.sourceByteEnd}, ${vector}::vector)
        `);
        }
        return { ingestionId, chunkCount: data.chunks.length, reused: false };
      }),
  };
}
