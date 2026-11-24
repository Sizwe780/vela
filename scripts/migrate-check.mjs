import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const connection = readFileSync(process.argv[2], "utf8").trim();
if (!connection.startsWith("postgres")) throw new Error("Expected a private file containing the temporary branch direct URL.");
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: connection, DATABASE_URL_UNPOOLED: connection } });
process.exitCode = result.status ?? 1;
