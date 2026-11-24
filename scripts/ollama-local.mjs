import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const root = resolve("../work/ollama");
const runtime = JSON.parse(readFileSync(new URL("../content/ollama-runtime.json", import.meta.url), "utf8"));
const installedWindows =
  process.platform === "win32"
    ? resolve(homedir(), "AppData", "Local", "Programs", "Ollama", "ollama.exe")
    : "";
const executable =
  process.env.OLLAMA_EXECUTABLE ||
  (existsSync(installedWindows) ? installedWindows : resolve(root, runtime.executable));
if (!existsSync(executable))
  throw new Error("Ollama is missing. Install Ollama normally or set OLLAMA_EXECUTABLE.");
const usingInstalledWindows = existsSync(installedWindows) && executable === installedWindows;
const profile = resolve(root, "profile");
mkdirSync(profile, { recursive: true });
const env = usingInstalledWindows
  ? {
      ...process.env,
      OLLAMA_HOST: process.env.OLLAMA_HOST || "127.0.0.1:11434",
      OLLAMA_NO_CLOUD: "1",
      OLLAMA_NUM_PARALLEL: "1",
      OLLAMA_MAX_LOADED_MODELS: "2",
      OLLAMA_CONTEXT_LENGTH: "4096",
      OLLAMA_KEEP_ALIVE: "30m",
    }
  : {
      ...process.env,
      USERPROFILE: profile,
      OLLAMA_MODELS: resolve(root, "models"),
      OLLAMA_HOST: process.env.OLLAMA_HOST || "127.0.0.1:11434",
      OLLAMA_NO_CLOUD: "1",
      OLLAMA_NUM_PARALLEL: "1",
      OLLAMA_MAX_LOADED_MODELS: "2",
      OLLAMA_CONTEXT_LENGTH: "4096",
      OLLAMA_KEEP_ALIVE: "30m",
      OLLAMA_MAX_TRANSFER_STREAMS: "16",
    };
const child = spawn(executable, process.argv.slice(2), {
  stdio: "inherit",
  windowsHide: true,
  env,
});
child.on("exit", code => { process.exitCode = code ?? 1; });
child.on("error", () => { console.error("Could not start portable Ollama."); process.exitCode = 1; });
