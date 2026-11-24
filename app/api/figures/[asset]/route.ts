import { requireFigureAccess } from "../../../../lib/enrollment/access";
import { requireLearner } from "../../../../lib/auth/server";
import { publicError } from "../../../../lib/ingest/errors";
import { sourceFigure } from "../../../../lib/study/figure-source";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  try {
    const learner = await requireLearner();
    const { asset } = await params;
    await requireFigureAccess(learner.id, asset);
    return await sourceFigure(asset);
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
