import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("BPT1501 starts at professional practice and renders inline framework and figure", async ({
  page,
}, info) => {
  test.skip(process.env.VELA_BPT_STAGING_TEST !== "1", "Requires disposable staging accounts.");
  test.setTimeout(180_000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech")
    throw new Error("Expected dedicated staging.");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    const module = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "BPT1501" } },
      select: { id: true },
    });
    learner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [module.id]);
    await page.goto("/modules/" + module.id);
    const links = page.locator(".curriculum-units .unit-card");
    await expect(links).toHaveCount(5);
    await expect(links.first()).toContainText("The teacher as a professional");
    await page.goto("/study/BPT1501-U1/sessions");
    await expect(
      page.getByRole("heading", { name: "We couldn’t find that study unit." }),
    ).toBeVisible();
    expect((await page.request.get("/api/sessions?unit=BPT1501-U1")).status()).toBe(404);

    await page.goto("/study/BPT1501-U2/sessions/BPT1501-U2-S1");
    const roles = page.getByRole("region", { name: "Seven roles in a school" });
    await expect(roles).toBeVisible();
    await roles.getByRole("button", { name: "Assessor", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(roles.getByText("Ask each learner to justify", { exact: false })).toBeVisible();
    await expect(roles.getByRole("button", { name: "Assessor", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const u2 = await db.studyUnit.findUniqueOrThrow({
      where: { moduleId_code: { moduleId: module.id, code: "BPT1501-U2" } },
      select: { id: true },
    });
    const recall = await page.request.post("/api/recall", {
      headers: { origin: new URL(page.url()).origin },
      data: { action: "queue", studyUnitId: u2.id, includeFuture: true },
    });
    expect(recall.ok()).toBe(true);

    await page.goto("/study/BPT1501-U4/sessions/BPT1501-U4-S1");
    const classroom = page.getByRole("img", { name: /An empty classroom at Zwelemfundo/ });
    await classroom.scrollIntoViewIfNeeded();
    await expect
      .poll(() => classroom.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(
      page.getByRole("link", { name: /Public domain.*DVIDS usage terms/ }),
    ).toBeVisible();
    await expect(page.getByText(/does not imply or constitute DoW endorsement/)).toBeVisible();
    const diagram = page.getByRole("img", { name: /Two room plans/ });
    await expect(diagram).toBeVisible();
    const imagePath = await diagram.getAttribute("src");
    expect(imagePath).toBe("/lesson-figures/classroom-discussion.svg");
    expect((await page.request.get(imagePath!)).ok()).toBe(true);
    await expect(page.getByText("Original Vela schematic", { exact: false })).toBeVisible();
    const exercise = page.locator(".try-example").first();
    await expect(exercise.locator(".worked-answer")).toHaveCount(0);
    await exercise.getByRole("button", { name: "Show answer" }).click();
    await expect(exercise.locator(".worked-answer")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    await page.goto("/study/BPT1501-U6/sessions/BPT1501-U6-S1");
    const portfolio = page.getByRole("img", { name: /Anonymised portfolio excerpt PORT06/ });
    await expect(portfolio).toBeVisible();
    await expect
      .poll(() =>
        portfolio
          .evaluate((node) => {
            node.scrollIntoView({ block: "center" });
            return (node as HTMLImageElement).naturalWidth;
          })
          .catch(() => 0),
      )
      .toBeGreaterThan(0);
    await expect(page.getByRole("link", { name: /published PORT06 excerpt/ })).toHaveAttribute(
      "href",
      "https://doi.org/10.1590/S1980-6574201600030009",
    );
    await expect(page.getByRole("link", { name: "CC BY 4.0" })).toBeVisible();
    const evidence = page
      .locator(".try-example")
      .filter({ hasText: "Choose the next piece of evidence" });
    await expect(evidence.locator(".worked-answer")).toHaveCount(0);
    await evidence.getByRole("button", { name: "Show answer" }).click();
    await expect(evidence.locator(".worked-answer")).toContainText(/Keep the record anonymised/);
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
