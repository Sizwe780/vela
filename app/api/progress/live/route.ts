import { requireLearner } from "../../../../lib/auth/server";
import { sealProgress } from "../../../../lib/neon/progress";
import { IngestError, publicError } from "../../../../lib/ingest/errors";

export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const expected = new URL(request.url).searchParams.get("expectedUserId");
    if (expected && expected !== user.id)
      throw new IngestError(
        409,
        "SESSION_CHANGED",
        "Your account changed. Reload the page to continue.",
      );
    return Response.json(
      {
        userId: user.id,
        url: process.env.NEON_REALTIME_URL,
        sealedQuery: await sealProgress(user.id),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
