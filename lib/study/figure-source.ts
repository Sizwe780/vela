import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

export async function sourceFigure(asset: string) {
  if (!/^[a-f0-9]{64}\.(png|pdf)$/.test(asset)) return new Response(null, { status: 404 });
  const pdf = asset.endsWith(".pdf");
  let bytes: Buffer;
  try {
    bytes = await readFile(
      join(process.env.MATH_ASSET_DIR || resolve("../work/math-parser/bulk/assets"), asset),
    );
  } catch {
    return new Response(null, { status: 404 });
  }
  if (
    !(pdf
      ? bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
      : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    createHash("sha256").update(bytes).digest("hex") + (pdf ? ".pdf" : ".png") !== asset
  )
    return new Response(null, { status: 409 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": pdf ? "application/pdf" : "image/png",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
