import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { enrollTestLearner } from "./helpers/enrollment";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";

test("published lessons render scoped, interactive visuals and respect the answer gate", async ({
  page,
}, info) => {
  test.skip(process.env.VELA_BPT_STAGING_TEST !== "1", "Requires disposable staging accounts.");
  test.setTimeout(180_000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech")
    throw Error("Expected dedicated staging.");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    const locations = [
      ["BPT1501-U6", "Synthesize practice through reflective evidence"],
      ["BPT1501-U4"],
      ["CHE1501-U7", "Recognize dynamic equilibrium"],
      ["CHE1501-U8", "Use absolute temperature and pressure"],
      ["MAT1503-U12", "Shortest distance follows the normal"],
      ["MAT1512-U2", "When a tangent fails to exist"],
    ];
    const lessons = await Promise.all(
      locations.map(([code, title]) =>
        db.studySession.findFirstOrThrow({
          where: { title, studyUnit: { code, module: { institution: "UNISA" } } },
          orderBy: { position: "asc" },
          select: { id: true, studyUnit: { select: { code: true, moduleId: true } } },
        }),
      ),
    );
    learner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [
      ...new Set(lessons.map(({ studyUnit }) => studyUnit.moduleId)),
    ]);
    const open = async (index: number) => {
      const { id, studyUnit } = lessons[index];
      await page.goto(`/study/${studyUnit.code}/sessions/${id}`);
    };

    await open(0);
    const reflection = page.getByRole("region", { name: "Gibbs’ reflective cycle" });
    await expect(reflection.getByRole("img", { name: /6 stages/ })).toBeVisible();
    await reflection.getByRole("button", { name: "Plan the next action" }).press("Enter");
    await expect(reflection.getByRole("status")).toHaveText(/specifies the change/);
    const answer = page.locator(".try-example").filter({ hasText: "Identify the weak claim" });
    await expect(answer.getByRole("img")).toHaveCount(0);
    await answer.getByRole("button", { name: "Show answer" }).click();
    await expect(answer.getByRole("img", { name: /Example lesson evidence sheet/ })).toBeVisible();

    await open(1);
    const classroom = page.getByRole("img", { name: /An empty classroom/ });
    await expect(classroom).toBeVisible();
    await expect(classroom).toHaveAttribute("srcset", /zwelemfundo-classroom-small.webp 500w/);
    await expect(
      page.getByRole("link", { name: /Public domain.*DVIDS usage terms/ }),
    ).toBeVisible();

    await open(2);
    const equilibrium = page.locator(".chemistry-bench");
    await equilibrium.getByLabel("Temperature comparison").selectOption("1");
    await expect(equilibrium.getByRole("status")).toContainText("Net reverse");

    await open(3);
    const piston = page.locator(".chemistry-bench");
    await piston.getByRole("slider", { name: /Amount/ }).fill("1.5");
    await expect(piston.getByRole("status")).toContainText("36.93 L");

    await open(4);
    const plane = page.getByRole("figure", { name: "Rotate a plane and its normal" });
    await plane.getByRole("slider", { name: "Normal parameter t" }).fill("0");
    await expect(plane.getByRole("status")).toContainText("distance = 0.00");

    await open(5);
    const curve = page.getByRole("figure", { name: "Compare slopes on either side of a corner" });
    const graphInput = curve.getByRole("slider", { name: "Graph input" });
    await expect(graphInput).toBeEnabled();
    await graphInput.press("ArrowLeft");
    await expect(curve.locator("output")).toContainText("Slope -1.000");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
