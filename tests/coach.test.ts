import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conceptualGrade,
  diagnosisInput,
  photoInput,
  transcriptionSchema,
} from "../lib/coach/types";
import { scoreConceptualGrade } from "../lib/coach/grading";
import { decodeCoachJSON } from "../lib/coach/ai";
import { checkedImage } from "../lib/coach/input";
import { speechText, speechSegments, spokenMath } from "../lib/voice/speech";
const learner =
  "A linear system uses first powers, so multiplying variables together breaks linearity. The same operation must affect both sides.";
const source =
  "A linear equation contains only first powers of its unknowns. Row operations preserve the solution set when they are reversible.";
const grade = () =>
  conceptualGrade.parse({
    supported: true,
    confidence: "high",
    facets: ["correctness", "reasoning", "clarity", "example"].map((id) => ({
      id,
      score: 1,
      learnerQuote: "A linear system uses first powers",
      referenceQuote: "A linear equation contains only first powers",
      feedback: "Explain the restriction, then test your own example.",
    })),
    misconceptions: [],
    nextQuestion: "What changes when the unknowns are multiplied?",
    summary: "Your central explanation is clear.",
  });
test("conceptual feedback requires real learner and source evidence", () => {
  assert.deepEqual(scoreConceptualGrade(grade(), learner, source), { verified: true, score: 1 });
  const fake = grade();
  fake.facets[0].learnerQuote = "This phrase was never in the student's answer";
  assert.equal(scoreConceptualGrade(fake, learner, source).verified, false);
  fake.facets[0].learnerQuote = "A linear system uses first powers";
  fake.facets[0].referenceQuote = "Invented reference evidence";
  assert.equal(scoreConceptualGrade(fake, learner, source).verified, false);
});
test("core conceptual errors cannot be compensated by fluent explanations", () => {
  const g = grade();
  g.facets[0].score = 0.25;
  assert.equal(scoreConceptualGrade(g, learner, source).score, 0.25);
  g.confidence = "low";
  assert.deepEqual(scoreConceptualGrade(g, learner, source), { verified: false, score: 0 });
  const empty = grade();
  empty.facets.forEach((f) => {
    f.score = 0;
    f.learnerQuote = "";
    f.referenceQuote = "";
  });
  assert.equal(scoreConceptualGrade(empty, learner, source).verified, false);
});
test("grade facets, model JSON and client-supplied scores fail closed", () => {
  const g = grade();
  g.facets[1].id = "correctness";
  assert.equal(conceptualGrade.safeParse(g).success, false);
  assert.throws(() => decodeCoachJSON(conceptualGrade, '{"supported":true}'));
  assert.throws(() =>
    decodeCoachJSON(conceptualGrade, "Here is an answer: " + JSON.stringify(grade())),
  );
  assert.deepEqual(
    decodeCoachJSON(conceptualGrade, "```json\n" + JSON.stringify(grade()) + "\n```"),
    grade(),
  );
  assert.equal(
    diagnosisInput.safeParse({
      studyUnitId: "u",
      sessionId: "s",
      confirmed: true,
      question: "",
      steps: [{ number: 1, latex: "x", description: "" }],
      score: 1,
    }).success,
    false,
  );
});
test("photo and transcript boundaries reject SVG, MIME spoofing and ambiguous numbering", () => {
  assert.throws(() =>
    checkedImage(
      "data:image/jpeg;base64," +
        Buffer.from("<svg><script>alert(1)</script></svg>").toString("base64"),
    ),
  );
  assert.equal(
    photoInput.safeParse({
      studyUnitId: "u",
      sessionId: "s",
      image: "data:image/svg+xml;base64,AAA",
    }).success,
    false,
  );
  assert.equal(
    transcriptionSchema.safeParse({
      steps: [{ number: 3, latex: "x", description: "", uncertain: false }],
      notice: "",
    }).success,
    false,
  );
  assert.equal(
    diagnosisInput.safeParse({
      studyUnitId: "u",
      sessionId: "s",
      confirmed: false,
      question: "",
      steps: [{ number: 1, latex: "x", description: "" }],
    }).success,
    false,
  );
});
test("streamed speech waits for complete sentences and preserves decimal numbers", () => {
  assert.deepEqual(speechSegments("Use 3.14 as a check. Now predict", false), {
    sentences: ["Use 3.14 as a check."],
    end: 20,
  });
  assert.equal(speechSegments("An unfinished thought", false).sentences.length, 0);
  assert.deepEqual(speechSegments("An unfinished thought", true).sentences, [
    "An unfinished thought",
  ]);
});
test("spoken mathematics omits unfinished notation, widgets and citation URLs", () => {
  assert.match(spokenMath(String.raw`\frac{x^2}{2}+\epsilon`), /x squared.*over.*2.*epsilon/);
  const said = speechText(
    '## Intuition\nTry $x^2$. [C1](https://private.example/source) <widget type="graph" data="{}" />',
  );
  assert.ok(said.includes("x squared"));
  assert.ok(!said.includes("https://"));
  assert.ok(!said.includes("<widget"));
  assert.equal(speechText("First think. Then $x^"), "First think. Then");
  assert.equal(
    spokenMath(String.raw`\begin{bmatrix}1&0\\0&1\end{bmatrix}`),
    "matrix shown on screen",
  );
});

