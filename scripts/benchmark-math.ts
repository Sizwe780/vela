import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { MathWorker } from "./math-worker";
import { mathSpans, normalizeMath } from "../lib/content/math";
const worker = new MathWorker();
async function main() {
  const dpi = Number(process.argv[2] || 144);
  const tag = process.argv[3] || "cpu";
  const folder = resolve(`../work/math-parser/benchmark/page14-${dpi}-${tag}`);
  await mkdir(folder, { recursive: true });
  try {
    await worker.run({ pdf: "C:/Users/sizwe/Documents/LMS/Mat1512/Mat1512-guide.pdf", page: 14, dpi, output: folder });
    const result = JSON.parse(await readFile(resolve(folder, "result.json"), "utf8"));
    const markdown = normalizeMath(result.markdown);
    const formulas = mathSpans(markdown).length;
    const check = { dpi, seconds: result.seconds, formulas, fraction: /\\frac\{x\^2\s*-\s*4\}\{x\s*-\s*2\}/.test(markdown), hasLeftTable: markdown.includes("1.9999"), hasRightTable: markdown.includes("2.0001"), hasLimit: /\\lim/.test(markdown), baselineSeconds: 197.72 };
    await writeFile(resolve(folder, "benchmark.json"), JSON.stringify(check, null, 2));
    console.log(JSON.stringify(check));
    if (tag === "gpu") {
      const next = resolve(`../work/math-parser/benchmark/page15-${dpi}-${tag}`);
      await mkdir(next, { recursive: true });
      await worker.run({ pdf: "C:/Users/sizwe/Documents/LMS/Mat1512/Mat1512-guide.pdf", page: 15, dpi, output: next });
      const warm = JSON.parse(await readFile(resolve(next, "result.json"), "utf8"));
      const result = { page: 15, dpi, backend: tag, seconds: warm.seconds, formulas: mathSpans(normalizeMath(warm.markdown)).length };
      await writeFile(resolve(next, "benchmark.json"), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result));
    }
  } finally { worker.stop(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; worker.stop(); });
