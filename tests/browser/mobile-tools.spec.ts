import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("360/375px utilities collapse, restore keyboard focus and hand off to persistent study drawers", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let id: string | undefined;
  try {
    await page.setViewportSize({ width: 360, height: 780 });
    id = await createTestLearner(page);
    await page.goto("/");
    const navigation = page.getByRole("button", { name: "Open learning navigation", exact: true });
    await expect(navigation).toBeVisible();
    expect((await page.locator(".learning-topbar").boundingBox())!.height).toBeLessThanOrEqual(64);
    await navigation.click();
    await expect(
      page.getByRole("dialog", { name: "Learning navigation menu", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Study activity", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(navigation).toBeFocused();
    const more = page.getByRole("button", { name: "More tools", exact: true });
    const unit = await db.studyUnit.findFirstOrThrow({ where: { code: "MAT1503-U1" } });
    await enrollTestLearner(page.request, db, [unit.moduleId]);
    let previousNote = "";
    for (const width of [360, 375]) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`/study/${unit.code}`);
      await expect(page.locator(".session-heading")).toBeVisible();
      await expect(more).toBeVisible();
      expect((await page.locator(".workspace-nav").boundingBox())!.height).toBeLessThanOrEqual(64);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`workspace-narrow-${width}.png`),
        fullPage: true,
      });
      await more.click();
      const tools = page.getByRole("dialog", { name: "Study tools", exact: true });
      await expect(tools).toBeVisible();
      await page.keyboard.press("Shift+Tab");
      expect(await tools.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Escape");
      await expect(more).toBeFocused();
      await more.click();
      await tools.getByRole("button", { name: "My Notes", exact: true }).click();
      const notes = page.getByRole("dialog", { name: "My Notes", exact: true });
      await expect(notes).toBeVisible();
      await expect(tools).toHaveCount(0);
      const editor = notes.getByRole("textbox", { name: "Personal study notes" });
      if (previousNote) await expect(editor).toHaveValue(previousNote);
      previousNote = `Narrow-screen notebook ${width}: try the question before revealing the answer.`;
      await editor.fill(previousNote);
      await notes.getByRole("button", { name: "Close notes", exact: true }).click();
      await expect(notes).toHaveCount(0);
      await more.click();
      await tools.getByRole("button", { name: "Source library", exact: true }).click();
      const sources = page.getByRole("dialog", { name: "Source library", exact: true });
      await expect(sources).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sources).toHaveCount(0);
      await more.click();
      await tools.getByRole("button", { name: "Practice active recall", exact: true }).click();
      const recall = page.getByRole("dialog", { name: "Active recall", exact: true });
      await expect(recall).toBeVisible();
      await recall.getByRole("button", { name: "Close recall", exact: true }).click();
      await more.click();
      await tools.getByRole("combobox", { name: "Tutor source" }).selectOption("cloudflare");
      await tools.getByRole("button", { name: "Dark mode", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await tools.getByRole("button", { name: "Dark mode", exact: true }).click();
      await tools.getByRole("button", { name: "Close tools", exact: true }).click();
      await more.click();
      await expect(tools.getByRole("combobox", { name: "Tutor source" })).toHaveValue("cloudflare");
      await page.screenshot({
        path: info.outputPath(`tools-narrow-${width}.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1100, height: 780 });
      await expect(tools).toHaveCount(0);
      await expect(more).toBeHidden();
      await expect(page.getByRole("button", { name: "My Notes", exact: true })).toBeVisible();
    }
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
