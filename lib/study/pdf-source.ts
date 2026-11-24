import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const files: Record<string, string> = { guide: "Mat1512-guide.pdf", stewart: "Stewart.pdf" };
const hashes = new Map<string, Promise<string>>();
export function byteRange(header: string | null, size: number) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const suffix = !match[1];
  const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (![start, end].every(Number.isSafeInteger) || start < 0 || start > end || start >= size)
    return null;
  return { start, end, partial: true };
}

import { registeredSource } from "./source-catalog";
export async function sourcePdf(document: string, request: Request) {
  const registered = Object.hasOwn(files, document) ? undefined : await registeredSource(document);
  const filename = Object.hasOwn(files, document) ? files[document] : registered?.filename;
  if (!filename) return Response.json({ error: "Source not found" }, { status: 404 });
  if (!registered && !process.env.MAT1512_SOURCE_DIR)
    return Response.json(
      { error: "Source files are not configured on this server." },
      { status: 503 },
    );
  const path = join(
    registered ? resolve(registered.directory) : process.env.MAT1512_SOURCE_DIR!,
    filename,
  );
  const requestedHash = new URL(request.url).searchParams.get("sha");
  if (registered && requestedHash && requestedHash !== registered.sha256)
    return Response.json({ error: "Source version mismatch" }, { status: 409 });
  return serveSourcePdf(path, filename, request, registered?.sha256 ?? requestedHash);
}

export async function serveSourcePdf(
  path: string,
  filename: string,
  request: Request,
  expectedHash?: string | null,
) {
  let info;
  try {
    info = await stat(path);
    if (!info.isFile() || info.size === 0) throw new Error("Source is not a readable PDF file.");
  } catch {
    return Response.json({ error: "Original PDF is unavailable on this server." }, { status: 404 });
  }
  if (expectedHash) {
    const cacheKey = `${path}:${info.size}:${info.mtimeMs}`;
    if (!hashes.has(cacheKey))
      hashes.set(
        cacheKey,
        (async () => {
          const hash = createHash("sha256");
          for await (const part of createReadStream(path)) hash.update(part);
          return hash.digest("hex");
        })(),
      );
    if ((await hashes.get(cacheKey)) !== expectedHash)
      return Response.json(
        { error: "The original PDF version has changed. Re-ingest before using this citation." },
        { status: 409 },
      );
  }
  const range = byteRange(request.headers.get("range"), info.size);
  if (!range)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${info.size}` },
    });
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Accept-Ranges": "bytes",
    "Content-Length": String(range.end - range.start + 1),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  });
  if (range.partial) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
  const body =
    request.method === "HEAD"
      ? null
      : (Readable.toWeb(
          createReadStream(path, { start: range.start, end: range.end }),
        ) as ReadableStream<Uint8Array>);
  return new Response(body, { status: range.partial ? 206 : 200, headers });
}
