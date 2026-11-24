import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { Prisma } from "@prisma/client";
import { createQuizEngine } from "../lib/quiz/engine";
import { heuristicQuiz, validateGeneratedQuiz, generateQuiz, normalizeAnswer, proseSentences } from "../lib/quiz/generator";
import { createIngestionRepository, type Database } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import type { QuizSource } from "../lib/quiz/types";
import { IngestError } from "../lib/ingest/errors";

let pg: PGlite;
let db: Database;
let engine: ReturnType<typeof createQuizEngine>;
const passage = "A derivative measures the instantaneous rate of change of a function. The tangent describes the local gradient at a particular point. Velocity is the derivative of displacement with respect to time. Acceleration describes the change of velocity during motion. Calculus connects these mathematical concepts through differentiation and integration.";
before(async () => {
  Object.assign(process.env, { AI_PROVIDER: "openai", EMBEDDING_DIMENSIONS: "1536" });
  pg = new PGlite({ extensions: { vector } });
  for (const name of ["20261105000000_init", "20261105000100_integrity_and_vector_index", "20261105000200_local_ai", "20261105000300_quiz_and_cloudflare", "20261105000400_curriculum_provenance", "20261105000500_structured_documents", "20261107000100_study_sessions"]) await pg.exec(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
  db = { query: async <T>(statement: Prisma.Sql) => (await pg.query<T>(statement.text, statement.values)).rows, transaction: action => pg.transaction(tx => action({ query: async <T>(statement: Prisma.Sql) => (await tx.query<T>(statement.text, statement.values)).rows })) };
  await pg.exec(`
    INSERT INTO "Qualification" ("id","institution","code","stream","title","streamTitle","saqaId","nqfExitLevel","updatedAt") VALUES ('q','UNISA','90104','PSM','Test','Test','103108',7,now());
    INSERT INTO "Module" ("id","institution","code","title","updatedAt") VALUES ('m','UNISA','MAT1512','Calculus A',now());
    INSERT INTO "QualificationModule" VALUES ('q','m',1,1);
    INSERT INTO "StudyUnit" ("id","moduleId","code","title","position","updatedAt") VALUES ('su','m','U1','Test unit',1,now()),('empty','m','U2','Empty unit',2,now());
    INSERT INTO "AssessmentCriterion" ("id","qualificationId","code","description","sourceUrl") VALUES ('ac','q','TEST','Synthetic criterion','https://example.org/test');
  `);
  for (let i = 1; i <= 3; i++) {
    await pg.query('INSERT INTO "LearningOutcome" ("id","studyUnitId","code","description","position","updatedAt") VALUES ($1,\'su\',$1,\'Test outcome\',$2,now())', [`lo${i}`, i]);
    await pg.query('INSERT INTO "_OutcomeCriteria" VALUES (\'ac\',$1)', [`lo${i}`]);
    await ingest({ moduleCode: "MAT1512", studyUnitId: "su", learningOutcomeId: `lo${i}`, assessmentCriterionId: "ac", text: `${passage} Passage number ${i}.` }, createIngestionRepository(db), async inputs => inputs.map(() => [1, ...Array(1535).fill(0)]));
  }
  engine = createQuizEngine(db);
});
after(async () => { await pg?.close(); });

test("quiz uses three ingested sources and persists both question types without exposing keys", async () => {
  const quiz = await engine.generate("student-a", { studyUnitId: "su", provider: "heuristic" });
  assert.equal(quiz.questions.length, 6); assert.equal(new Set(quiz.questions.map(question => question.sourceChunkId)).size, 3);
  assert.equal(quiz.provider, "heuristic");
  assert.equal(quiz.questions.filter(question => question.kind === "SHORT_ANSWER").length, 3);
  assert.ok(quiz.questions.every(question => !("answer" in question) && !("explanation" in question)));
  const rows = await pg.query('SELECT "answer" FROM "QuizQuestion" WHERE "quizAttemptId"=$1', [quiz.attemptId]); assert.equal(rows.rows.length, 6);
  // The same reading can be embedded by both providers. It should still yield
  // three distinct passages instead of repeating the first passage twice.
  await ingest({ moduleCode: "MAT1512", studyUnitId: "su", learningOutcomeId: "lo1", assessmentCriterionId: "ac", text: `${passage} Passage number 1.`, sourceName: "Re-embedded reading" }, createIngestionRepository(db), async inputs => inputs.map(() => [1, ...Array(1535).fill(0)]));
  for (let index = 0; index < 3; index++) await ingest({ moduleCode: "MAT1512", studyUnitId: "su", learningOutcomeId: "lo1", assessmentCriterionId: "ac", text: `Formula-only fragment ${index}\nx^2 = 4\nf sxd = 3\nlim x 2 a`, sourceName: `Unreviewed formula page ${index}` }, createIngestionRepository(db), async inputs => inputs.map(() => [1, ...Array(1535).fill(0)]));
  const repeated = await engine.generate("student-a", { studyUnitId: "su", provider: "heuristic" });
  const outcomes = await pg.query<{ learningOutcomeId: string }>('SELECT "learningOutcomeId" FROM "QuizQuestion" WHERE "quizAttemptId"=$1', [repeated.attemptId]);
  assert.equal(new Set(outcomes.rows.map(row => row.learningOutcomeId)).size, 3);
});

async function issue(studentId: string) {
  const quiz = await engine.generate(studentId, { studyUnitId: "su", provider: "heuristic" });
  const { rows } = await pg.query<{ id: string; kind: string; answer: { optionId?: string; accepted?: string[] } }>('SELECT "id","kind","answer" FROM "QuizQuestion" WHERE "quizAttemptId"=$1', [quiz.attemptId]);
  const answers = rows.map(row => ({ questionId: row.id, value: row.kind === "MULTIPLE_CHOICE" ? row.answer.optionId! : `  ${row.answer.accepted![0].toUpperCase()}! ` }));
  return { quiz, answers };
}

test("grading normalizes short terms, saves per-outcome scores and deduplicates concurrent retries", async () => {
  const { quiz, answers } = await issue("student-b");
  const payload = { attemptId: quiz.attemptId, answers };
  const results = await Promise.all([engine.submit("student-b", payload), engine.submit("student-b", payload)]);
  assert.equal(results[0].score, 100); assert.equal(results[0].correct, 6); assert.deepEqual(results[0], results[1]);
  const { rows } = await pg.query<{ score: number; attempts: number }>('SELECT "score","attempts" FROM "StudentMastery" WHERE "studentId"=\'student-b\'');
  assert.equal(rows.length, 3); assert.ok(rows.every(row => row.score === 1 && row.attempts === 1));
  assert.ok(results[0].feedback.every(item => item.explanation && item.sourceUrl.startsWith('/study/su#chunk-')));
});

test("ownership, duplicate/missing/foreign answers, score spoofing and invalid options are rejected", async () => {
  const { quiz, answers } = await issue("student-c");
  await assert.rejects(engine.submit("intruder", { attemptId: quiz.attemptId, answers }), (error: unknown) => error instanceof IngestError && error.status === 404);
  for (const value of [answers.slice(1), answers.map(() => answers[0]), [...answers.slice(1), { questionId: "foreign", value: "a" }]]) await assert.rejects(engine.submit("student-c", { attemptId: quiz.attemptId, answers: value }), IngestError);
  await assert.rejects(engine.submit("student-c", { attemptId: quiz.attemptId, answers, score: 100 }), IngestError);
  const mc = quiz.questions.find(question => question.kind === "MULTIPLE_CHOICE")!;
  await assert.rejects(engine.submit("student-c", { attemptId: quiz.attemptId, answers: answers.map(answer => answer.questionId === mc.id ? { ...answer, value: "forged" } : answer) }), IngestError);
  const { rows } = await pg.query<{ count: number }>('SELECT count(*)::int AS count FROM "StudentMastery" WHERE "studentId"=\'student-c\''); assert.equal(rows[0].count, 0);
});

test("partial scores use server keys; retries increment each outcome only once per new quiz", async () => {
  const { quiz, answers } = await issue("student-d");
  const wrong = answers.map(answer => quiz.questions.find(question => question.id === answer.questionId)!.kind === "SHORT_ANSWER" ? { ...answer, value: "wrong" } : answer);
  const result = await engine.submit("student-d", { attemptId: quiz.attemptId, answers: wrong });
  assert.equal(result.score, 50); assert.ok(result.mastery.every(outcome => outcome.score === 0.5));
  const retry = await issue("student-d"); await engine.submit("student-d", { attemptId: retry.quiz.attemptId, answers: retry.answers });
  const { rows } = await pg.query<{ attempts: number; score: number }>('SELECT "attempts","score" FROM "StudentMastery" WHERE "studentId"=\'student-d\''); assert.ok(rows.every(row => row.attempts === 2 && row.score === 1));
});

test("submission rolls back every mastery write if saving the final result fails", async () => {
  const { quiz, answers } = await issue("student-rollback");
  const broken = createQuizEngine({ ...db, transaction: action => db.transaction(tx => action({ query: statement => { if (statement.text.startsWith('UPDATE "QuizAttempt"')) throw new Error("Simulated result failure"); return tx.query(statement); } })) });
  await assert.rejects(broken.submit("student-rollback", { attemptId: quiz.attemptId, answers }));
  const { rows } = await pg.query<{ count: number }>('SELECT count(*)::int AS count FROM "StudentMastery" WHERE "studentId"=\'student-rollback\''); assert.equal(rows[0].count, 0);
  assert.equal((await engine.submit("student-rollback", { attemptId: quiz.attemptId, answers })).score, 100);
});

test("unknown/empty units and expired attempts return actionable failures", async () => {
  await assert.rejects(engine.generate("student", { studyUnitId: "missing", provider: "heuristic" }), (error: unknown) => error instanceof IngestError && error.status === 404);
  await assert.rejects(engine.generate("student", { studyUnitId: "empty", provider: "heuristic" }), (error: unknown) => error instanceof IngestError && error.status === 409);
  const { quiz, answers } = await issue("student-expired");
  await pg.query('UPDATE "QuizAttempt" SET "expiresAt"=now()-interval \'1 minute\' WHERE "id"=$1', [quiz.attemptId]);
  await assert.rejects(engine.submit("student-expired", { attemptId: quiz.attemptId, answers }), (error: unknown) => error instanceof IngestError && error.status === 410);
});

test("heuristic fallback needs no key, varies source clozes and does not accept arbitrary essay answers", async () => {
  const sources: QuizSource[] = [{ id: "c", learningOutcomeId: "lo", title: "Rates", body: passage }];
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const result = await generateQuiz(sources, "ollama"); assert.equal(result.provider, "heuristic"); assert.ok(result.questions.length >= 2);
    assert.equal(normalizeAnswer("  TANGENT! "), "tangent");
    assert.notEqual(normalizeAnswer("tangent"), normalizeAnswer("not tangent"));
    assert.throws(() => heuristicQuiz([{ ...sources[0], body: "x = 1" }]), IngestError);
    assert.throws(() => validateGeneratedQuiz({ questions: [] }, sources));
  } finally { globalThis.fetch = original; }
});

