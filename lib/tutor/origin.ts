import { IngestError } from "../ingest/errors";

export function assertTutorOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next's internal URL may say localhost while the browser requested
  // 127.0.0.1. The HTTP Host identifies the browser-facing origin.
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (origin && origin !== expected)
    throw new IngestError(
      403,
      "CROSS_ORIGIN_REQUEST",
      "Send tutor requests from this application.",
    );
}
