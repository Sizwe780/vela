import "dotenv/config";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("private practice copies reopen with fresh checks, export, isolate accounts and never award mastery", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const other = await browser.newContext({ baseURL: info.project.use.baseURL });
  const guest = await browser.newContext({ baseURL: info.project.use.baseURL });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let owner: string | undefined, stranger: string | undefined;
  try {
    expect((await guest.request.get("/api/practice-notebook")).status()).toBe(401);
    owner = await createTestLearner(page);
    await page.goto("/practice/notebook");
    await expect(page).toHaveURL(/\/practice\/math\?notebook=1$/);
    await expect(page.getByRole("heading", { name: "Practical Lab", exact: true })).toBeVisible();
    await expect(page.getByText("No saved entries on this page.")).toBeVisible();
    await page.locator('math-field[aria-label="Your next line"]').evaluate((el) => {
      (el as HTMLElement & { value: string }).value = "x^2+2x+1";
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText("Step 1 · Verified", { exact: true })).toBeVisible();
    await page.getByLabel("Notebook entry title").fill("Distributing the middle term");
    await page.getByLabel("Practice reflection").fill("I must include both cross terms.");
    await page.getByLabel("Notebook entry type").selectOption("mistake");
    let dropped = false;
    await page.route("**/api/practice-notebook", async (route) => {
      if (route.request().method() === "POST" && !dropped) {
        dropped = true;
        const committed = await route.fetch();
        expect(committed.status()).toBe(200);
        await route.abort("failed");
      } else await route.continue();
    });
    const request = page.waitForRequest(
      (r) => r.url().endsWith("/api/practice-notebook") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Save copy to notebook", exact: true }).click();
    const payload = (await request).postDataJSON();
    await expect(page.locator(".practice-notebook").getByRole("status")).toContainText(
      "Your draft is still here",
    );
    await expect(page.getByLabel("Practice reflection")).toHaveValue(
      "I must include both cross terms.",
    );
    const retried = page.waitForRequest(
      (r) => r.url().endsWith("/api/practice-notebook") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Save copy to notebook", exact: true }).click();
    expect((await retried).postDataJSON().id).toBe(payload.id);
    await expect(page.locator(".practice-notebook").getByRole("status")).toContainText(
      "Saved a private copy",
    );
    await page.unroute("**/api/practice-notebook");
    const entry = page.locator(".notebook-entries > li").first();
    await expect(entry).toContainText("Distributing the middle term");
    expect(payload.snapshot.lines[0].feedback).toBeUndefined();
    expect((await page.request.post("/api/practice-notebook", { data: payload })).status()).toBe(
      200,
    );
    expect(await db.practiceNotebook.count({ where: { studentId: owner } })).toBe(1);
    expect(
      (
        await page.request.post("/api/practice-notebook", {
          headers: { origin: "https://attacker.invalid" },
          data: { ...payload, id: randomUUID() },
        })
      ).status(),
    ).toBe(403);
    expect((await page.request.get("/api/practice-notebook")).headers()["cache-control"]).toContain(
      "no-store",
    );
    expect(
      (
        await page.request.post("/api/practice-notebook", {
          data: { ...payload, title: "Different data" },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/practice-notebook", {
          data: { ...payload, id: randomUUID(), studentId: "spoof" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/practice-notebook", {
          data: { ...payload, id: randomUUID(), snapshot: { ...payload.snapshot, score: 1 } },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/practice-notebook", {
          data: { ...payload, id: randomUUID(), ownerId: "changed-account" },
        })
      ).status(),
    ).toBe(409);
    const downloading = page.waitForEvent("download");
    await entry.getByRole("button", { name: "Export text", exact: true }).click();
    const download = await downloading;
    const text = await readFile((await download.path())!, "utf8");
    expect(text).toContain("x^2+2x+1");
    expect(text).toContain("both cross terms");
    expect(text).toContain("not grades");
    await page.reload();
    await expect(page.locator(".math-history li")).toHaveCount(0);
    await page
      .locator(".notebook-entries > li")
      .first()
      .getByRole("button", { name: "Reopen work", exact: true })
      .click();
    await page.getByRole("button", { name: "Replace and recheck", exact: true }).click();
    await expect(page.getByText("Step 1 · Verified", { exact: true })).toBeVisible();
    await page.getByLabel("Notebook filter").selectOption("practice");
    await expect(page.getByText("No saved entries on this page.")).toBeVisible();
    await page.getByLabel("Notebook filter").selectOption("mistake");
    await expect(page.locator(".notebook-entries > li")).toHaveCount(1);
    const second = await other.newPage();
    stranger = await createTestLearner(second);
    expect((await (await second.request.get("/api/practice-notebook")).json()).entries).toEqual([]);
    expect((await second.request.delete(`/api/practice-notebook?id=${payload.id}`)).status()).toBe(
      404,
    );
    expect(
      (
        await second.request.post("/api/practice-notebook", {
          data: { ...payload, ownerId: stranger },
        })
      ).status(),
    ).toBe(409);
    if (info.project.name === "desktop") {
      await db.practiceNotebook.createMany({
        data: Array.from({ length: 99 }, (_, i) => ({
          id: randomUUID(),
          studentId: owner!,
          title: `QA capacity ${i}`,
          snapshot: payload.snapshot,
        })),
      });
      expect(
        (
          await page.request.post("/api/practice-notebook", {
            data: { ...payload, id: randomUUID() },
          })
        ).status(),
      ).toBe(409);
      await db.practiceNotebook.deleteMany({
        where: { studentId: owner, id: { not: payload.id } },
      });
    }
    await page.screenshot({
      path: `../work/practice-notebook-${info.project.name}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator(".katex-error").count()).toBe(0);
    await page
      .locator(".notebook-entries > li")
      .first()
      .getByRole("button", { name: "Delete entry", exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel deletion", exact: true }).click();
    expect(await db.practiceNotebook.count({ where: { studentId: owner } })).toBe(1);
    await page
      .locator(".notebook-entries > li")
      .first()
      .getByRole("button", { name: "Delete entry", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm deletion", exact: true }).click();
    await expect(page.locator(".practice-notebook").getByRole("status")).toContainText(
      "Entry deleted",
    );
    expect(await db.practiceNotebook.count({ where: { studentId: owner } })).toBe(0);
    expect(await db.studentMastery.count({ where: { studentId: owner } })).toBe(0);
    expect(await db.sessionProgress.count({ where: { studentId: owner } })).toBe(0);
    // The same notebook is accessible from a real unit's question-first scratchpad.
    const unit = await db.studyUnit.findFirstOrThrow({
      where: { code: info.project.name === "desktop" ? "MAT1503-U1" : "MAT1512-U1" },
    });
    await enrollTestLearner(page.request, db, [unit.moduleId]);
    await page.goto("/");
    if (info.project.name === "mobile") {
      await page.getByRole("button", { name: "Open learning navigation" }).click();
    }
    const navigation = page.getByRole("navigation", { name: "Learning navigation", exact: true });
    await expect(
      navigation.getByRole("link", { name: "Practice notebook", exact: true }),
    ).toHaveCount(0);
    await navigation.getByRole("link", { name: "Practical Lab", exact: true }).click();
    await expect(page).toHaveURL(/\/practice\/math$/);
    await page.getByText("My practice notebook", { exact: true }).click();
    await expect(page.getByText("No saved entries on this page.")).toBeVisible();

    await page.goto(`/study/${unit.code}`);
    await page.getByRole("button", { name: "Try in math scratchpad", exact: true }).first().click();
    await expect(
      page.locator(".exercise-scratchpad summary").filter({ hasText: "My practice notebook" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    if (stranger) await cleanupTestLearner(db, stranger);
    await other.close();
    await guest.close();
    await db.$disconnect();
  }
});
