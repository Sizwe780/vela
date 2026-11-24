import { requireSourceAccess } from "../../../../lib/enrollment/access";
import { requireLearner } from "../../../../lib/auth/server";
import { publicError } from "../../../../lib/ingest/errors";
import { sourcePdf } from "../../../../lib/study/pdf-source";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ document: string }> }) {
  try {
    const learner = await requireLearner();
    const { document } = await params;
    await requireSourceAccess(learner.id, document);
    return await sourcePdf(document, request);
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
export const HEAD = GET;
