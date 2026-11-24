import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runContentBatch } from "../scripts/content-factory-batch";
import { manufacture, regenerateSection } from "../lib/content/factory";
import { manifestSchema, reviewedEvidence, hashValue } from "../lib/content/factory-evidence";
import {
  renderSession,
  sessionSchema,
  validateSessionMarkdown,
} from "../lib/content/session-schema";
import { parseWidgetBlocks, readWidgetDirective } from "../lib/content/widget-registry";
import { sourceOverlap } from "../lib/content/factory-quality";
import { visibleStudyText } from "../lib/search/visible";

const sha = "1".repeat(64);
const manifest = manifestSchema.parse({
  version: 1,
  institution: "UNISA",
  moduleCode: "CHE1501",
  scope: "provisional",
  scopeNote: "Synthetic fixture.",
  sources: [
    {
      id: "demo-guide",
      role: "syllabus_master",
      filename: "demo.pdf",
      sha256: sha,
      edition: "Fixture edition",
      remoteProcessing: false,
    },
  ],
  unitMapping: [
    {
      unitCode: "CHE1501-U1",
      title: "Density",
      status: "working",
      pages: [{ sourceId: "demo-guide", first: 1, last: 2 }],
      referenceSections: [],
      sessions: ["Compare material density"],
    },
  ],
});
const sourceBody =
  "Measurement instruments specify acceptable repeatability under comparable ambient circumstances. " +
  "Conversion conventions preserve internationally agreed reference magnitudes for scientific reporting purposes without increasing the precision of a measurement.";
const document = {
  version: 1,
  parser: { name: "marker", version: "2.1.0", review: "source-compared" },
  source: { document: "demo-guide", sha256: sha, pageStart: 2, pageEnd: 2 },
  blocks: [{ id: "page", type: "markdown", markdown: sourceBody }],
};
const cover = {
  kind: "cover",
  first: 1,
  last: 1,
  sourceId: "demo-guide",
  sha256: sha,
  compared: true,
  note: "Checked against the physical PDF cover.",
};

const session = {
  title: "Compare material density",
  learningGoal:
    "Compare the densities of two solids by reasoning with equal volumes and checking your unit conversions.",
  prerequisites: [
    "Read mass on a balance whose scale is labelled in grams",
    "Interpret a cylinder volume in millilitres",
  ],
  intuition:
    "Imagine two blocks shaped like the same toy brick. If one is harder to lift, more mass fits into each matching portion.",
  whyThisWorks:
    "Dividing any sample mass by its own measured volume gives the amount of matter per unit of space. The quotient can only describe a representative sample if the material is uniform.",
  visualExplanation:
    "Keep the amount of space fixed and move the mass slider. Describe what happens to the quotient on the display.",
  visualWidget: { type: "density_model", config: { mass: 35, volume: 10 } },
  procedure:
    "Write mass above volume, convert the original measures to the units required, divide, then interpret how densely matter is packed.",
  workedExample: {
    title: "Inspect a ceramic sample",
    problem: "A ceramic sample fills 10 mL and has a mass of 35 g. What density would you report?",
    gatedAnswer:
      "The ceramic density is 3.5 grams per millilitre. Divide the mass by the space occupied.",
  },
  interpretation:
    "At equal volumes the material with the larger quotient has greater mass. The reading says nothing by itself about shape.",
  commonMistakes: [
    "Switching the numerator and denominator produces volume per gram, which answers a different question.",
  ],
  practiceQuestions: [
    {
      type: "recognition",
      q: "What comparison can the quotient of mass and volume represent for a uniform material?",
      a: "It compares how much mass occupies a fixed volume of that material.",
    },
    {
      type: "procedure",
      q: "A glass sample has a mass of 180 g and a volume of 75 mL. Compute its density.",
      a: "Divide 180 by 75 to obtain 2.4 grams per millilitre for the sample.",
    },
    {
      type: "error_correction",
      q: "Why would dividing the measured volume by the measured mass produce an unsuitable unit?",
      a: "That order gives millilitres per gram, the reciprocal quantity. Density uses mass per volume.",
    },
    {
      type: "transfer",
      q: "Two flasks contain oil and water to the same fill line. What measurement distinguishes their densities?",
      a: "Weigh both after subtracting their empty masses. The larger liquid mass at the same volume yields the higher density.",
    },
  ],
  application:
    "A materials technician could compare small chips of two polymers by measuring each chip separately before choosing a lighter material.",
  pauseAndPredict: {
    prompt: "Predict what the quotient does when the same piece is cut into two equal halves.",
    solution: "Both the mass and the volume halve, so their quotient stays the same.",
  },
  concepts: ["Density and unit conversions"],
  quantitativeChecks: [
    {
      label: "Volume conversion",
      value: { value: "10", unit: "mL" },
      equivalent: { value: "10", unit: "cm^3" },
    },
  ],
};

