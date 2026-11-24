import { readFile, mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const root = resolve("../work/math-parser/bulk");
async function main() {
  const action = process.argv[2] || "status";
  await mkdir(root, { recursive: true });
  const lockPath = resolve(root, "runner.lock");
  let lock: { pid: number } | null = null;
  try { lock = JSON.parse(await readFile(lockPath, "utf8")); } catch { /* Not started. */ }
  let alive = false;
  if (lock && Number.isSafeInteger(lock.pid) && lock.pid > 0) {
    try { process.kill(lock.pid, 0); alive = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") alive = true; }
  }
  if (action === "pause") { await writeFile(resolve(root, "pause.request"), "Pause after the current page\n"); console.log("Pause requested; the current page will finish and checkpoint."); return; }
  if (action === "status") {
    try { console.log(JSON.stringify({ ...(JSON.parse(await readFile("bulk-conversion-status.json", "utf8"))), runnerAlive: alive }, null, 2)); }
    catch { console.log("Bulk conversion has not started."); }
    return;
  }
  if (!["start", "resume"].includes(action)) throw new Error("Choose status, pause, start or resume");
  if (alive) { console.log(`Bulk conversion is already running (PID ${lock!.pid}).`); return; }
  if (lock) await unlink(lockPath);
  await unlink(resolve(root, "pause.request")).catch(() => {});
  const child = spawn(process.execPath, ["--require", "./scripts/windows-runtime.cjs", "--import", "tsx", "scripts/bulk-convert.ts", ...process.argv.slice(3)], { cwd: process.cwd(), windowsHide: true, stdio: "inherit", env: process.env });
  await new Promise<void>((accept, reject) => { child.once("spawn", () => accept()); child.once("error", reject); });
  console.log(`Bulk conversion running (PID ${child.pid}). Keep this process open. Use npm run bulk:status to inspect progress; npm run bulk:pause checkpoints and pauses it.`);
  process.exitCode = await new Promise<number>(accept => child.once("exit", code => accept(code ?? 1)));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
