import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { IngestError } from "../ingest/errors";
import type { AIProvider } from "./config";

const execute = promisify(execFile);
let pending: Promise<string> | undefined;
let saved: { token: string; until: number } | undefined;

// Opt-in local development authentication. Wrangler owns OAuth refresh; no token is
// copied to source, browser code, command-line arguments or application logs.
export async function providerCredential(config: { provider: AIProvider; apiKey?: string }) {
  if (config.apiKey) return config.apiKey;
  if (config.provider !== "cloudflare" || process.env.CLOUDFLARE_AUTH_MODE !== "wrangler")
    throw new IngestError(503, "AI_NOT_CONFIGURED", "Connect the selected AI provider first.");
  if (saved && saved.until > Date.now()) return saved.token;
  pending ??= execute(
    process.execPath,
    [resolve("node_modules/wrangler/bin/wrangler.js"), "auth", "token", "--json"],
    {
      timeout: 20_000,
      windowsHide: true,
      maxBuffer: 32_000,
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: "false",
        XDG_CONFIG_HOME: resolve("../work/cloudflare"),
        WRANGLER_LOG_PATH: resolve("../work/cloudflare/logs"),
      },
    },
  )
    .then(({ stdout }) => {
      const token = JSON.parse(stdout).token as string;
      if (!/^[A-Za-z0-9_.-]{20,}$/.test(token)) throw new Error("Invalid credential output");
      saved = { token, until: Date.now() + 60_000 };
      return token;
    })
    .catch(() => {
      throw new IngestError(
        503,
        "CLOUDFLARE_LOGIN_REQUIRED",
        "Run npm run cloudflare:login and finish browser sign-in.",
      );
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
