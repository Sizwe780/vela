import { requireLearner } from "../../../../lib/auth/server";
import { prisma } from "../../../../lib/db";
import { privateHeaders, socialFailure } from "../../../../lib/social/common";
import { peerAlias } from "../../../../lib/social/discussions";
import { IngestError } from "../../../../lib/ingest/errors";
export async function GET() {
  try {
    const learner = await requireLearner();
    const modules = await prisma.$queryRaw<
      { moduleId: string }[]
    >`SELECT DISTINCT qm."moduleId" FROM "StaffMembership" sm JOIN "QualificationModule" qm ON qm."qualificationId"=sm."qualificationId" WHERE sm."studentId"=${learner.id} AND sm.role IN ('staff','admin') AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=${learner.id} AND e."moduleId"=qm."moduleId" AND e.status IN ('active','completed'))`;
    if (!modules.length)
      throw new IngestError(
        403,
        "MODERATION_REQUIRED",
        "Scoped staff membership and module enrollment are required for peer-report review.",
      );
    const posts = await prisma.discussionPost.findMany({
      where: {
        deletedAt: null,
        reports: { some: {} },
        studyUnit: { moduleId: { in: modules.map((m) => m.moduleId) } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: { select: { reports: true } },
        studyUnit: { select: { module: { select: { code: true } }, title: true } },
      },
    });
    return Response.json(
      {
        ownerId: learner.id,
        posts: posts.map((p) => ({
          id: p.id,
          body: p.body,
          alias: peerAlias(p.studentId, p.sourceType + ":" + p.sourceId),
          reports: p._count.reports,
          moduleCode: p.studyUnit.module.code,
          unitTitle: p.studyUnit.title,
          href: `/study/${encodeURIComponent(p.studyUnitId)}`,
        })),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return socialFailure(e);
  }
}
