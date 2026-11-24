import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
const entry = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
    institution: z.string().default("UNISA"),
    moduleCode: z.string(),
    title: z.string(),
    filename: z.string().regex(/^[^/\\]+\.pdf$/i),
    directory: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export async function registeredSource(id: string) {
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(id)) return undefined;
  const rows = z
    .array(entry)
    .parse(JSON.parse(await readFile(resolve("content/source-catalog.json"), "utf8")));
  const matches = rows.filter((r) => r.id === id);
  if (matches.length > 1) throw Error("Ambiguous source registry");
  return matches[0];
}
