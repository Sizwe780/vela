import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("automatic study tracking enforces enrollment, tab ownership and private activity goals", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(180000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const anonymous = await browser.newContext({ baseURL: info.project.use.baseURL });
  let id: string | undefined;
  try {
    expect((await anonymous.request.get("/api/activity")).status()).toBe(401);
    id = await createTestLearner(page);
    const session = await db.studySession.findFirstOrThrow({
      where: { studyUnit: { module: { code: "MAT1503", institution: "UNISA" } } },
      include: { studyUnit: true },
    });
    const origin = new URL(page.url()).origin,
      trackingId = randomUUID();
    const post = (data: object) =>
      page.request.post("/api/activity", { headers: { origin }, data });
    const base = { sessionId: session.id, trackingId };
    expect((await post({ ...base, action: "start" })).status()).toBe(403);
    await enrollTestLearner(page.request, db, [session.studyUnit.moduleId]);
    await page.goto(`/study/${session.studyUnit.code}/sessions/${session.id}`);
    await expect(page.getByRole("button", { name: /^Pause study timer/ })).toBeVisible();
    await expect.poll(() => db.studyPresence.count({ where: { studentId: id } })).toBe(1);
    await page.getByRole("button", { name: /^Pause study timer/ }).click();
    await expect.poll(() => db.studyPresence.count({ where: { studentId: id } })).toBe(0);
    expect((await post({ ...base, action: "pulse", seconds: 9999 })).status()).toBe(400);
    expect((await post({ ...base, action: "start" })).status()).toBe(200);
    await db.studyPresence.update({
      where: { studentId: id },
      data: { lastPulseAt: new Date(Date.now() - 5000) },
    });
    const pulse = await post({ ...base, action: "pulse" });
    expect(pulse.status()).toBe(200);
    const credit = await pulse.json();
    expect(credit.secondsAdded).toBeGreaterThanOrEqual(5);
    expect(credit.secondsAdded).toBeLessThanOrEqual(10);
    const otherTab = randomUUID();
    expect((await post({ ...base, trackingId: otherTab, action: "start" })).status()).toBe(409);
    expect(
      (await post({ ...base, trackingId: otherTab, action: "start", takeover: true })).status(),
    ).toBe(200);
    expect((await post({ ...base, action: "pulse" })).status()).toBe(409);
    expect((await post({ ...base, action: "stop" })).status()).toBe(200);
    expect(
      (await db.studyPresence.findUniqueOrThrow({ where: { studentId: id } })).trackingId,
    ).toBe(otherTab);
    await post({ ...base, trackingId: otherTab, action: "stop" });
    await page.getByRole("button", { name: "Start study timer", exact: true }).click();
    await expect(page.locator(".study-timer > span[role=status]")).toHaveText(
      "Recording focused time",
    );
    await expect
      .poll(() => db.studyPresence.count({ where: { studentId: id } }), { timeout: 16000 })
      .toBe(0);
    await expect(page.locator(".study-timer > span[role=status]")).toHaveText(
      "Paused while away or idle",
    );
    await page.mouse.move(80, 350);
    await expect.poll(() => db.studyPresence.count({ where: { studentId: id } })).toBe(1);
    let reloadedTrackingId: string | undefined;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/activity") && request.method() === "POST") {
        const action = request.postDataJSON();
        if (action.action === "start") reloadedTrackingId = action.trackingId;
      }
    });
    await page.reload();
    await expect
      .poll(
        async () => {
          const row = await db.studyPresence.findUnique({ where: { studentId: id } });
          return !!reloadedTrackingId && row?.trackingId === reloadedTrackingId;
        },
        { timeout: 15000 },
      )
      .toBe(true);
    // Playwright forces every Chromium page to appear focused by default.
    // Remove that test-only override to exercise the real blur/visibility lifecycle.
    const focusSession = await page.context().newCDPSession(page);
    await focusSession.send("Emulation.setFocusEmulationEnabled", { enabled: false });
    const background = await page.context().newPage();
    await background.goto("about:blank");
    await background.bringToFront();
    await expect
      .poll(() =>
        page.evaluate(() => !document.hasFocus() || document.visibilityState === "hidden"),
      )
      .toBe(true);
    await expect.poll(() => db.studyPresence.count({ where: { studentId: id } })).toBe(0);
    await page.bringToFront();
    await focusSession.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await expect(page.locator(".study-timer > span[role=status]")).toHaveText(
      "Recording focused time",
    );
    await background.close();
    await page.getByRole("button", { name: /^Pause study timer/ }).click();
    await expect(
      page.getByRole("button", { name: "Start study timer", exact: true }),
    ).toBeVisible();
    await expect.poll(() => db.studyPresence.count({ where: { studentId: id } })).toBe(0);
    expect(await db.studentMastery.count({ where: { studentId: id } })).toBe(0);
    expect(await db.sessionProgress.count({ where: { studentId: id } })).toBe(0);
    const summary = await page.request.get("/api/activity");
    expect(summary.headers()["cache-control"]).toContain("no-store");
    expect((await summary.json()).ownerId).toBe(id);
    await page.goto("/activity");
    await expect(page.getByRole("progressbar", { name: "Weekly study goal" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("MAT1503");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("activity.png"), fullPage: true });
    await db.enrollment.updateMany({ where: { studentId: id }, data: { status: "withdrawn" } });
    expect((await post({ ...base, action: "start" })).status()).toBe(403);
  } finally {
    await anonymous.close();
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
