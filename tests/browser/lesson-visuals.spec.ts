import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { enrollTestLearner } from "./helpers/enrollment";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";

test("staged chemistry, linear algebra and calculus let learners use models inside lessons", async ({
  page,
}, testInfo) => {
  test.skip(process.env.VELA_BPT_STAGING_TEST !== "1", "Requires disposable staging accounts.");
  test.setTimeout(180_000);
  if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech") {
    throw new Error("Expected dedicated staging.");
  }
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    const settings = [
      { unit: "CHE1501-U3", title: "Distinguish ionic and covalent bonding" },
      { unit: "MAT1512-U5", title: "Net change is not total travel" },
      { unit: "CHE1501-U3", title: "Connect orbital overlap to bond properties" },
      { unit: "MAT1503-U5", title: "Invert with an augmented identity" },
      { unit: "MAT1503-U11", title: "A route is not its net displacement" },
      { unit: "CHE1501-U2", title: "Explain periodic trends and their exceptions" },
    ];
    const [chemistry, calculus, orbitals, inverse, route, periodic] = await Promise.all(
      settings.map(({ unit, title }) =>
        db.studySession.findFirstOrThrow({
          where: { title, studyUnit: { code: unit, module: { institution: "UNISA" } } },
          select: { id: true, studyUnit: { select: { code: true, moduleId: true } } },
        }),
      ),
    );
    learner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [
      chemistry.studyUnit.moduleId,
      calculus.studyUnit.moduleId,
      inverse.studyUnit.moduleId,
    ]);

    await page.goto(`/study/${chemistry.studyUnit.code}/sessions/${chemistry.id}`);
    const bonding = page.getByRole("figure", { name: "Ionic lattice and molecular structure" });
    await expect(bonding.getByText(/1:1 ion ratio/)).toBeVisible();
    await bonding.getByRole("button", { name: "Hydrogen chloride gas" }).click();
    await expect(bonding.getByText(/separate molecules in the gas/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    await page.goto(`/study/${calculus.studyUnit.code}/sessions/${calculus.id}`);
    const rectangles = page.getByRole("slider", { name: "Number of rectangles" });
    await expect(rectangles).toBeVisible();
    const previous = await rectangles.inputValue();
    await rectangles.press("ArrowRight");
    expect(await rectangles.inputValue()).not.toBe(previous);
    await expect(
      page.getByRole("img", { name: "Polynomial curve with signed Riemann rectangles" }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    await page.goto(`/study/${orbitals.studyUnit.code}/sessions/${orbitals.id}`);
    const overlap = page.getByRole("figure", { name: "Explore orbital overlap" });
    const sideBySide = overlap.getByRole("button", { name: /Side-by-side/ });
    await sideBySide.press("Enter");
    await expect(sideBySide).toHaveAttribute("aria-pressed", "true");
    await expect(overlap.getByRole("img", { name: /node on the bond axis/ })).toBeVisible();

    await page.goto(`/study/${periodic.studyUnit.code}/sessions/${periodic.id}`);
    const trends = page.getByRole("figure", { name: "Compare a trend and its exceptions" });
    await trends.getByRole("button", { name: "N → O" }).click();
    await expect(trends.getByRole("table")).toContainText("1314 kJ/mol");
    await expect(trends.locator("meter")).toHaveCount(2);

    await page.goto(`/study/${inverse.studyUnit.code}/sessions/${inverse.id}`);
    const ledger = page.getByRole("figure", { name: "Carry the same moves across the divider" });
    await ledger.getByRole("button", { name: "R₁ ← R₁ − 2R₂" }).press("Enter");
    await expect(ledger.getByRole("table")).toContainText("3, −2");
    const exercise = page.locator(".try-example").first();
    await expect(exercise.locator(".worked-answer")).toHaveCount(0);
    await exercise.getByRole("button", { name: "Show answer" }).click();
    await expect(exercise.locator(".worked-answer")).toBeVisible();

    await page.goto(`/study/${route.studyUnit.code}/sessions/${route.id}`);
    const routeVisual = page.getByRole("figure", {
      name: "Compare a route, a displacement and its direction",
    });
    await routeVisual.getByRole("button", { name: "Use the direct segment" }).click();
    await expect(
      routeVisual.getByRole("img", { name: "Use the direct segment coordinate sketch" }),
    ).toBeVisible();
    await expect(routeVisual.getByRole("table")).toContainText("(3, 4)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
