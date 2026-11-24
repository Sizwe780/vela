import { publishedStudyUnit } from "../../../lib/study/published-units";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { emailDeliveryStatus } from "../../../lib/email/config";
export async function GET() {
  try {
    const user = await requireLearner();
    const now = new Date();
    const units = await prisma.studyUnit.findMany({
      where: {
        ...publishedStudyUnit,
        module: {
          qualifications: {
            some: {
              enrollments: {
                some: { studentId: user.id, status: { in: ["active", "completed"] } },
              },
            },
          },
        },
      },
      orderBy: [{ moduleId: "asc" }, { position: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        module: { select: { code: true, title: true } },
        learningOutcomes: {
          select: {
            id: true,
            mastery: {
              where: { studentId: user.id },
              select: { score: true, nextReviewAt: true, attempts: true },
            },
          },
        },
      },
    });
    const queue = units.map((u) => ({
      id: u.id,
      code: u.code,
      title: u.title,
      moduleCode: u.module.code,
      due: u.learningOutcomes.filter(
        (o) => !!o.mastery[0]?.nextReviewAt && o.mastery[0].nextReviewAt <= now,
      ).length,
      newOutcomes: u.learningOutcomes.filter((o) => !o.mastery[0]?.attempts).length,
      nextReviewAt:
        u.learningOutcomes
          .map((o) => o.mastery[0]?.nextReviewAt)
          .filter((d): d is Date => !!d && d > now)
          .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
    }));
    return Response.json(
      {
        queue,
        due: queue.reduce((n, u) => n + u.due, 0),
        newOutcomes: queue.reduce((n, u) => n + u.newOutcomes, 0),
        emailDelivery: emailDeliveryStatus(),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
