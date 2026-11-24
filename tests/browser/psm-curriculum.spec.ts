import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";
import { currentStudyPeriod } from "../../lib/curriculum/psm-enrollment";
import { psmCompulsory } from "../../lib/curriculum/psm-first-level";

test("PSM onboarding saves modules awaiting content and enforces UNISA planning rules", async ({
  page,
}, info) => {
  test.skip(process.env.VELA_PSM_STAGING_TEST !== "1", "Requires the staging app and auth branch.");
  test.setTimeout(180_000);
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech")
    throw new Error("Expected the dedicated staging database.");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    learner = await createTestLearner(page);
    const qualifications = page.getByRole("combobox", { name: "Qualification", exact: true });
    const psm = await db.qualification.findUniqueOrThrow({
      where: { institution_code_stream: { institution: "UNISA", code: "90104", stream: "PSM" } },
      select: { id: true, modules: { select: { module: { select: { id: true, code: true } } } } },
    });
    await qualifications.selectOption(psm.id);
    const compulsory = page.getByRole("group", { name: "Group A · Compulsory modules" });
    const languages = page.getByRole("group", { name: "Group B · Choose one language" });
    await expect(compulsory.getByRole("checkbox")).toHaveCount(10);
    await expect(languages.getByRole("radio")).toHaveCount(12);
    await expect(page.getByRole("checkbox", { name: /^PHY1501/ })).toHaveCount(0);
    const mechanics = compulsory.getByRole("checkbox", {
      name: /^PHY1505 .*Content in preparation/,
    });
    const practical = compulsory.getByRole("checkbox", { name: /^PHY1503 / });
    await expect(mechanics).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    const moduleId = (code: string) =>
      psm.modules.find((link) => link.module.code === code)!.module.id;
    const { year } = currentStudyPeriod();
    const request = (codes: string[], planYear = year, languageConfirmed = true) =>
      page.request.post("/api/enrollments", {
        headers: { origin: new URL(page.url()).origin },
        data: {
          action: "enroll",
          qualificationId: psm.id,
          moduleIds: codes.map(moduleId),
          year: planYear,
          semester: 1,
          languageConfirmed,
        },
      });
    if (info.project.name === "desktop") {
      for (const [codes, expected, confirmed] of [
        [["PHY1503"], /PHY1505 and PHY1506/, true],
        [["AFK1505", "ZUL1507"], /only one Group B/, true],
        [["ZUL1507"], /Confirm/, false],
        [[...psmCompulsory.map(({ code }) => code), "ZUL1507"], /120 credits/, true],
      ] as const) {
        const response = await request([...codes], year, confirmed);
        expect(response.status()).toBe(409);
        expect((await response.json()).error.message).toMatch(expected);
      }
    }

    await practical.check();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      /PHY1503 requires PHY1505 and PHY1506/,
    );
    await mechanics.check();
    await compulsory.getByRole("checkbox", { name: /^PHY1506 / }).check();
    const language = languages.getByRole("radio", { name: /^ZUL1507 / });
    await language.check();
    await expect(page.getByRole("button", { name: /Save modules/ })).toBeDisabled();
    await languages.getByRole("checkbox", { name: /My choice differs/ }).check();
    await page.getByRole("button", { name: /Save modules/ }).click();
    await expect(page).toHaveURL(/\/$/);
    const enrolled = await db.enrollment.findMany({
      where: { studentId: learner, qualificationId: psm.id, status: "active" },
    });
    expect(enrolled).toHaveLength(4);
    expect(enrolled.every((row) => row.studyPlanYear === year)).toBe(true);
    const storedMechanics = enrolled.find((row) => row.moduleId === moduleId("PHY1505"))!;
    const secondLanguage = await request(["AFK1505"], year + 1);
    expect(secondLanguage.status()).toBe(409);
    const withdrawal = await page.request.post("/api/enrollments", {
      headers: { origin: new URL(page.url()).origin },
      data: { action: "withdraw", enrollmentId: storedMechanics.id },
    });
    expect(withdrawal.status()).toBe(409);
    expect((await withdrawal.json()).error.message).toMatch(/PHY1503/);

    await page.goto("/modules/" + storedMechanics.moduleId);
    await expect(page.getByRole("heading", { name: "Mechanics", exact: true })).toBeVisible();
    await expect(page.getByText("Study units for this module are being prepared.")).toBeVisible();
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
