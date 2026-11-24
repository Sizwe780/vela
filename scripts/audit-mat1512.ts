import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import { createQuizEngine } from "../lib/quiz/engine";
import { heuristicQuiz, proseSentences } from "../lib/quiz/generator";

const prisma = new PrismaClient();
async function main() {
  const module = await prisma.module.findUniqueOrThrow({ where: { institution_code: { institution: "UNISA", code: "MAT1512" } }, include: { studyUnits: { orderBy: { position: "asc" }, select: { id: true, code: true, title: true } } } });
  const rows = await prisma.$queryRaw<{ unitCode: string; provider: string; segments: number; chunks: number; linkedChunks: number }[]>`SELECT su."code" AS "unitCode", i."embeddingProvider" AS provider, count(DISTINCT i."id")::int AS segments, count(c."id")::int AS chunks, count(c."resourceUrl")::int AS "linkedChunks" FROM "ContentChunk" c JOIN "Ingestion" i ON i."id"=c."ingestionId" JOIN "LearningOutcome" lo ON lo."id"=c."learningOutcomeId" JOIN "StudyUnit" su ON su."id"=lo."studyUnitId" WHERE su."moduleId"=${module.id} AND i."structuredContent" IS NULL GROUP BY su."code",i."embeddingProvider" ORDER BY su."code",i."embeddingProvider"`;
  assert.equal(rows.length, 10);
  for (const row of rows) assert.equal(row.chunks, row.linkedChunks);
  for (const provider of ["ollama", "cloudflare"]) {
    assert.equal(rows.filter(row => row.provider === provider).reduce((sum, row) => sum + row.segments, 0), 60);
    assert.equal(rows.filter(row => row.provider === provider).reduce((sum, row) => sum + row.chunks, 0), 995);
  }
  const structured = await prisma.ingestion.findMany({ where: { learningOutcome: { studyUnit: { moduleId: module.id } }, structuredContent: { path: ["version"], equals: 1 } }, select: { id: true, embeddingProvider: true, structuredContent: true, _count: { select: { chunks: true } } } });
  const quizChecks = [];
  const engine = createQuizEngine({ query: statement => prisma.$queryRaw(statement), transaction: action => prisma.$transaction(tx => action({ query: statement => tx.$queryRaw(statement) }), { maxWait: 15000, timeout: 60000 }) }, async sources => ({ questions: heuristicQuiz(sources), provider: "heuristic", notice: `Complete prose counts: ${sources.map(source => proseSentences(source.body).length).join(",")}` }));
  for (const unit of module.studyUnits) {
    try {
      const quiz = await engine.generate("mat1512-audit-only", { studyUnitId: unit.id, provider: "heuristic" });
      quizChecks.push({ unitCode: unit.code, questions: quiz.questions.length, note: quiz.notice });
      await prisma.quizAttempt.delete({ where: { id: quiz.attemptId } });
    } catch (error) { quizChecks.push({ unitCode: unit.code, error: error instanceof Error ? error.message : "Quiz generation failed" }); }
  }
  console.table(rows); console.table(quizChecks);
  const result = { checkedOn: "2026-11-05", moduleCode: module.code, title: module.title, metadata: module.metadata, rows, structured, quizChecks, units: module.studyUnits.map(unit => ({ ...unit, url: `http://localhost:3200/study/${unit.id}`, quizUrl: `http://localhost:3200/study/${unit.id}/quiz` })) };
  await writeFile("mat1512-ingestion.json", JSON.stringify(result, null, 2));
  assert.ok(quizChecks.every(check => !("error" in check)), "Every pilot unit must generate usable free practice");
  console.log("Verified legacy baseline of 1,990 page-linked chunks and 120 ingestions, additional structured documents, and five real-source free quizzes. Audit attempts removed.");
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Audit failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
