import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parse } from "dotenv";

let content = readFileSync(".env", "utf8");
const env = parse(content);
for (const key of ["NEON_AUTH_COOKIE_SECRET", "INGEST_API_TOKEN"]) {
  if (env[key]) continue;
  const value = randomBytes(32).toString("base64url");
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
  console.log(`Generated ${key} (value not printed).`);
}
writeFileSync(".env", content);
