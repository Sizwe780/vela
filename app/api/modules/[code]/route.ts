import { requireModuleAccess } from "../../../../lib/enrollment/access";
import { requireLearner } from "../../../../lib/auth/server";
import { prisma } from "../../../../lib/db";
import { publicError } from "../../../../lib/ingest/errors";
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const learner = await requireLearner();
    const module = await prisma.module.findUnique({
      where: { institution_code: { institution: "UNISA", code: (await params).code } },
      select: { id: true, code: true, title: true, metadata: true },
    });
    if (module) await requireModuleAccess(learner.id, module.id);
    return Response.json(module ?? { error: "Module not found" }, {
      status: module ? 200 : 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
