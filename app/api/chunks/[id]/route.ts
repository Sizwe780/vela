import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { publicError } from "../../../../lib/ingest/errors";
import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const learner = await requireLearner();
    const { id } = await params;
    const unit = new URL(request.url).searchParams.get("unit");
    await requireUnitAccess(learner.id, unit ?? "");
    const c = await prisma.contentChunk.findFirst({
      where: { id, learningOutcome: { studyUnitId: unit ?? "" } },
      select: {
        id: true,
        title: true,
        body: true,
        resourceUrl: true,
        assessmentCriterion: {
          select: { code: true, description: true, sourceUrl: true, authority: true },
        },
      },
    });
    if (!c) return Response.json({ error: "Source not found" }, { status: 404 });
    return Response.json(
      {
        id: c.id,
        title: c.title,
        body: c.body,
        criterionCode: c.assessmentCriterion?.code ?? null,
        criterionDescription: c.assessmentCriterion?.description ?? null,
        criterionSourceUrl: c.assessmentCriterion?.sourceUrl ?? null,
        criterionAuthority: c.assessmentCriterion?.authority,
        sourceUrl: c.resourceUrl,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    const f = publicError(e);
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private,no-store" } },
    );
  }
}
