import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("lesson maths, fair ungraded feedback and recoverable outcome loading", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let owner: string | undefined;
  try {
    owner = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    await page.goto("/study/MAT1512-U1/sessions/MAT1512-U1-S1");
    await expect(page.locator(".session-heading h2")).toHaveText("Approaching a value");
    await expect(page.locator(".katex-error")).toHaveCount(0);
    const fonts = await page.evaluate(async () => {
      const main = await document.fonts.load("16px KaTeX_Main", "=");
      const math = await document.fonts.load("italic 16px KaTeX_Math", "x");
      return [...main, ...math].map((font) => ({ family: font.family, status: font.status }));
    });
    expect(fonts.length).toBeGreaterThanOrEqual(2);
    expect(fonts.every((f) => f.status === "loaded")).toBe(true);
    const mathML = page.locator(".katex-mathml").first();
    const bounds = await mathML.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(2);
    expect(bounds!.height).toBeLessThanOrEqual(2);
    const copied = await page
      .locator(".markdown")
      .filter({ has: page.locator(".katex") })
      .first()
      .evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        const transfer = new DataTransfer();
        element.dispatchEvent(
          new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: transfer }),
        );
        selection.removeAllRanges();
        return transfer.getData("text/plain");
      });
    expect(copied).toContain("$");
    expect(copied).not.toMatch(/[\uE000-\uF8FF]/u);
    const example = page.locator(".try-example").first();
    await example.getByRole("button", { name: "Show answer", exact: true }).click();
    await expect(example.locator(".katex-display")).toBeVisible();
    await expect(example.locator(".katex-error")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("calculus-equations.png") });

    const liveInsights = await page.request.get("/api/insights");
    expect(liveInsights.status()).toBe(200);
    expect((await liveInsights.json()).ownerId).toBe(owner);
    const unit = await db.studyUnit.findFirstOrThrow({
      where: { code: "MAT1512-U1", module: { institution: "UNISA" } },
    });
    await page.route("**/api/quiz/generate", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          attemptId: "synthetic-attempt",
          studyUnitId: unit.id,
          provider: "heuristic",
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          notice: "Synthetic UI fixture",
          questions: [
            {
              id: "q",
              kind: "SHORT_ANSWER",
              prompt: "Give the formula using defined symbols.",
              options: null,
              sourceChunkId: "synthetic-source",
              points: 1,
            },
          ],
        }),
      });
    });
    await page.route("**/api/quiz/submit", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          attemptId: "synthetic-attempt",
          score: null,
          earned: 0,
          possible: 0,
          correct: 0,
          total: 1,
          mastery: [],
          feedback: [
            {
              questionId: "q",
              correct: false,
              status: "unverified",
              gradingMessage: "Define the slope relation before comparing formulas.",
              earned: 0,
              points: 1,
              answer: "$g=4\\pi^2/m$",
              explanation: "This item needs review.",
              sourceUrl: `/study/${unit.id}`,
            },
          ],
        }),
      }),
    );
    await page.goto(`/study/${unit.id}/quiz`);
    await page.getByText("Question settings", { exact: true }).click();
    await page.getByRole("combobox", { name: "Question generator" }).selectOption("cloudflare");
    await page.getByRole("button", { name: "Generate quiz", exact: true }).click();
    await expect(
      page.getByText("Drafting and validating AI questions", { exact: true }),
    ).toBeVisible();
    await page.getByText("Symbols & math keyboard", { exact: true }).click();
    await page.getByRole("button", { name: "Insert π", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Answer to question 1" })).toHaveValue("π");
    await page.getByRole("button", { name: "Insert math", exact: true }).click();
    await expect(page.locator("math-field")).toBeVisible();
    await expect(page.getByRole("button", { name: "Fraction", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Matrix", exact: true })).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Answer to question 1" })
      .fill(String.raw`$$g=4\pi^2 L/T^2$$`);
    await page.getByRole("button", { name: "Check my understanding", exact: true }).click();
    await expect(page.getByText("Needs review · ungraded", { exact: true })).toBeVisible();
    await expect(page.locator(".quiz-feedback")).not.toContainText("0/1");
    await expect(page.locator(".quiz-feedback .katex-error")).toHaveCount(0);

    let stall = false;
    await page.route("**/api/insights", (route) => {
      if (stall) return;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ownerId: owner,
          outcomes: [],
          recommendations: [],
          completedSessions: 0,
          totalSessions: 2,
          windowLimited: false,
        }),
      });
    });
    await page.goto("/progress");
    await page.getByText("Which actions update these counters?", { exact: true }).click();
    await expect(page.getByText(/Companion.*Tools.*Teach the Tutor/)).toBeVisible();
    await expect(
      page.getByText("Outcomes with Teach-the-Tutor reviews", { exact: true }),
    ).toBeVisible();
    stall = true;
    await page.reload();
    await expect(page.getByRole("button", { name: "Retry progress", exact: true })).toBeVisible({
      timeout: 28000,
    });
    await expect(page.getByText("Loading your learning evidence…", { exact: true })).toHaveCount(0);
    stall = false;
    await page.getByRole("button", { name: "Retry progress", exact: true }).click();
    await expect(
      page.getByText("Outcomes with Teach-the-Tutor reviews", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("evidence-guide.png") });
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});
