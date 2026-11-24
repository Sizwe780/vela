import "dotenv/config";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import type { Quiz, QuizResult } from "../../lib/quiz/types";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("module, unit overview and real quiz persist results for both mathematics modules", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let studentId: string | undefined;
  try {
    studentId = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
      include: { studyUnits: { orderBy: { position: "asc" }, take: 1 } },
    });
    expect(modules).toHaveLength(2);
    await enrollTestLearner(
      page.request,
      db,
      modules.map((module) => module.id),
    );
    for (const module of modules) {
      const unit = module.studyUnits[0];
      await page.goto("/");
      await page.getByRole("link", { name: `Open ${module.code}`, exact: true }).click();
      await expect(page.getByRole("heading", { name: module.title, exact: true })).toBeVisible();
      await page
        .locator(".curriculum-units")
        .getByRole("link", { name: new RegExp(unit.title) })
        .click();
      await expect(page.getByRole("heading", { name: "Learning sessions" })).toBeVisible();
      await expect(page.getByRole("progressbar", { name: "Sessions complete" })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${module.code}-unit.png`) });
      await page.getByRole("link", { name: "Start reading" }).click();
      await expect(page.locator(".session-heading")).toBeVisible();
      if (info.project.name === "mobile") {
        await page.getByRole("button", { name: "Learning companion", exact: true }).click();
      }
      await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
      const tools = page.getByRole("dialog", { name: "Tutor tools" });
      await expect(tools.getByRole("group", { name: "Hint progression" })).toBeVisible();
      await tools.getByRole("button", { name: "Snap & diagnose" }).click();
      await expect(tools.locator('input[type="file"]')).toBeVisible();
      await tools.getByRole("button", { name: "Teach the tutor" }).click();
      await expect(
        tools.getByRole("button", { name: "Start teaching this session" }),
      ).toBeVisible();
      await tools.getByRole("button", { name: "Close tutor tools" }).click();
      await page
        .getByRole("navigation", { name: "Breadcrumb" })
        .getByRole("link", { name: "Unit 01" })
        .click();
      await page.getByRole("link", { name: "Open unit quiz" }).click();
      const issuedPromise = page.waitForResponse((res) => res.url().endsWith("/api/quiz/generate"));
      await page.getByRole("button", { name: "Generate quiz" }).click();
      const issued = await issuedPromise;
      expect(issued.ok()).toBe(true);
      const quiz: Quiz = await issued.json();
      expect(quiz.provider).toBe("heuristic");
      expect(quiz.questions.length).toBeGreaterThan(1);
      expect(quiz.questions.map(({ prompt }) => prompt).join("\n")).not.toMatch(
        /Marker OCR|Vela original \/|· chunk \d/,
      );
      for (const [index, question] of quiz.questions.entries()) {
        const card = page.locator(".quiz-question");
        await expect(card).toHaveCount(1);
        await expect(
          page.getByRole("heading", { name: `Question ${index + 1} of ${quiz.questions.length}` }),
        ).toBeVisible();
        if (index === 1) {
          await page.getByRole("button", { name: "Previous" }).click();
          if (quiz.questions[0].kind === "MULTIPLE_CHOICE")
            await expect(card.getByRole("radio").first()).toBeChecked();
          else await expect(card.getByRole("textbox")).toHaveValue("Test recall response");
          await page.getByRole("button", { name: "Next question" }).click();
        }
        if (question.kind === "MULTIPLE_CHOICE") await card.getByRole("radio").first().check();
        else await card.getByRole("textbox").fill("Test recall response");
        if (index < quiz.questions.length - 1)
          await page.getByRole("button", { name: "Next question" }).click();
      }
      const submittedPromise = page.waitForResponse((res) =>
        res.url().endsWith("/api/quiz/submit"),
      );
      await page.getByRole("button", { name: "Check my understanding" }).click();
      const submitted = await submittedPromise;
      expect(submitted.ok()).toBe(true);
      const graded: QuizResult = await submitted.json();
      await expect(page.locator(".quiz-result")).toContainText(`${graded.score}%`);
      await expect(page.locator(".quiz-feedback")).toHaveCount(quiz.questions.length);
      expect(
        (await db.quizAttempt.findUniqueOrThrow({ where: { id: quiz.attemptId } })).submittedAt,
      ).toBeTruthy();
      expect(
        await db.studentMastery.count({
          where: { studentId, learningOutcome: { studyUnitId: unit.id } },
        }),
      ).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath(`${module.code}-quiz-result.png`) });
    }
  } finally {
    if (studentId) await cleanupTestLearner(db, studentId);
    await db.$disconnect();
  }
});

test("preview keeps the composer compact and serves only sample responses", async ({
  page,
}, info) => {
  await page.goto("/study/demo");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await expect(page.getByText("Sample responses", { exact: true })).toBeVisible();
  expect((await page.locator(".composer").boundingBox())!.height).toBeLessThan(66);
  await page.screenshot({ path: info.outputPath("preview-companion.png") });
  const tools = page.getByRole("button", { name: "Tutor tools", exact: true });
  await tools.click();
  const drawer = page.getByRole("dialog", { name: "Tutor tools" });
  await expect(drawer.getByRole("button", { name: "Insert math" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Teach the tutor" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close tutor tools" }).click();
  const more = page.getByRole("button", { name: "More tools", exact: true });
  const compact = await more.isVisible();
  if (compact) await more.click();
  await expect(page.getByRole("combobox", { name: "Tutor source" })).toHaveCount(0);
  if (compact) await page.getByRole("button", { name: "Close tools" }).click();
  for (const provider of ["cloudflare", "ollama"]) {
    const response = await page.request.post("/api/tutor", {
      headers: { origin: new URL(page.url()).origin },
      data: {
        studyUnitId: "demo",
        query: "What is a derivative?",
        mode: "academic",
        live: true,
        provider,
      },
    });
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('"preview":true');
  }
});
