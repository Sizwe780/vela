import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("reading first, live pendulum practice and encrypted offline lessons", async ({
  page,
  context,
}, info) => {
  test.setTimeout(360000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let student: string | undefined;
  try {
    student = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: {
        institution: "UNISA",
        code: { in: ["MAT1503", "MAT1512", "BPT1501", "PHY1503", "PHY1505", "PHY1506"] },
      },
      select: { id: true },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    const session = await db.studySession.findFirstOrThrow({
      where: {
        studyUnit: { module: { code: "PHY1503", institution: "UNISA" } },
        title: { contains: "pendulum", mode: "insensitive" },
      },
      include: { studyUnit: true },
    });
    const path = `/study/${session.studyUnit.code}/sessions/${session.id}`;
    await page.goto(path);
    await expect(page.locator(".session-heading h2")).toHaveText(session.title);
    await expect(page.getByRole("dialog", { name: "Academic Master companion" })).not.toBeVisible();
    if (info.project.name === "desktop")
      expect((await page.locator("#workspace-reader").boundingBox())!.width).toBeGreaterThan(900);
    await expect(page.locator(".study-article .study-timer")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("first-reading.png") });
    await expect(page.getByRole("button", { name: "Bookmark session", exact: true })).toBeHidden();
    await page.locator(".workspace-display-menu summary").click();
    await page.getByRole("button", { name: "Increase text size", exact: true }).click();
    await expect(page.locator(".reader-scroll")).toHaveAttribute("style", /18px/);
    await page.locator(".workspace-display-menu summary").click();
    const bench = page.getByRole("region", { name: "Pendulum bench", exact: true });
    await expect(bench).toBeVisible();
    await expect(bench.locator('circle[aria-label="Zero-origin reference"]')).toHaveCount(1);
    const record = bench.getByRole("button", {
      name: "Record simulated time for 20 swings",
      exact: true,
    });
    for (let i = 0; i < 3; i++) {
      if (i)
        await bench
          .getByRole("button", { name: "Increase Pivot to bob centre", exact: true })
          .click();
      await record.click();
    }
    await expect(bench.locator(".lab-fit-readout")).toContainText(
      /Fitted slope.*estimated g = 9\./,
    );
    const g = page
      .locator(".try-example")
      .filter({ has: page.getByRole("heading", { name: "Recover g", exact: true }) });
    await g.getByRole("textbox", { name: "Value", exact: true }).fill("9.92");
    await g.getByRole("textbox", { name: "SI unit", exact: true }).fill("s");
    await g.getByRole("button", { name: "Check my attempt" }).click();
    await expect(g).toContainText("Check the SI unit dimensions");
    await g.getByRole("textbox", { name: "SI unit", exact: true }).fill("m/s²");
    await g.getByRole("button", { name: "Check my attempt" }).click();
    await expect(g).toContainText("Good work");
    await expect(page.locator(".lesson-practice-meter")).toContainText("1 locally checked");
    await page.getByRole("button", { name: "Guided mode off", exact: true }).click();
    expect(await page.locator(".lesson-beat:not([hidden])").count()).toBe(1);
    await page.getByRole("button", { name: "Guided mode on", exact: true }).click();
    await g.getByRole("button", { name: "Ask tutor for a hint", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Academic Master companion" })).toBeVisible();
    await expect(page.getByLabel("Ask your learning companion")).toHaveValue(/fitted slope/);
    await page.screenshot({ path: info.outputPath("companion.png") });
    await page.getByLabel("Ask your learning companion").fill("Keep this private question");
    await page.getByRole("button", { name: "Close companion", exact: true }).click();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    else await page.getByRole("button", { name: "Ask your companion", exact: true }).click();
    await expect(page.getByLabel("Ask your learning companion")).toHaveValue(
      "Keep this private question",
    );
    await page.getByRole("button", { name: "Close companion", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("reader.png") });
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page.getByRole("button", { name: "My Notes", exact: true }).click();
    const notes = page.getByRole("dialog", { name: "My Notes", exact: true });
    await expect(notes).toBeVisible();
    await notes
      .getByRole("textbox", { name: "Personal study notes" })
      .fill("Private UX study note.");
    await expect(notes.getByRole("status")).toHaveText("Saved");
    await notes.getByRole("button", { name: "Close notes", exact: true }).click();
    if (process.env.VELA_LIVE_RECALL !== "1")
      await page.route("**/api/recall", (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            cards: [
              {
                id: "synthetic",
                prompt: "Recall a complete cycle",
                answer: "Return to the same position and direction.",
              },
            ],
          }),
        }),
      );
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Recall", exact: true }).click();
    else await page.getByRole("button", { name: "Practice active recall", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Active recall", exact: true })).toBeVisible();
    if (process.env.VELA_LIVE_RECALL === "1") {
      const recall = page.getByRole("dialog", { name: "Active recall", exact: true });
      await expect(recall.locator(".recall-count")).toContainText("Card 1 of", { timeout: 60000 });
      await recall.getByRole("button", { name: "Reveal / hide answer", exact: true }).click();
      await expect(recall.locator(".recall-answer")).not.toBeEmpty();
      const rating = recall.getByRole("button", { name: "Good", exact: true });
      await rating.click();
      await expect(recall.locator(".recall-count")).not.toContainText("Card 1 of");
      console.log("Live recall retrieved, revealed and rated", info.project.name);
    }
    await page.getByRole("button", { name: "Close recall", exact: true }).click();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "More tools", exact: true }).click();
    else await page.locator(".workspace-more-menu>summary").click();
    await page.getByRole("button", { name: "Source library", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Source library", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator(".session-more>summary").click();
    await page.getByRole("button", { name: "Bookmark session", exact: true }).click();
    await expect(page.getByText("Saved to your library.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save lesson offline", exact: true }).click();
    await page
      .getByLabel("Download passphrase", { exact: true })
      .fill("synthetic-offline-passphrase");
    await page
      .getByLabel("Confirm download passphrase", { exact: true })
      .fill("synthetic-offline-passphrase");
    await page
      .getByRole("button", { name: "Encrypt and save on this device", exact: true })
      .click();
    await expect(page.getByText(/Encrypted lesson saved on this device/)).toBeVisible({
      timeout: 90000,
    });
    await page.goto("/offline.html");
    await expect(page.getByRole("button", { name: "Unlock lesson 1", exact: true })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("button", { name: "Unlock lesson 1", exact: true })).toBeVisible();
    await page.getByLabel("Download passphrase", { exact: true }).fill("wrong-passphrase");
    await page.getByRole("button", { name: "Unlock lesson 1", exact: true }).click();
    await expect(page.getByText(/Could not unlock this lesson/)).toBeVisible();
    await page
      .getByLabel("Download passphrase", { exact: true })
      .fill("synthetic-offline-passphrase");
    await page.getByRole("button", { name: "Unlock lesson 1", exact: true }).click();
    await expect(page.getByRole("heading", { name: session.title, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pendulum bench", exact: true })).toBeVisible();
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const key of await caches.keys()) {
        for (const req of await (await caches.open(key)).keys()) urls.push(req.url);
      }
      return urls;
    });
    expect(cached.some((u) => /\/api\/|\/study\//.test(u))).toBe(false);
    await page.screenshot({ path: info.outputPath("offline-reader.png") });
    console.log("Verified reading-first workspace and offline pendulum", info.project.name);
  } finally {
    await context.setOffline(false);
    if (student) await cleanupTestLearner(db, student);
    await db.$disconnect();
  }
});