test("factory evidence is hash-locked, source compared and complete without cover text", () => {
  const result = reviewedEvidence(manifest, "CHE1501-U1", [
    cover,
    { kind: "instructional", document },
  ]);
  assert.equal(result.included.length, 1);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.included[0].body, sourceBody);
  assert.throws(
    () => reviewedEvidence(manifest, "CHE1501-U1", [{ kind: "instructional", document }]),
    /does not cover/,
  );
  assert.throws(
    () =>
      reviewedEvidence(manifest, "CHE1501-U1", [
        cover,
        {
          kind: "instructional",
          document: { ...document, parser: { ...document.parser, review: "machine" } },
        },
      ]),
    /compared/,
  );
  assert.throws(
    () =>
      reviewedEvidence(manifest, "CHE1501-U1", [
        cover,
        {
          kind: "instructional",
          document: {
            ...document,
            blocks: [
              { id: "broken", type: "markdown", markdown: "The formula ce{H2O} was damaged." },
            ],
          },
        },
      ]),
    /backslash/,
  );
  assert.equal(hashValue({ a: 1, b: 2 }), hashValue({ b: 2, a: 1 }));
});

test("manufacturing extracts grounded facts and closes the source before producing a session", async () => {
  const { included, skipped } = reviewedEvidence(manifest, "CHE1501-U1", [
    cover,
    { kind: "instructional", document },
  ]);
  const inventory = {
    unitCode: "CHE1501-U1",
    concepts: [
      {
        name: "Density",
        definition: "Uniform material mass per volume.",
        governingFormulas: [],
        requiredPrerequisites: [],
        commonStudentMisconceptions: [],
        validityConditions: [],
        evidenceIds: [included[0].ref.evidenceHash],
      },
    ],
  };
  let calls = 0;
  const result = await manufacture(
    manifest,
    "CHE1501-U1",
    included,
    async (_system, prompt, _limit, schema) => {
      calls++;
      assert.ok(schema, "The model request must carry its output schema.");
      if (calls === 1) {
        assert.ok(prompt.includes(sourceBody));
        assert.ok(schema.safeParse(inventory).success);
        assert.equal(schema.safeParse({ ...inventory, unitCode: "CHE1501-U2" }).success, false);
        return JSON.stringify(inventory);
      }
      assert.ok(!prompt.includes(sourceBody));
      assert.ok(prompt.includes(inventory.concepts[0].definition));
      assert.ok(schema.safeParse(session).success);
      return JSON.stringify(session);
    },
    skipped,
  );
  assert.equal(calls, 2);
  assert.equal(result.audit.passed, true, JSON.stringify(result.audit.issues));
  assert.equal(result.artifact.exclusions[0].kind, "cover");
  const markdown = renderSession(result.artifact.sessions[0]);
  assert.ok(!visibleStudyText(markdown).includes("ceramic density is 3.5"));
  assert.ok(!visibleStudyText(markdown).includes("density_model"));
  const next = await regenerateSection(
    {
      markdown,
      section: "Intuition first",
      guidance: "Use equal-sized jars instead.",
      effectivePrompt: "Write only the specified section.",
      facts: inventory,
    },
    async () =>
      JSON.stringify({
        prose:
          "Picture two jars filled to the same line. The heavier jar contains more mass in each matching portion.",
      }),
  );
  assert.match(next, /Picture two jars/);
  assert.ok(next.includes(session.workedExample.gatedAnswer));
});

test("validator rejects wrong dimensions and unsupported executable-looking widgets", () => {
  const invalid = {
    ...session,
    quantitativeChecks: [
      {
        label: "Volume error",
        value: { value: "10", unit: "mL" },
        equivalent: { value: "10", unit: "g" },
      },
    ],
  };
  assert.equal(sessionSchema.safeParse(invalid).success, false);
  assert.throws(() =>
    readWidgetDirective(':::widget{type="vsepr_geometry" molecule="water" callback="script"}'),
  );
  assert.throws(() =>
    readWidgetDirective(':::widget{type="reaction_balance" reaction="water" a=1 a=2 b=1 c=1}'),
  );
  assert.equal(
    parseWidgetBlocks(':::widget{type="density_model" mass=35 volume=10}\n:::').errors.length,
    0,
  );
  assert.notEqual(
    parseWidgetBlocks(':::widget{type="density_model" mass=35 volume=10}').errors.length,
    0,
  );
  assert.throws(() => validateSessionMarkdown("Unmatched formula $\\" + "frac{2}{3}"));
  assert.equal(sourceOverlap(sourceBody, [sourceBody]).nearCopy, 1);
});

