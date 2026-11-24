import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("real modules preserve tools, panel widths and drafts in the redesigned workspace", async ({
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
  if (info.project.name === "mobile") {
    await page.addInitScript(() => {
      HTMLElement.prototype.requestFullscreen = () =>
        Promise.reject(new Error("Fullscreen unavailable"));
    });
  }

  try {
    id = await createTestLearner(page);
    const units = await db.studyUnit.findMany({
      where: { code: { in: ["MAT1503-U1", "MAT1512-U5"] } },
      include: { sessions: { orderBy: { position: "asc" }, take: 2 } },
    });
    expect(units).toHaveLength(2);
    await enrollTestLearner(
      page.request,
      db,
      units.map((u) => u.moduleId),
    );
    for (const unit of units) {
      const session = unit.sessions[unit.code === "MAT1503-U1" ? 0 : 1];
      await page.goto(`/study/${unit.code}/sessions/${session.id}`);
      await expect(page.locator(".session-reader")).toHaveCount(1);
      const chooser = page.getByText("Choose a session", { exact: true });
      const sessions = page.getByRole("navigation", { name: "Learning sessions" });
      await expect(sessions).toBeHidden();
      await chooser.click();
      await expect(sessions.locator('button[aria-current="step"]')).toContainText(session.title);
      await chooser.click();
      await expect(sessions).toBeHidden();
      await expect(page.getByRole("button", { name: "Bookmark session", exact: true })).toHaveCount(
        1,
      );
      await page.getByRole("button", { name: "Increase text size", exact: true }).click();
      await page.getByRole("button", { name: "Bookmark session", exact: true }).click();
      await expect(page.getByText("Saved to your library.", { exact: true })).toBeVisible();
      await expect(page.locator(".session-tools")).toHaveCount(1);
      await page
        .locator(".session-heading h2")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      if (info.project.name === "mobile")
        await page.screenshot({ path: info.outputPath(`reader-${unit.code}.png`), fullPage: true });
      if (info.project.name === "desktop")
        for (const layout of ["reader", "theater", "split"]) {
          await page.getByRole("combobox", { name: "Workspace layout" }).selectOption(layout);
          await expect(page.locator(".session-tools")).toHaveCount(1);
        }
      if (info.project.name === "mobile")
        await page.getByRole("button", { name: "Learning companion", exact: true }).click();
      const divider = page.getByRole("separator", { name: "Resize reader and companion" });
      if (info.project.name === "desktop") {
        const before = (await page.locator("#workspace-reader").boundingBox())!.width;
        const rail = (await divider.boundingBox())!;
        await page.mouse.move(rail.x + rail.width / 2, rail.y + rail.height / 2);
        await page.mouse.down();
        await page.mouse.move(rail.x + rail.width / 2 + 105, rail.y + rail.height / 2, {
          steps: 6,
        });
        await page.mouse.up();
        await expect(page.getByLabel("Workspace layout")).toHaveValue("custom");
        expect((await page.locator("#workspace-reader").boundingBox())!.width).toBeGreaterThan(
          before + 65,
        );
        const resized = Number(await divider.getAttribute("aria-valuenow"));
        await divider.press("ArrowLeft");
        await expect(divider).toHaveAttribute("aria-valuenow", String(resized - 1));
        await page.reload();
        await expect(divider).toHaveAttribute("aria-valuenow", String(resized - 1));
      } else {
        await expect(divider).toHaveCount(0);
      }
      const draft = page.getByLabel("Ask your learning companion");
      await draft.fill("I want to check the current lesson.");
      await page.getByRole("button", { name: "Enter focus mode" }).click();
      await expect(page.locator(".workspace")).toHaveAttribute("data-focus", "true");
      await expect(page.getByRole("button", { name: "Exit focus mode" })).toBeVisible();
      if (info.project.name === "desktop")
        await expect
          .poll(() =>
            page.evaluate(() => document.fullscreenElement?.classList.contains("workspace")),
          )
          .toBe(true);
      await expect(draft).toHaveValue("I want to check the current lesson.");
      expect(
        await page
          .locator(".workspace")
          .evaluate((el) => Math.abs(el.getBoundingClientRect().height - innerHeight)),
      ).toBeLessThanOrEqual(2);
      const more = page.getByRole("button", { name: "More tools", exact: true });
      if (await more.isVisible()) await more.click();
      await page.getByRole("button", { name: "My Notes", exact: true }).click();
      const notes = page.getByRole("dialog", { name: "My Notes", exact: true });
      await expect(notes).toBeVisible();
      await notes.getByRole("button", { name: "Close notes", exact: true }).click();
      if (info.project.name === "mobile") await page.keyboard.press("Escape");
      else await page.getByRole("button", { name: "Exit focus mode" }).click();
      await expect(page.getByRole("button", { name: "Enter focus mode" })).toBeVisible();
      await expect(draft).toHaveValue("I want to check the current lesson.");
      await draft.fill("");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scroll = page.locator(".chat-scroll");
      await expect(scroll).toBeVisible();
      const metrics = await scroll.evaluate((el) => {
        const h = el.querySelector(".chat-welcome h3")!.getBoundingClientRect(),
          p = el.getBoundingClientRect();
        return { scrollTop: el.scrollTop, headingTop: h.top, paneTop: p.top };
      });
      console.log(JSON.stringify({ module: unit.code, ...metrics }));
      await page.screenshot({
        path: info.outputPath(`workspace-${unit.code}.png`),
        fullPage: true,
      });
      expect(metrics.scrollTop).toBe(0);
      expect(metrics.headingTop).toBeGreaterThanOrEqual(metrics.paneTop);
      if (info.project.name === "desktop") {
        const viewport = page.viewportSize()!;
        for (const width of [1100, 961, 960, 820, 761, 760, 390, 360]) {
          await page.setViewportSize({ width, height: 800 });
          await expect(page.getByRole("button", { name: "Enter focus mode" })).toBeInViewport();
          if (width <= 960) await expect(more).toBeInViewport();
          if (width > 760) {
            await expect(divider).toBeVisible();
            await expect(page.locator("#workspace-reader")).toBeVisible();
          } else {
            await expect(divider).toHaveCount(0);
            await expect(page.getByRole("button", { name: "Study material" })).toBeVisible();
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width);
          const overflow = await page
            .locator(".workspace-nav")
            .evaluate((el) => el.scrollWidth - el.clientWidth);
          expect(overflow, `header overflow at ${width}px`).toBeLessThanOrEqual(1);
        }
        await page.setViewportSize(viewport);
      }
      if (info.project.name === "mobile")
        await page.getByRole("button", { name: "Study material", exact: true }).click();
      await page.getByRole("button", { name: "Next session →", exact: true }).click();
      await expect(page.locator(".session-tools")).toHaveCount(1);
      await page.getByRole("button", { name: "← Previous session", exact: true }).click();
      await expect(page.locator(".session-heading h2")).toHaveText(session.title);
      await expect(page.locator(".session-tools")).toHaveCount(1);
    }
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
