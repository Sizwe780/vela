import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { enrollTestLearner } from "./helpers/enrollment";
test("resume, visible-only search, saved passages, profile and scoped staff analytics", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(360000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let studentId: string | undefined;
  const other = await browser.newContext({ baseURL: info.project.use.baseURL });
  let otherId: string | undefined;
  try {
    const module = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "MAT1512" } },
      include: {
        studyUnits: {
          orderBy: { position: "asc" },
          take: 1,
          include: { sessions: { orderBy: { position: "asc" } } },
        },
      },
    });
    const unit = module.studyUnits[0];
    const foreign = await db.studySession.findFirstOrThrow({
      where: { studyUnit: { module: { code: "MAT1503" } } },
    });
    async function signup(p: typeof page) {
      await p.goto("/auth/sign-up");
      await p.getByLabel("Full name").fill("Student Experience QA");
      await p.getByLabel("Email", { exact: true }).fill(`journey-${randomUUID()}@example.invalid`);
      await p.getByLabel("Password", { exact: true }).fill(`Journey-${randomUUID()}!`);
      await p.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(p).toHaveURL(/onboarding/, { timeout: 60000 });
      return (await (await p.request.get("/api/auth/get-session")).json()).user.id as string;
    }
    studentId = await signup(page);
    const second = await other.newPage();
    otherId = await signup(second);
    await enrollTestLearner(page.request, db, [module.id]);
    const origin = new URL(page.url()).origin;
    expect((await page.request.get("/api/staff/analytics")).status()).toBe(403);
    expect(
      (
        await page.request.put("/api/profile", {
          headers: { origin },
          data: {
            displayName: "Student QA",
            weeklyGoalMinutes: 150,
            emailReminders: false,
            role: "admin",
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/study-position", {
          headers: { origin },
          data: { sessionId: foreign.id },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await page.request.get(`/api/search?q=matrix&moduleId=${foreign.studyUnitId}`)).status(),
    ).toBe(403);
    await page.goto(`/study/${unit.code}/sessions/${unit.sessions[1].id}`);
    await expect(
      page.getByRole("heading", { name: unit.sessions[1].title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".worked-answer")).toHaveCount(0);
    await page.getByRole("button", { name: "Next session →", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/sessions/${unit.sessions[2].id}$`));
    await expect(page.locator(".tutor-session-context strong")).toHaveText(unit.sessions[2].title);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: unit.sessions[2].title, exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () => {
          const r = await page.request.get("/api/study-position");
          return (await r.json()).positions.find((p: any) => p.moduleId === module.id)?.sessionId;
        },
        { timeout: 20000 },
      )
      .toBe(unit.sessions[2].id);
    await page.getByRole("button", { name: "Bookmark session", exact: true }).click();
    await expect(page.getByText("Saved to your library.", { exact: true })).toBeVisible();
    const selected = await page
      .locator(".session-reader .markdown p")
      .first()
      .evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event("selectionchange"));
        return selection.toString().trim();
      });
    expect(selected.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Save highlighted passage", exact: true }).click();
    await expect
      .poll(async () => (await (await page.request.get("/api/bookmarks")).json()).bookmarks.length)
      .toBe(2);
    const saved = await (await page.request.get("/api/bookmarks")).json();
    expect(saved.bookmarks.some((b: any) => b.quote === selected)).toBe(true);
    await expect(page.locator(".saved-highlight").first()).toBeVisible();
    await page.reload();
    await expect(page.locator(".saved-highlight").first()).toBeVisible();
    expect(
      (
        await other.request.delete(`${origin}/api/bookmarks?id=${saved.bookmarks[0].id}`, {
          headers: { origin },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.post("/api/bookmarks", {
          headers: { origin },
          data: {
            studyUnitId: unit.id,
            sourceType: "session",
            sourceId: foreign.id,
            quote: "Wrong source",
          },
        })
      ).status(),
    ).toBe(404);
    await page.goto("/saved");
    await expect(
      page.getByRole("heading", { name: "Your saved library", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Your saved selection", { exact: true })).toBeVisible();
    await page.goto("/search");
    await page.getByRole("searchbox", { name: "Search your enrolled lessons" }).fill("limits");
    await expect(page.locator("main article").first()).toBeVisible();
    const results = await (await page.request.get("/api/search?q=limits")).json();
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results.every((r: any) => r.moduleCode === "MAT1512")).toBe(true);
    await page.locator("main article h2 a").first().click();
    await expect(page).toHaveURL(/\/sessions\//);
    await page.route("**/api/auth/email-otp/send-verification-otp", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true }) }),
    );
    await page.route("**/api/auth/email-otp/verify-email", (route) =>
      route.fulfill({
        status: route.request().postDataJSON().otp === "123456" ? 200 : 400,
        contentType: "application/json",
        body: JSON.stringify(
          route.request().postDataJSON().otp === "123456"
            ? { status: true, user: { id: studentId, emailVerified: true } }
            : { message: "Invalid or expired verification code", code: "INVALID_OTP" },
        ),
      }),
    );
    await page.goto("/profile");
    await expect(
      page.getByRole("button", { name: "Send verification code", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Send verification code", exact: true }).click();
    await expect(
      page.getByText("Verification code sent. Enter the code from your email below.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Email verification code", { exact: true }).fill("000000");
    await page.getByRole("button", { name: "Verify email", exact: true }).click();
    await expect(page.getByText(/Invalid or expired verification code/)).toBeVisible();
    await page.getByLabel("Email verification code", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Verify email", exact: true }).click();
    await expect(page.getByText("Email verified ✓", { exact: true })).toBeVisible();
    const themes = page.getByRole("button", { name: "Dark mode", exact: true });
    await themes.first().click();
    for (const control of await themes.all())
      await expect(control).toHaveAttribute("aria-pressed", "true");
    await themes.first().click();
    await page.getByLabel("Display name", { exact: true }).fill("My Updated Learning Name");
    await page.getByLabel("Weekly study goal, in minutes", { exact: true }).fill("150");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
    const profile = await (await page.request.get("/api/profile")).json();
    expect(profile.displayName).toBe("My Updated Learning Name");
    expect(profile.role).toBe("student");
    expect(["not-connected", "test", "connected"]).toContain(profile.emailDelivery);
    await page.goto("/review");
    await expect(
      page.getByRole("button", { name: `Review ${unit.code}`, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Review ${unit.code}`, exact: true }).click();
    await expect(page.getByRole("region", { name: "Active recall" })).toBeVisible();
    await page.getByRole("button", { name: "Close recall", exact: true }).click();
    const qualification = await db.qualificationModule.findFirstOrThrow({
      where: { moduleId: module.id },
    });
    await db.studentProfile.update({ where: { studentId }, data: { role: "staff" } });
    await db.staffMembership.create({
      data: { studentId, qualificationId: qualification.qualificationId, role: "staff" },
    });
    const analytics = await page.request.get("/api/staff/analytics");
    expect(analytics.status()).toBe(200);
    const report = await analytics.json();
    expect(report.qualifications.every((q: any) => q.id === qualification.qualificationId)).toBe(
      true,
    );
    expect(JSON.stringify(report)).not.toContain("@example.invalid");
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "Staff analytics", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /MAT1512 ·/ })).toBeVisible();
    await db.staffMembership.deleteMany({ where: { studentId } });
    expect((await page.request.get("/api/staff/analytics")).status()).toBe(403);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Continue where you left off", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "MAT1512 session completion", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `student-journey-${info.project.name}.png`, fullPage: true });
  } finally {
    await other.close();
    for (const id of [studentId, otherId].filter((x): x is string => !!x)) {
      await db.studyBookmark.deleteMany({ where: { studentId: id } });
      await db.studyPosition.deleteMany({ where: { studentId: id } });
      await db.emailDelivery.deleteMany({ where: { studentId: id } });
      await db.studentProfile.deleteMany({ where: { studentId: id } });
      await db.enrollment.deleteMany({ where: { studentId: id } });
      await db.studyNote.deleteMany({ where: { studentId: id } });
      await db.sessionProgress.deleteMany({ where: { studentId: id } });
      await db.studentMastery.deleteMany({ where: { studentId: id } });
      if (!/^[a-zA-Z0-9-]+$/.test(id)) throw Error("Unexpected test identity");
      const project = process.env.NEON_PROJECT_ID || "square-grass-82468951";
      if (!/^[a-z0-9-]+$/.test(project)) throw Error("Invalid project");
      const clean = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${id} --branch production --project-id ${project}`,
        ],
        { cwd: resolve(info.project.testDir, "../.."), encoding: "utf8", windowsHide: true },
      );
      expect(clean.status).toBe(0);
    }
    await db.$disconnect();
  }
});

test("public discovery, global 404 and privacy-safe offline fallback", async ({
  page,
  context,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: "Learn deeply. Teach confidently.", exact: true }),
  ).toBeVisible();
  await page.goto("/privacy");
  await expect(
    page.getByText("Vela Learning (Pty) Ltd operates Vela.", { exact: false }),
  ).toBeVisible();
  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/about");
  expect(await sitemap.text()).not.toContain("/study/");
  const og = await page.request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  const missing = await page.goto("/a-page-that-does-not-exist");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn't here", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
  });
  const keys = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys())
      if (key.startsWith("vela-public-shell-")) {
        const cache = await caches.open(key);
        for (const request of await cache.keys()) urls.push(new URL(request.url).pathname);
      }
    return urls;
  });
  expect(keys.sort()).toEqual(["/icon.svg", "/offline.html"]);
  try {
    await context.setOffline(true);
    await page.goto("/study/MAT1512-U1");
    await expect(
      page.getByRole("heading", { name: "A connection is needed", exact: true }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
