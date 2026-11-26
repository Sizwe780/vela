import { publishedStudyUnit } from "../../../lib/study/published-units";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import {
  outcomeEvidence,
  studyRecommendations,
  type Evidence,
} from "../../../lib/insights/evidence";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { z } from "zod";
import { logServerError } from "../../../lib/log-error";
const resultSchema = z.object({
  mastery: z
    .array(z.object({ learningOutcomeId: z.string(), score: z.number().min(0).max(1) }))
    .max(100),
});
export async function GET() {
  try {
    const learner = await requireLearner();
    const allowed = {
      qualifications: {
        some: {
          enrollments: {
            some: {
              studentId: learner.id,
              status: { in: ["active", "completed"] as ("active" | "completed")[] },
            },
          },
        },
      },
    };
    const modules = await prisma.module.findMany({
      where: allowed,
      select: { id: true, code: true },
      take: 200,
    });
    const ids = modules.map((m) => m.id),
      since = new Date(Date.now() - 90 * 86400000);
    const [outcomes, sessions, completed, quizzes, concepts] = await Promise.all([
      prisma.learningOutcome.findMany({
        where: {
          studyUnit: { ...publishedStudyUnit, moduleId: { in: ids }, sessions: { some: {} } },
        },
        include: {
          mastery: { where: { studentId: learner.id } },
          studyUnit: { select: { title: true, moduleId: true } },
        },
        orderBy: [{ studyUnitId: "asc" }, { position: "asc" }],
        take: 5000,
      }),
      prisma.studySession.findMany({
        where: { studyUnit: { ...publishedStudyUnit, moduleId: { in: ids } } },
        orderBy: [{ studyUnit: { position: "asc" } }, { position: "asc" }],
        select: { id: true, studyUnitId: true },
        take: 5000,
      }),
      prisma.sessionProgress.findMany({
        where: {
          studentId: learner.id,
          session: { studyUnit: { ...publishedStudyUnit, moduleId: { in: ids } } },
        },
        select: { sessionId: true },
        take: 5000,
      }),
      prisma.quizAttempt.findMany({
        where: {
          studentId: learner.id,
          submittedAt: { gte: since },
          studyUnit: { ...publishedStudyUnit, moduleId: { in: ids } },
        },
        select: { id: true, studyUnitId: true, submittedAt: true, result: true },
        orderBy: { submittedAt: "desc" },
        take: 1000,
      }),
      prisma.conceptAttempt.findMany({
        where: {
          studentId: learner.id,
          verified: true,
          submittedAt: { gte: since },
          learningOutcome: { studyUnit: { ...publishedStudyUnit, moduleId: { in: ids } } },
        },
        select: { id: true, learningOutcomeId: true, score: true, submittedAt: true },
        orderBy: { submittedAt: "desc" },
        take: 1000,
      }),
    ]);
    const events: Evidence[] = [],
      byId = new Map(outcomes.map((o) => [o.id, o]));
    for (const attempt of quizzes) {
      const parsed = resultSchema.safeParse(attempt.result);
      if (parsed.success)
        for (const item of parsed.data.mastery)
          if (byId.get(item.learningOutcomeId)?.studyUnitId === attempt.studyUnitId)
            events.push({
              id: attempt.id,
              outcomeId: item.learningOutcomeId,
              score: item.score,
              kind: "quiz",
              at: attempt.submittedAt!.toISOString(),
            });
    }
    for (const attempt of concepts)
      if (attempt.score !== null && byId.has(attempt.learningOutcomeId))
        events.push({
          id: attempt.id,
          outcomeId: attempt.learningOutcomeId,
          score: attempt.score,
          kind: "concept",
          at: attempt.submittedAt!.toISOString(),
        });
    const done = new Set(completed.map((c) => c.sessionId));
    const rows = outcomes.map((o) =>
      outcomeEvidence(
        {
          id: o.id,
          title: o.description,
          unitId: o.studyUnitId,
          unitTitle: o.studyUnit.title,
          moduleId: o.studyUnit.moduleId,
          moduleCode: modules.find((m) => m.id === o.studyUnit.moduleId)!.code,
          due: o.mastery[0]?.nextReviewAt?.toISOString() ?? null,
          mixedScore: o.mastery[0]?.score ?? null,
          attempts: o.mastery[0]?.attempts ?? 0,
          studyLink: `/study/${encodeURIComponent(o.studyUnitId)}`,
          nextSession: (() => {
            const s = sessions.find((s) => s.studyUnitId === o.studyUnitId && !done.has(s.id));
            return s
              ? `/study/${encodeURIComponent(o.studyUnitId)}/sessions/${encodeURIComponent(s.id)}`
              : null;
          })(),
        },
        events,
      ),
    );
    return Response.json(
      {
        ownerId: learner.id,
        windowDays: 90,
        windowLimited: quizzes.length === 1000 || concepts.length === 1000,
        outcomes: rows,
        recommendations: studyRecommendations(rows, new Date()),
        completedSessions: completed.length,
        totalSessions: sessions.length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (!(e instanceof IngestError)) logServerError("insights", e);
    const f = publicError(
      e instanceof IngestError
        ? e
        : new IngestError(
            503,
            "INSIGHTS_UNAVAILABLE",
            "Your progress overview is temporarily unavailable.",
          ),
    );
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
