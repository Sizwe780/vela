import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
import { companionCards } from "../../lib/tutor/cards";
import { writeFile } from "node:fs/promises";

test("real lessons and reusable sandboxes preserve mathematics without awarding mastery", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let id: string | undefined;
  try {
    id = await createTestLearner(page);
    const sessions = await Promise.all(
      [
        ["MAT1503", "matrix-transform"],
        ["MAT1512", "integral"],
        ["MAT1512", "limit"],
      ].map(([code, visual]) =>
        db.studySession.findFirstOrThrow({
          where: { visual, studyUnit: { module: { code } } },
          include: { studyUnit: true },
          orderBy: { position: "asc" },
        }),
      ),
    );
    await enrollTestLearner(page.request, db, [
      ...new Set(sessions.map((s) => s.studyUnit.moduleId)),
    ]);
    for (const [i, s] of sessions.entries()) {
      if (process.env.VERIFY_SANDBOX_AI && info.project.name === "desktop" && i < 2) {
        const query =
          i === 0
            ? `Explain the determinant of A=[[1,2],[-1,1]]. Include exactly one supported render_widget type="matrix" frame with matrix [1,2,-1,1] so I can explore it.`
            : `Explain right Riemann sums for f(x)=3x+2 on [0,4]. Include exactly one supported render_widget type="riemann" frame with coefficients [0,3,2] and bounds [0,4].`;
        const response = await page.request.post("/api/tutor", {
          timeout: 120000,
          headers: { origin: new URL(info.project.use.baseURL!).origin },
          data: {
            query,
            studyUnitId: s.studyUnitId,
            sessionId: s.id,
            mode: "academic",
            provider: "cloudflare",
          },
        });
        expect(response.status()).toBe(200);
        const frames = (await response.text())
          .split("\n")
          .filter((l) => l.startsWith("data: {"))
          .map((l) => JSON.parse(l.slice(6)));
        expect(frames.some((f) => f.type === "error")).toBe(false);
        const answer = frames
          .filter((f) => f.type === "text-delta")
          .map((f) => f.delta)
          .join("");
        const widgets = companionCards(answer).widgets;
        const expected = i === 0 ? "matrix" : "riemann";
        await writeFile(`../work/live-${expected}-tutor.md`, answer, "utf8");
        expect(
          widgets.some((w) => w.type === expected),
          answer,
        ).toBe(true);
        const actual = widgets.find((w) => w.type === expected)!;
        expect(actual.data).toMatchObject(
          i === 0 ? { matrix: [1, 2, -1, 1] } : { coefficients: [0, 3, 2], bounds: [0, 4] },
        );
      }
      await page.goto(`/study/${s.studyUnit.code}/sessions/${s.id}`);
      const figure = page.locator(".reader-scroll .concept-sandbox").first();
      await expect(figure).toBeVisible({ timeout: 45000 });
      const canvas = figure.locator("canvas");
      await expect(canvas).toBeVisible();
      expect(
        await canvas.evaluate((el: HTMLCanvasElement) => {
          const pixels = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
          return pixels.some((v, j) => j % 4 === 3 && v > 0);
        }),
      ).toBe(true);
      if (i === 0) {
        await expect(figure.locator("output")).toContainText("Signed determinant: 3");
        await figure.getByRole("button", { name: "Collapse to a line", exact: true }).click();
        await expect(figure).toContainText("collapses to a line");
        await expect(figure.getByLabel("Apply inverse of A")).toBeDisabled();
        await figure.getByRole("button", { name: "Zero matrix", exact: true }).click();
        await expect(figure).toContainText("whole plane collapses to the origin");
        await expect(figure.getByLabel("Eigenvector interpretation")).toContainText(
          "Every nonzero direction",
        );
        await figure.getByRole("button", { name: "Quarter turn", exact: true }).click();
        await figure.getByLabel("Transformation progress", { exact: true }).fill("0.5");
        await expect(figure.locator("output")).toContainText("area scaling: 1");
        await expect(figure.getByLabel("Eigenvector interpretation")).toContainText(
          "No real eigendirections",
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(
          figure.getByRole("button", { name: "Animate transformation", exact: true }),
        ).toBeDisabled();
        await figure.getByLabel("Transformation progress", { exact: true }).fill("1");
        await expect(figure.locator("output")).toContainText("area scaling: 1");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await figure.getByRole("button", { name: "Animate transformation", exact: true }).click();
        await expect(
          figure.getByRole("button", { name: "Pause transformation", exact: true }),
        ).toBeVisible();
        await figure.getByRole("button", { name: "Pause transformation", exact: true }).click();
        const frozen = await figure
          .getByLabel("Transformation progress", { exact: true })
          .inputValue();
        await page.waitForTimeout(150);
        expect(
          await figure.getByLabel("Transformation progress", { exact: true }).inputValue(),
        ).toBe(frozen);
      } else if (i === 1) {
        await expect(figure.getByTestId("riemann-exact")).toHaveCount(0);
        await expect(figure.getByTestId("riemann-estimate")).toHaveText("35");
        await figure.getByLabel("Number of rectangles", { exact: true }).fill("512");
        await expect(figure.getByTestId("riemann-estimate")).toHaveText("32.046875");
        await figure
          .getByRole("button", { name: "Reveal exact integral and error", exact: true })
          .click();
        await expect(figure.getByTestId("riemann-exact")).toHaveText("32");
        await figure.getByRole("button", { name: "Signed cancellation", exact: true }).click();
        await expect(figure.getByTestId("riemann-exact")).toHaveCount(0);
        await figure.getByLabel("Sampling rule", { exact: true }).selectOption("midpoint");
        await expect(figure.getByTestId("riemann-estimate")).toHaveText("0");
        await figure
          .getByRole("button", { name: "Reveal exact integral and error", exact: true })
          .click();
        await expect(figure.getByTestId("riemann-exact")).toHaveText("0");
        await expect(figure.locator(".sandbox-reference")).toContainText("Geometric area: 1");
      } else {
        await expect(figure).toContainText("Both sides approach 26");
        await expect(figure.getByTestId("limit-point-readout")).toContainText("undefined");
        await figure.getByLabel("Approach precision", { exact: true }).fill("6");
        await figure.getByLabel("Limit zoom", { exact: true }).fill("5");
        await expect(figure.locator("output")).toContainText("25.999999");
        await figure.getByLabel("Define a new value at the missing point").check();
        await figure.getByLabel("Assigned point value", { exact: true }).fill("40");
        await expect(figure.getByTestId("limit-point-readout")).toContainText("40");
        await expect(figure).toContainText("Both sides approach 26");
        await figure.getByRole("button", { name: "Jump comparison", exact: true }).click();
        await expect(figure).toContainText("no two-sided limit");
      }
      expect(await page.locator(".katex-error").count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await figure.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `../work/sandbox-${i}-${info.project.name}.png` });
    }
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Tutor tools", exact: true });
    await drawer.getByRole("button", { name: "Visual sandboxes", exact: true }).click();
    await expect(
      drawer.getByRole("button", { name: "Matrix transformations", exact: true }),
    ).toHaveCount(0);
    await drawer.getByRole("button", { name: "Riemann sums", exact: true }).click();
    await expect(drawer.getByLabel("Number of rectangles", { exact: true })).toBeVisible();
    await drawer.getByRole("button", { name: "Close tutor tools", exact: true }).click();
    await page.goto("/practice/visuals");
    await expect(
      page.getByRole("heading", { name: "Visual sandboxes", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect(page.getByLabel("Matrix entry a", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `../work/sandbox-gallery-dark-${info.project.name}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await db.studentMastery.count({ where: { studentId: id } })).toBe(0);
    expect(await db.sessionProgress.count({ where: { studentId: id } })).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});

test("typed streaming frames execute the exact matrix and calculus models inside chat", async ({
  page,
}, info) => {
  await page.goto("/study/demo");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  const answer = `## Core Answer\nIndependent examples for exploration.\n<widget type="matrix" data='{"matrix":[2,0,0,1]}' />\n\`\`\`widget\n{"type":"riemann","data":{"coefficients":[1,0,0],"bounds":[0,2]}}\n\`\`\`\n<render_widget type="limitzoom" data='{"coefficients":[0,2,1],"center":3}' />`;
  const events = [
    { type: "start", messageId: "sandbox-chat" },
    { type: "text-start", id: "text" },
    { type: "text-delta", id: "text", delta: answer },
    { type: "text-end", id: "text" },
    { type: "finish" },
  ];
  await page.route("**/api/tutor", (route) =>
    route.fulfill({
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n",
    }),
  );
  await page
    .getByLabel("Ask your learning companion")
    .fill("Explore these three independent examples");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const widgets = page.locator(".widget-card .concept-sandbox");
  await expect(widgets).toHaveCount(2);
  await expect(
    page.locator(".widget-card").getByLabel("Matrix entry a", { exact: true }),
  ).toHaveCount(0);
  await expect(widgets.nth(0).getByTestId("riemann-estimate")).toHaveText("3.1875");
  await expect(widgets.nth(1)).toContainText("Both sides approach 7");
  await widgets.nth(1).getByLabel("Approach precision", { exact: true }).fill("6");
  await expect(widgets.nth(1).locator("output")).toContainText("6.999998");
  expect(await page.locator(".katex-error").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
