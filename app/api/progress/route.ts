import { publishedStudyUnit } from "../../../lib/study/published-units";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
export async function GET() {
  try {
    const learner = await requireLearner();
    const enrolled = {
      studentId: learner.id,
      status: { in: ["active", "completed"] as ("active" | "completed")[] },
    };
    const courses = await prisma.qualification.findMany({
      where: { modules: { some: { enrollments: { some: enrolled } } } },
      select: {
        id: true,
        title: true,
        code: true,
        modules: {
          where: { enrollments: { some: enrolled } },
          select: {
            module: {
              select: {
                id: true,
                code: true,
                title: true,
                studyUnits: {
                  where: publishedStudyUnit,
                  select: {
                    id: true,
                    code: true,
                    sessions: {
                      select: {
                        id: true,
                        progress: { where: { studentId: learner.id }, select: { sessionId: true } },
                      },
                    },
                    learningOutcomes: {
                      select: {
                        id: true,
                        mastery: { where: { studentId: learner.id }, select: { score: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return Response.json(
      {
        courses: courses.map((course) => {
          const modules = course.modules.map(({ module: m }) => {
            const units = m.studyUnits.map((u) => ({
              id: u.id,
              code: u.code,
              total: u.sessions.length,
              completed: u.sessions.filter((s) => s.progress.length > 0).length,
              mastery: u.learningOutcomes.length
                ? u.learningOutcomes.reduce((sum, o) => sum + (o.mastery[0]?.score ?? 0), 0) /
                  u.learningOutcomes.length
                : 0,
            }));
            return {
              id: m.id,
              code: m.code,
              title: m.title,
              units,
              total: units.reduce((n, u) => n + u.total, 0),
              completed: units.reduce((n, u) => n + u.completed, 0),
              complete:
                units.length > 0 && units.every((u) => u.total > 0 && u.completed === u.total),
            };
          });
          return {
            id: course.id,
            title: course.title,
            code: course.code,
            modules,
            total: modules.reduce((n, m) => n + m.total, 0),
            completed: modules.reduce((n, m) => n + m.completed, 0),
            completedModules: modules.filter((m) => m.complete).length,
          };
        }),
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch {
    return Response.json({ error: "Progress unavailable" }, { status: 503 });
  }
}