test("a batch isolates modules, blocks incomplete evidence, and resumes only audited drafts", async () => {
  const root = await mkdtemp(join(tmpdir(), "vela-factory-batch-"));
  try {
    const second = {
      ...manifest,
      moduleCode: "CHE1502",
      unitMapping: [{ ...manifest.unitMapping[0], unitCode: "CHE1502-U1" }],
    };
    const secondDocument = {
      ...document,
      blocks: [
        {
          id: "page",
          type: "markdown",
          markdown: "Reference fixture about comparing material samples under fixed conditions.",
        },
      ],
    };
    await writeFile(
      join(root, "first.json"),
      JSON.stringify([cover, { kind: "instructional", document }]),
    );
    await writeFile(
      join(root, "second.json"),
      JSON.stringify([cover, { kind: "instructional", document: secondDocument }]),
    );
    await writeFile(join(root, "incomplete.json"), JSON.stringify([cover]));
    const plan = {
      modules: [
        {
          code: "CHE1501",
          sourceRoot: ".",
          allowProvisional: true,
          units: [
            { code: "CHE1501-U1", evidence: "first.json" },
            { code: "CHE1501-U2", evidence: "incomplete.json" },
          ],
        },
        {
          code: "CHE1502",
          sourceRoot: ".",
          allowProvisional: true,
          units: [{ code: "CHE1502-U1", evidence: "second.json" }],
        },
      ],
    };
    const firstManifest = {
      ...manifest,
      unitMapping: [
        ...manifest.unitMapping,
        { ...manifest.unitMapping[0], unitCode: "CHE1501-U2" },
      ],
    };
    let verifications = 0;
    const dependencies = {
      loadManifest: async (code: string) => (code === "CHE1501" ? firstManifest : second),
      verifySources: async () => {
        verifications++;
      },
    };
    const opts = { root, drafts: join(root, "drafts"), workers: 2, provider: "ollama" as const };
    const preflight = await runContentBatch(plan, opts, dependencies);
    assert.deepEqual(preflight.map((item) => item.status).sort(), ["blocked", "ready", "ready"]);
    assert.equal(verifications, 2);
    const remote = await runContentBatch(plan, { ...opts, provider: "cloudflare" }, dependencies);
    assert.ok(remote.every((item) => item.status === "blocked"));
    let calls = 0;
    const mode = {
      provider: "ollama" as const,
      model: "fixture",
      generate: async (_system: string, prompt: string) => {
        calls++;
        const data = JSON.parse(prompt);
        if (!data.evidence) {
          assert.ok(!prompt.includes(sourceBody));
          assert.ok(!prompt.includes(secondDocument.blocks[0].markdown));
          return JSON.stringify(session);
        }
        const expected =
          data.unitCode === "CHE1501-U1" ? sourceBody : secondDocument.blocks[0].markdown;
        assert.equal(data.evidence[0].body, expected);
        return JSON.stringify({
          unitCode: data.unitCode,
          concepts: [
            {
              name: "Density",
              definition: "Uniform material mass per volume.",
              governingFormulas: [],
              requiredPrerequisites: [],
              commonStudentMisconceptions: [],
              validityConditions: [],
              evidenceIds: [data.evidence[0].evidenceId],
            },
          ],
        });
      },
    };
    const first = await runContentBatch(plan, { ...opts, mode }, dependencies);
    assert.deepEqual(
      first.map((item) => item.status).sort(),
      ["blocked", "generated", "generated"],
      JSON.stringify(first),
    );
    assert.equal(calls, 4);
    for (const result of first) {
      if (result.status !== "generated") continue;
      const draft = JSON.parse(await readFile(result.artifact!, "utf8"));
      assert.equal(draft.moduleCode, result.module);
    }
    const resumed = await runContentBatch(plan, { ...opts, mode }, dependencies);
    assert.deepEqual(resumed.map((item) => item.status).sort(), ["blocked", "reused", "reused"]);
    assert.equal(calls, 4);
    const corrupt = first.find((item) => item.module === "CHE1502")?.artifact;
    assert.ok(corrupt);
    await writeFile(corrupt, "interrupted");
    const repaired = await runContentBatch(plan, { ...opts, mode }, dependencies);
    assert.equal(repaired.find((item) => item.module === "CHE1502")?.status, "generated");
    assert.equal(calls, 6);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
