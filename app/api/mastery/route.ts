import { publishedStudyUnit } from "../../../lib/study/published-units";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
export async function GET() {
  try {
    const learner = await requireLearner();
    const rows = await prisma.learningOutcome.findMany({
      where: {
        studyUnit: {
          ...publishedStudyUnit,
          module: {
            qualifications: {
              some: {
                enrollments: {
                  some: { studentId: learner.id, status: { in: ["active", "completed"] } },
                },
              },
            },
          },
        },
      },
      take: 5000,
      include: {
        mastery: { where: { studentId: learner.id } },
        studyUnit: { include: { module: true } },
      },
      orderBy: [
        { studyUnit: { module: { code: "asc" } } },
        { studyUnit: { position: "asc" } },
        { position: "asc" },
        { id: "asc" },
      ],
    });
    return Response.json(
      {
        outcomes: rows.map((r) => ({
          id: r.id,
          title: r.description,
          unitId: r.studyUnitId,
          unit: r.studyUnit.title,
          moduleId: r.studyUnit.moduleId,
          module: r.studyUnit.module.code,
          institution: r.studyUnit.module.institution,
          score: r.mastery[0]?.score ?? 0,
          attempts: r.mastery[0]?.attempts ?? 0,
          due: r.mastery[0]?.nextReviewAt ?? null,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Sign in or retry shortly." }, { status: 401 });
  }
}
