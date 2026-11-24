import type { Prisma, PrismaClient } from "../generated/app-client";
import { embedTokens } from "../lib/ingest/embeddings";
import { createIngestionRepository, type Database } from "../lib/ingest/repository";
import { finishPreparedIngestion, prepareIngestion } from "../lib/ingest/service";
import { transactionLock } from "../lib/teaching/scope";
import { BulkDatabase } from "./bulk-database";

type Lesson = {
  title: string;
  position: number;
  visual: string | null;
  markdown: string;
  concepts: Prisma.InputJsonObject;
};

export async function reviseChemistryUnit(
  db: PrismaClient,
  url: string,
  code: string,
  position: number,
  outcome: string,
  sessions: Lesson[],
) {
  const unit = await db.studyUnit.findFirstOrThrow({
    where: {
      code,
      position,
      module: {
        institution: "UNISA",
        code: "CHE1501",
        qualifications: {
          some: { qualification: { institution: "UNISA", code: "90104", stream: "PSM" } },
        },
      },
    },
    include: {
      sessions: { orderBy: { position: "asc" } },
      learningOutcomes: {
        where: { code: "LO1" },
        include: {
          assessmentCriteria: {
            where: {
              code: "LOCAL-" + code,
              authority: "CURRICULUM",
              qualification: { institution: "UNISA", code: "90104", stream: "PSM" },
            },
          },
        },
      },
    },
  });
  const learningOutcome = unit.learningOutcomes[0];
  const assessmentCriterion = learningOutcome?.assessmentCriteria[0];
  if (
    !assessmentCriterion ||
    unit.sessions.length !== sessions.length ||
    sessions.some(
      (session, i) =>
        session.title !== unit.sessions[i].title || session.position !== unit.sessions[i].position,
    )
  ) {
    throw new Error(
      "The staged unit structure or mapped criterion differs. Review before revising.",
    );
  }
  process.env.AI_PROVIDER = "cloudflare";
  const sql = new BulkDatabase(url);
  try {
    const repository = createIngestionRepository(sql);
    const plans: {
      session: Lesson;
      sourceName: string;
      original: (typeof unit.sessions)[number];
      plan: Awaited<ReturnType<typeof prepareIngestion>>;
    }[] = [];
    for (const [index, session] of sessions.entries()) {
      const sourceName =
        "Vela original / " + code + " / S" + session.position + ": " + session.title;
      const plan = await prepareIngestion(
        {
          moduleCode: "CHE1501",
          studyUnitId: unit.id,
          learningOutcomeId: learningOutcome.id,
          assessmentCriterionId: assessmentCriterion.id,
          sourceName,
          text: session.markdown,
        },
        repository,
        embedTokens,
      );
      plans.push({ session, sourceName, original: unit.sessions[index], plan });
    }

    const result = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('CHE1501'))::text`;
        await transactionLock(tx, "vela:unit:" + unit.id);
        const current = await tx.studySession.findMany({
          where: { studyUnitId: unit.id },
          orderBy: { position: "asc" },
        });
        if (
          current.length !== unit.sessions.length ||
          current.some(
            (session, i) =>
              session.id !== unit.sessions[i].id ||
              session.version !== unit.sessions[i].version ||
              session.title !== unit.sessions[i].title ||
              session.markdown !== unit.sessions[i].markdown,
          )
        ) {
          throw new Error(
            "Another update changed this unit during preparation. Retry against the current version.",
          );
        }
        const database: Database = {
          query: <T>(statement: Parameters<Database["query"]>[0]) => tx.$queryRaw<T[]>(statement),
          transaction: (callback) => callback(database),
        };
        const atomicRepository = createIngestionRepository(database);
        let changed = 0;
        let chunks = 0;
        for (const { session, original, plan, sourceName } of plans) {
          const receipt = await finishPreparedIngestion(plan, atomicRepository);
          chunks += receipt.chunkCount;
          await tx.contentChunk.updateMany({
            where: { ingestionId: receipt.ingestionId },
            data: { resourceUrl: "/study/" + code + "/sessions/" + original.id },
          });
          if (session.markdown !== original.markdown || session.visual !== original.visual) {
            await tx.studySession.update({
              where: { id: original.id },
              data: { ...session, version: { increment: 1 } },
            });
            changed++;
          }
          await tx.ingestion.deleteMany({
            where: {
              learningOutcomeId: learningOutcome.id,
              assessmentCriterionId: assessmentCriterion.id,
              sourceName,
              embeddingProvider: "cloudflare",
              id: { not: receipt.ingestionId },
            },
          });
        }
        if (learningOutcome.description !== outcome)
          await tx.learningOutcome.update({
            where: { id: learningOutcome.id },
            data: { description: outcome },
          });
        if (assessmentCriterion.description !== outcome)
          await tx.assessmentCriterion.update({
            where: { id: assessmentCriterion.id },
            data: { description: outcome },
          });
        return { changed, chunks };
      },
      { maxWait: 15000, timeout: 90000 },
    );
    const stored = await db.studySession.findMany({
      where: { studyUnitId: unit.id },
      orderBy: { position: "asc" },
    });
    if (
      stored.length !== sessions.length ||
      stored.some(
        (row, i) =>
          row.id !== unit.sessions[i].id ||
          row.markdown !== sessions[i].markdown ||
          row.visual !== sessions[i].visual,
      )
    )
      throw new Error("The committed unit read-back differs.");
    console.log(
      code +
        " staging verified: " +
        result.changed +
        " revised sessions, " +
        result.chunks +
        " Cloudflare chunks, stable session IDs.",
    );
  } finally {
    await sql.disconnect();
  }
}
