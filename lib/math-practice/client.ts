import type { MathCheckRequest, MathFeedback } from "./types";
export function checkInWorker(
  request: MathCheckRequest,
  signal?: AbortSignal,
): Promise<MathFeedback> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url));
    } catch {
      resolve({
        status: "unsupported",
        message:
          "This browser could not start the local checker. Your work is still here; ask your tutor to review the step.",
      });
      return;
    }
    let settled = false;
    const finish = (result: MathFeedback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      resolve(result);
    };
    const abort = () => finish({ status: "unsupported", message: "Check cancelled." });
    const timeout = setTimeout(
      () =>
        finish({
          status: "unsupported",
          message:
            "This check exceeded the local time limit. Break the line into a smaller step or ask your tutor.",
        }),
      4000,
    );
    worker.onmessage = (event: MessageEvent<MathFeedback>) => finish(event.data);
    worker.onerror = () =>
      finish({
        status: "unsupported",
        message:
          "The local checker is unavailable. Your work is still here; try again or ask your tutor.",
      });
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    try {
      worker.postMessage(request);
    } catch {
      finish({
        status: "unsupported",
        message: "The local check could not start. Try again or ask your tutor.",
      });
    }
  });
}
