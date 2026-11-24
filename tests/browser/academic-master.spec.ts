import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("Academic Master uses private scoped evidence, assessed concepts and entered availability", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(20000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const connection = new URL(process.env.DATABASE_URL!);
  connection.searchParams.delete("sslmode");
  connection.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: connection.toString(),
      ssl: { rejectUnauthorized: true },
    }),
  });
  const peerContext = await browser.newContext({ baseURL: info.project.use.baseURL });
  const peer = await peerContext.newPage();
  const guest = await browser.newContext({ baseURL: info.project.use.baseURL });
  let a: string | undefined, b: string | undefined;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    expect((await guest.request.get("/api/learning")).status()).toBe(401);
    expect((await guest.request.post("/api/concept-check", { data: {} })).status()).toBe(401);
    const linear = await db.module.findUniqueOrThrow({
        where: { institution_code: { institution: "UNISA", code: "MAT1503" } },
      }),
      calc = await db.module.findUniqueOrThrow({
        where: { institution_code: { institution: "UNISA", code: "MAT1512" } },
      });
    a = await createTestLearner(page);
    b = await createTestLearner(peer);
    await enrollTestLearner(page.request, db, [linear.id, calc.id]);
    await enrollTestLearner(peer.request, db, [calc.id]);
    const initial = await (await page.request.get("/api/learning")).json();
    expect(initial.preferences.tutorContext).toBe(false);
    expect(initial.preferences.crossModule).toBe(false);
    expect(initial.concepts.length).toBe(8);
    expect(
      initial.concepts.every((n: { probability: number | null }) => n.probability === null),
    ).toBe(true);
    const balance = initial.concepts.find((n: { id: string }) => n.id === "algebra.equality");
    expect(balance.mappings.some((m: { moduleId: string }) => m.moduleId === linear.id)).toBe(true);
    expect(balance.mappings.some((m: { moduleId: string }) => m.moduleId === calc.id)).toBe(true);
    const peerData = await (await peer.request.get("/api/learning")).json();
    expect(
      peerData.concepts
        .find((n: { id: string }) => n.id === "algebra.equality")
        .mappings.every((m: { moduleId: string }) => m.moduleId === calc.id),
    ).toBe(true);
    expect((await peer.request.get(`/api/learning?moduleId=${linear.id}`)).status()).toBe(403);
    await page.route("**/api/learning", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(peerData) }),
    );
    await page.goto("/learning-map");
    await expect(
      page.getByText("Your account changed. Reload your learning workspace.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".concept-detail")).toHaveCount(0);
    await page.unroute("**/api/learning");
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome back, Workspace.", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open my learning briefing", exact: true }).click();
    await page
      .getByRole("button", { name: "Preserving equality: not checked", exact: true })
      .click();
    const detail = page.getByRole("article", { name: "Selected concept" });
    await detail.getByRole("button", { name: "Show answer", exact: true }).click();
    expect(await db.learningConceptState.count({ where: { studentId: a } })).toBe(0);
    await detail.getByLabel("Practice in module").selectOption(linear.id);
    const issued = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/concept-check") && r.request().postDataJSON()?.action === "issue",
    );
    await detail.getByRole("button", { name: "Start a focused check", exact: true }).click();
    const q = await (await issued).json();
    expect(JSON.stringify(q)).not.toContain("correctId");
    const check = await db.conceptCheck.findUniqueOrThrow({ where: { id: q.id } });
    const payload = check.payload as { correctId: string };
    expect(
      (
        await peer.request.post("/api/concept-check", {
          data: { action: "submit", ownerId: b, checkId: q.id, choice: payload.correctId },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.post("/api/concept-check", {
          data: { action: "submit", ownerId: b, checkId: q.id, choice: payload.correctId },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/concept-check", {
          data: {
            action: "submit",
            ownerId: a,
            checkId: q.id,
            choice: payload.correctId,
            probability: 1,
          },
        })
      ).status(),
    ).toBe(400);
    const submission = { action: "submit", ownerId: a, checkId: q.id, choice: payload.correctId };
    const concurrent = await Promise.all([
      page.request.post("/api/concept-check", { data: submission }),
      page.request.post("/api/concept-check", { data: submission }),
    ]);
    expect(concurrent.every((r) => r.status() === 200)).toBe(true);
    await detail.locator(`input[type=radio][value=${payload.correctId}]`).check();
    await detail.getByRole("button", { name: "Check my answer", exact: true }).click();
    await expect(detail.getByRole("heading", { name: "Correct", exact: true })).toBeVisible();
    const states = await db.learningConceptState.findMany({ where: { studentId: a } });
    expect(states.length).toBe(1);
    expect(states[0].observations).toBe(1);
    expect(states[0].conceptId).toBe("algebra.equality");
    expect(await db.learningConceptState.count({ where: { studentId: b } })).toBe(0);
    expect(await db.studentMastery.count({ where: { studentId: a } })).toBe(0);
    await page.getByRole("button", { name: "Close Academic Master", exact: true }).click();
    await expect(page.locator(".academic-briefing")).toContainText(
      "Your direct checks contribute to one shared concept estimate.",
    );
    console.info("Verified concept ownership, atomic grading and duplicate replay.");
    await db.studyNote.create({
      data: {
        studentId: a,
        studyUnitId: check.studyUnitId,
        body: "PRIVATE_NOTE_SHOULD_NOT_ENTER_TUTOR_CONTEXT",
      },
    });
    const off = await (await page.request.get(`/api/learning/context?moduleId=${calc.id}`)).json();
    expect(off.enabled).toBe(false);
    expect(off.entries).toEqual([]);
    const startAt = new Date(Date.now() + 86400000).toISOString(),
      availability = [{ startAt, minutes: 45 }];
    expect(
      (
        await page.request.put("/api/learning", {
          data: { ownerId: a, tutorContext: true, crossModule: false, availability },
        })
      ).status(),
    ).toBe(200);
    const local = await (
      await page.request.get(`/api/learning/context?moduleId=${calc.id}`)
    ).json();
    expect(local.entries).toEqual([]);
    expect(
      (
        await page.request.put("/api/learning", {
          data: { ownerId: a, tutorContext: true, crossModule: true, availability },
        })
      ).status(),
    ).toBe(200);
    const shared = await (
      await page.request.get(`/api/learning/context?moduleId=${calc.id}`)
    ).json();
    expect(shared.entries.some((e: { title: string }) => e.title === "Preserving equality")).toBe(
      true,
    );
    expect(JSON.stringify(shared)).not.toContain("PRIVATE_NOTE");
    expect(JSON.stringify(shared)).not.toContain(startAt);
    const unrelated = await db.studySession.findFirstOrThrow({
      where: { studyUnit: { moduleId: calc.id, code: "MAT1512-U5" }, position: 2 },
    });
    const focused = await (
      await page.request.get(`/api/learning/context?moduleId=${calc.id}&sessionId=${unrelated.id}`)
    ).json();
    expect(focused.entries).toEqual([]);
    const enrollment = await db.enrollment.findFirstOrThrow({
      where: { studentId: a, moduleId: linear.id },
    });
    expect(
      (
        await page.request.post("/api/enrollments", {
          data: { action: "withdraw", enrollmentId: enrollment.id },
        })
      ).status(),
    ).toBe(200);
    const withdrawn = await (
      await page.request.get(`/api/learning/context?moduleId=${calc.id}`)
    ).json();
    expect(withdrawn.entries).toEqual([]);
    expect((await page.request.post("/api/concept-check", { data: submission })).status()).toBe(
      403,
    );
    await enrollTestLearner(page.request, db, [linear.id, calc.id]);
    console.info("Verified context consent, active-session relevance and withdrawal.");
    const scheduled = await (await page.request.get("/api/learning")).json();
    expect(scheduled.periods[0].minutes).toBe(25);
    expect(scheduled.periods[0].startAt).toBe(startAt);
    expect(
      (
        await page.request.put("/api/learning", {
          data: { ownerId: a, tutorContext: false, crossModule: true, availability: [] },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.put("/api/learning", {
          data: {
            ownerId: a,
            tutorContext: false,
            crossModule: false,
            availability: [...availability, ...availability],
          },
        })
      ).status(),
    ).toBe(400);
    await page.goto("/learning-map");
    await page.getByText("Privacy and study availability", { exact: true }).click();
    await page.getByLabel("Preview module", { exact: true }).selectOption(calc.id);
    await page.getByRole("button", { name: "Preview saved tutor context", exact: true }).click();
    await expect(page.getByRole("region", { name: "Tutor context preview" })).toContainText(
      "Preserving equality",
    );
    const session = await db.studySession.findFirstOrThrow({
      where: { studyUnit: { moduleId: calc.id, code: "MAT1512-U2" }, position: 2 },
      include: { studyUnit: true },
    });
    await page.goto(`/study/${session.studyUnitId}/sessions/${session.id}`);
    const prerequisite = page.getByRole("complementary", { name: "Session prerequisites" });
    await expect(prerequisite).toBeVisible();
    const before = page.url();
    await prerequisite.getByRole("button", { name: /Combining powers/ }).click();
    const dock = page.getByRole("dialog", { name: "Academic Master briefing", exact: true });
    await expect(dock).toBeVisible();
    expect(page.url()).toBe(before);
    await expect(
      dock.getByRole("heading", { name: "Combining powers of one base", exact: true }),
    ).toBeVisible();
    await dock.getByRole("button", { name: "Close Academic Master", exact: true }).click();
    await expect(dock).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(
      page.getByRole("dialog", { name: "Academic Master briefing", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    if (!process.env.OLLAMA_GUIDED_MODEL) {
      const pending = await page.request.post("/api/tutor", {
        data: {
          query: "A nudge please",
          studyUnitId: session.studyUnitId,
          sessionId: session.id,
          mode: "academic",
          hintTier: 1,
          provider: "ollama",
        },
      });
      expect(pending.status()).toBe(503);
      expect((await pending.json()).error.code).toBe("LOCAL_GUIDED_NOT_READY");
    }
    if (process.env.VERIFY_AI_ALLOWANCE) {
      if (info.project.name === "mobile")
        await page.getByRole("button", { name: "Learning companion", exact: true }).click();
      await page.locator("#tutor-query").fill("Give me a nudge on the power rule.");
      await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
      await page.getByText("Think it through", { exact: true }).click();
      await page.getByRole("button", { name: "1 · Nudge", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Learning companion", exact: true }).getByRole("alert"),
      ).toContainText("daily free AI allowance is exhausted", {
        timeout: 45000,
      });
      await expect(page.locator(".companion-card")).toHaveCount(0);
    }
    await page.goto("/learning-map");
    await page.getByText("Privacy and study availability", { exact: true }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Reset concept estimates", exact: true }).click();
    await expect.poll(() => db.learningConceptState.count({ where: { studentId: a } })).toBe(0);
    expect(await db.conceptCheck.count({ where: { studentId: a } })).toBe(0);
    expect(await db.studyNote.count({ where: { studentId: a } })).toBe(1);
    await expect(
      page.getByRole("button", { name: "Preserving equality: not checked", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `../work/concept-map-${info.project.name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  } finally {
    if (a) await cleanupTestLearner(db, a);
    if (b) await cleanupTestLearner(db, b);
    await peerContext.close();
    await guest.close();
    await db.$disconnect();
  }
});
