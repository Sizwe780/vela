import "dotenv/config";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("public landing, theme and workspace are available without the student sidebar", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  if (mobile) await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make the subject yours." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await expect(page.locator(".learning-rail")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Explore in the Practical Lab" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("landing.png"), fullPage: true });
  await page.goto("/about");
  await expect(page.locator(".learning-rail")).toHaveCount(0);
  await page.goto("/");

  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await page.getByRole("link", { name: "Try a lesson", exact: true }).click();
  await expect(page).toHaveURL(/\/study\/demo$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".reader-panel")).toBeVisible();
  if (mobile) await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await expect(page.getByRole("region", { name: "Learning companion", exact: true })).toBeVisible();
  await expect(page.locator("#tutor-query")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
  await page.screenshot({ path: info.outputPath("workspace.png"), fullPage: true });
});

test("enrolled learner can use the Practical Lab, review, outcomes and concept map in the new shell", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let id: string | undefined;
  const mobile = info.project.name === "mobile";
  try {
    id = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
      select: { id: true },
    });
    expect(modules).toHaveLength(2);
    await enrollTestLearner(
      page.request,
      db,
      modules.map((module) => module.id),
    );
    await page.goto("/");
    if (mobile) await page.getByRole("button", { name: "Open learning navigation" }).click();
    const nav = page.getByRole("navigation", { name: "Learning navigation", exact: true });
    await expect(nav.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Visual sandboxes", exact: true })).toHaveCount(0);
    await nav.getByRole("link", { name: "Practical Lab", exact: true }).click();
    const mathLab = page.getByRole("group", { name: "Practical Lab tools" });
    const topic = page.getByRole("combobox", { name: "Practice topic" });
    await expect(topic).toBeVisible();
    await topic.selectOption({ index: 1 });
    const originalTopic = await topic.inputValue();
    await mathLab.getByRole("button", { name: "Visual sandboxes" }).click();
    await expect(page.getByRole("slider", { name: "Matrix entry a" })).toBeVisible();
    await page.getByRole("button", { name: "Riemann sums" }).click();
    await expect(page.getByLabel("Number of rectangles", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("math-lab.png"), fullPage: true });
    await mathLab.getByRole("button", { name: "Scratchpad" }).click();
    await expect(topic).toHaveValue(originalTopic);

    await page.goto("/review");
    const review = page.locator(".review-start").getByRole("button", { name: /^Review MAT/ });
    await review.click();
    const flashcard = page.getByRole("region", { name: "Active recall" });
    await expect(flashcard).toBeVisible();
    await expect(flashcard).toHaveCSS("position", "static");
    await expect(flashcard.getByRole("button", { name: "Reveal / hide answer" })).toBeVisible();
    await expect(flashcard.locator(".recall-question")).not.toContainText(/Marker OCR|chunk \d/);
    await flashcard.getByRole("button", { name: "Reveal / hide answer" }).click();
    await expect(flashcard.getByRole("button", { name: "Good", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("recall.png"), fullPage: true });
    await flashcard.getByRole("button", { name: "Good", exact: true }).click();
    await expect(flashcard.getByRole("status")).toContainText("Saved");
    await flashcard.getByRole("button", { name: "Close recall" }).click();
    await page.screenshot({ path: info.outputPath("review.png"), fullPage: true });

    await page.goto("/progress");
    await expect(page.getByRole("progressbar", { name: "Reading milestones" })).toBeVisible();
    const filter = page.getByRole("combobox", { name: "Progress module" });
    await filter.selectOption({ label: "MAT1512" });
    await expect(page.locator(".outcome-grid article").first()).toContainText("MAT1512");
    await page.screenshot({ path: info.outputPath("progress.png"), fullPage: true });

    await page.goto("/learning-map");
    const graph = page.getByRole("group", { name: "Interactive concept graph" });
    await graph.getByRole("button").nth(1).click();
    await expect(graph.getByRole("button").nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: info.outputPath("concept-map.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
