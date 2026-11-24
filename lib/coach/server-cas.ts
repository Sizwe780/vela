import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import type { WorkStep } from "./types";
import type { MathFeedback } from "../math-practice/types";
export type ServerStepCheck = { number: number; result: MathFeedback };
let active = 0;
export async function checkWorkingOnServer(
  steps: WorkStep[],
  signal?: AbortSignal,
): Promise<ServerStepCheck[]> {
  if (active >= 2 || signal?.aborted || steps.length < 2) return [];
  active++;
  return new Promise((resolveResult) => {
    let worker: Worker;
    try {
      worker = new Worker(
        resolve(process.cwd(), "generated/coach-cas/scripts/coach-cas-worker.js"),
        { workerData: steps, resourceLimits: { maxOldGenerationSizeMb: 96 } },
      );
    } catch {
      active--;
      resolveResult([]);
      return;
    }
    let settled = false;
    const finish = (result: ServerStepCheck[]) => {
      if (settled) return;
      settled = true;
      active--;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      void worker.terminate();
      resolveResult(result);
    };
    const timeout = setTimeout(() => finish([]), 5000);
    const abort = () => finish([]);
    signal?.addEventListener("abort", abort, { once: true });
    worker.on("message", (data: ServerStepCheck[]) => finish(data));
    worker.on("error", () => finish([]));
    worker.on("exit", () => finish([]));
  });
}
