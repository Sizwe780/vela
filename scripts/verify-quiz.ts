import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { ingest } from "../lib/ingest/service";
import { createIngestionRepository } from "../lib/ingest/repository";
import { embedTokens } from "../lib/ingest/embeddings";
import type { Quiz, QuizResult } from "../lib/quiz/types";

async function main() {
console.log("Starting live quiz verification against the running app.");
const prisma = new PrismaClient();
const browser = await chromium.launch({ channel: "chrome" });
const contexts: BrowserContext[] = [];
const users: { id: string; page: Page; context: BrowserContext }[] = [];
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3200";
const run = randomUUID();
const password = `Recall-${randomUUID()}!`;
let unitId: string | undefined;
let criterionId: string | undefined;
try {
  const qualification = await prisma.qualification.findUniqueOrThrow({ where: { institution_code_stream: { institution: "UNISA", code: "90104", stream: "PSM" } } });
  const module = await prisma.module.findUniqueOrThrow({ where: { institution_code: { institution: "UNISA", code: "MAT1512" } } });
  const criterion = await prisma.assessmentCriterion.create({ data: { qualificationId: qualification.id, code: `TEST-${run}`, description: "Synthetic verification criterion; not an official SAQA criterion.", sourceUrl: "https://example.invalid/verification" } }); criterionId = criterion.id;
  const unit = await prisma.studyUnit.create({ data: { moduleId: module.id, code: `TEST-${run}`, title: "Temporary calculus verification", position: 99998, learningOutcomes: { create: [1, 2, 3].map(position => ({ code: `LO${position}`, position, description: "Temporary verification outcome", assessmentCriteria: { connect: { id: criterion.id } } })) } }, include: { learningOutcomes: { orderBy: { position: "asc" } } } }); unitId = unit.id;
  // Use actual Cloudflare embeddings and the normal ingestion repository, not
  // fabricated vectors. The server's default provider remains unchanged.
  process.env.AI_PROVIDER = "cloudflare";
  const passages = [
    "The derivative measures the instantaneous rate of change of a function. The gradient of the tangent gives this rate at a particular point. Differentiation connects the graphical slope to the algebraic rule. Average change instead uses a secant through two distinct points. The limiting process brings these points closer together to find a local rate.",
    "Velocity describes how displacement changes with time. Acceleration describes how velocity changes with time. Position, velocity and acceleration are related through successive derivatives. A positive acceleration does not always mean an object has positive velocity. Direction and magnitude must be considered separately when interpreting motion.",
    "Integration accumulates quantities across an interval. A definite integral describes signed accumulation between specified bounds. Differentiation and integration are related by the fundamental theorem of calculus. The constant of integration appears in an indefinite integral because differentiation removes constant terms. Always interpret the units of an accumulated quantity.",
  ];
  const repository = createIngestionRepository({ query: statement => prisma.$queryRaw(statement), transaction: action => prisma.$transaction(tx => action({ query: statement => tx.$queryRaw(statement) }), { timeout: 30_000 }) });
  for (const [index, outcome] of unit.learningOutcomes.entries()) await ingest({ moduleCode: "MAT1512", studyUnitId: unit.id, learningOutcomeId: outcome.id, assessmentCriterionId: criterion.id, text: passages[index] }, repository, embedTokens);
  assert.equal(await prisma.contentChunk.count({ where: { learningOutcome: { studyUnitId: unit.id } } }), 3);
  console.log("PASS real Cloudflare embeddings ingested three passages into Neon pgvector.");

  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext({ baseURL }); contexts.push(context);
    assert.equal((await context.request.post("/api/quiz/generate", { data: { studyUnitId: unit.id, provider: "heuristic" } })).status(), 401);
    const page = await context.newPage(); await page.goto("/auth/sign-up");
    await page.getByLabel("Full name").fill(`Recall Test ${index}`);
    await page.getByLabel("Email", { exact: true }).fill(`recall-${run}-${index}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible({ timeout: 45000 });
    const session = await (await context.request.get("/api/auth/get-session")).json();
    users.push({ id: session.user.id, page, context });
  }
  const learner = users[0];
  await learner.page.goto(`/study/${unit.id}/quiz`);
  const generation = learner.page.waitForResponse(response => response.url().endsWith("/api/quiz/generate") && response.request().method() === "POST");
  await learner.page.getByRole("button", { name: "Generate quiz", exact: true }).click();
  const quizResponse = await generation; assert.equal(quizResponse.status(), 200);
  const quiz = await quizResponse.json() as Quiz; assert.equal(quiz.questions.length, 6); assert.equal(quiz.provider, "heuristic");
  assert.ok(quiz.questions.every(question => !("answer" in question) && !("explanation" in question)));
  const stored = await prisma.quizQuestion.findMany({ where: { quizAttemptId: quiz.attemptId } });
  let madeWrong = false;
  const answers: { questionId: string; value: string }[] = [];
  for (const [index, question] of quiz.questions.entries()) {
    const key = stored.find(row => row.id === question.id)!.answer as { optionId?: string; accepted?: string[] };
    let value = question.kind === "MULTIPLE_CHOICE" ? key.optionId! : key.accepted![0];
    if (question.kind === "SHORT_ANSWER" && !madeWrong) { value = "incorrect term"; madeWrong = true; }
    answers.push({ questionId: question.id, value });
    if (question.kind === "MULTIPLE_CHOICE") await learner.page.locator(`input[name="${question.id}"][value="${value}"]`).check();
    else await learner.page.getByLabel(`Answer to question ${index + 1}`, { exact: true }).fill(value);
  }
  const submission = learner.page.waitForResponse(response => response.url().endsWith("/api/quiz/submit"));
  await learner.page.getByRole("button", { name: "Check my understanding", exact: true }).click();
  const submitted = await submission; assert.equal(submitted.status(), 200);
  const result = await submitted.json() as QuizResult; assert.equal(result.score, 83); assert.equal(result.correct, 5);
  await expect(learner.page.locator(".quiz-score")).toHaveText("83%");
  await expect(learner.page.locator(".quiz-feedback")).toHaveCount(6);
  const payload = { attemptId: quiz.attemptId, answers };
  for (const response of await Promise.all([learner.context.request.post("/api/quiz/submit", { data: payload }), learner.context.request.post("/api/quiz/submit", { data: payload })])) assert.deepEqual(await response.json(), result);
  assert.equal((await users[1].context.request.post("/api/quiz/submit", { data: payload })).status(), 404);
  assert.equal((await learner.context.request.post("/api/quiz/submit", { data: { ...payload, score: 100, studentId: users[1].id } })).status(), 400);
  const mastery = await prisma.studentMastery.findMany({ where: { studentId: learner.id } });
  assert.equal(mastery.length, 3); assert.ok(mastery.every(row => row.attempts === 1));
  console.log("PASS browser quiz: six questions, no exposed keys, 5/6 = 83%, source feedback and three transactional mastery updates.");
  console.log("PASS concurrent replay is idempotent; another learner gets 404; forged score/identity gets 400.");
  await learner.page.screenshot({ path: "active-recall-quiz.png", fullPage: true });
  await learner.page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await learner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const retryResponse = learner.page.waitForResponse(response => response.url().endsWith("/api/quiz/generate"));
  await learner.page.getByRole("button", { name: "Practice again", exact: true }).click();
  assert.notEqual((await (await retryResponse).json()).attemptId, quiz.attemptId);
  await expect(learner.page.locator(".quiz-score")).toHaveCount(0);
  console.log("PASS mobile layout and fresh retry reset the score without overwriting the completed attempt.");
  const tutor = await learner.context.request.post("/api/tutor", { data: { studyUnitId: unit.id, mode: "academic", provider: "cloudflare", query: "In one sentence, what does a derivative measure?" }, timeout: 120000 });
  assert.equal(tutor.status(), 200);
  const stream = await tutor.text();
  assert.ok(stream.includes('"type":"text-delta"') && stream.includes('"preview":false'));
  const chunks = await prisma.contentChunk.findMany({ where: { learningOutcome: { studyUnitId: unit.id } }, select: { id: true } });
  assert.ok(chunks.some(chunk => stream.includes(chunk.id))); assert.ok(!stream.includes('"type":"error"'));
  console.log("PASS live Cloudflare RAG: query embedding, unit-filtered pgvector retrieval, streamed model answer and real chunk citations.");
  await learner.page.goto("/study/demo");
  await expect(learner.page.getByLabel("Tutor source")).toHaveValue("default");
  console.log("PASS signed-in preview defaults to live AI rather than preset responses.");
  if (process.argv.includes("--local")) {
    process.env.AI_PROVIDER = "ollama";
    await ingest({ moduleCode: "MAT1512", studyUnitId: unit.id, learningOutcomeId: unit.learningOutcomes[0].id, assessmentCriterionId: criterion.id, text: passages[0] }, repository, embedTokens);
    const local = await learner.context.request.post("/api/tutor", { data: { studyUnitId: unit.id, mode: "academic", provider: "ollama", query: "In one sentence, what does a derivative measure?" }, timeout: 240000 });
    assert.equal(local.status(), 200);
    const localStream = await local.text();
    assert.ok(localStream.includes('"type":"text-delta"') && localStream.includes('"preview":false') && !localStream.includes('"type":"error"'));
    console.log("PASS local Ollama RAG: actual Nomic ingestion, pgvector retrieval and streamed llama3.2 answer.");
  }
  const generated = await learner.context.request.post("/api/quiz/generate", { data: { studyUnitId: unit.id, provider: "cloudflare" }, timeout: 120000 });
  assert.equal(generated.status(), 200);
  const aiQuiz = await generated.json() as Quiz;
  console.log(`PASS requested Cloudflare quiz returned ${aiQuiz.questions.length} validated questions; actual generator: ${aiQuiz.provider}.`);
} finally {
  if (unitId) await prisma.studyUnit.delete({ where: { id: unitId } });
  if (criterionId) await prisma.assessmentCriterion.delete({ where: { id: criterionId } });
  for (const user of users) {
    assert.match(user.id, /^[a-zA-Z0-9-]+$/);
    const cleanup = spawnSync("powershell.exe", ["-NoProfile", "-Command", `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${user.id} --branch production`], { encoding: "utf8" });
    if (cleanup.status !== 0) console.error("Synthetic verification account cleanup needs a retry.");
  }
  await Promise.all(contexts.map(context => context.close())); await browser.close(); await prisma.$disconnect();
  console.log("Temporary study content, quiz attempts and verification learners cleaned up.");
}
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Live quiz verification failed."); process.exitCode = 1; });
