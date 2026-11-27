import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { staffScopes } from "../../../../lib/staff/access";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
export async function GET() {
  try {
    const user = await requireLearner();
    const scopes = await staffScopes(user.id);
    const qualifications = await prisma.qualification.findMany({
      where: { id: { in: scopes.map((s) => s.qualificationId) } },
      select: {
        id: true,
        code: true,
        title: true,
        institution: true,
        modules: {
          orderBy: { position: "asc" },
          select: {
            module: {
              select: {
                id: true,
                code: true,
                title: true,
                metadata: true,
                studyUnits: {
                  select: {
                    id: true,
                    _count: { select: { sessions: true, learningOutcomes: true } },
                  },
                },
              },
            },
            enrollments: {
              where: { status: { in: ["active", "completed"] } },
              select: { studentId: true, status: true },
            },
          },
        },
      },
    });
    const report = [];
    for (const q of qualifications) {
      const modules = [];
      for (const link of q.modules) {
        const m = link.module;
        const students = link.enrollments.map((e) => e.studentId);
        const totalSessions = m.studyUnits.reduce((n, u) => n + u._count.sessions, 0);
        const completions = students.length
          ? await prisma.sessionProgress.count({
              where: { studentId: { in: students }, session: { studyUnit: { moduleId: m.id } } },
            })
          : 0;
        const mastery = students.length
          ? await prisma.studentMastery.aggregate({
              where: {
                studentId: { in: students },
                learningOutcome: { studyUnit: { moduleId: m.id } },
              },
              _sum: { score: true },
              _count: true,
            })
          : null;
        const outcomes = m.studyUnits.reduce((n, u) => n + u._count.learningOutcomes, 0);
        const metadata =
          m.metadata && typeof m.metadata === "object" && !Array.isArray(m.metadata)
            ? m.metadata
            : null;
        const raw = metadata?.conversion;
        const conversion =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? {
                status: raw.status,
                total: raw.total,
                converted: raw.converted,
                needsReview: raw.needsReview,
                updatedAt: raw.updatedAt,
              }
            : null;
        const [indexedLessonChunks, sourcePageChunks] = await Promise.all([
          prisma.contentChunk.count({
            where: {
              learningOutcome: { studyUnit: { moduleId: m.id } },
              OR: [
                { ingestion: { sourceName: { startsWith: "Vela original" } } },
                { resourceUrl: { contains: "/sessions/" } },
              ],
            },
          }),
          prisma.contentChunk.count({
            where: {
              learningOutcome: { studyUnit: { moduleId: m.id } },
              NOT: {
                OR: [
                  { ingestion: { sourceName: { startsWith: "Vela original" } } },
                  { resourceUrl: { contains: "/sessions/" } },
                ],
              },
            },
          }),
        ]);
        modules.push({
          id: m.id,
          code: m.code,
          title: m.title,
          enrolledStudents: students.length,
          completedEnrollments: link.enrollments.filter((e) => e.status === "completed").length,
          units: m.studyUnits.length,
          sessions: totalSessions,
          completionPercent:
            students.length && totalSessions
              ? Math.round((100 * completions) / (students.length * totalSessions))
              : 0,
          meanMastery:
            students.length && outcomes
              ? Number(((mastery?._sum.score ?? 0) / (students.length * outcomes)).toFixed(3))
              : 0,
          assessedRecords: mastery?._count ?? 0,
          conversion,
          indexedLessonChunks,
          sourcePageChunks,
        });
      }
      report.push({ id: q.id, code: q.code, title: q.title, institution: q.institution, modules });
    }
    return Response.json(
      {
        qualifications: report,
        scope: "Aggregated learner data only, scoped to your assigned qualifications.",
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
