import { auth, requireLearner } from "../../../lib/auth/server";
import { publicError } from "../../../lib/ingest/errors";

export async function GET() {
  try {
    await requireLearner();
    const { data, error } = await auth.token();
    if (error || !data?.token)
      return Response.json({ error: { message: "Please sign in again." } }, { status: 401 });
    const response = await fetch(process.env.NEON_FUNCTION_HELLO_BASE_URL!, {
      headers: { Authorization: `Bearer ${data.token}` },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok)
      return Response.json(
        { error: { message: "The course catalog is temporarily unavailable." } },
        { status: 503 },
      );
    return Response.json(await response.json(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
