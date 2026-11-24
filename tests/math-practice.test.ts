import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMathStep } from "../lib/math-practice/checker";
import { createMathProblem } from "../lib/math-practice/problems";
import { checkMatrixStep, matrixLatex, reducedMatrix } from "../lib/math-practice/matrix";
const check = (
  reference: string,
  next: string,
  mode: "expression" | "antiderivative" | "derivative" = "expression",
) => checkMathStep({ kind: "symbolic", reference, next, mode, variable: "x" });
test("local CAS verifies algebra and trigonometry without fusing x and cos", async () => {
  assert.equal((await check("(x+1)^2", "x^2+2x+1")).status, "equivalent");
  assert.equal((await check(String.raw`\sin^2(x)+\cos^2(x)`, "1")).status, "equivalent");
  assert.equal((await check(String.raw`x\cos(x)`, String.raw`\cos(x)x`)).status, "equivalent");
});
test("an integration-by-parts line with an unevaluated integral is verified by differentiation", async () => {
  const start = String.raw`\int x\cos(x)\,dx`;
  assert.equal(
    (await check(start, String.raw`x\sin(x)-\int \sin(x)\,dx`, "antiderivative")).status,
    "equivalent",
  );
  assert.equal(
    (await check(start, String.raw`x\sin(x)+\cos(x)+C`, "antiderivative")).status,
    "equivalent",
  );
  const wrong = await check(start, String.raw`x\sin(x)-\cos(x)`, "antiderivative");
  assert.equal(wrong.status, "not-equivalent");
  assert.ok(wrong.counterexample);
  assert.ok(wrong.residualLatex?.includes("sin"));
});
test("cancellation retains excluded inputs and domain-sensitive roots are not guessed", async () => {
  const result = await check(String.raw`\frac{x^2-1}{x-1}`, "x+1");
  assert.equal(result.status, "conditional");
  assert.ok(result.conditions?.length);
  assert.equal((await check(String.raw`\sqrt{x^2}`, "x")).status, "unsupported");
  assert.equal((await check(String.raw`\ln(x)`, String.raw`\ln(x)`)).status, "unsupported");
  assert.equal((await check("x^x", "x^x")).status, "unsupported");
  assert.equal((await check("1/0", "0")).status, "unsupported");
});
test("finite rational limits and derivative operators can be rewritten line by line", async () => {
  assert.equal(
    (await check(String.raw`\lim_{x\to 0}\left(1/x^2\right)`, "0")).status,
    "unsupported",
  );
  assert.equal((await check(String.raw`\lim_{x\to 0}\left(e^x\right)`, "1")).status, "unsupported");
  assert.equal(
    (await check(String.raw`\lim_{x\to 2}\left(\frac{x^2-4}{x-2}\right)`, "4")).status,
    "equivalent",
  );
  assert.equal((await check(String.raw`\lim_{x\to 0}\left(1/x\right)`, "0")).status, "unsupported");
  assert.equal(
    (await check(String.raw`\frac{d}{dx}\left(3x^2+2x\right)`, "6x+2")).status,
    "equivalent",
  );
});
test("matrix checks use exact fractions and the declared operation, including the augmented column", () => {
  const a = matrixLatex([
    [1, 2, 3, 4],
    [2, 5, 7, 9],
    [0, 1, 2, 3],
  ]);
  const valid = matrixLatex([
    [1, 2, 3, 4],
    [0, 1, 1, 1],
    [0, 1, 2, 3],
  ]);
  assert.equal(
    checkMatrixStep(a, valid, { kind: "add", source: 1, target: 2, factor: "-2" }).status,
    "equivalent",
  );
  const wrong = matrixLatex([
    [1, 2, 3, 4],
    [0, 1, -1, 1],
    [0, 1, 2, 3],
  ]);
  assert.match(
    checkMatrixStep(a, wrong, { kind: "add", source: 1, target: 2, factor: "-2" }).message,
    /row 2, column 3/,
  );
  assert.equal(
    checkMatrixStep(a, a, { kind: "scale", source: 1, target: 2, factor: "0" }).status,
    "not-equivalent",
  );
  assert.equal(
    checkMatrixStep(
      matrixLatex([
        [2, 1],
        [0, 1],
      ]),
      matrixLatex([
        [1, "1/2"],
        [0, 1],
      ]),
      { kind: "scale", source: 1, target: 1, factor: String.raw`\frac{1}{2}` },
    ).status,
    "equivalent",
  );
});
test("parameterized templates are reproducible, varied, and mathematically checked", async () => {
  for (const topic of ["expand", "derivative", "integral", "limit", "matrix"] as const) {
    const variants = new Set<string>();
    for (const seed of [1, 2, 17, 400, 999]) {
      const p = createMathProblem(topic, seed);
      assert.deepEqual(p, createMathProblem(topic, seed));
      variants.add(p.reference);
      if (topic === "matrix") assert.equal(reducedMatrix(p.reference), p.answer);
      else
        assert.ok(
          ["equivalent", "conditional"].includes(
            (await check(p.reference, p.answer, p.mode)).status,
          ),
          `${topic}/${seed}`,
        );
    }
    assert.ok(variants.size > 1);
  }
});
test("unsupported commands and unbounded powers cannot reach the symbolic evaluator", async () => {
  for (const bad of [
    "x=1",
    "set(x,1)",
    "x^9999",
    "x".repeat(601),
    String.raw`\href{javascript:alert(1)}{x}`,
  ])
    assert.equal((await check(bad, "1")).status, "unsupported");
});
