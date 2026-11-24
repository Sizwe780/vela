import { parentPort, workerData } from "node:worker_threads";
import { checkMathStep } from "../lib/math-practice/checker";
import type { WorkStep } from "../lib/coach/types";
async function run() {
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
