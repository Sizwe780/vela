import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type MarkerFigure = {
  reference: string;
  file: string;
  vector?: string;
  vectorError?: string;
};

export async function storeMarkerFigure(source: string, destination: string, image: MarkerFigure) {
  async function save(file: string, kind: "png" | "pdf") {
    const pattern = kind === "png" ? /^figure-\d+\.png$/ : /^figure-\d+\.pdf$/;
    if (!pattern.test(file)) throw new Error("Invalid worker figure filename");
    const bytes = await readFile(join(source, file));
    const header =
      kind === "png" ? Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) : Buffer.from("%PDF-");
    if (!bytes.subarray(0, header.length).equals(header)) throw new Error("Invalid source figure");
    const asset = createHash("sha256").update(bytes).digest("hex") + "." + kind;
    const temporary = join(destination, `${asset}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, bytes, { flag: "wx", flush: true });
      await rename(temporary, join(destination, asset));
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    return asset;
  }
  const asset = await save(image.file, "png");
  const vectorAsset = image.vector ? await save(image.vector, "pdf") : undefined;
  if (image.vectorError) console.warn(image.vectorError);
  return { asset, ...(vectorAsset ? { vectorAsset } : {}) };
}