test("nonmathematical formatting is blocked before it reaches the expression editor", async () => {
  const { unsafeMathFormatting } = await import("../lib/math-practice/display");
  assert.equal(unsafeMathFormatting(String.raw`\href{javascript:alert(1)}{x}`), true);
  assert.equal(unsafeMathFormatting(String.raw`\htmlData{href=https://example.com}{x}`), true);
  assert.equal(unsafeMathFormatting(String.raw`\frac{x^2}{2}+\epsilon`), false);
});
test("server algebra facts override contradictory AI diagnoses and preserve excluded inputs", async () => {
  const { groundDiagnosis } = await import("../lib/coach/diagnosis");
  const guessed = {
    summary: "Distribution is correct",
    steps: [
      { number: 1, status: "consistent" as const, feedback: "First expression", hint: "" },
      {
        number: 2,
        status: "consistent" as const,
        feedback: "The distribution is correct",
        hint: "Ignore the signs",
      },
    ],
    nextQuestion: "An unrelated question",
  };
  const result = groundDiagnosis(
    guessed,
    [{ latex: "-(2x-5)" }, { latex: "-2x-5" }],
    [
      {
        number: 2,
        result: {
          status: "not-equivalent",
          message: "Different",
          counterexample: { values: { x: -3 }, previous: 11, proposed: 1 },
        },
      },
    ],
  );
  assert.equal(result.steps[1].status, "revisit");
  assert.ok(!result.steps[1].feedback.includes("distribution is correct"));
  assert.match(result.steps[1].feedback, /11\.000000/);
  assert.match(result.steps[1].hint, /multiplication by -1/);
  assert.match(result.summary, /step 2/);
  const conditional = groundDiagnosis(
    guessed,
    [{ latex: "x/x" }, { latex: "1" }],
    [
      {
        number: 2,
        result: {
          status: "conditional",
          message: "Keep excluded values",
          conditions: ["x \\ne 0"],
        },
      },
    ],
  );
  assert.match(conditional.steps[1].feedback, /x \\ne 0/);
});
test("bounded server worker verifies a sign mismatch and rejects unsupported general equations", async () => {
  const { checkWorkingOnServer } = await import("../lib/coach/server-cas");
  const result = await checkWorkingOnServer([
    { number: 1, latex: "-(2x-5)", description: "", uncertain: false },
    { number: 2, latex: "-2x-5", description: "", uncertain: false },
  ]);
  assert.equal(result[0].result.status, "not-equivalent");
  const unsupported = await checkWorkingOnServer([
    { number: 1, latex: "x=1", description: "", uncertain: false },
    { number: 2, latex: "x=2", description: "", uncertain: false },
  ]);
  assert.equal(unsupported[0].result.status, "unsupported");
  const c = new AbortController();
  c.abort();
  assert.deepEqual(
    await checkWorkingOnServer(
      [
        { number: 1, latex: "x", description: "", uncertain: false },
        { number: 2, latex: "x", description: "", uncertain: false },
      ],
      c.signal,
    ),
    [],
  );
});
