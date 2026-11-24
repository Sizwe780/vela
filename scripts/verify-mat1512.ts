import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { chromium, expect } from "@playwright/test";
import type { Quiz, QuizResult } from "../lib/quiz/types";

async function main() {
  const prisma = new PrismaClient();
  const browser = await chromium.launch({ channel: "chrome" });
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3200";
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
  const checks: string[] = [];
  const pass = (text: string) => { checks.push(text); console.log(`PASS ${text}`); };
  let studentId: string | undefined;
  try {
    const module = await prisma.module.findUniqueOrThrow({ where: { institution_code: { institution: "UNISA", code: "MAT1512" } }, include: { studyUnits: { orderBy: { position: "asc" }, include: { learningOutcomes: { include: { assessmentCriteria: true } } } } } });
    assert.equal(module.studyUnits.length, 5);
    const unit = module.studyUnits[0];
    assert.ok(module.studyUnits.every(study => study.learningOutcomes[0].assessmentCriteria.every(criterion => criterion.authority === "CURRICULUM")));
    const counts = await prisma.$queryRaw<{ provider: string; chunks: number }[]>`SELECT i."embeddingProvider" AS provider, count(c."id")::int AS chunks FROM "ContentChunk" c JOIN "Ingestion" i ON i."id"=c."ingestionId" JOIN "LearningOutcome" lo ON lo."id"=c."learningOutcomeId" JOIN "StudyUnit" su ON su."id"=lo."studyUnitId" WHERE su."moduleId"=${module.id} GROUP BY i."embeddingProvider"`;
    pass(`real MAT1512 data: five units, explicit curriculum provenance; current chunks ${JSON.stringify(counts)}`);
    assert.equal((await context.request.get("/api/sources/guide")).status(), 401);
    const home = await context.newPage(); await home.goto("/auth/sign-up");
    await home.getByLabel("Full name").fill("Module Pilot Test");
    await home.getByLabel("Email", { exact: true }).fill(`mat1512-${randomUUID()}@example.invalid`);
    await home.getByLabel("Password", { exact: true }).fill(`Pilot-${randomUUID()}!`);
    await home.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(home.getByRole("button", { name: "Sign out", exact: true })).toBeVisible({ timeout: 60000 });
    studentId = (await (await context.request.get("/api/auth/get-session")).json()).user.id;
    await expect(home.locator(".live-progress")).toHaveText("0 assessed outcomes · live", { timeout: 60000 });
    const metadataResponse = await context.request.get("/api/modules/MAT1512"); assert.equal(metadataResponse.status(), 200);
    const { metadata } = await metadataResponse.json();
    assert.equal(metadata.nqfLevel, 5); assert.equal(metadata.credits, 12); assert.equal(metadata.delivery, "Year module");
    assert.equal(metadata.userReported.verification, "UNVERIFIED_CURRENT_POLICY");
    const source = await prisma.contentChunk.findFirstOrThrow({ where: { learningOutcome: { studyUnitId: unit.id }, resourceUrl: { not: null } }, select: { resourceUrl: true } });
    const pdf = await context.request.get(source.resourceUrl!, { headers: { Range: "bytes=0-15" } });
    assert.equal(pdf.status(), 206); assert.ok((await pdf.body()).subarray(0, 4).equals(Buffer.from("%PDF")));
    assert.equal((await context.request.get("/api/sources/guide?sha=wrong")).status(), 409);
    pass("authenticated original PDF ranges return 206 and PDF bytes; anonymous 401 and wrong source SHA 409; verified facts separated from reported rules");

    const study = await context.newPage(); await study.goto(`/study/${unit.id}`, { waitUntil: "domcontentloaded" });
    await expect(study.getByTestId("interactive-limit")).toBeVisible();
    await study.getByRole("button", { name: "Original PDF", exact: true }).click();
    await expect(study.locator('iframe[title="Original study PDF"]')).toBeVisible();
    await study.getByLabel("Tutor source").selectOption("cloudflare");
    const tutorResponse = study.waitForResponse(response => response.url().endsWith("/api/tutor"), { timeout: 120000 });
    await study.getByLabel("Ask your learning companion").fill("In two sentences, explain the difference between a left-hand limit and a right-hand limit using my reading.");
    await study.getByRole("button", { name: "Send message", exact: true }).click();
    const streamed = await tutorResponse; assert.equal(streamed.status(), 200);
    const sse = await streamed.text();
    const structuredChunks = await prisma.contentChunk.findMany({ where: { learningOutcome: { studyUnitId: unit.id }, ingestion: { structuredContent: { path: ["version"], equals: 1 } } }, select: { id: true } });
    const allowedChunkIds = new Set(structuredChunks.map(chunk => chunk.id));
    const sourceEvent = sse.split("\n").filter(line => line.startsWith("data: ")).map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } }).find(part => part?.type === "data-citations");
    assert.ok(sourceEvent?.data.sources.length > 0 && sourceEvent.data.sources.every((source: { chunkId: string }) => allowedChunkIds.has(source.chunkId)), "Live HTTP tutor must cite only structured pilot evidence");
    assert.ok(sse.includes('"type":"text-delta"') && sse.includes('"authority":"CURRICULUM"') && !sse.includes('"type":"error"'));
    await expect(study.getByRole("button", { name: "Stop response" })).toHaveCount(0, { timeout: 120000 });
    await study.locator(".citations summary").last().click();
    await study.locator(".citation-card > a").first().click();
    await expect(study.locator(".selected-source .criterion-detail")).toContainText("not verified SAQA/CAPS");
    await expect(study.locator(".selected-source .original-page-link")).toBeVisible();
    await study.screenshot({ path: "mat1512-pilot-study.png", fullPage: true });
    pass("live Cloudflare chat renders over real PDF text, returns chunk citations, opens an excerpt and links the original PDF page without claiming verified SAQA/CAPS");

    const local = await context.request.post("/api/tutor", { data: { studyUnitId: unit.id, mode: "pck", provider: "ollama", query: "In two sentences, suggest one short classroom activity to explain one-sided limits. Label it a teaching suggestion, not a verified CAPS requirement." }, timeout: 240000 });
    assert.equal(local.status(), 200); const localText = await local.text();
    assert.ok(localText.includes('"type":"text-delta"') && !localText.includes('"type":"error"'));
    pass("local Ollama PCK tutor streams from real MAT1512 passages");

    const quizPage = await context.newPage(); await quizPage.goto(`/study/${unit.id}/quiz`, { waitUntil: "domcontentloaded" });
    const generatedResponse = quizPage.waitForResponse(response => response.url().endsWith("/api/quiz/generate"));
    await quizPage.getByRole("button", { name: "Generate quiz", exact: true }).click();
    const generated = await generatedResponse; assert.equal(generated.status(), 200); const quiz = await generated.json() as Quiz;
    assert.equal(quiz.questions.length, 6); assert.equal(new Set(quiz.questions.map(question => question.sourceChunkId)).size, 3);
    assert.ok(quiz.questions.every(question => !("answer" in question)));
    const keys = await prisma.quizQuestion.findMany({ where: { quizAttemptId: quiz.attemptId } });
    let wrong = false; const answers = [];
    for (const [index, question] of quiz.questions.entries()) {
      const key = keys.find(key => key.id === question.id)!.answer as { optionId?: string; accepted?: string[] };
      let value = question.kind === "MULTIPLE_CHOICE" ? key.optionId! : key.accepted![0];
      if (!wrong && question.kind === "SHORT_ANSWER") { value = "incorrect term"; wrong = true; }
      answers.push({ questionId: question.id, value });
      if (question.kind === "MULTIPLE_CHOICE") await quizPage.locator(`input[name="${question.id}"][value="${value}"]`).check();
      else await quizPage.getByLabel(`Answer to question ${index + 1}`, { exact: true }).fill(value);
    }
    const submittedResponse = quizPage.waitForResponse(response => response.url().endsWith("/api/quiz/submit"));
    await quizPage.getByRole("button", { name: "Check my understanding", exact: true }).click();
    const submitted = await submittedResponse; assert.equal(submitted.status(), 200); const result = await submitted.json() as QuizResult;
    assert.equal(result.score, 83); await expect(quizPage.locator(".quiz-score")).toHaveText("83%");
    await expect(quizPage.locator(".quiz-feedback")).toHaveCount(6);
    const repeat = await context.request.post("/api/quiz/submit", { data: { attemptId: quiz.attemptId, answers } }); assert.deepEqual(await repeat.json(), result);
    await expect(home.locator(".live-progress")).toHaveAttribute("data-assessed-count", "1", { timeout: 60000 });
    const mastery = await prisma.studentMastery.findFirstOrThrow({ where: { studentId } }); assert.equal(mastery.attempts, 1);
    await quizPage.screenshot({ path: "mat1512-pilot-quiz.png", fullPage: true });
    await study.setViewportSize({ width: 390, height: 844 }); await study.goto(`/study/${unit.id}`, { waitUntil: "domcontentloaded" });
    assert.ok(await study.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await quizPage.setViewportSize({ width: 390, height: 844 }); assert.ok(await quizPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    pass("real-source quiz scores 5/6 = 83%, feedback and idempotent mastery persist; homepage Realtime updates to one assessed outcome; mobile layouts fit");

    const structuredContent = JSON.parse(await readFile("content/mat1512/limits-reviewed.json", "utf8"));
    const response = await fetch(`${baseURL}/api/ingest`, { method: "POST", headers: { Authorization: `Bearer ${process.env.INGEST_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ moduleCode: "MAT1512", studyUnitId: unit.id, learningOutcomeId: unit.learningOutcomes[0].id, assessmentCriterionId: unit.learningOutcomes[0].assessmentCriteria[0].id, sourceName: "Math-aware guide · PDF 14–14", structuredContent }), signal: AbortSignal.timeout(120000) });
    assert.equal(response.status, 200); assert.equal((await response.json()).reused, true);
    pass("POST /api/ingest safely reuses the structured math ingestion without duplicate content");
    await writeFile("../work/mat1512/live-verification.json", JSON.stringify({ checkedOn: "2026-11-05", checks, unitUrls: module.studyUnits.map(study => ({ code: study.code, url: `${baseURL}/study/${study.id}` })) }, null, 2));
  } finally {
    if (studentId) {
      await prisma.quizAttempt.deleteMany({ where: { studentId } }); await prisma.studentMastery.deleteMany({ where: { studentId } });
      assert.match(studentId, /^[a-zA-Z0-9-]+$/);
      const cleanup = spawnSync("powershell.exe", ["-NoProfile", "-Command", `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production`], { encoding: "utf8" });
      if (cleanup.status !== 0) throw new Error("Temporary learner cleanup needs a retry.");
    }
    await context.close(); await browser.close(); await prisma.$disconnect();
    console.log("Temporary learner, quiz and mastery removed. Real MAT1512 curriculum, PDFs and ingested passages retained.");
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MAT1512 live verification failed."); process.exitCode = 1; });
