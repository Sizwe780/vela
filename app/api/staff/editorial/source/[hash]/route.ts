import { prisma } from "../../../../../../lib/db";
import { requireLearner } from "../../../../../../lib/auth/server";
import { IngestError } from "../../../../../../lib/ingest/errors";
import { studentFailure } from "../../../../../../lib/student/http";
import {
  editorScope,
  privateSourcePath,
  provenanceSchema,
} from "../../../../../../lib/content/editorial";
import { serveSourcePdf } from "../../../../../../lib/study/pdf-source";

export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  try {
    const user = await requireLearner();
    const { hash } = await params;
    const query = new URL(request.url).searchParams;
    const qualificationId = query.get("qualificationId") ?? "";
    const studyUnitId = query.get("studyUnitId") ?? "";
    const id = query.get("draftId") ?? "";
    if (
      !/^[a-f0-9]{64}$/.test(hash) ||
      ![qualificationId, studyUnitId, id].every((value) => /^[A-Za-z0-9_-]{1,100}$/.test(value))
    )
      throw new IngestError(404, "SOURCE_NOT_FOUND", "This evidence PDF is unavailable.");
    await editorScope(prisma, user.id, qualificationId, studyUnitId);
    const draft = await prisma.lessonDraft.findFirst({
      where: { id, qualificationId, studyUnitId },
      select: { factoryProvenance: true },
    });
    const parsed = provenanceSchema.safeParse(draft?.factoryProvenance);
    const ref = parsed.success
      ? parsed.data.evidence.find((evidence) => evidence.evidenceHash === hash)
      : undefined;
    if (!ref) throw new IngestError(404, "SOURCE_NOT_FOUND", "This evidence PDF is unavailable.");
    return await serveSourcePdf(
      privateSourcePath(ref.sha256),
      ref.sourceId + ".pdf",
      request,
      ref.sha256,
    );
  } catch (error) {
    return studentFailure(error);
  }
}
export const HEAD = GET;
