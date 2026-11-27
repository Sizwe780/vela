import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
function database() {
  const u = new URL(process.env.DATABASE_URL!);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("channel_binding");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: u.toString(), ssl: { rejectUnauthorized: true } }),
  });
}

async function trackedLearner(
  page: Page,
  db: ReturnType<typeof database>,
  save: (id: string) => void,
) {
  const capture = page
    .waitForResponse(
      (response) => response.url().includes("/api/auth/sign-up/email") && response.status() === 200,
      { timeout: 60000 },
    )
    .then(async (response) => {
      const email = response.request().postDataJSON()?.email;
      if (typeof email !== "string" || !/^workspace-[0-9a-f-]{36}@example\.invalid$/.test(email))
        throw Error("Unexpected signup fixture");
      const rows = await db.$queryRaw<
        { id: string }[]
      >`SELECT id::text FROM neon_auth."user" WHERE email=${email}`;
      if (rows[0]) save(rows[0].id);
    });
  const [id] = await Promise.all([createTestLearner(page), capture]);
  return id;
}

test("saved real lesson working and contextual references survive navigation and offline edits", async ({
  page,
  context,
}, info) => {
  test.setTimeout(420000);
  page.setDefaultNavigationTimeout(60000);
  const db = database();
  let owner: string | undefined;
  try {
    owner = await trackedLearner(page, db, (id) => {
      owner = id;
    });
    const units = await db.studyUnit.findMany({
      where: {
        code: { in: ["MAT1503-U1", "MAT1512-U1", "CHE1501-U1"] },
        module: { institution: "UNISA" },
      },
      orderBy: { code: "asc" },
      include: { sessions: { orderBy: { position: "asc" }, take: 2 } },
    });
    expect(units).toHaveLength(3);
    const origin = new URL(process.env.PLAYWRIGHT_BASE_URL!).origin;
    const preference = await page.request.put("/api/profile", {
      headers: { origin },
      data: {
        displayName: "Workspace QA",
        weeklyGoalMinutes: 120,
        emailReminders: false,
        autoStartTimer: true,
      },
    });
    expect(preference.status()).toBe(200);
    expect((await (await page.request.get("/api/profile")).json()).autoStartTimer).toBe(true);
    await enrollTestLearner(
      page.request,
      db,
      units.map((u) => u.moduleId),
    );
    for (const unit of units) {
      const url = `/study/${unit.code}/sessions/${unit.sessions[0].id}`;
      await page.goto(url);
      await expect(page.locator(".session-reader")).toBeVisible();
      await expect(
        page.locator('select[aria-label="All lesson sections"] option:checked'),
      ).toHaveText("Learning goal");
      const answer = page.locator(".written-practice textarea").first();
      await expect(page.getByRole("button", { name: /Pause study timer/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await answer.fill("My saved reasoning " + unit.code);
      await expect
        .poll(
          async () =>
            (
              await db.$queryRaw<
                { n: number }[]
              >`SELECT count(*)::int n FROM "LessonAttempt" WHERE "studentId"=${owner} AND "sessionId"=${unit.sessions[0].id}`
            )[0].n,
        )
        .toBeGreaterThan(0);
      await page.reload();
      await expect(answer).toHaveValue("My saved reasoning " + unit.code);
      await expect(
        page.getByRole("progressbar", { name: "Practice questions attempted" }),
      ).toHaveAttribute("value", "1");
      const card = answer.locator("xpath=..");
      const ref = unit.code.startsWith("CHE") ? "Periodic table" : "Formula sheet";
      await card.getByRole("button", { name: ref, exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Learning references", exact: true }),
      ).toBeVisible();
      if (ref === "Periodic table")
        await expect(page.locator(".periodic-grid button")).toHaveCount(118);
      await page.screenshot({ path: info.outputPath(unit.code + "-drawer.png") });
      await page.getByRole("button", { name: "Close references", exact: true }).click();
      await expect(answer).toHaveValue("My saved reasoning " + unit.code);
      await card.getByRole("button", { name: ref, exact: true }).click();
      if (ref === "Periodic table") {
        await page.getByLabel("Chemical formula", { exact: true }).fill("CaCO3");
        await page
          .getByRole("button", { name: "Insert molar mass into answer", exact: true })
          .click();
        await expect(answer).toHaveValue(/My saved reasoning[\s\S]*100\.08/);
      } else {
        await page
          .getByRole("button", { name: "Insert formula into answer", exact: true })
          .first()
          .click();
        await expect(answer).toHaveValue(/My saved reasoning[\s\S]*\$/);
      }
      expect(await page.locator(".reader-scroll .katex-error").count()).toBe(0);
      await page.screenshot({ path: info.outputPath(unit.code + "-references.png") });
      if (unit.code === "MAT1503-U1" && unit.sessions[1]) {
        await page.goto(`/study/${unit.code}/sessions/${unit.sessions[1].id}`);
        await expect(page.locator(".reader-scroll .katex").first()).toBeVisible();
        const math = await page.locator(".reader-scroll .katex-mathml").evaluateAll((nodes) =>
          nodes.map((n) => ({
            width: n.getBoundingClientRect().width,
            height: n.getBoundingClientRect().height,
          })),
        );
        expect(math.length).toBeGreaterThan(0);
        expect(math.every((n) => n.width <= 1 && n.height <= 1)).toBe(true);
        expect(await page.locator(".reader-scroll .katex table").count()).toBe(0);
        await page
          .getByRole("button", {
            name: info.project.name === "mobile" ? "Learning companion" : "Ask your companion",
            exact: true,
          })
          .click();
        await expect(page.locator(".companion-mark")).toHaveText("✦");
        expect(
          await page
            .locator(".companion-mark")
            .evaluate((n) => getComputedStyle(n, "::after").content),
        ).not.toContain("Briefing");
        await page.getByRole("button", { name: "Close companion", exact: true }).click();
        await page.goto(url);
        await expect(page.locator(".written-practice textarea").first()).toBeVisible();
      }
    }
    const last = units[units.length - 1],
      answer = page.locator(".written-practice textarea").first();
    await context.setOffline(true);
    await answer.fill("Offline draft retained");
    await page.waitForTimeout(900);
    await context.setOffline(false);
    await expect
      .poll(
        async () =>
          (
            await db.$queryRaw<
              { answer: any }[]
            >`SELECT "userAnswer" answer FROM "LessonAttempt" WHERE "studentId"=${owner} AND "sessionId"=${last.sessions[0].id} AND "userAnswer"->>'text'='Offline draft retained'`
          ).length,
        { timeout: 30000 },
      )
      .toBe(1);
    await page.reload();
    await expect(answer).toHaveValue("Offline draft retained");
    await page.route("**/api/practice/check", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Test provider unavailable" } }),
      }),
    );
    const lastCard = answer.locator("xpath=..");
    await lastCard.getByRole("button", { name: "Check my attempt", exact: true }).click();
    await lastCard
      .getByRole("button", { name: "Save this attempt for review", exact: true })
      .click();
    await expect
      .poll(
        async () => (await (await page.request.get("/api/practice/review")).json()).cards.length,
      )
      .toBe(1);
    await page.goto("/review");
    await expect(page.getByRole("heading", { name: "From your lesson attempts" })).toBeVisible();
    await expect(page.locator(".review-summary dl > div").first().locator("dd")).toHaveText("1");
    const other = units.find((u) => u.id !== last.id)!;
    await page
      .getByRole("group", { name: "Review module" })
      .getByRole("button", { name: other.code.split("-U")[0], exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "From your lesson attempts" })).toHaveCount(0);
    await page
      .getByRole("group", { name: "Review module" })
      .getByRole("button", { name: "All modules", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "From your lesson attempts" })).toBeVisible();
    const queued = (await (await page.request.get("/api/practice/review")).json()).cards[0];
    const rated = await page.request.post("/api/practice/review", {
      headers: { origin },
      data: { action: "rate", id: queued.id, rating: 0.7 },
    });
    expect(rated.status()).toBe(200);
    expect((await rated.json()).masteryUpdated).toBe(false);
    await db.enrollment.updateMany({
      where: { studentId: owner, moduleId: last.moduleId },
      data: { status: "withdrawn" },
    });
    const denied = await page.request.get(
      `/api/practice/attempts?studyUnitId=${last.id}&sessionId=${last.sessions[0].id}&version=${last.sessions[0].version}`,
    );
    expect(denied.status()).toBe(403);
    await page.goto("/onboarding");
    await expect(page.locator("select").first()).not.toContainText("Synthetic only");
    if (info.project.name === "desktop") {
      for (const route of ["/activity", "/onboarding", "/practice/lab"]) {
        await page.goto(route);
        await expect(page.locator(".learning-rail")).toBeVisible();
      }
    }
  } finally {
    await context.setOffline(false);
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});
