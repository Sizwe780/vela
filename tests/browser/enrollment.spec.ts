import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
test("signup, qualification selection, enrolled dashboard and server-side module gates", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const users: string[] = [];
  const other = await browser.newContext({ baseURL: info.project.use.baseURL });
  try {
    const link = await db.qualificationModule.findFirstOrThrow({
      where: { module: { code: "MAT1512", institution: "UNISA" } },
      include: {
        module: {
          include: { studyUnits: { orderBy: { position: "asc" }, include: { sessions: true } } },
        },
      },
    });
    const linear = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "MAT1503" } },
      include: { studyUnits: { orderBy: { position: "asc" }, take: 1 } },
    });
    const unit = link.module.studyUnits[0];
    for (const p of [page, await other.newPage()]) {
      await p.goto("/auth/sign-up");
      await p.getByLabel("Full name").fill("Enrollment QA");
      await p
        .getByLabel("Email", { exact: true })
        .fill(`enrollment-${randomUUID()}@example.invalid`);
      await p.getByLabel("Password", { exact: true }).fill(`Enroll-${randomUUID()}!`);
      await p.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(p).toHaveURL(/onboarding/, { timeout: 60000 });
      await expect(p.getByRole("heading", { name: "What are you studying?" })).toBeVisible();
      users.push((await (await p.request.get("/api/auth/get-session")).json()).user.id);
    }
    const origin = new URL(page.url()).origin;
    expect((await page.request.get(`/api/notes?studyUnitId=${unit.id}`)).status()).toBe(403);
    expect((await page.request.get(`/api/sessions?unit=${unit.id}`)).status()).toBe(403);
    expect((await page.request.get(`/api/reading?unit=${unit.id}`)).status()).toBe(403);
    expect(
      (await page.request.get("/api/sources/guide", { headers: { range: "bytes=0-15" } })).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: { origin },
          data: {
            studyUnitId: unit.id,
            query: "Explain limits",
            mode: "academic",
            provider: "cloudflare",
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/quiz/generate", {
          headers: { origin },
          data: { studyUnitId: unit.id, provider: "heuristic" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/recall", {
          headers: { origin },
          data: { action: "queue", studyUnitId: unit.id },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/enrollments", {
          headers: { origin },
          data: {
            action: "enroll",
            qualificationId: link.qualificationId,
            moduleIds: [link.moduleId],
            studentId: users[1],
          },
        })
      ).status(),
    ).toBe(400);
    const invalid = await page.request.post("/api/enrollments", {
      headers: { origin },
      data: {
        action: "enroll",
        qualificationId: link.qualificationId,
        moduleIds: [link.moduleId, "missing-module"],
      },
    });
    expect(invalid.status()).toBe(400);
    expect(await db.enrollment.count({ where: { studentId: users[0] } })).toBe(0);
    await page.goto(`/study/${unit.code}`);
    await expect(page).toHaveURL(/onboarding.*moduleId=/);
    await page.getByLabel("Qualification", { exact: true }).selectOption(link.qualificationId);
    await page.getByRole("checkbox", { name: new RegExp("MAT1512") }).check();
    await page.getByRole("button", { name: "Save modules and continue" }).click();
    await expect(page.getByRole("heading", { name: unit.title, exact: true })).toBeVisible({
      timeout: 30000,
    });
    let enrollment = await db.enrollment.findFirstOrThrow({
      where: { studentId: users[0], moduleId: link.moduleId },
    });
    expect(enrollment.status).toBe("active");
    await page.goto("/");
    const dashboard = page.getByRole("region", { name: "My enrolled modules" });
    await expect(dashboard.getByRole("heading", { name: /MAT1512/ })).toBeVisible();
    await expect(dashboard.getByRole("heading", { name: /MAT1503/ })).toHaveCount(0);
    const progress = await (await page.request.get("/api/progress")).json();
    expect(progress.courses.flatMap((q: any) => q.modules).map((m: any) => m.id)).toEqual([
      link.moduleId,
    ]);
    const outcomes = await (await page.request.get("/api/mastery")).json();
    expect(outcomes.outcomes.length).toBeGreaterThan(0);
    expect(outcomes.outcomes.every((o: any) => o.module === "MAT1512" && o.score === 0)).toBe(true);
    const duplicate = await page.request.post("/api/enrollments", {
      headers: { origin },
      data: { action: "enroll", qualificationId: link.qualificationId, moduleIds: [link.moduleId] },
    });
    expect(duplicate.status()).toBe(200);
    expect(await db.enrollment.count({ where: { studentId: users[0] } })).toBe(1);
    expect(
      (
        await page.request.post("/api/enrollments", {
          headers: { origin },
          data: { action: "complete", enrollmentId: enrollment.id },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await other.request.post(`${origin}/api/enrollments`, {
          headers: { origin },
          data: { action: "withdraw", enrollmentId: enrollment.id },
        })
      ).status(),
    ).toBe(404);
    expect((await other.request.get(`${origin}/api/notes?studyUnitId=${unit.id}`)).status()).toBe(
      403,
    );
    expect(
      (await page.request.get(`/api/notes?studyUnitId=${linear.studyUnits[0].id}`)).status(),
    ).toBe(403);
    await page.goto(`/study/${linear.studyUnits[0].code}`);
    await expect(page).toHaveURL(/onboarding/);
    const note = await page.request.put("/api/notes", {
      headers: { origin },
      data: {
        studyUnitId: unit.id,
        body: "My original limit explanation.",
        revision: 0,
        ownerId: users[0],
      },
    });
    expect(note.status()).toBe(200);
    expect(
      (
        await page.request.post("/api/sessions", {
          headers: { origin },
          data: { sessionId: unit.sessions[0].id, complete: true },
        })
      ).status(),
    ).toBe(200);
    const revoked = await page.request.post("/api/enrollments", {
      headers: { origin },
      data: { action: "withdraw", enrollmentId: enrollment.id },
    });
    expect(revoked.status()).toBe(200);
    expect((await page.request.get(`/api/notes?studyUnitId=${unit.id}`)).status()).toBe(403);
    expect(
      (
        await db.studyNote.findUniqueOrThrow({
          where: { studentId_studyUnitId: { studentId: users[0], studyUnitId: unit.id } },
        })
      ).body,
    ).toContain("limit explanation");
    expect(
      (
        await page.request.post("/api/enrollments", {
          headers: { origin },
          data: {
            action: "enroll",
            qualificationId: link.qualificationId,
            moduleIds: [link.moduleId],
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await (await page.request.get(`/api/notes?studyUnitId=${unit.id}`)).json()).body,
    ).toContain("limit explanation");
    // Exercise completion semantics with temporary learner-owned progress only.
    await db.sessionProgress.createMany({
      data: link.module.studyUnits.flatMap((u) =>
        u.sessions.map((s) => ({ sessionId: s.id, studentId: users[0] })),
      ),
      skipDuplicates: true,
    });
    expect(
      (
        await page.request.post("/api/enrollments", {
          headers: { origin },
          data: { action: "complete", enrollmentId: enrollment.id },
        })
      ).status(),
    ).toBe(200);
    enrollment = await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(enrollment.status).toBe("completed");
    expect((await page.request.get(`/api/notes?studyUnitId=${unit.id}`)).status()).toBe(200);
    expect(
      (
        await page.request.post("/api/sessions", {
          headers: { origin },
          data: { sessionId: unit.sessions[0].id, complete: false },
        })
      ).status(),
    ).toBe(200);
    expect((await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe(
      "active",
    );
    await page.goto("/");
    await expect(dashboard.getByRole("heading", { name: /MAT1512/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Browse the module catalog" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Hello,/ })).toHaveCount(0);
    const mastery = page.getByRole("region", { name: "Course progress tree" });
    await expect(mastery.getByText("Not yet practised", { exact: true }).first()).toBeVisible();
    await page.goto(`/study/${unit.id}/quiz`);
    await page.getByRole("button", { name: "Generate quiz", exact: true }).click();
    const questions = page.locator(".quiz-question");
    await expect(questions.first()).toBeVisible({ timeout: 45000 });
    const next = page.getByRole("button", { name: "Next question" });
    for (;;) {
      const option = questions.getByRole("radio").first();
      if (await option.count()) await option.check();
      else await questions.getByRole("textbox").fill("QA response");
      if (!(await next.isVisible())) break;
      await next.click();
    }
    await page.getByRole("button", { name: "Check my understanding" }).click();
    await expect(page.locator(".quiz-result")).toBeVisible();
    await page.goto("/");
    await expect(mastery.getByRole("progressbar").first()).toBeVisible();
    await expect(mastery.getByText("Not yet practised", { exact: true }).first()).toBeVisible();
    await mastery.getByText("Qualification and session completion", { exact: true }).click();
    await expect(mastery.getByRole("region", { name: "Course completion" })).toBeVisible();
    await mastery.getByText("Qualification and session completion", { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath("enrolled-dashboard.png"), fullPage: true });
  } finally {
    await other.close();
    for (const studentId of users) {
      await db.studyBookmark.deleteMany({ where: { studentId } });
      await db.studyPosition.deleteMany({ where: { studentId } });
      await db.emailDelivery.deleteMany({ where: { studentId } });
      await db.studentProfile.deleteMany({ where: { studentId } });
      await db.quizAttempt.deleteMany({ where: { studentId } });
      await db.enrollment.deleteMany({ where: { studentId } });
      await db.studyNote.deleteMany({ where: { studentId } });
      await db.sessionProgress.deleteMany({ where: { studentId } });
      await db.studentMastery.deleteMany({ where: { studentId } });
      if (!/^[a-zA-Z0-9-]+$/.test(studentId)) throw Error("Invalid temporary learner ID");
      const project = process.env.NEON_PROJECT_ID || "square-grass-82468951";
      if (!/^[a-z0-9-]+$/.test(project)) throw Error("Invalid project ID");
      const result = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production --project-id ${project}`,
        ],
        { cwd: resolve(info.project.testDir, "../.."), encoding: "utf8", windowsHide: true },
      );
      expect(result.status).toBe(0);
    }
    await db.$disconnect();
  }
});
