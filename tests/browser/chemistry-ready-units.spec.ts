import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { enrollTestLearner } from "./helpers/enrollment";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";

test("all ready CHE1501 units render their chemistry models and notation", async ({ page }) => {
  test.skip(process.env.VELA_CHEMISTRY_STAGING_TEST !== "1", "Requires the chemistry staging app.");
  test.setTimeout(300_000);
  const connection = new URL(process.env.DATABASE_URL!);
  if (!connection.hostname.startsWith("ep-gentle-rice-bdzad4px.")) {
    throw new Error("Chemistry browser verification requires the staging database.");
  }
  connection.searchParams.delete("sslmode");
  connection.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: connection.toString(),
      ssl: { rejectUnauthorized: true },
    }),
  });
  let studentId: string | undefined;
  try {
    const module = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "CHE1501" } },
      select: { id: true },
    });
    studentId = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [module.id]);

    await page.goto("/study/CHE1501-U1/sessions/CHE1501-U1-S2");
    await expect(page.locator(".science-sandbox")).toContainText("one cubic centimetre");
    await expect(page.locator(".katex-error")).toHaveCount(0);

    await page.goto("/study/CHE1501-U2/sessions/CHE1501-U2-S3");
    const orbitals = page.locator(".science-sandbox");
    await orbitals.getByRole("slider").fill("4");
    await expect(orbitals.getByRole("status")).toHaveText("2 unpaired electrons in the subshell.");
    await expect(page.locator(".katex-error")).toHaveCount(0);

    await page.goto("/study/CHE1501-U3/sessions/CHE1501-U3-S3");
    const geometry = page.locator(".science-sandbox");
    await geometry.getByRole("button", {name:"Atom envelopes"}).click();
    await expect(geometry.getByText(/overlapping spheres/i)).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    await page.goto("/study/CHE1501-U4/sessions/CHE1501-U4-S2");
    const precipitate = page.locator(".science-sandbox");
    await precipitate.getByRole("button", {name:"Mix the solutions"}).click();
    await expect(precipitate.getByText("3 Na⁺ and 3 NO₃⁻")).toBeVisible();
    await expect(precipitate.getByText("3 AgCl formula units")).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    await page.goto("/study/CHE1501-U5/sessions/CHE1501-U5-S4");
    await expect(
      page.getByRole("heading", { name: "Identify limiting and excess reagents" }),
    ).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    const limiting = page.locator(".science-sandbox");
    await expect(limiting).toBeVisible();
    await limiting.getByLabel("Available A (mol)").fill("5");
    await limiting.getByRole("button", { name: "Apply reaction" }).click();
    await expect(limiting.getByRole("status")).toContainText("B is limiting");
    await expect(limiting.getByText("A left")).toContainText("3.00 mol");

    await page.goto("/study/CHE1501-U6/sessions/CHE1501-U6-S2");
    await expect(
      page.getByRole("heading", { name: "Prepare and dilute a solution" }),
    ).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    const dilution = page.locator(".science-sandbox");
    await dilution.getByLabel("Final solution volume (L)").fill("2");
    await expect(dilution.getByRole("status")).toContainText("0.050 mol/L");
    await expect(
      dilution.getByRole("img", { name: /fixed amount of dissolved solute/ }),
    ).toBeVisible();

    await page.goto("/study/CHE1501-U7/sessions/CHE1501-U8-S1");
    await expect(
      page.getByRole("heading", { name: "Recognize dynamic equilibrium" }),
    ).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    const equilibrium = page.locator(".science-sandbox");
    await equilibrium.getByLabel("Reaction quotient Q/K").fill("0.5");
    await expect(equilibrium.getByRole("status")).toContainText("forward");
    await expect(equilibrium.getByText("Forward rate")).toBeVisible();

    await page.goto("/study/CHE1501-U8/sessions/CHE1501-U11-S1");
    await expect(
      page.getByRole("heading", { name: "Use absolute temperature and pressure" }),
    ).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    const gases = page.locator(".science-sandbox");
    await gases.getByLabel("Pressure (atm)").fill("2");
    await gases.getByLabel("Temperature (K)").fill("300");
    await expect(gases.getByRole("status")).toContainText("V =");
    await expect(
      gases.getByRole("img", { name: /piston position represents volume/i }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (studentId) await cleanupTestLearner(db, studentId, "che1501-staging");
    await db.$disconnect();
  }
});
