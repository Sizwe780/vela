import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
import { parseLearningBlocks } from "../../lib/content/exercises";
import { practiceCheck } from "../../lib/content/practice-checks";

test("published practices offer feedback across science, mathematics and education", async ({
  page,
}, info) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let owner: string | undefined;
  const live = process.env.VELA_LIVE_PRACTICE === "1";
  try {
    owner = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: {
        institution: "UNISA",
        code: {
          in: [
            "MAT1503",
            "MAT1512",
            "CHE1501",
            "BPT1501",
            "TPS2601",
            "PHY1503",
            "PHY1505",
            "PHY1506",
          ],
        },
      },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    for (const code of [
      "MAT1503",
      "MAT1512",
      "CHE1501",
      "BPT1501",
      "TPS2601",
      "PHY1505",
      "PHY1503",
    ]) {
      const sessions = await db.studySession.findMany({
        where: {
          studyUnit: {
            module: { institution: "UNISA", code },
            code: code === "BPT1501" ? "BPT1501-U2" : `${code}-U1`,
          },
        },
        include: { studyUnit: true },
        orderBy: { position: "asc" },
        take: 80,
      });
      const selected = sessions
        .flatMap((session) =>
          parseLearningBlocks(session.markdown).blocks.flatMap((exercise) =>
            exercise.type === "exercise" && !practiceCheck(exercise.question)
              ? [{ session, exercise }]
              : [],
          ),
        )
        .find((x) => x.exercise.answer.length < 6000);
      expect(selected, `${code} has a published written practice`).toBeTruthy();
      const { session, exercise } = selected!;
      await page.goto(`/study/${session.studyUnit.code}/sessions/${session.id}`);
      const card = page
        .locator(".try-example")
        .filter({ has: page.getByRole("heading", { name: exercise.title, exact: true }) })
        .first();
      const input = card.getByRole("textbox", { name: /Your answer or working/ });
      await expect(
        card.getByRole("button", { name: "Check my attempt", exact: true }),
      ).toBeEnabled();
      await input.fill("A synthetic independent attempt.");
      if (!live)
        await page.route("**/api/practice/check", (route) =>
          route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              ownerId: owner,
              verdict: "partial",
              feedback: "Explain the reason for your chosen operation.",
              nextStep: "State the principle before the calculation.",
              method: "ai",
              masteryUpdated: false,
            }),
          }),
        );
      if (live) await input.fill(exercise.answer);
      const response = page.waitForResponse(
        (r) => r.url().endsWith("/api/practice/check") && r.request().method() === "POST",
        { timeout: 85000 },
      );
      await card.getByRole("button", { name: "Check my attempt", exact: true }).click();
      const result = await response;
      expect(result.status(), code).toBe(200);
      const body = await result.json();
      expect(body.masteryUpdated).toBe(false);
      await expect(card.locator(".practice-review-feedback")).toBeVisible();
      await expect(card.locator(".practice-status")).toContainText("AI review");
      await expect(card.locator(".worked-answer")).toHaveCount(0);
      if (live) {
        const origin = new URL(page.url()).origin;
        const submitted = result.request().postDataJSON();
        if (code === "MAT1503") {
          const wrong = await page.request.post("/api/practice/check", {
            headers: { origin },
            data: {
              ...submitted,
              attempt:
                "Bananas determine every mathematical result. I did not calculate or explain anything.",
            },
          });
          expect(wrong.status()).toBe(200);
          expect((await wrong.json()).verdict).not.toBe("correct");
        }
        expect(
          (
            await page.request.post("/api/practice/check", {
              headers: { origin },
              data: { ...submitted, ownerId: "foreign-account" },
            })
          ).status(),
        ).toBe(409);
        expect(
          (
            await page.request.post("/api/practice/check", {
              headers: { origin },
              data: { ...submitted, question: "An invented exercise" },
            })
          ).status(),
        ).toBe(409);
      }
      console.log("Practice review estimate", code, body.verdict);
      await input.fill("A revised attempt");
      await expect(card.locator(".practice-review-feedback")).toHaveCount(0);
      await expect(card.locator(".practice-status")).toHaveText("Tried");
      if (!live) await page.unroute("**/api/practice/check");
      console.log(
        "Published practice feedback verified",
        code,
        info.project.name,
        live ? "live AI transport; reference submission" : "mock feedback transport",
      );
      if (code === "CHE1501" || code === "BPT1501")
        await page.screenshot({ path: info.outputPath(`${code}-practice.png`) });
    }
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});
