import { createHash } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { FactoryManifest } from "../lib/content/factory-evidence";

export function options() {
  const entries = process.argv.slice(2).map((arg) => {
    const parsed = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!parsed) throw new Error("Pass options after -- using --name=value.");
    return [parsed[1], parsed[2]];
  });
  return Object.fromEntries(entries);
}
export async function readJSON(input: string) {
  if ((await stat(input)).size > 8_000_000)
    throw new Error("Evidence or artifact JSON exceeds 8 MB. Split the batch.");
  return JSON.parse(await readFile(input, "utf8"));
}
export async function verifyPDFs(manifest: FactoryManifest, root: string, capture: boolean) {
  const targetRoot = resolve(
    process.env.CONTENT_FACTORY_EVIDENCE_DIR || "../work/content-factory/evidence",
  );
  if (capture) await mkdir(targetRoot, { recursive: true });
  async function hash(path: string) {
    const digest = createHash("sha256");
    for await (const bytes of createReadStream(path)) digest.update(bytes);
    return digest.digest("hex");
  }
  for (const source of manifest.sources) {
    const path = resolve(root, source.filename);
    if ((await stat(path)).size === 0 || (await hash(path)) !== source.sha256)
      throw new Error("PDF does not match its manifest lock: " + source.id);
    if (capture) {
      const target = resolve(targetRoot, source.sha256 + ".pdf");
      try {
        await copyFile(path, target, constants.COPYFILE_EXCL);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      if ((await hash(target)) !== source.sha256)
        throw new Error("The private evidence copy does not match its hash.");
    }
  }
}
