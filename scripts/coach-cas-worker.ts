import { parentPort, workerData } from "node:worker_threads";
import { checkMathStep } from "../lib/math-practice/checker";
import type { WorkStep } from "../lib/coach/types";
import { parseMath } from "../lib/math-practice/parser";
import nerdamer from "nerdamer";
async function denominatorVariables(expression: string) {
  const parsed = await parseMath(expression);
  const variables = new Set<string>();
  for (const denominator of parsed.denominators) {
    const value = nerdamer.simplify(denominator);
    if (!value.variables().length) continue;
    // Only certify monomial denominator domains. Sums/poles need a fuller review.
    if (/[+\-]/.test(value.toString().replace(/^-/, ""))) return null;
    for (const variable of value.variables()) variables.add(variable);
  }
  return variables;
}
async function run() {
  if (workerData?.kind === "quiz") {
    const pairs = workerData.pairs as { reference: string; candidate: string }[];
    if (!Array.isArray(pairs) || pairs.length > 32) return parentPort?.postMessage([]);
    const results = [];
    for (const pair of pairs) {
      let result = await checkMathStep({
        kind: "symbolic",
        mode: "expression",
        variable: "x",
        reference: pair.reference,
        next: pair.candidate,
      });
      if (result.status === "conditional") {
        const left = await denominatorVariables(pair.reference),
          right = await denominatorVariables(pair.candidate);
        if (!left || !right || [...right].some((v) => !left.has(v)))
          result = {
            status: "unsupported",
            message:
              "The proposed expression introduces or changes an excluded input. Review its domain before grading.",
          };
      }
      results.push(result);
    }
    return parentPort?.postMessage(results);
  }
  const steps = workerData as WorkStep[];
  const results = [];
  const integral = /\\int\b/.test(steps[0]?.latex ?? "");
  const variable = (steps[0]?.latex.match(/d\s*([xyzt])\s*$/)?.[1] ?? "x") as "x" | "y" | "z" | "t";
  for (let i = 1; i < steps.length; i++) {
    if (!steps[i - 1].latex.trim() || !steps[i].latex.trim()) continue;
    const result = await checkMathStep({
      kind: "symbolic",
      reference: steps[integral ? 0 : i - 1].latex,
      next: steps[i].latex,
      mode: integral ? "antiderivative" : "expression",
      variable,
    });
    results.push({ number: i + 1, result });
  }
  parentPort?.postMessage(results);
}
run().catch(() => parentPort?.postMessage([]));
