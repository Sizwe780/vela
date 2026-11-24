import "server-only";
import { IngestError, publicError } from "../ingest/errors";
import { logServerError } from "../log-error";
export const privateHeaders = { "Cache-Control": "private, no-store" };
export function studentFailure(error: unknown) {
  if (!(error instanceof IngestError)) logServerError("student-service", error);
  const f = publicError(
    error instanceof IngestError
      ? error
      : new IngestError(
          503,
          "SERVICE_UNAVAILABLE",
          "This feature is temporarily unavailable. Please retry.",
        ),
  );
  return Response.json({ error: f.error }, { status: f.status, headers: privateHeaders });
}
