import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { moduleSearchDocuments } from "../../../lib/search/catalog";
import { searchStudyDocuments } from "../../../lib/search/visible";
import { IngestError } from "../../../lib/ingest/errors";
export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 100)
      throw new IngestError(400, "INVALID_SEARCH", "Use between 2 and 100 characters.");
    const selected = params.get("moduleId");
    const links = await prisma.enrollment.findMany({
      where: { studentId: user.id, status: { in: ["active", "completed"] } },
      distinct: ["moduleId"],
      select: { moduleId: true },
    });
    const ids = links.map((l) => l.moduleId);
    if (selected && !ids.includes(selected))
      throw new IngestError(
        403,
        "ENROLLMENT_REQUIRED",
        "Search is limited to your enrolled modules.",
      );
    const documents = await Promise.all(
      (selected ? [selected] : ids).map((id) => moduleSearchDocuments(id)),
    );
    return Response.json(
      {
        results: searchStudyDocuments(documents.flat(), q),
        scope: "Published sessions in your enrolled modules; hidden solutions are excluded.",
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
