import "dotenv/config";
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
import { mockSpeech } from "./helpers/speech";
const linearExplanation =
  "A system is linear when every unknown appears only to the first power and unknowns are not multiplied together. Think of ingredients at fixed prices: doubling an unknown amount doubles its contribution while fixed constants stay fixed. For example, 2x + 3y = 7 and x - y = 1 are linear equations. The expression xy = 7 is not linear because one unknown becomes the other unknown's changing coefficient. Linearity concerns the unknowns; a known coefficient may be negative or zero. We identify the unknowns before deciding which coefficients are fixed.";
const calculusExplanation =
  "Think of watching a cyclist approach a road marker from either side: we ask where the readings are heading, not whether a measurement was recorded exactly at the marker. A two-sided limit L means the outputs get arbitrarily close to L as admissible inputs approach the target from both sides. For q(x)=(x^2-9)/(x-3), factoring gives (x-3)(x+3). We may cancel only when x is not 3, so nearby outputs follow x+3 and approach 6 from both sides. This does not define q(3); the original quotient is still undefined. Assigning q(3) a different value would not change that limiting trend.";
for (const target of [
  {
    code: "MAT1503-U1",
    explanation: linearExplanation,
    query: "Explain why a product of unknowns makes an equation nonlinear.",
  },
  {
    code: "MAT1512-U1",
    explanation: calculusExplanation,
    query: "Explain why a finite limit can exist when the function value is undefined.",
  },
]) {
  const explanation = target.explanation;
  test(`live tutor tools on ${target.code}`, async ({ page, browser }, info) => {
    test.setTimeout(360000);
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("channel_binding");
    const db = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: url.toString(),
        ssl: { rejectUnauthorized: true },
      }),
    });
    const anonymous = await browser.newContext({ baseURL: info.project.use.baseURL });
    let id: string | undefined;
    try {
      expect((await anonymous.request.get("/api/tutor/teach")).status()).toBe(401);
      for (const endpoint of ["photo", "diagnose", "teach", "voice"])
        expect(
          (await anonymous.request.post(`/api/tutor/${endpoint}`, { data: {} })).status(),
        ).toBe(401);
      await mockSpeech(page);
      id = await createTestLearner(page);
      const unit = await db.studyUnit.findFirstOrThrow({ where: { code: target.code } });
      const session = await db.studySession.findFirstOrThrow({
        where: { studyUnitId: unit.id },
        orderBy: { position: "asc" },
      });
      expect(
        (
          await page.request.post("/api/tutor/teach", {
            data: { action: "start", studyUnitId: unit.id, sessionId: session.id },
          })
        ).status(),
      ).toBe(403);
      await enrollTestLearner(page.request, db, [unit.moduleId]);
      const audio = await page.request.post(`/api/tutor/voice?studyUnitId=${unit.id}`, {
        headers: { "Content-Type": "audio/wav" },
        data: await readFile(resolve("tests/fixtures/synthetic-math-question.wav")),
      });
      expect(audio.status()).toBe(200);
      expect((await audio.json()).transcript).toMatch(/negative sign/i);
      await page.goto(`/study/${unit.code}`);
      if (info.project.name === "mobile")
        await page.getByRole("button", { name: "Learning companion", exact: true }).click();
      await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
      const tools = page.getByRole("dialog", { name: "Tutor tools", exact: true });
      await expect(tools).toBeVisible();
      await tools.getByRole("button", { name: "Snap & diagnose", exact: true }).click();
      await tools
        .locator('input[type="file"]')
        .setInputFiles(resolve("tests/fixtures/handwriting-font-working.png"));
      await expect(tools.locator(".photo-crop img")).toBeVisible();
      await tools.getByRole("button", { name: "Prepare crop", exact: true }).click();
      await expect(tools.locator(".prepared-crop")).toBeVisible();
      await tools.getByLabel(/Send this crop to Cloudflare/).check();
      const photoRequest = page.waitForRequest(
        (r) => r.url().endsWith("/api/tutor/photo") && r.method() === "POST",
      );
      await tools.getByRole("button", { name: "Transcribe this crop", exact: true }).click();
      const payload = (await photoRequest).postDataJSON();
      expect(payload.image).toMatch(/^data:image\/jpeg;base64,/);
      expect(Object.keys(payload).sort()).toEqual(["image", "sessionId", "studyUnitId"]);
      await expect(tools.locator('math-field[aria-label="Equation in step 2"]')).toBeVisible({
        timeout: 90000,
      });
      expect(
        await tools
          .locator('math-field[aria-label="Equation in step 2"]')
          .evaluate((el) => (el as HTMLElement & { value: string }).value),
      ).toMatch(/-2x-5/);
      await expect(
        tools.getByRole("button", { name: "Confirm and diagnose", exact: true }),
      ).toBeDisabled();
      await tools
        .getByLabel("What are you trying to solve?")
        .fill("Expand -(2x - 5) by distributing the minus sign.");
      await tools.getByLabel(/I checked these lines/).check();
      await tools.getByText("Check adjacent algebra locally, without AI", { exact: true }).click();
      await tools.getByRole("button", { name: "Check algebra locally", exact: true }).click();
      await expect(tools.getByText(/Local check · step 2 · not-equivalent/)).toBeVisible();
      await tools.getByRole("button", { name: "Confirm and diagnose", exact: true }).click();
      await expect(tools.locator(".diagnosis-result")).toBeVisible({ timeout: 90000 });
      await expect(tools.locator(".diagnosis-result .work-step.revisit")).toContainText("Step 2");
      await expect(tools.locator(".diagnosis-result")).toContainText(
        /sign|negative|minus|distribut/i,
      );
      expect(await db.studentMastery.count({ where: { studentId: id } })).toBe(0);
      await tools.locator(".diagnosis-result").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `snap-diagnose-${info.project.name}.png` });
      await tools.getByRole("button", { name: "Teach the tutor", exact: true }).click();
      await tools.getByRole("button", { name: "Start teaching this session", exact: true }).click();
      await expect(
        tools.getByRole("textbox", { name: "Your explanation", exact: true }),
      ).toBeVisible();
      await tools.getByRole("textbox", { name: "Your explanation", exact: true }).fill(explanation);
      const gradedResponse = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/tutor/teach") &&
          r.request().method() === "POST" &&
          r.request().postDataJSON()?.action === "submit",
      );
      await tools.getByRole("button", { name: "Review my explanation", exact: true }).click();
      const response = await gradedResponse;
      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.masteryUpdated).toBe(true);
      expect(result.pointsEarned).toBeGreaterThan(0);
      expect(result.pointsEarned).toBeLessThanOrEqual(10);
      await expect(tools.locator(".concept-result")).toContainText("conceptual points");
      const master = await db.studentMastery.findFirstOrThrow({ where: { studentId: id } });
      expect(master.attempts).toBe(1);
      expect(await db.sessionProgress.count({ where: { studentId: id } })).toBe(0);
      const saved = await db.conceptAttempt.findUniqueOrThrow({ where: { id: result.attemptId } });
      expect(saved.explanation).toBe(explanation);
      expect(saved.result).not.toBeNull();
      const replay = await page.request.post("/api/tutor/teach", {
        data: { action: "submit", attemptId: result.attemptId, explanation },
      });
      expect(replay.status()).toBe(200);
      expect(await replay.json()).toEqual(result);
      expect(
        (await db.studentMastery.findUniqueOrThrow({ where: { id: master.id } })).attempts,
      ).toBe(1);
      expect(
        (
          await page.request.post("/api/tutor/teach", {
            data: { action: "submit", attemptId: result.attemptId, explanation, score: 1 },
          })
        ).status(),
      ).toBe(400);
      await tools.locator(".concept-result").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `teach-tutor-${info.project.name}.png` });
      await tools.getByRole("button", { name: "Try another explanation", exact: true }).click();
      await expect(
        tools.getByRole("textbox", { name: "Your explanation", exact: true }),
      ).toHaveValue(explanation);
      await page.route("**/api/tutor/teach", async (route) => {
        if (
          route.request().method() === "POST" &&
          route.request().postDataJSON()?.action === "submit"
        )
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "SESSION_CHANGED",
                message: "The lesson was revised. Start a fresh attempt.",
              },
            }),
          });
        else await route.continue();
      });
      await tools.getByRole("button", { name: "Review my explanation", exact: true }).click();
      await expect(tools.getByRole("alert")).toContainText("Your draft is preserved");
      await tools.getByRole("button", { name: "Start a fresh attempt", exact: true }).click();
      await expect(tools.getByRole("alert")).toHaveCount(0);
      await expect(
        tools.getByRole("textbox", { name: "Your explanation", exact: true }),
      ).toHaveValue(explanation);
      await page.unroute("**/api/tutor/teach");
      expect(
        (await db.studentMastery.findUniqueOrThrow({ where: { id: master.id } })).attempts,
      ).toBe(1);
      await tools.getByRole("button", { name: "Close tutor tools", exact: true }).click();
      await page.getByRole("button", { name: "Voice options", exact: true }).click();
      const voice = page.getByRole("dialog", { name: "Voice tutor", exact: true });
      await voice.getByLabel(/I understand browser dictation/).check();
      await voice.getByRole("button", { name: "Dictate a question", exact: true }).click();
      await page.evaluate((query) => {
        const r = (window as any).voiceQA.current;
        r.onresult({ results: [{ isFinal: true, 0: { transcript: query } }] });
        r.onend();
      }, target.query);
      await expect(
        voice.getByRole("textbox", { name: "Voice transcript", exact: true }),
      ).toHaveValue(target.query);
      await voice.getByLabel("Read responses aloud", { exact: true }).check();
      const sent = page.waitForRequest(
        (r) => r.url().endsWith("/api/tutor") && r.method() === "POST",
      );
      const answered = page.waitForResponse(
        (r) => r.url().endsWith("/api/tutor") && r.request().method() === "POST",
      );
      await voice.getByRole("button", { name: "Send transcript", exact: true }).click();
      const request = (await sent).postDataJSON();
      expect(request.studyUnitId).toBe(unit.id);
      expect(request.sessionId).toBe(session.id);
      expect(request.query).toBe(target.query);
      const answer = await answered;
      expect(answer.status()).toBe(200);
      await answer.finished();
      await expect
        .poll(() => page.evaluate(() => (window as any).voiceQA.spoken.length))
        .toBeGreaterThan(0);
      await voice.getByRole("button", { name: "Close voice options", exact: true }).click();
      await expect(page.locator(".chat-message.assistant").last()).toBeVisible();
      expect(
        (await page.locator(".chat-message.assistant").last().textContent())!.length,
      ).toBeGreaterThan(40);
      await page.goto("/");
      await expect(
        page.getByRole("region", { name: "Conceptual practice progress", exact: true }),
      ).toContainText(`${result.bestPoints} conceptual points`);
      await db.enrollment.updateMany({ where: { studentId: id }, data: { status: "withdrawn" } });
      expect(
        (
          await page.request.post("/api/tutor/teach", {
            data: { action: "start", studyUnitId: unit.id, sessionId: session.id },
          })
        ).status(),
      ).toBe(403);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    } finally {
      if (id) await cleanupTestLearner(db, id);
      await anonymous.close();
      await db.$disconnect();
    }
  });
}
