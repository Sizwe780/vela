import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("production serves the promoted lessons and their grounded tutor", async ({ page }) => {
  test.skip(
    process.env.VELA_PRODUCTION_RELEASE_TEST !== "1",
    "Explicit production release verification only.",
  );
  test.setTimeout(420000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(45000);
  expect(new URL(process.env.PLAYWRIGHT_BASE_URL!).hostname).toBe("velastudy.app");
  const connection = new URL(process.env.DATABASE_URL!);
  expect(connection.hostname).not.toContain("ep-gentle-rice");
  connection.searchParams.delete("sslmode");
  connection.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: connection.toString(),
      ssl: { rejectUnauthorized: true },
    }),
  });
  let learner: string | undefined;
  try {
    for (const asset of ["/vela-tab-v2.svg", "/vela-logo-v2.png", "/deployment-version.json"]) {
      expect((await page.request.get(asset)).status()).toBe(200);
    }
    console.log("Production signup starting");
    learner = await createTestLearner(page);
    console.log("Production disposable learner signed in");
    const modules = await db.module.findMany({
      where: {
        institution: "UNISA",
        code: {
          in: [
            "MAT1503",
            "MAT1512",
            "CHE1501",
            "BPT1501",
            "PHY1503",
            "PHY1505",
            "PHY1506",
            "TPS2601",
          ],
        },
      },
      select: { id: true },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map(({ id }) => id),
    );
    console.log("Production enrollment verified");
    for (const [unit, session, text] of process.env.VELA_PRODUCTION_TUTOR_ONLY === "1"
      ? []
      : [
          ["PHY1505-U7", "PHY1505-U7-S10", "Practise multi-stage mechanics under exam conditions"],
          ["CHE1501-U3", "CHE1501-U3-S1", ""],
          ["MAT1503-U1", "MAT1503-U1-S1", ""],
          ["MAT1512-U1", "MAT1512-U1-S1", ""],
          ["BPT1501-U2", "BPT1501-U2-S1", ""],
          ["TPS2601-U4", "TPS2601-U4-S1", "Assess learner reasoning and plan feedback"],
          ["PHY1503-U3", "PHY1503-U3-S1", ""],
        ]) {
      const stored = await db.studySession.findFirstOrThrow({
        where: {
          studyUnit: { code: unit, module: { institution: "UNISA" } },
          ...(unit === "MAT1503-U1" ? { position: 1 } : { id: session }),
        },
      });
      await page.goto(`/study/${unit}/sessions/${stored.id}`);
      if (text) await expect(page.locator(".session-heading h2")).toHaveText(text);
      const example = page.locator(".try-example").first();
      await expect(example).toBeVisible();
      await expect(example.locator(".worked-answer")).toHaveCount(0);
      await expect(page.locator(".lesson-pacing")).toBeVisible();
      await expect(async () => {
        const reveal = example.getByRole("button", { name: "Show answer", exact: true });
        if (await reveal.isVisible()) await reveal.click();
        await expect(example.locator(".worked-answer")).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 30000 });
      await expect(page.locator(".katex-error")).toHaveCount(0);
      console.log("Production lesson verified", unit, session);
    }
    if (process.env.VELA_PRODUCTION_LESSONS_ONLY === "1") return;
    const unit = await db.studyUnit.findFirstOrThrow({
      where: { code: "PHY1505-U6", module: { institution: "UNISA", code: "PHY1505" } },
    });
    const providers = process.env.VELA_TEST_TUTOR_PROVIDERS?.split(",") ?? [
      "cloudflare",
      "groq",
      "gemini",
      "openrouter",
    ];
    for (const provider of providers) {
      const response = await page.request.post("/api/tutor", {
        headers: { origin: "https://velastudy.app" },
        timeout: 70000,
        data: {
          provider,
          live: true,
          mode: "academic",
          studyUnitId: unit.id,
          sessionId: "PHY1505-U6-S2",
          query:
            "Give the two numerical moments of inertia for the 2.4 kg rod of length 1.5 m in this session. Put both numbers first, with units, and cite the lesson.",
        },
      });
      console.log("Production tutor HTTP", provider, response.status());
      expect.soft(response.status(), provider).toBe(200);
      if (response.status() !== 200) continue;
      const frames = (await response.text())
        .split("\n")
        .filter((line) => line.startsWith("data: {"))
        .map((line) => JSON.parse(line.slice(6)));
      expect
        .soft(
          frames.some((frame) => frame.type === "error"),
          provider,
        )
        .toBe(false);
      const sources = frames.find((frame) => frame.type === "data-citations")?.data.sources;
      expect.soft(sources?.length, provider).toBeGreaterThan(0);
      for (const citation of sources ?? [])
        expect.soft(citation.sourceUrl).toBe("/study/PHY1505-U6/sessions/PHY1505-U6-S2");
      const answer = frames
        .filter((frame) => frame.type === "text-delta")
        .map((frame) => frame.delta)
        .join("");
      expect.soft(answer, provider).toMatch(/0\.45/);
      expect.soft(answer, provider).toMatch(/1\.8/);
      console.log("Production tutor result", provider, sources.length, "active-session citations");
    }
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "production");
    await db.$disconnect();
  }
});
