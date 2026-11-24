import "dotenv/config";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { enrollTestLearner } from "./helpers/enrollment";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";

test("staged chemistry units render formulas, reveal answers and run original simulations", async ({
  page,
}, info) => {
  test.skip(
    process.env.VELA_CHEMISTRY_STAGING_TEST !== "1" ||
      process.env.PLAYWRIGHT_BASE_URL !== "http://localhost:3200",
    "Requires the chemistry staging app.",
  );
  test.setTimeout(1_200_000);
  const unit4Only = process.env.VELA_CHEMISTRY_UNIT4_ONLY === "1";
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
      include: {
        studyUnits: {
          where: { code: { in: ["CHE1501-U1", "CHE1501-U2", "CHE1501-U3", "CHE1501-U4"] } },
          include: { _count: { select: { sessions: true } } },
          orderBy: { position: "asc" },
        },
      },
    });
    expect(module.studyUnits).toHaveLength(4);
    studentId = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [module.id]);
    await page.goto(`/modules/${module.id}`);
    const foundations = page.getByRole("heading", { name: "Chemical foundations" });
    await expect(async () => {
      await page.reload();
      await expect(foundations).toBeVisible({ timeout: 2_000 });
      await expect(
        page.getByRole("heading", { name: "Chemical bonding", exact: true }),
      ).toBeVisible({ timeout: 2_000 });
      await expect(
        page.getByRole("heading", { name: "Reaction classes", exact: true }),
      ).toBeVisible({ timeout: 2_000 });
      await expect(page.getByRole("heading", { name: "Stoichiometry", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Solutions and concentrations", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Chemical equilibrium", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Gases", exact: true })).toBeVisible();
    }).toPass({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Quantum mechanics and periodicity" }),
    ).toBeVisible();

    if (!unit4Only) {
      await page.goto(`/study/${module.studyUnits[0].id}/sessions/CHE1501-U1-S2`);
      const renderedMath = page.locator(".katex-mathml annotation");
      await expect(renderedMath.filter({ hasText: /^\\rho=m\/V$/ })).toBeAttached();
      await expect(renderedMath.filter({ hasText: /^3\.20\\times10\^2$/ })).toBeAttached();
      await expect(
        renderedMath.filter({ hasText: /\\mathrm\{kg\\,m\^\{-3\}\}/ }).first(),
      ).toBeAttached();
      const density = page.locator(".session-visual");
      await expect(density.locator("output")).toContainText("2.00 g/cm³");
      const volume = density.getByRole("slider", { name: /Volume/ });
      await volume.press("ArrowRight");
      await expect(density.locator("output")).toContainText("1.60 g/cm³");
      await volume.fill("40");
      await expect(density.locator("output")).toContainText("1.00 g/cm³");
      await page.goto("/study/CHE1501-U1/sessions/CHE1501-U1-S3");
      const atomicMass = page.locator(".try-example").filter({ hasText: "Average two masses" });
      await expect(
        atomicMass.locator(".katex-mathml mi[mathvariant=normal]", { hasText: /^u$/ }),
      ).toHaveCount(2);
      await atomicMass.getByRole("button", { name: "Show answer", exact: true }).click();
      await expect(
        atomicMass.locator(".worked-answer .katex-mathml mi[mathvariant=normal]", {
          hasText: /^u$/,
        }),
      ).toHaveCount(1);
      await expect(
        page
          .locator(".katex-mathml annotation")
          .filter({ hasText: /\\ce\{/ })
          .first(),
      ).toBeAttached();

      await page.goto("/study/CHE1501-U2/sessions/CHE1501-U2-S1");
      const photon = page.locator(".session-visual");
      await expect(photon.locator("output")).toContainText(
        "Absorption · Atom ΔE = +2 eV · Photon ≈ 620 nm",
      );
      await photon.getByLabel("Initial level").selectOption("2");
      await expect(photon.locator("output")).toContainText("No transition or photon");
      await photon.getByLabel("Final level").selectOption("0");
      await expect(photon.locator("output")).toContainText(
        "Emission · Atom ΔE = -2 eV · Photon ≈ 620 nm",
      );
      await expect(renderedMath.filter({ hasText: /10\^\{-19\}.+\\mathrm\{J\}/ })).toBeAttached();

      await page.goto("/study/CHE1501-U3/sessions/CHE1501-U3-S3");
      const model = page.locator(".science-sandbox");
      await expect(model.locator("output")).toContainText("Bent · 104.5°");
      await model.getByRole("checkbox", { name: "Show bond dipoles" }).check();
      await expect(model.locator("output")).toContainText("towards the oxygen end");
      await model.getByLabel("Molecule").selectOption("carbonDioxide");
      await model.getByRole("slider", { name: /Rotation/ }).press("ArrowRight");
      await expect(model.locator("output")).toContainText("Linear · 180°");
      await expect(model.locator("output")).toContainText("cancel");
    }
    await page.goto("/study/CHE1501-U4/sessions/CHE1501-U4-S3");
    const balancing = page.locator(".science-sandbox");
    await expect(balancing.locator("output")).toContainText("Left: 2 H, 2 O; right: 2 H, 1 O");
    await balancing.getByLabel("First coefficient").fill("2");
    await balancing.getByLabel("Second coefficient").fill("1");
    await balancing.getByLabel("Product coefficient").fill("2");
    await expect(balancing.getByText("Balanced: the coefficients are in the smallest whole-number ratio.")).toBeVisible();
    await balancing.getByLabel("First coefficient").fill("4");
    await balancing.getByLabel("Second coefficient").fill("2");
    await balancing.getByLabel("Product coefficient").fill("4");
    await expect(balancing.getByText(/Reduce the coefficients to the smallest whole-number ratio/)).toBeVisible();
    await page.goto("/study/CHE1501-U4/sessions/CHE1501-U4-S4");
    const redox = page.locator(".science-sandbox");
    await expect(redox.getByLabel("Redox example")).toHaveValue("zinc");
    await redox.getByLabel("Species oxidized").selectOption("Zn");
    await redox.getByLabel("Electrons transferred").selectOption("2");
    await expect(redox.locator("output")).toContainText("Correct.");
    await page.goto("/study/CHE1501-U5/sessions/CHE1501-U5-S4");
    const limiting = page.locator(".science-sandbox");
    await expect(limiting.locator("output")).toContainText("limiting");
    await limiting.getByLabel("Available A (mol)").fill("5");
    await expect(limiting.locator("output")).toBeVisible();
    await page.goto("/study/CHE1501-U6/sessions/CHE1501-U6-S2");
    const dilution = page.locator(".science-sandbox");
    await expect(dilution.locator("output")).toContainText("mol/L");
    await dilution.getByLabel("Final solution volume (L)").fill("2");
    await expect(dilution.locator("output")).toContainText("0.050");
    await page.goto("/study/CHE1501-U7/sessions/CHE1501-U8-S1");
    const equilibrium = page.locator(".science-sandbox");
    await equilibrium.getByLabel("Reaction quotient Q/K").fill("0.5");
    await expect(equilibrium.locator("output")).toContainText("forward");
    await page.goto("/study/CHE1501-U8/sessions/CHE1501-U11-S1");
    const gases = page.locator(".science-sandbox");
    await gases.getByLabel("Pressure (atm)").fill("2");
    await gases.getByLabel("Temperature (K)").fill("300");
    await expect(gases.locator("output")).toContainText("V =");
    await redox.getByLabel("Redox example").selectOption("aluminium");
    await expect(redox.locator("output")).toContainText("Choose both responses.");
    await redox.getByLabel("Species oxidized").selectOption("Al");
    await redox.getByLabel("Electrons transferred").selectOption("3");
    await expect(redox.locator("output")).toContainText("Three silver ions each gain one");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download reading" }).click();
    expect((await download).suggestedFilename()).toBe("lesson-CHE1501-U4-S4.md");

    for (const unit of module.studyUnits) {
      if (unit4Only && unit.code !== "CHE1501-U4") continue;
      for (let position = 1; position <= unit._count.sessions; position++) {
        await page.goto(`/study/${unit.code}/sessions/${unit.code}-S${position}`);
        const examples = page.locator(".try-example");
        await expect(examples.first()).toBeVisible();
        await expect(page.locator(".worked-answer")).toHaveCount(0);
        for (const example of unit4Only ? await examples.all() : [examples.first()]) {
          await example.getByRole("button", { name: "Show answer", exact: true }).click();
          await expect(example.locator(".worked-answer")).toBeVisible();
        }
        await expect(page.locator(".katex-error")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      const origin = new URL(page.url()).origin;
      const quiz = await page.request.post("/api/quiz/generate", {
        headers: { origin },
        data: { studyUnitId: unit.id, provider: "heuristic" },
      });
      expect(quiz.status()).toBe(200);
      expect((await quiz.json()).questions.length).toBeGreaterThan(0);
      if (unit.code === "CHE1501-U3" || unit.code === "CHE1501-U4") {
        const recall = await page.request.post("/api/recall", {
          headers: { origin },
          data: { action: "queue", studyUnitId: unit.id },
        });
        expect(recall.status()).toBe(200);
        expect(
          (await recall.json()).cards.some((card: { prompt: string }) =>
            card.prompt.includes(
              unit.code === "CHE1501-U3" ? "beryllium fluoride" : "permanganate",
            ),
          ),
        ).toBe(true);
      }
    }
    if (unit4Only) {
      if (info.project.name === "desktop" && process.env.VELA_LIVE_TUTOR_SMOKE === "1") {
        const origin = new URL(page.url()).origin;
        const response = await page.request.post("/api/tutor", {
          headers: { origin },
          timeout: 90_000,
          data: {
            studyUnitId: "CHE1501-U4",
            sessionId: "CHE1501-U4-S5",
            mode: "academic",
            pace: "transfer",
            query:
              "Check my understanding of cancelling electrons when combining permanganate and sulfite half-reactions in basic solution.",
          },
        });
        expect(response.status()).toBe(200);
        const frames = (await response.text())
          .split("\n")
          .filter((line) => line.startsWith("data: {"))
          .map((line) => JSON.parse(line.slice(6)));
        const answer = frames
          .filter((frame) => frame.type === "text-delta")
          .map((frame) => frame.delta)
          .join("");
        expect(answer).toMatch(/electron|permanganate|sulfite/i);
        expect((answer.match(/\?/g) ?? []).length).toBe(1);
        expect(
          frames.find((frame) => frame.type === "data-citations")?.data.sources.length,
        ).toBeGreaterThan(0);
      }
      return;
    }
    await page.goto("/practice/lab");
    await page.getByText("Check a unit conversion", { exact: true }).click();
    const original = page.getByRole("group", { name: "Original quantity" });
    const converted = page.getByRole("group", { name: "Converted quantity" });
    await original.getByLabel("Magnitude").fill("2.5");
    await original.getByLabel("Unit", { exact: true }).fill("kJ");
    await converted.getByLabel("Magnitude").fill("2500");
    await converted.getByLabel("Unit", { exact: true }).fill("J");
    await page.getByRole("button", { name: "Check dimensions and magnitude" }).click();
    await expect(page.getByText("The SI dimensions and converted magnitudes match.")).toBeVisible();
    await converted.getByLabel("Unit", { exact: true }).fill("N");
    await page.getByRole("button", { name: "Check dimensions and magnitude" }).click();
    await expect(page.getByText(/The units have different SI dimensions/)).toBeVisible();

    if (info.project.name === "desktop" && process.env.VELA_LIVE_TUTOR_SMOKE === "1") {
      await page.goto("/study/CHE1501-U3/sessions/CHE1501-U3-S3");
      await page.route("**/api/tutor", (route) => route.abort("internetdisconnected"), {
        times: 1,
      });
      await page.getByRole("button", { name: "Check my understanding" }).click();
      await expect(page.getByRole("combobox", { name: "Tutor pacing" })).toHaveValue("transfer");
      await expect(page.getByText("Check my understanding", { exact: true })).toBeVisible();
      const tutor = page.getByRole("log", { name: "Tutor conversation" });
      await page.getByRole("button", { name: "Try again" }).click();
      const latest = tutor.locator(".companion-card").last();
      await expect(latest).toContainText("?", { timeout: 90_000 });
      expect(((await latest.innerText()).match(/\?/g) ?? []).length).toBe(1);
      await expect(latest.locator(".katex-error")).toHaveCount(0);
      await page
        .locator("#tutor-query")
        .fill(
          "Carbon dioxide is linear. I think its dipoles cancel because they are equal and opposite. Check my reasoning, write the molecular formula in LaTeX, and ask one next question.",
        );
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(tutor.locator(".chat-message.assistant")).toHaveCount(2, { timeout: 90_000 });
      await expect(latest).toContainText("?", { timeout: 90_000 });
      expect(((await latest.innerText()).match(/\?/g) ?? []).length).toBe(1);
      await expect(latest.locator(".katex-error")).toHaveCount(0);
    }
  } finally {
    try {
      if (studentId) await cleanupTestLearner(db, studentId);
    } finally {
      await db.$disconnect();
    }
  }
});
