import { checkMathStep } from "./checker";
import type { MathCheckRequest } from "./types";
// Dedicated worker: no network calls, persistence, grades or privileged operations.
self.onmessage = async (event: MessageEvent<MathCheckRequest>) => {
  self.postMessage(await checkMathStep(event.data));
};
