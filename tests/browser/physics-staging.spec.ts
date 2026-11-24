import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("enrolled learner opens the physics pilot and uses virtual labs", async ({ page }) => {
  test.skip(process.env.VELA_PHYSICS_STAGING_TEST !== "1", "Requires dedicated staging.");
  test.setTimeout(240_000);
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    const verifyFigures = process.env.VELA_STAGED_FIGURES_TEST === "1";
    const teachingPractice = process.env.VELA_TPS2601_TEST === "1";
    const moduleCodes = teachingPractice ? ["TPS2601"] : ["PHY1503", "PHY1505", "PHY1506"];
    if (verifyFigures) moduleCodes.push("CHE1501", "MAT1503", "MAT1512");
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: moduleCodes } },
      select: { id: true, code: true },
    });
    expect(modules).toHaveLength(moduleCodes.length);
    learner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, modules.map(({ id }) => id));
    if (teachingPractice) {
      const lessons = [
        [1, "Separate observation from inference", "tps-observation-record.svg"],
        [2, "Plan a lesson around observable learning", "tps-lesson-rehearsal.svg"],
        [3, "Build a reflection from evidence", "tps-portfolio-evidence.svg"],
        [4, "Assess learner reasoning and plan feedback", null],
      ] as const;
      const assessmentOnly = process.env.VELA_TPS2601_ASSESSMENT_ONLY === "1";
      for (const [number, title, figure] of assessmentOnly ? lessons.slice(-1) : lessons) {
        await page.goto(`/study/TPS2601-U${number}/sessions/TPS2601-U${number}-S1`);
        await expect(page.getByText(title.toString(), { exact: true }).first()).toBeVisible();
        if (figure) await expect(page.locator(`img[src="/lesson-figures/${figure}"]`)).toBeVisible();
        const exercise = page.locator(".try-example").first();
        await expect(exercise.locator(".worked-answer")).toHaveCount(0);
        await exercise.getByRole("button", { name: "Show answer" }).click();
        await expect(exercise.locator(".worked-answer")).toBeVisible();
      }
      const unit = await db.studyUnit.findFirstOrThrow({ where: { code: "TPS2601-U4", moduleId: modules[0].id } });
      const response = await page.request.post("/api/tutor", {
        headers: { origin: new URL(page.url()).origin },
        timeout: 65_000,
        data: {
          live: true, provider: "cloudflare", mode: "academic", studyUnitId: unit.id,
          sessionId: "TPS2601-U4-S1", query: "In the assessment lesson, what does fictional response C show and what evidence should I collect next?",
        },
      });
      expect(response.status()).toBe(200);
      const frames = (await response.text()).split("\n")
        .filter((line) => line.startsWith("data: {")).map((line) => JSON.parse(line.slice(6)));
      expect(frames.some((frame) => frame.type === "error")).toBe(false);
      const sources = frames.find((frame) => frame.type === "data-citations")?.data.sources;
      expect(sources?.length).toBeGreaterThan(0);
      for (const source of sources) expect(source.sourceUrl).toBe("/study/TPS2601-U4/sessions/TPS2601-U4-S1");
      const answer = frames.filter((frame) => frame.type === "text-delta").map((frame) => frame.delta).join("");
      expect(answer).toMatch(/correct/i);
      expect(answer).toMatch(/reason|explanation/i);
      console.log("TPS2601 lesson rendering and assessment tutor citations verified");
      return;
    }
    if (verifyFigures) {
      const files = [
        "analytical-balance.webp", "epsilon-delta.svg", "free-body-diagram.svg", "hydrogen-spectrum.svg",
        "magnesium-burning.webp", "matrix-transform-grid.svg", "newton-cradle.webp", "riemann-area.svg",
        "stroboscope-ball.webp", "vector-addition.svg", "tps-observation-record.svg",
        "tps-lesson-rehearsal.svg", "tps-portfolio-evidence.svg",
      ];
      for (const filename of files) {
        const src = "/lesson-figures/" + filename;
        const lesson = await db.studySession.findFirstOrThrow({
          where: { markdown: { contains: src }, studyUnit: { module: { code: { in: moduleCodes } } } },
          select: { id: true, studyUnit: { select: { code: true } } },
        });
        await page.goto(`/study/${lesson.studyUnit.code}/sessions/${lesson.id}`);
        const figure = page.locator(`img[src="${src}"]`);
        await expect(figure).toBeVisible();
        await expect.poll(() => figure.evaluate((image: HTMLImageElement) => {
          image.scrollIntoView({ block: "center" });
          return image.naturalWidth;
        }, undefined, { timeout: 1000 }).catch(() => 0)).toBeGreaterThan(0);
        console.log(lesson.id, filename, "rendered");
      }
      return;
    }
    if (process.env.VELA_PHYSICS_TUTOR_TEST === "1") {
      const completion = process.env.VELA_PHYSICS_COMPLETION_TEST === "1";
      if (completion) {
        for (const [number, title] of [
          [7, "Distinguish damping regimes"], [8, "Explain resonance in a driven oscillator"],
          [9, "Compare shear and bulk elasticity"], [10, "Practise multi-stage mechanics under exam conditions"],
        ]) {
          await page.goto("/study/PHY1505-U7/sessions/PHY1505-U7-S" + number);
          await expect(page.getByText(title.toString(), { exact: true }).first()).toBeVisible();
          await expect(page.locator(".katex-error")).toHaveCount(0);
          const exercise = page.locator(".try-example").first();
          await expect(exercise.locator(".worked-answer")).toHaveCount(0);
          await exercise.getByRole("button", { name: "Show answer" }).click();
          await expect(exercise.locator(".worked-answer")).toBeVisible();
        }
      }
      const consolidation = process.env.VELA_PHYSICS_CONSOLIDATION_TEST === "1";
      if (consolidation) {
        for (const [path, title] of [
          ["PHY1505-U4/sessions/PHY1505-U4-S3", "Solve a collision where the objects separate"],
          ["PHY1505-U4/sessions/PHY1505-U4-S4", "Integrate work when the force changes"],
          ["PHY1505-U6/sessions/PHY1505-U6-S4", "Track energy transferred by torque"],
          ["PHY1505-U7/sessions/PHY1505-U7-S6", "Derive buoyancy from the pressure difference"],
        ]) {
          await page.goto("/study/" + path);
          await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
          await expect(page.locator(".katex-error")).toHaveCount(0);
        }
      }
      if (process.env.VELA_PHYSICS_ENRICHMENT_TEST === "1") {
        for (const [path, title] of [
          ["PHY1505-U7/sessions/PHY1505-U7-S4", "Derive Bernoulli from pressure work"],
          ["PHY1503-U5/sessions/PHY1503-U5-S3", "Calibrate the spectrometer angle and grating"],
        ]) {
          await page.goto("/study/" + path);
          await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
          await expect(page.locator(".katex-error")).toHaveCount(0);
        }
      }
      const cases = completion ? [
        ["PHY1505-U7", "PHY1505-U7-S7", "For the damped spring worked example, state its damping regime and amplitude decay time.", /underdamped/i, /0\.5/],
        ["PHY1505-U7", "PHY1505-U7-S8", "For the driven oscillator worked example, find the amplitude at 5 rad/s and the frequency of the displacement peak. Give numerical values.", /0\.2/, /4\.8/],
        ["PHY1505-U7", "PHY1505-U7-S9", "Give the absolute lateral shift in millimetres and the volume decrease in millilitres from the pad and fluid worked example.", /0\.2/, /5(?:\.0)?\b/],
        ["PHY1505-U7", "PHY1505-U7-S10", "In the collision then braking worked example, explicitly give the impact kinetic energy loss and the braking distance with units.", /\b6(?:\.0)?\b/, /\b3(?:\.0)?\b/],
      ] as const : consolidation ? [
        ["PHY1505-U4", "PHY1505-U4-S3", "Give the speed and angle below +x for puck B in the worked example, then state whether the collision is elastic.", /53/, /\belastic\b/i],
        ["PHY1505-U4", "PHY1505-U4-S4", "State the net work in joules and the final speed in metres per second for the cart in the worked example.", /\b8(?:\.0)?\b/, /\b3(?:\.0)?\b/],
        ["PHY1505-U6", "PHY1505-U6-S4", "State the work in joules and angular speed to two significant figures for the cord and drum worked example.", /4\.5/, /4\.2/],
        ["PHY1505-U7", "PHY1505-U7-S6", "For the submerged-scale worked example give the upward buoyant force and the scale reading to two significant figures for the scale.", /19\.6/, /9\.8/],
      ] as const : [
        ["PHY1505-U6", "PHY1505-U6-S2", "From this session's worked example, give both moments of inertia for the 2.4 kg, 1.5 m rod. Please show the answer.", /0\.45/, /1\.8/],
        ["PHY1503-U1", "PHY1503-U1-S2", "Use the active calibration lesson. What is the sensitivity, and what is the corrected length for an indication of 15.40 mm? Please show the answer.", /1\.02/, /15(?:\.0+)?\s*(?:\\[, ]|\\mathrm|\\text|mm)/],
        ...(process.env.VELA_PHYSICS_ENRICHMENT_TEST === "1" ? [
          ["PHY1505-U4", "PHY1505-U4-S2", "Show the answer for the two skaters in this lesson. Give the direction in degrees and the kinetic energy decrease.", /26\.6/, /15\b/],
          ["PHY1503-U6", "PHY1503-U6-S4", "Use the two calibration points in this session. Give the field intercept and the calibrated field at 2 amperes, in millitesla.", /0\.10?\b/, /0\.90?\b/],
        ] as const : []),
      ] as const;
      const providerMatrix = process.env.VELA_PHYSICS_PROVIDER_TEST === "1";
      const probes = providerMatrix
        ? (["cloudflare", "groq", "gemini", "openrouter"] as const).map((provider) => ({ provider, example: cases[0] }))
        : cases.map((example) => ({ provider: "cloudflare", example }));
      async function verifyReply({ provider, example: [code, sessionId, query, first, second] }: (typeof probes)[number]) {
        const unit = await db.studyUnit.findFirstOrThrow({ where: { code, module: { institution: "UNISA" } } });
        const origin = new URL(process.env.PLAYWRIGHT_BASE_URL!).origin;
        const response = await page.request.post("/api/tutor", {
          headers: { origin }, timeout: 65_000,
          data: {
            live: true, provider, mode: "academic", studyUnitId: unit.id, sessionId,
            query: providerMatrix ? query + " Put both numerical results first in one line." : query,
          },
        });
        expect(response.status()).toBe(200);
        const frames = (await response.text()).split("\n")
          .filter((line) => line.startsWith("data: {")).map((line) => JSON.parse(line.slice(6)));
        expect(frames.some((frame) => frame.type === "error")).toBe(false);
        const citations = frames.find((frame) => frame.type === "data-citations")?.data.sources;
        expect(citations?.length).toBeGreaterThan(0);
        for (const citation of citations) expect(citation.sourceUrl).toBe(`/study/${code}/sessions/${sessionId}`);
        const answer = frames.filter((frame) => frame.type === "text-delta").map((frame) => frame.delta).join("");
        expect(answer).toMatch(first);
        expect(answer.replace(/\$|\\,|\\quad/g, "")).toMatch(second);
        console.log(provider, sessionId, citations.length, "same-session citations and expected answer values");
      }
      if (providerMatrix) {
        const results = await Promise.allSettled(probes.map(verifyReply));
        const failures = results.flatMap((result, index) =>
          result.status === "rejected" ? [new Error(probes[index].provider + " failed", { cause: result.reason })] : [],
        );
        if (failures.length) throw new AggregateError(failures, "Tutor provider checks failed");
      } else {
        for (const probe of probes) await verifyReply(probe);
      }
      return;
    }
    const mechanics = modules.find(({ code }) => code === "PHY1505")!;
    await page.goto("/modules/" + mechanics.id);
    await expect(page.locator(".curriculum-units .unit-card").filter({ hasText: "Describing motion" })).toBeVisible();
    async function openSession(id: string) {
      const unit = id.replace(/-S\d+$/, "");
      await page.goto(`/study/${unit}/sessions/${id}`);
      await expect(page.locator(".try-example").first()).toBeVisible();
      await expect(page.locator(".katex-error")).toHaveCount(0);
    }
    await openSession("PHY1505-U1-S1");
    const motion = page.getByRole("region", { name: "Position, velocity and acceleration" });
    await expect(motion).toBeVisible();
    const cursor = motion.getByRole("slider", { name: /Time cursor/ });
    await cursor.focus();
    await page.keyboard.press("End");
    await expect(motion.getByText(/Velocity -8\.00 m\/s/)).toBeVisible();
    const exercise = page.locator(".try-example").first();
    await expect(exercise.locator(".worked-answer")).toHaveCount(0);
    await exercise.getByRole("button", { name: "Show answer" }).click();
    await expect(exercise.locator(".worked-answer")).toBeVisible();

    await openSession("PHY1503-U1-S1");
    const instrument = page.getByRole("region", { name: "Instrument reading bench" });
    await instrument.getByRole("button", { name: "Reveal reading" }).click();
    await expect(instrument.getByText(/Indicated 8\.35 mm/)).toBeVisible();

    await openSession("PHY1503-U2-S1");
    await expect(page.getByText(/standard error\)\. Intercept/)).toBeVisible();
    await openSession("PHY1503-U2-S2");
    const report = page.getByRole("region", { name: "Scientific report studio" });
    await report.getByRole("textbox", { name: /Aim/ }).fill("Estimate gravity from simulated data.");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      report.getByRole("button", { name: "Download report draft" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("lab-report.md");

    await openSession("PHY1503-U3-S1");
    const pendulum = page.getByRole("region", { name: "Pendulum bench" });
    const length = pendulum.getByRole("slider", { name: /Pivot to bob centre/ });
    const record = pendulum.getByRole("button", { name: /Record simulated time/ });
    await record.click();
    await length.focus();
    await page.keyboard.press("Home");
    await record.click();
    await length.focus();
    await page.keyboard.press("End");
    await record.click();
    await expect(pendulum.getByText(/From the fitted slope, g = 9\.8/)).toBeVisible();

    await openSession("PHY1503-U3-S2");
    await expect(page.getByRole("region", { name: "Centripetal rig" })).toBeVisible();
    await openSession("PHY1503-U3-S3");
    const track = page.getByRole("region", { name: "Air track collision bench" });
    await track.getByRole("button", { name: "Record simulated collision" }).click();
    await expect(track.getByText(/Total momentum/)).toBeVisible();

    await openSession("PHY1503-U4-S1");
    const circuit = page.getByRole("region", { name: "DC cell and resistance bench" });
    await circuit.getByRole("combobox", { name: "Ammeter placement" }).selectOption("parallel");
    await expect(circuit.getByRole("button", { name: "Record simulated readings" })).toBeDisabled();
    await expect(circuit.getByText(/low-resistance bypass/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.VELA_PHYSICS_EXPANDED_TEST !== "1") return;

    await openSession("PHY1505-U2-S1");
    const projectile = page.getByRole("region", { name: "Projectile launch bench" });
    await projectile.getByRole("slider", { name: /Flight cursor/ }).focus();
    await page.keyboard.press("End");
    await expect(projectile.getByText(/height is 0\.00 m/)).toBeVisible();
    await openSession("PHY1505-U3-S1");
    const incline = page.getByRole("region", { name: "Incline and friction bench" });
    await incline.getByRole("slider", { name: /Slope angle/ }).focus();
    await page.keyboard.press("End");
    await expect(incline.getByText(/block slides/)).toBeVisible();
    await openSession("PHY1505-U4-S1");
    await expect(page.getByRole("region", { name: "Air track collision bench" })).toBeVisible();
    await openSession("PHY1505-U5-S1");
    await expect(page.getByRole("region", { name: "Centripetal rig" })).toBeVisible();
    await openSession("PHY1505-U6-S1");
    await expect(page.getByRole("region", { name: "Moment of inertia bench" })).toBeVisible();
    await openSession("PHY1505-U7-S1");
    await expect(page.getByRole("region", { name: "Pendulum bench" })).toBeVisible();
    await openSession("PHY1505-U7-S2");
    const venturi = page.getByRole("region", { name: "Venturi flow bench" });
    await venturi.getByRole("slider", { name: /Throat radius/ }).focus();
    await page.keyboard.press("End");
    await expect(venturi.getByText(/by 0\.00 kPa/)).toBeVisible();
    await openSession("PHY1505-U7-S3");
    await expect(page.getByRole("region", { name: "Axial elasticity bench" })).toBeVisible();

    await openSession("PHY1503-U4-S2");
    const bridge = page.getByRole("region", { name: "Slide-wire null detector" });
    await bridge.getByRole("combobox", { name: "Method" }).selectOption("potential");
    const contact = bridge.getByRole("slider", { name: /Contact from left end/ });
    await contact.fill("65");
    await expect(bridge.getByText(/Balanced voltage 1\.30 V/)).toBeVisible();
    await openSession("PHY1503-U5-S1");
    const grating = page.getByRole("region", { name: "Diffraction grating bench" });
    await grating.getByRole("slider", { name: /Order magnitude/ }).focus();
    await page.keyboard.press("End");
    await expect(grating.getByText(/no propagating ray/)).toBeVisible();
    await openSession("PHY1503-U5-S2");
    await expect(page.getByRole("region", { name: "Parallel-wire current balance" })).toBeVisible();
    await openSession("PHY1503-U6-S1");
    const rings = page.getByRole("region", { name: "Electron diffraction screen" });
    await rings.getByRole("slider", { name: /Accelerating voltage/ }).focus();
    await page.keyboard.press("End");
    await expect(rings.getByText(/Outer diameter 38\.0\d mm/)).toBeVisible();
    await openSession("PHY1503-U6-S2");
    const photoelectric = page.getByRole("region", { name: "Photoelectric threshold bench" });
    await photoelectric.getByRole("combobox", { name: "Wavelength" }).selectOption("577");
    await expect(photoelectric.getByText(/No photoelectrons/)).toBeVisible();
    await openSession("PHY1503-U6-S3");
    await expect(page.getByRole("region", { name: "Electron charge-to-mass bench" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
