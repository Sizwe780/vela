import { appendFile } from "node:fs/promises";
import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
import { unitBanks } from "../../content/assessments/unit-banks";
test("public information pages use the modern public frame", async ({ page }, info) => {
  test.setTimeout(180000);
  page.setDefaultNavigationTimeout(60000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/about", "/privacy", "/terms"]) {
    await page.goto(path);
    await expect(page.locator(".information-hero h1")).toBeVisible();
    await expect(page.locator(".learning-rail")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (path !== "/about") {
      await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
      await expect(page.locator(".policy-section").first()).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(path.slice(1) + ".png") });
  }
});
test("learner page flow, fixed real-unit quiz and evidence remain functional", async ({
  page,
}, info) => {
  test.setTimeout(600000);
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
    await appendFile(
      "../work/site-audit-fixtures.jsonl",
      JSON.stringify({ owner, event: "created" }) + "\n",
    );
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512", "CHE1501"] } },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    const unit = await db.studyUnit.findFirstOrThrow({
      where: {
        code: info.project.name === "mobile" ? "MAT1512-U1" : "MAT1503-U1",
        module: { institution: "UNISA" },
      },
      include: { sessions: { orderBy: { position: "asc" } }, learningOutcomes: true },
    });
    for (const path of [
      "/",
      "/profile",
      "/classroom",
      "/review",
      "/progress",
      "/learning-map",
      "/practice/lab",
      "/lounge",
    ]) {
      console.info(`Checking learner page ${path}`);
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByText("Application error", { exact: false })).toHaveCount(0);
      if (path === "/") {
        await expect(page.getByRole("heading", { name: /MAT1512/ }).first()).toBeVisible({
          timeout: 30000,
        });
        await expect(page.locator(".nav-section-label")).toHaveCount(3);
        await expect(page.locator(".outcome-grid")).toHaveCount(0);
        await page.getByLabel("Account options", { exact: true }).click();
        await expect(
          page.getByRole("link", { name: "Profile & preferences", exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeHidden();
      }
      if (path === "/profile") {
        await expect(page.getByText("Neon sends", { exact: false })).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Verify email", exact: true }),
        ).toBeDisabled();
        await expect(page.locator("#learning-preferences")).toBeVisible();
      }
      if (path === "/progress") await expect(page.locator(".outcome-module")).not.toHaveCount(0);
      if (path === "/review") await expect(page.locator(".review-start")).toBeVisible();
      if (path === "/learning-map") {
        await expect(page.getByText("Privacy and study availability", { exact: true })).toHaveCount(
          0,
        );
        await page.getByRole("button", { name: "Fit to view", exact: true }).click();
      }
      if (path === "/practice/lab") {
        await page.getByRole("button", { name: "Visual simulations", exact: true }).click();
        await page.getByRole("button", { name: "Matrix transformations", exact: true }).click();
        const canvas = page.locator("canvas").first();
        await expect(canvas).toBeVisible();
        await canvas.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL().length),
          )
          .toBeGreaterThan(2000);
        const box = (await canvas.boundingBox())!;
        const scale = Math.min((box.width - 84) / 18, (box.height - 54) / 18);
        const x = box.x + 64 + (box.width - 84) / 2 + scale,
          y = box.y + 20 + (box.height - 54) / 2 + scale;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + scale * 0.5, y, { steps: 5 });
        await page.mouse.up();
        await expect(page.getByLabel("Matrix entry a", { exact: true })).not.toHaveValue("1");
        await page.screenshot({ path: info.outputPath("matrix-drag.png") });
        await page.getByRole("button", { name: "Unit converter", exact: true }).click();
        await expect(page.getByText("Check a unit conversion", { exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath((path.slice(1).replaceAll("/", "-") || "overview") + ".png"),
      });
    }
    const cofactor = await db.studySession.findFirstOrThrow({
      where: {
        studyUnit: { code: "MAT1503-U8", module: { institution: "UNISA" } },
        markdown: { contains: "cofactors" },
      },
      select: { id: true, studyUnitId: true },
    });
    await page.goto(`/study/${cofactor.studyUnitId}/sessions/${cofactor.id}`);
    const cofactorLab = page.getByRole("region", {
      name: "Interactive cofactor expansion",
      exact: true,
    });
    await expect(cofactorLab).toBeVisible();
    await cofactorLab.getByRole("button", { name: "Row 2, column 3: 4", exact: true }).click();
    await cofactorLab.getByLabel("Show cofactor sign pattern", { exact: true }).check();
    await expect(cofactorLab.locator(".katex-error")).toHaveCount(0);
    await expect(cofactorLab.locator(".katex")).toHaveCount(2);
    await page.screenshot({ path: info.outputPath("cofactor-lab.png") });
    await page.goto(`/study/${unit.id}/sessions`);
    await expect(page.getByText("Not started", { exact: true })).toHaveCount(unit.sessions.length);
    await expect(page.getByText(/minutes of reading remaining/)).toBeVisible();
    await page.goto(`/study/${unit.id}/quiz`);
    await page.getByRole("button", { name: "Generate quiz", exact: true }).click();
    await expect(page.getByText("UNIT PRACTICE BANK", { exact: true })).toBeVisible({
      timeout: 45000,
    });
    const bank = unitBanks[unit.code];
    // Select the server-issued option by its original authored text, avoiding visual TeX representations.
    const issued = await db.quizAttempt.findFirstOrThrow({
      where: { studentId: owner },
      orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    const correct = (issued.questions[0].answer as { optionId: string }).optionId;
    await page.locator(`input[type=radio][value="${correct}"]`).check();
    await page.getByRole("button", { name: /Next question/ }).click();
    await page.getByRole("textbox", { name: "Answer to question 2" }).fill(bank[1].accepted![0]);
    await page.getByRole("button", { name: "Check my understanding", exact: true }).click();
    await expect(page.locator(".quiz-score")).toHaveText("100%");
    await page.goto("/progress");
    await expect(page.locator(".outcome-module[open]")).not.toHaveCount(0);
    await page.screenshot({ path: info.outputPath("graded-progress.png") });
  } finally {
    if (owner) {
      await cleanupTestLearner(db, owner);
      await appendFile(
        "../work/site-audit-fixtures.jsonl",
        JSON.stringify({ owner, event: "cleaned" }) + "\n",
      );
    }
    await db.$disconnect();
  }
});
