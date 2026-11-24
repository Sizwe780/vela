import { IngestError } from "./errors";
import { MAX_REQUEST_BYTES } from "./input";

export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  )
    throw new IngestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send a request body as application/json.",
    );
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES)
    throw new IngestError(413, "REQUEST_TOO_LARGE", "Request exceeds 2 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new IngestError(400, "INVALID_JSON", "A JSON request body is required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new IngestError(413, "REQUEST_TOO_LARGE", "Request exceeds 2 MB.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)));
  } catch {
    throw new IngestError(400, "INVALID_JSON", "The request body must be valid UTF-8 JSON.");
  }
}
