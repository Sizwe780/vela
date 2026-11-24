import "dotenv/config";
import assert from "node:assert/strict";
import { psmFirstLevel } from "../lib/curriculum/psm-first-level";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";

const url = new URL(process.env.DATABASE_URL!);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const sslmode = url.searchParams.get("sslmode");
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: sslmode === "disable" || local ? false : { rejectUnauthorized: true },
  }),
});
const rollback = new Error("Roll back verification fixtures");

async function main() {
  const qualification = await prisma.qualification.findUniqueOrThrow({
    where: { institution_code_stream: { institution: "UNISA", code: "90104", stream: "PSM" } },
    include: { modules: { orderBy: { position: "asc" }, include: { module: true } } },
  });
  assert.equal(qualification.saqaId, "103108");
  assert.equal(qualification.nqfExitLevel, 7);
  for (const entry of psmFirstLevel) {
    const linked = qualification.modules.find((link) => link.module.code === entry.code);
    assert.equal(linked?.module.title, entry.title);
    assert.equal(linked?.studyYear, 1);
  }
  const legacy = qualification.modules.find((link) => link.module.code === "PHY1501");
  if (legacy) {
    assert.ok(legacy.archivedAt);
    assert.equal(legacy.acceptingEnrollments, false);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const module = await tx.module.create({
          data: { institution: "TEST", code: "VERIFY", title: "Fixture" },
        });
        const unit = await tx.studyUnit.create({
          data: { moduleId: module.id, code: "U1", title: "Fixture", position: 1 },
        });
        const outcome = await tx.learningOutcome.create({
          data: { studyUnitId: unit.id, code: "LO1", description: "Fixture", position: 1 },
        });
        await tx.contentChunk.create({
          data: { learningOutcomeId: outcome.id, title: "Fixture", body: "Example", position: 1 },
        });
        await tx.quizQuestion.create({
          data: {
            learningOutcomeId: outcome.id,
            prompt: "True?",
            kind: "TRUE_FALSE",
            answer: { value: true },
            position: 1,
          },
        });
        const mastery = await tx.studentMastery.create({
          data: {
            studentId: "verification-student",
            learningOutcomeId: outcome.id,
            score: 0.8,
            attempts: 1,
          },
        });
        // PostgreSQL marks a transaction failed after a constraint violation;
        // isolate each expected rejection with a savepoint.
        async function rejects(operation: () => Promise<unknown>) {
          await tx.$executeRawUnsafe("SAVEPOINT expected_failure");
          await assert.rejects(operation);
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT expected_failure");
          await tx.$executeRawUnsafe("RELEASE SAVEPOINT expected_failure");
        }
        await rejects(() =>
          tx.studentMastery.create({
            data: { studentId: mastery.studentId, learningOutcomeId: outcome.id },
          }),
        );
        await rejects(() =>
          tx.studentMastery.update({ where: { id: mastery.id }, data: { score: 1.1 } }),
        );
        await rejects(() =>
          tx.studentMastery.update({ where: { id: mastery.id }, data: { attempts: -1 } }),
        );
        await rejects(() =>
          tx.studyUnit.create({
            data: { moduleId: "missing-module", code: "U2", title: "Invalid FK", position: 1 },
          }),
        );
        await tx.module.delete({ where: { id: module.id } });
        assert.equal(await tx.studentMastery.count({ where: { id: mastery.id } }), 0);
        assert.equal(await tx.quizQuestion.count({ where: { learningOutcomeId: outcome.id } }), 0);
        assert.equal(await tx.contentChunk.count({ where: { learningOutcomeId: outcome.id } }), 0);
        throw rollback;
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    "Verified seed metadata, first-level modules, content hierarchy, mastery uniqueness/bounds, foreign keys and cascading deletes. Fixtures rolled back.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
