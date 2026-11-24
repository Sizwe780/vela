import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, basename, join } from "node:path";
import { existsSync } from "node:fs";
import { structuredDocumentSchema } from "../lib/content/structured";
import { normalizeMath, mathSpans } from "../lib/content/math";

// Runs local OCR only. No LLM service, API key, or raw-text fallback.
async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const i = arg.indexOf("="); return [arg.slice(2, i), arg.slice(i + 1)]; }));
  if (!args.pdf || !/^[a-z][a-z0-9-]{0,79}$/.test(args.document ?? "") || !/^\d+-\d+$/.test(args.pages ?? "")) throw new Error("Usage: npm run parse:math -- --pdf=PATH --document=che1501-guide --pages=1-10 [--annotations=JSON]");
  const [first, last] = args.pages.split("-").map(Number);
  if (first < 1 || last < first || last - first > 9) throw new Error("Choose 1–10 physical PDF pages per reviewed batch.");
  const pdf = resolve(args.pdf);
  const sha256 = createHash("sha256").update(await readFile(pdf)).digest("hex");
  const output = resolve(`../work/math-parser/jobs/${sha256.slice(0, 16)}-${first}-${last}`);
  await mkdir(output, { recursive: true });
  const executable = process.env.MARKER_EXECUTABLE || resolve(process.platform === "win32" ? "../work/math-parser/venv/Scripts/python.exe" : "../work/math-parser/venv/bin/python");
  const launcher = process.env.MARKER_EXECUTABLE ? [] : [resolve("scripts/marker-local.py")];
  const localBackend = resolve("../work/math-parser/backend/llama/llama-server.exe");
  const localModel = resolve("../work/math-parser/backend/surya-2.5-Q8_0.gguf");
  const localProjector = resolve("../work/math-parser/backend/surya-2.5-mmproj.gguf");
  if (existsSync(localBackend) && (!existsSync(process.env.SURYA_GGUF_LOCAL_MODEL_PATH || localModel) || !existsSync(process.env.SURYA_GGUF_LOCAL_MMPROJ_PATH || localProjector))) throw new Error("Complete the local Surya model and projector downloads before parsing; see MATH_PIPELINE.md.");
  const runtimeEnvironment = { ...process.env };
  for (const key of ["LLAMA_CPP_BINARY", "SURYA_GGUF_LOCAL_MODEL_PATH", "SURYA_GGUF_LOCAL_MMPROJ_PATH"]) if (!runtimeEnvironment[key]) delete runtimeEnvironment[key];
  const profile = resolve(process.env.MARKER_PROFILE_DIR || "../work/math-parser/profile");
  await mkdir(profile, { recursive: true });
  const pageRange = Array.from({ length: last - first + 1 }, (_, i) => String(first + i - 1)).join(",");
  console.log(JSON.stringify({ phase: "local-ocr", document: basename(pdf), pages: args.pages, output }));
  await new Promise<void>((accept, reject) => {
    const child = spawn(executable, [...launcher, pdf, "--output_dir", output, "--output_format", "markdown", "--page_range", pageRange, "--mode", "balanced", "--disable_multiprocessing", "--force_ocr", "--ocr_inline_math", "true"], {
      stdio: "inherit", windowsHide: true, env: { ...runtimeEnvironment,
        // Surya hardcodes its server sentinels under expanduser("~/.cache").
        // Scope the Windows child profile to the workspace, as for local Ollama.
        ...(process.platform === "win32" ? {
          USERPROFILE: profile,
          OMP_NUM_THREADS: process.env.OMP_NUM_THREADS || "1",
          MKL_NUM_THREADS: process.env.MKL_NUM_THREADS || "1",
        } : {}),
        ...(existsSync(localBackend) && !process.env.LLAMA_CPP_BINARY ? { LLAMA_CPP_BINARY: localBackend } : {}),
        ...(existsSync(localModel) && !process.env.SURYA_GGUF_LOCAL_MODEL_PATH ? { SURYA_GGUF_LOCAL_MODEL_PATH: localModel } : {}),
        ...(existsSync(localProjector) && !process.env.SURYA_GGUF_LOCAL_MMPROJ_PATH ? { SURYA_GGUF_LOCAL_MMPROJ_PATH: localProjector } : {}),
        HF_HOME: resolve("../work/math-parser/huggingface"), MODEL_CACHE_DIR: resolve("../work/math-parser/models"),
        SURYA_INFERENCE_PARALLEL: process.env.SURYA_INFERENCE_PARALLEL || "1",
        XDG_CACHE_HOME: resolve("../work/math-parser/cache"), TORCH_HOME: resolve("../work/math-parser/torch"), PYTHONUTF8: "1", PYTHONUNBUFFERED: "1" },
    });
    child.on("error", reject); child.on("exit", code => code === 0 ? accept() : reject(new Error(`Marker exited ${code}; no document ingested.`)));
  });
  const markdownFiles: string[] = [];
  async function scan(dir: string) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await scan(path); else if (entry.name.endsWith(".md")) markdownFiles.push(path); } }
  await scan(output);
  if (markdownFiles.length !== 1) throw new Error("Expected one Marker Markdown result; inspect job output.");
  const markdown = normalizeMath(await readFile(markdownFiles[0], "utf8"));
  const formulas = mathSpans(markdown);
  const annotations = args.annotations ? JSON.parse(await readFile(resolve(args.annotations), "utf8")) : [];
  const document = structuredDocumentSchema.parse({ version: 1, parser: { name: "marker", version: "2.1.0", review: "machine" }, source: { document: args.document, sha256, pageStart: first, pageEnd: last }, blocks: [{ type: "markdown", id: "reading", markdown }, ...annotations] });
  await writeFile(join(output, "structured.json"), JSON.stringify(document, null, 2));
  console.log(JSON.stringify({ source: basename(pdf), output: join(output, "structured.json"), formulas: formulas.length, review: "machine — compare against original before approval" }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
