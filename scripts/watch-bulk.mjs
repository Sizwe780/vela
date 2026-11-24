import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const summaryPath = new URL("../bulk-conversion-status.json", import.meta.url);
const lockPath = new URL("../../work/math-parser/bulk/runner.lock", import.meta.url);
async function render() {
  try {
    const progress = JSON.parse(await readFile(summaryPath, "utf8"));
    let alive = false;
    try {
      const { pid } = JSON.parse(await readFile(lockPath, "utf8"));
      if (Number.isSafeInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); alive = true; }
        catch (error) { alive = error.code !== "ESRCH"; }
      }
    } catch { /* No active runner lock. */ }
    if (process.stdout.isTTY) console.clear();
    console.log([
      `MAT1512 conversion — ${alive ? "RUNNING" : "STOPPED"}`,
      `Published: ${progress.converted}/${progress.total} (${(100 * progress.converted / progress.total).toFixed(1)}%)`,
      `Pending: ${progress.remaining} | Held for review: ${progress.needsReview}`,
      `Embeddings: Ollama ${progress.providers.ollama} | Cloudflare ${progress.providers.cloudflare}`,
      ...Object.entries(progress.units).map(([code, unit]) => `${code}: ${unit.converted}/${unit.total} pages; ${unit.needsReview} held`),
      `Last checkpoint: ${new Date(progress.updatedAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false })} SAST`,
      "Refreshes every 15 seconds. Ctrl+C closes this monitor; conversion keeps running.",
    ].join("\n"));
  } catch {
    console.log(`Progress is not readable yet: ${fileURLToPath(summaryPath)}. Retrying on the next refresh.`);
  }
}
await render();
if (!process.argv.includes("--once")) setInterval(() => { void render(); }, 15_000);
