import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInput } from "../lib/ingest/input";
import { normalizeMath, mathSpans } from "../lib/content/math";
test("Marker aligned displays with adjacent dollar fences stay one valid display", () => {
  const raw = String.raw`$$\begin{aligned}
f'(x) &= 2x \\
&= x+x
\end{aligned}$$`;
  const normalized = normalizeMath(raw);
  assert.equal(mathSpans(normalized).length, 1);
  assert.ok(normalized.includes("\n$$\n"));
  assert.ok(normalized.includes(String.raw`&= 2x`));
  assert.equal(normalizeMath(normalized), normalized);
});
import { structuredDocumentSchema } from "../lib/content/structured";
import { ingest } from "../lib/ingest/service";

const formula = String.raw`$$\lim_{x\to 2}\frac{x^2-4}{x-2}=4$$`;
const canonicalFormula = normalizeMath(formula).trim();
const document = {
  version: 1,
  parser: { name: "marker", version: "2.1.0", review: "machine" },
  source: { document: "guide", sha256: "a".repeat(64), pageStart: 14, pageEnd: 14 },
  blocks: [
    { id: "text", type: "markdown", markdown: `# Limits\n\n${formula}` },
    {
      id: "graph",
      type: "interactive",
      kind: "limit",
      title: "Approach a hole",
      caption: "The value is undefined at 2; the limit is 4.",
      initialX: 1,
      sourcePage: 14,
    },
  ],
};
const input = {
  moduleCode: "MAT1512",
  studyUnitId: "unit",
  learningOutcomeId: "lo",
  assessmentCriterionId: "ac",
  structuredContent: document,
};
test("structured ingestion preserves fractions, powers, provenance and ordered widgets", () => {
  const parsed = parseInput(input);
  assert.ok(parsed.sourceText.includes(canonicalFormula));
  assert.equal(parsed.sourceKind, "PARSED_PDF");
  assert.equal(parsed.structuredContent?.blocks[1].type, "interactive");
  assert.equal(mathSpans(parsed.sourceText).length, 1);
});
test("math validation normalizes TeX delimiters and supports mhchem", () => {
  const text = normalizeMath(String.raw`\[\frac{x^2}{2}\]\n\(\ce{2H2 + O2 -> 2H2O}\)`);
  assert.equal(mathSpans(text).length, 2);
  assert.equal(normalizeMath("Code: `\\(x\\)`"), "Code: `\\(x\\)`");
});
test("escaped currency and code are preserved, while undelimited broken TeX is rejected", () => {
  assert.deepEqual(mathSpans(String.raw`A book costs \$5.` + " Code: `\\frac{x}{2}`"), []);
  assert.throws(() => mathSpans(String.raw`lim x\to 2 f sxd`));
});
test("malformed LaTeX and executable or unbounded widgets are rejected", () => {
  for (const markdown of [
    String.raw`$$\frac{x}{ $$`,
    String.raw`$$x^2`,
    "$x +",
    String.raw`$\href{javascript:alert(1)}{x}$`,
    String.raw`$\unknownMacro{x}$`,
  ]) {
    assert.throws(() =>
      parseInput({
        ...input,
        structuredContent: { ...document, blocks: [{ id: "bad", type: "markdown", markdown }] },
      }),
    );
  }
  assert.equal(
    structuredDocumentSchema.safeParse({
      ...document,
      blocks: [...document.blocks, { ...document.blocks[1], id: "js", expression: "alert(1)" }],
    }).success,
    false,
  );
  assert.equal(
    structuredDocumentSchema.safeParse({
      ...document,
      blocks: [document.blocks[0], { ...document.blocks[1], sourcePage: 15 }],
    }).success,
    false,
  );
  assert.throws(() => parseInput({ ...input, text: "ambiguous" }));
});
test("500/50 canonical windows expand complete formulas across boundaries before embedding", async () => {
  process.env.AI_PROVIDER = "openai";
  let saved = false;
  const markdown = "Calculus ".repeat(490) + "\n\n" + formula + "\n\n" + "Limits ".repeat(450);
  await ingest(
    {
      ...input,
      structuredContent: { ...document, blocks: [{ id: "reading", type: "markdown", markdown }] },
    },
    {
      resolveContext: async () => ({
        moduleCode: "MAT1512",
        saqaId: "103108",
        learningOutcomeId: "lo",
        assessmentCriterionId: "ac",
      }),
      find: async () => null,
      save: async (data) => {
        saved = true;
        data.chunks.forEach((chunk, index) => {
          assert.equal(chunk.tokenStart, index * 450);
          assert.ok(chunk.tokenCount <= 500);
          mathSpans(chunk.body);
        });
        assert.ok(data.chunks.some((chunk) => chunk.body.includes(canonicalFormula)));
        return { ingestionId: "test", chunkCount: data.chunks.length, reused: false };
      },
    },
    async (tokens, context) => {
      context!.texts.forEach((text) => mathSpans(text));
      return tokens.map(() => [1, ...Array(1535).fill(0)]);
    },
  );
  assert.ok(saved);
});
