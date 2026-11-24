import { createHash, timingSafeEqual } from "node:crypto";
import { IngestError } from "./errors";

export function authorizeIngestion(authorization: string | null) {
  const token = process.env.INGEST_API_TOKEN;
  if (!token)
    throw new IngestError(
      503,
      "INGEST_NOT_CONFIGURED",
      "Ingestion authentication is not configured.",
    );
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(token)))
    throw new IngestError(401, "UNAUTHORIZED", "A valid ingestion bearer token is required.");
}
