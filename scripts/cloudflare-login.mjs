import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const home = resolve("../work/cloudflare");
mkdirSync(home, { recursive: true }); writeFileSync(resolve(home, ".gitignore"), "*\n");
const options = { env: { ...process.env, XDG_CONFIG_HOME: home, WRANGLER_LOG_PATH: resolve(home, "logs"), WRANGLER_SEND_METRICS: "false" }, windowsHide: true };
const cli = resolve("node_modules/wrangler/bin/wrangler.js");
const login = spawnSync(process.execPath, [cli, "login"], { ...options, stdio: "inherit" });
if (login.status !== 0) process.exit(login.status || 1);
const who = spawnSync(process.execPath, [cli, "whoami", "--json"], { ...options, encoding: "utf8" });
if (who.status !== 0) throw new Error("Could not identify the Cloudflare account.");
const accounts = JSON.parse(who.stdout).accounts;
const selected = accounts.find(account => account.id === process.env.CLOUDFLARE_ACCOUNT_ID) || (accounts.length === 1 ? accounts[0] : null);
if (!selected) throw new Error("Multiple accounts: set CLOUDFLARE_ACCOUNT_ID to the account you want and rerun.");
let content = readFileSync(".env", "utf8");
for (const [key, value] of Object.entries({ CLOUDFLARE_ACCOUNT_ID: selected.id, CLOUDFLARE_AUTH_MODE: "wrangler" })) {
  const line = `${key}=${JSON.stringify(value)}`; const pattern = new RegExp(`^${key}=.*$`, "m");
  content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}
writeFileSync(".env", content);
console.log("Cloudflare connected. Wrangler refreshes OAuth locally; no token was copied into .env.");
