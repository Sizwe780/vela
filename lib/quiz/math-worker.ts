import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import type { MathFeedback } from "../math-practice/types";
export type FormulaPair = { reference: string; candidate: string; notationUnclear?: boolean };
let active = 0;
export async function compareQuizFormulas(pairs: FormulaPair[]): Promise<MathFeedback[]> {
  if (!pairs.length || pairs.length > 32 || active >= 2) return [];
  active++;
  return new Promise((done) => {
    let worker: Worker;
    try {
      worker = new Worker(
        resolve(process.cwd(), "generated/coach-cas/scripts/coach-cas-worker.js"),
        { workerData: { kind: "quiz", pairs }, resourceLimits: { maxOldGenerationSizeMb: 96 } },
      );
    } catch {
      active--;
      done([]);
      return;
    }
    let settled = false;
    const finish = (value: MathFeedback[]) => {
      if (settled) return;
      settled = true;
      active--;
      clearTimeout(timeout);
      void worker.terminate();
      done(value);
    };
    const timeout = setTimeout(() => finish([]), 8000);
    worker.on("message", (value) => finish(Array.isArray(value) ? value : []));
    worker.on("error", () => finish([]));
    worker.on("exit", () => finish([]));
  });
}
