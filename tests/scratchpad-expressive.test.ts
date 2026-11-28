import test from "node:test";
import assert from "node:assert/strict";
import { checkMathStep } from "../lib/math-practice/checker";
import { symbolicStep } from "../lib/math-practice/steps";
import { parseMath } from "../lib/math-practice/parser";
import { createMathProblem } from "../lib/math-practice/problems";
import { checkMatrixStep, matrixLatex, reducedMatrix } from "../lib/math-practice/matrix";
import { practiceSnapshot } from "../lib/math-practice/notebook";
const check = (
  r: string,
  n: string,
  mode: "expression" | "antiderivative" | "derivative" = "expression",
) => checkMathStep({ kind: "symbolic", reference: r, next: n, mode, variable: "x" });
const verified = (status: string) =>
  assert.ok(["equivalent", "conditional"].includes(status), status);
test("mixed polynomial regression rejects the genuine sign error and keeps last valid line", async () => {
  const r = "(x+1)(2x-3)^3-(x^2+4x-1)^2",
    a = "(x+1)(8x^3-36x^2+54x-27)-(x^4+8x^3+14x^2-8x+1)",
    b = "(8x^4-28x^3-18x^2+27x-27)-(x^4+8x^3+14x^2-8x+1)",
    c = "7x^4-36x^3-32x^2+35x-28";
  verified((await checkMathStep(symbolicStep(r, a, "expression", "x", []))).status);
  const wrong = await checkMathStep(symbolicStep(r, b, "expression", "x", [a]));
  assert.equal(wrong.status, "not-equivalent");
  assert.equal(wrong.counterexample?.previous, 1442);
  assert.equal(wrong.counterexample?.proposed, 1118);
  assert.equal(
    (await checkMathStep(symbolicStep(r, c, "expression", "x", [a]))).status,
    "not-equivalent",
  );
  verified((await check(a, "7x^4-36x^3+4x^2+35x-28")).status);
});
test("mixed logarithmic exponential primitive and split integrals verify without prescribed methods", async () => {
  const r = String.raw`\int \left(\frac{3x^2+2x}{x^3+x^2+1}+xe^{-2x}\right)\,dx`;
  const split = String.raw`\int \frac{3x^2+2x}{x^3+x^2+1}\,dx+\int xe^{-2x}\,dx`;
  verified((await check(r, split, "antiderivative")).status);
  const final = String.raw`= \ln\left|x^3+x^2+1\right|-\frac{2x+1}{4}e^{-2x}+C`;
  const result = await check(r, final, "antiderivative");
  assert.equal(result.status, "conditional");
  assert.ok(result.conditions?.some((c) => c.includes("ne") || c.includes(">")));
  assert.equal(
    (await check(r, String.raw`\ln\left|x^3+x^2+1\right|+\frac{2x+1}{4}e^{-2x}`, "antiderivative"))
      .status,
    "not-equivalent",
  );
});
test("radical rationalisation retains exclusions and limit operators", async () => {
  const r = String.raw`\lim_{x\to 2}\left(\frac{\sqrt{x+2}-2}{x-2}\right)`,
    a = String.raw`\lim_{x\to 2}\left(\frac{1}{\sqrt{x+2}+2}\right)`;
  verified((await check(r, a)).status);
  verified((await check(a, String.raw`\frac{1}{4}`)).status);
  assert.equal((await check(r, String.raw`\frac{1}{\sqrt{x+2}+2}`)).status, "not-equivalent");
  const raw = await check("(sqrt(x+2)-2)/(x-2)", "1/(sqrt(x+2)+2); x != 2");
  assert.equal(raw.status, "conditional");
  assert.ok(raw.conditions?.some((c) => c.includes("ne")));
  for (const [r, n] of [
    ["lim(x->0)(sin(x)/x)", "1"],
    ["lim(x->0)((exp(x)-1)/x)", "1"],
    ["lim(x->0)((sqrt(x+1)-1)/x)", "1/2"],
  ])
    verified((await check(r, n)).status);
  for (const r of ["lim(x->0)(1/x)", "lim(x->0)(1/x^2)", "lim(x->0)(sqrt(x))"])
    assert.equal((await check(r, "0")).status, "unsupported");
});
test("domain restrictions are explicit, survive accepted steps and reject empty intervals", async () => {
  verified((await check("$= (x+1)^3$", "x^3+3x^2+3x+1")).status);
  assert.equal((await check("sqrt(x^2)", "x")).status, "not-equivalent");
  assert.equal((await check("sqrt(x^2); x > 0", "x")).status, "conditional");
  assert.equal((await check("ln(-1)", "ln(-1)")).status, "unsupported");
  assert.equal((await check("ln(-x^2-1)", "ln(-x^2-1)")).status, "unsupported");
  assert.equal((await check("x; x > 2, x < 1", "x")).status, "unsupported");
  const req = symbolicStep("(x^2-4)/(x-2)", "x+2", "expression", "x", ["x+2"]);
  const result = await checkMathStep(req);
  assert.equal(result.status, "conditional");
  assert.ok(result.conditions?.some((c) => c.includes("ne")));
  assert.equal((await check("x", "u=x^2")).status, "unsupported");
});
test("multi-rule differentiation allows full equivalent intermediate expressions", async () => {
  const f = String.raw`e^{2x}\sin(3x)+\frac{\ln(x^2+1)}{x+1}`;
  const derivative = String.raw`e^{2x}(2\sin(3x)+3\cos(3x))+\frac{\frac{2x}{x^2+1}(x+1)-\ln(x^2+1)}{(x+1)^2}`;
  verified((await check(f, derivative, "derivative")).status);
  verified((await checkMathStep(symbolicStep("sin(x)", "cos(x)", "derivative", "x", []))).status);
  verified(
    (await checkMathStep(symbolicStep("sin(x)", "cos(x)+0", "derivative", "x", ["cos(x)"]))).status,
  );
  verified((await check("cos(x)^2-sin(x)^2", "cos(2x)")).status);
});
test("all richer generator families produce independently checkable answers", async () => {
  for (const topic of ["expand", "integral", "limit"] as const)
    for (let seed = 0; seed < 20; seed++) {
      const p = createMathProblem(topic, seed);
      const result = await check(p.reference, p.answer, p.mode);
      assert.ok(
        ["equivalent", "conditional"].includes(result.status),
        `${p.id}: ${result.message}`,
      );
    }
});
test("matrix evidence separates a correct matrix from a wrong declaration and supports free-variable RREF", () => {
  const r = matrixLatex([
      [-2, 1, 4, 13],
      [2, -1, -3, -10],
      [1, -1, -3, -10],
    ]),
    next = matrixLatex([
      [-2, 1, 4, 13],
      [0, 0, 1, 3],
      [1, -1, -3, -10],
    ]);
  const result = checkMatrixStep(r, next, { kind: "add", source: 1, target: 2, factor: "-2" });
  assert.equal(result.status, "not-equivalent");
  assert.equal(result.matrixEvidence?.rowEquivalent, true);
  assert.equal(result.matrixEvidence?.inferredOperation?.factor, "1");
  assert.equal(
    checkMatrixStep(r, next, result.matrixEvidence!.inferredOperation!).status,
    "equivalent",
  );
  const large = matrixLatex([
    [1, 2, 3, 4, 5, 6, 7],
    [0, 1, 2, 3, 4, 5, 6],
    [0, 0, 1, 2, 3, 4, 5],
    [0, 0, 0, 1, 2, 3, 4],
    [0, 0, 0, 0, 1, 2, 3],
    [0, 0, 0, 0, 0, 1, 2],
  ]);
  assert.equal(
    checkMatrixStep(large, reducedMatrix(large), {
      kind: "equivalence",
      source: 1,
      target: 1,
      factor: "1",
    }).status,
    "equivalent",
  );
  const free = matrixLatex([
    [1, 2, 3, 4],
    [2, 4, 6, 8],
  ]);
  assert.equal(
    checkMatrixStep(free, reducedMatrix(free), {
      kind: "equivalence",
      source: 1,
      target: 1,
      factor: "1",
    }).status,
    "equivalent",
  );
});
test("scratch notes save separately from mathematical lines with old snapshot compatibility", () => {
  const snapshot = {
    version: 1,
    reference: "x",
    draft: "x",
    mode: "expression",
    variable: "x",
    matrix: false,
    operation: { kind: "add", source: 1, target: 2, factor: "1" },
    context: "",
    lines: [],
  };
  assert.equal(practiceSnapshot.safeParse(snapshot).success, true);
  assert.equal(
    practiceSnapshot.parse({ ...snapshot, notes: "u = x³ + x² + 1; du = …" }).notes,
    "u = x³ + x² + 1; du = …",
  );
});