test("PDF fallback ignores headings and broken formulas, and joins soft-wrapped complete prose", () => {
  const sentences = proseSentences("## PDF page 14 - printed page 8\n\n3.4 Introduction to the Limit Concept\n\nMathematically, this can be written as follows: lim\nx 2 1\nf sxd = 5\n\nThe derivative measures the instantaneous\nrate of change of a mathematical function. The tangent line describes the local gradient of a curve.");
  assert.equal(sentences.length, 2);
  assert.ok(sentences.every(sentence => /[.!?]$/.test(sentence) && !sentence.includes("lim\n")));
});

test("verified blank source pages are never used to generate assessment questions",async()=>{
 const rows=await pg.query<{id:string;ingestionId:string;structuredContent:unknown}>('SELECT c.id,c."ingestionId",i."structuredContent" FROM "ContentChunk" c JOIN "Ingestion" i ON i.id=c."ingestionId" WHERE c."learningOutcomeId"=$1 LIMIT 1',["lo1"]);const row=rows.rows[0];
 try{await pg.query('UPDATE "Ingestion" SET "structuredContent"=$1::jsonb WHERE id=$2',[JSON.stringify({parser:{profile:"verified-blank-page"}}),row.ingestionId]);const quiz=await engine.generate("blank-audit-student",{studyUnitId:"su",provider:"heuristic"});assert.ok(quiz.questions.length>0);assert.ok(quiz.questions.every(q=>q.sourceChunkId!==row.id));}
 finally{await pg.query('UPDATE "Ingestion" SET "structuredContent"=$1::jsonb WHERE id=$2',[row.structuredContent===null?null:JSON.stringify(row.structuredContent),row.ingestionId]);}
});
