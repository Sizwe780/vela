import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { unsubscribeToken } from "../../lib/email/unsubscribe";

test("verified email gating, deduplicated welcome and scanner-safe unsubscribe", async ({
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
  let studentId: string | undefined;
  try {
    expect(
      (
        await anonymous.request.post("/api/jobs/email", {
          headers: { authorization: "Bearer é".repeat(32) },
        })
      ).status(),
    ).toBe(401);
    expect((await anonymous.request.post("/api/email/welcome")).status()).toBe(401);
    await page.goto("/auth/sign-up");
    await page.getByLabel("Full name").fill("Email Preferences QA");
    await page.getByLabel("Email", { exact: true }).fill(`email-${randomUUID()}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill(`Email-${randomUUID()}!`);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/onboarding/, { timeout: 60000 });
    studentId = (await (await page.request.get("/api/auth/get-session")).json()).user.id;
    const origin = new URL(page.url()).origin;
    for (let i = 0; i < 2; i++)
      expect(
        (
          await page.request.post("/api/email/welcome", {
            headers: { origin },
            data: { studentId: "cannot-override" },
          })
        ).status(),
      ).toBe(200);
    expect(await db.emailDelivery.count({ where: { studentId, kind: "welcome" } })).toBe(1);
    const preferences = { displayName: "Email QA", weeklyGoalMinutes: 120, emailReminders: true };
    expect(
      (await page.request.put("/api/profile", { headers: { origin }, data: preferences })).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/email/test", {
          headers: { origin },
          data: { to: "someone@example.org" },
        })
      ).status(),
    ).toBe(403);
    await page.goto("/profile");
    await expect(
      page.getByLabel("Email me active recall reminders", { exact: true }),
    ).toBeDisabled();
    // Disposable fixture: do not verify an address or send any email. Exercise opt-out persistence only.
    const consentAt = new Date();
    await db.studentProfile.upsert({
      where: { studentId: studentId! },
      create: {
        studentId: studentId!,
        emailReminders: true,
        emailConsentAt: consentAt,
        emailConsentVersion: "recall-daily-v1",
      },
      update: {
        emailReminders: true,
        emailConsentAt: consentAt,
        emailConsentVersion: "recall-daily-v1",
      },
    });
    const queued = await db.emailDelivery.create({
      data: { studentId: studentId!, kind: "recall", consentAt, dedupeKey: `qa:${randomUUID()}` },
    });
    const token = unsubscribeToken(studentId!, consentAt, process.env.EMAIL_UNSUBSCRIBE_SECRET!);
    const preview = await anonymous.newPage();
    await preview.goto(`/email/unsubscribe?token=${token}`);
    await expect(
      preview.getByRole("button", { name: "Stop recall reminders", exact: true }),
    ).toBeVisible();
    expect(
      (await db.studentProfile.findUniqueOrThrow({ where: { studentId } })).emailReminders,
    ).toBe(true);
    expect((await anonymous.request.post(`/api/email/unsubscribe?token=X${token}`)).status()).toBe(
      400,
    );
    await preview.getByRole("button", { name: "Stop recall reminders", exact: true }).click();
    await expect(preview.getByText("Recall reminders are off.", { exact: true })).toBeVisible();
    expect(
      (await db.studentProfile.findUniqueOrThrow({ where: { studentId } })).emailReminders,
    ).toBe(false);
    expect((await db.emailDelivery.findUniqueOrThrow({ where: { id: queued.id } })).status).toBe(
      "suppressed",
    );
    const newConsent = new Date(consentAt.getTime() + 1000);
    await db.studentProfile.update({
      where: { studentId },
      data: { emailReminders: true, emailConsentAt: newConsent },
    });
    expect((await anonymous.request.post(`/api/email/unsubscribe?token=${token}`)).status()).toBe(
      409,
    );
    expect(
      (await db.studentProfile.findUniqueOrThrow({ where: { studentId } })).emailReminders,
    ).toBe(true);
    const newToken = unsubscribeToken(
      studentId!,
      newConsent,
      process.env.EMAIL_UNSUBSCRIBE_SECRET!,
    );
    expect(
      (
        await anonymous.request.post(`/api/email/unsubscribe?token=${newToken}`, {
          form: { "List-Unsubscribe": "One-Click" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await db.studentProfile.findUniqueOrThrow({ where: { studentId } })).emailReminders,
    ).toBe(false);
  } finally {
    await anonymous.close();
    if (studentId) {
      await db.emailDelivery.deleteMany({ where: { studentId } });
      await db.studentProfile.deleteMany({ where: { studentId } });
      if (!/^[a-zA-Z0-9-]+$/.test(studentId)) throw Error("Invalid disposable identity");
      const project = process.env.NEON_PROJECT_ID || "square-grass-82468951";
      if (!/^[a-z0-9-]+$/.test(project)) throw Error("Invalid test project");
      const clean = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production --project-id ${project}`,
        ],
        { cwd: resolve(info.project.testDir, "../.."), encoding: "utf8", windowsHide: true },
      );
      expect(clean.status).toBe(0);
    }
    await db.$disconnect();
  }
});
