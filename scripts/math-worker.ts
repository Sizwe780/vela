import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type OcrJob = { pdf: string; page: number; dpi: number; output: string };
export class MathWorker {
  private child?: ChildProcessWithoutNullStreams;
  private pending?: { resolve: (event: Record<string, unknown>) => void; reject: (error: Error) => void };
  private ready?: Promise<void>;
  constructor(
    private root = resolve("../work/math-parser"),
    private profile = resolve(root, "profile"),
  ) {}
  async start() {
    if (this.ready) return this.ready;
    await mkdir(this.profile, { recursive: true });
    let gpu = false;
    try { gpu = JSON.parse(await readFile("content/math-bulk-config.json", "utf8")).backend === "adreno-opencl"; } catch { /* Portable CPU default. */ }
    const gpuBinary = resolve(this.root, "gpu/bin/llama-server.exe");
    const env: NodeJS.ProcessEnv = { ...process.env, PYTHONUTF8: "1", PYTHONUNBUFFERED: "1",
      USERPROFILE: this.profile, HF_HOME: resolve(this.root, "huggingface"),
      MODEL_CACHE_DIR: resolve(this.root, "models"), XDG_CACHE_HOME: resolve(this.root, "cache"),
      TORCH_HOME: resolve(this.root, "torch"), SURYA_INFERENCE_PARALLEL: "1",
      LLAMA_CPP_BINARY: process.env.BULK_LLAMA_BINARY || (gpu && existsSync(gpuBinary) ? gpuBinary : resolve(this.root, "backend/llama/llama-server.exe")),
      SURYA_GGUF_LOCAL_MODEL_PATH: resolve(this.root, "backend/surya-2.5-Q8_0.gguf"),
      SURYA_GGUF_LOCAL_MMPROJ_PATH: resolve(this.root, "backend/surya-2.5-mmproj.gguf"),
      ...(process.platform === "win32" ? { FONT_PATH: process.env.FONT_PATH || "C:/Windows/Fonts/arial.ttf" } : {}),
    };
    const child = spawn(resolve(this.root, process.platform === "win32" ? "venv/Scripts/python.exe" : "venv/bin/python"), [resolve("scripts/marker-bulk-worker.py")], { env, windowsHide: true, stdio: "pipe" });
    this.child = child;
    this.ready = new Promise<void>((accept, reject) => {
      this.child!.once("error", reject);
      const lines = createInterface({ input: this.child!.stdout });
      lines.on("line", line => {
        if (!line.startsWith("LMS_EVENT ")) { void appendFile(resolve(this.root, "bulk-worker.log"), line + "\n"); return; }
        const event = JSON.parse(line.slice(10));
        if (event.type === "ready") accept();
        else if (this.pending) {
          const pending = this.pending; this.pending = undefined;
          if (event.type === "error") pending.reject(new Error(event.error)); else pending.resolve(event);
        }
      });
      this.child!.stderr.on("data", bytes => { void appendFile(resolve(this.root, "bulk-worker.log"), bytes); });
      child.once("exit", code => {
        const error = new Error(`OCR worker exited ${code}; see bulk-worker.log`); reject(error);
        if (this.child === child) { this.pending?.reject(error); this.pending = undefined; this.ready = undefined; this.child = undefined; }
      });
    });
    return this.ready;
  }
  async run(job: OcrJob) {
    await this.start();
    if (this.pending) throw new Error("Only one OCR job may run per worker");
    return new Promise<Record<string, unknown>>((resolveJob, reject) => {
      const timeout = setTimeout(() => {
        const child = this.child;
        this.pending = undefined; this.ready = undefined; this.child = undefined;
        child?.kill();
        reject(new Error("OCR page exceeded 15 minutes"));
      }, 900_000);
      this.pending = { resolve: event => { clearTimeout(timeout); resolveJob(event); }, reject: error => { clearTimeout(timeout); reject(error); } };
      this.child!.stdin.write(JSON.stringify(job) + "\n");
    });
  }
  stop() { if (this.child) this.child.stdin.end(JSON.stringify({ stop: true }) + "\n"); }
}
