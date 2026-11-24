import { authorizeIngestion } from "../../../lib/ingest/auth";
import { publicError } from "../../../lib/ingest/errors";
import { readJson } from "../../../lib/ingest/http";
import { ingestStudyText } from "../../../lib/ingest/runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    authorizeIngestion(request.headers.get("authorization"));
    const result = await ingestStudyText(await readJson(request));
    return Response.json(result, {
      status: result.reused ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure = publicError(error);
    return Response.json(
      { error: failure.error },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
