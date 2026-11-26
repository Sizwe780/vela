import test from "node:test";
import assert from "node:assert/strict";
import { checkShortAnswers } from "../lib/quiz/answers";
import { gradeQuiz } from "../lib/quiz/engine";

test("formula answers accept LaTeX wrappers, rational rewrites and reviewed speed notation", async () => {
  const results = await checkShortAnswers([
    {
      prompt: "Give the gravitational acceleration formula",
      accepted: [String.raw`g=4\pi^2/m`],
      value: String.raw`$$g=\frac{4\pi^2}{m}$$`,
    },
    { prompt: "Give a speed estimate", accepted: ["v=w/t"], value: "d/t" },
    { prompt: "Give a speed estimate", accepted: ["v=w/t"], value: "v=w/t or d/t" },
    { prompt: "Give a speed estimate", accepted: ["v=w/t"], value: "v=t/w" },
    { prompt: "Give a speed estimate", accepted: ["v=w/t"], value: "v=w/t or v=t/w" },
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["correct", "correct", "correct", "incorrect", "incorrect"],
  );
});
test("unknown notation and physical relations are not guessed or graded as wrong", async () => {
  const results = await checkShortAnswers([
    {
      prompt: "Recover gravity from the fitted slope",
      accepted: [String.raw`g=4\pi^2/m`],
      value: String.raw`g=4\pi^2 L/T^2`,
    },
    { prompt: "Give the expression", accepted: ["a=b/c"], value: "a=d/c" },
    { prompt: "Give the expression", accepted: ["T=x+1"], value: "t=x+1" },
    {
      prompt: "Explain the learning process",
      accepted: ["learners build knowledge through experience"],
      value: "People actively construct their understanding.",
    },
  ]);
  assert.ok(results.every((r) => r.status === "unverified"));
  const aliased = await checkShortAnswers([
    {
      prompt: "Find the ratio",
      accepted: ["a=b/c"],
      value: "a=d/c",
      rules: { kind: "expression", aliases: { d: "b" } },
    },
  ]);
  assert.equal(aliased[0].status, "correct");
});
test("terminology uses reviewed equivalents rather than keyword matching or answer shotgun", async () => {
  const results = await checkShortAnswers([
    {
      prompt: "Name the quantity",
      accepted: ["fractional uncertainty"],
      value: "relative uncertainty",
    },
    {
      prompt: "Complete the statement with the exact missing term",
      accepted: ["period"],
      value: "time for one complete oscillation",
    },
    {
      prompt: "Complete the statement with the exact missing term",
      accepted: ["density"],
      value: "density or momentum",
    },
    {
      prompt: "Complete the statement with the exact missing term",
      accepted: ["density"],
      value: "momentum",
    },
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["correct", "correct", "incorrect", "incorrect"],
  );
});
test("unverified quiz items are excluded from the score and all-unverified outcomes receive no mastery", async () => {
  const question = {
    id: "q",
    learningOutcomeId: "outcome",
    sourceChunkId: "chunk",
    points: 1,
    kind: "SHORT_ANSWER" as const,
    prompt: "Give a formula",
    options: null,
    answer: { accepted: ["a=b/c"] },
    explanation: "Reference relationship.",
  };
  const result = await gradeQuiz(
    "attempt",
    "unit",
    [question],
    [{ questionId: "q", value: "a=d/c" }],
  );
  assert.equal(result.score, null);
  assert.equal(result.possible, 0);
  assert.deepEqual(result.mastery, []);
  assert.equal(result.feedback[0].status, "unverified");
});

test("symbolic rewrites preserve source domains and do not introduce new excluded inputs", async () => {
  const results = await checkShortAnswers([
    { prompt: "Simplify", accepted: ["x"], value: "x^2/x" },
    { prompt: "Simplify", accepted: ["x^2/x"], value: "x" },
    { prompt: "Simplify", accepted: ["x+1"], value: "x+1+y-y" },
  ]);
  assert.equal(results[0].status, "unverified");
  assert.equal(results[1].status, "correct");
  assert.equal(results[2].status, "correct");
});
