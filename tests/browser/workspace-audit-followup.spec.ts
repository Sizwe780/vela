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

test("real study headers keep sources in menus without duplicate mobile overflow", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const db = database();
  let owner: string | undefined;
  try {
    owner = await trackedLearner(page, db, (id) => {
      owner = id;
    });
    const units = await db.studyUnit.findMany({
      where: { code: { in: ["MAT1503-U1", "MAT1512-U5"] }, module: { institution: "UNISA" } },
      include: { sessions: { orderBy: { position: "asc" }, take: 1 } },
    });
    expect(units).toHaveLength(2);
    await enrollTestLearner(
      page.request,
      db,
      units.map((u) => u.moduleId),
    );
    for (const unit of units) {
      await page.goto(`/study/${unit.code}/sessions/${unit.sessions[0].id}`);
      await expect(page.locator(".session-reader")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sources", exact: true })).toHaveCount(0);
      if (info.project.name === "mobile") {
        await expect(page.locator(".workspace-more-menu")).toBeHidden();
        await page.getByRole("button", { name: "More tools", exact: true }).click();
        await page
          .getByRole("dialog", { name: "Study tools", exact: true })
          .getByRole("button", { name: "Source library", exact: true })
          .click();
        await expect(page.getByRole("dialog", { name: "Study tools", exact: true })).toHaveCount(0);
      } else {
        await page.getByLabel("More study tools", { exact: true }).click();
        await page
          .locator(".workspace-more-menu")
          .getByRole("button", { name: "Source library", exact: true })
          .click();
        await expect(page.locator(".workspace-more-menu")).not.toHaveAttribute("open", "");
      }
      await expect(page.getByRole("dialog", { name: "Source library", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Source library", exact: true })).toHaveCount(
        0,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath(unit.code + "-header.png") });
    }
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});

test("Classroom availability follows enrollment and cohort audience, including general assignments", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(180000);
  page.setDefaultNavigationTimeout(60000);
  const db = database(),
    q = "qa-" + randomUUID(),
    m = "qa-" + randomUUID();
  let owner: string | undefined;
  try {
    owner = await trackedLearner(page, db, (id) => {
      owner = id;
    });
    const available = async () => {
      const r = await page.request.get("/api/profile");
      expect(r.status()).toBe(200);
      return (await r.json()).hasClassroom;
    };
    expect(await available()).toBe(false);
    await db.qualification.create({
      data: {
        id: q,
        institution: "Vela QA",
        code: q,
        stream: "TEST",
        title: "Isolated classroom QA",
        streamTitle: "Test",
        saqaId: "QA",
        nqfExitLevel: 5,
      },
    });
    await db.module.create({
      data: { id: m, institution: "Vela QA", code: m, title: "Isolated QA" },
    });
    await db.qualificationModule.create({
      data: {
        qualificationId: q,
        moduleId: m,
        studyYear: 1,
        position: 1,
        acceptingEnrollments: false,
      },
    });
    const enrollment = await db.enrollment.create({
      data: { studentId: owner, qualificationId: q, moduleId: m },
    });
    const assignment = await db.teachingAssignment.create({
      data: {
        qualificationId: q,
        moduleId: m,
        title: "Synthetic QA only",
        instructions: "Synthetic fixture",
        rubric: [],
        dueAt: new Date(Date.now() + 86400000),
        authorId: owner,
      },
    });
    expect(await available()).toBe(true);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "withdrawn" } });
    expect(await available()).toBe(false);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "active" } });
    const cohort = await db.teachingCohort.create({
      data: { qualificationId: q, name: "Isolated QA" },
    });
    await db.teachingAssignment.update({
      where: { id: assignment.id },
      data: { cohortId: cohort.id },
    });
    expect(await available()).toBe(false);
    await db.teachingCohortMember.create({ data: { cohortId: cohort.id, studentId: owner } });
    expect(await available()).toBe(true);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "withdrawn" } });
    expect(await available()).toBe(false);
  } finally {
    await db.teachingAssignment.deleteMany({ where: { qualificationId: q } });
    await db.teachingCohortMember.deleteMany({ where: { cohort: { qualificationId: q } } });
    await db.teachingCohort.deleteMany({ where: { qualificationId: q } });
    if (owner) await cleanupTestLearner(db, owner);
    await db.qualificationModule.deleteMany({ where: { qualificationId: q } });
    await db.qualification.deleteMany({ where: { id: q } });
    await db.module.deleteMany({ where: { id: m } });
    await db.$disconnect();
  }
});
