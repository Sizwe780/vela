import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireLearner } from "../../../../lib/auth/server";
import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { prisma } from "../../../../lib/db";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError } from "../../../../lib/ingest/errors";
import { studentFailure, privateHeaders } from "../../../../lib/student/http";
import { parseLearningBlocks } from "../../../../lib/content/exercises";
import { nextRecall } from "../../../../lib/recall/schedule";
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("queue"), id: z.string().uuid() }).strict(),
  z
    .object({ action: z.literal("rate"), id: z.string().uuid(), rating: z.number().min(0).max(1) })
    .strict(),
]);
export async function GET() {
  try {
    const user = await requireLearner();
    const rows = await prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT a.*,s."studyUnitId",s.markdown,s.version AS "currentVersion",u.code AS "unitCode",m.code AS "moduleCode" FROM "LessonAttempt" a JOIN "StudySession" s ON s.id=a."sessionId" JOIN "StudyUnit" u ON u.id=s."studyUnitId" JOIN "Module" m ON m.id=u."moduleId" WHERE a."studentId"=${user.id} AND a."inReview"=true ORDER BY a."nextReviewAt" ASC LIMIT 100`,
    );
    const cards = [];
    const access = new Map<string, boolean>();
    for (const row of rows) {
      if (!access.has(row.studyUnitId)) {
        try {
          await requireUnitAccess(user.id, row.studyUnitId);
          access.set(row.studyUnitId, true);
        } catch (error) {
          if (!(error instanceof IngestError) || ![403, 404].includes(error.status)) throw error;
          access.set(row.studyUnitId, false);
        }
      }
      if (!access.get(row.studyUnitId)) continue;
      if (row.version !== row.currentVersion) continue;
      const exercise = parseLearningBlocks(row.markdown).blocks.find(
        (b) => b.type === "exercise" && b.title === row.title && b.question === row.question,
      );
      if (exercise?.type !== "exercise") continue;
      cards.push({
        id: row.id,
        title: row.title,
        question: row.question,
        answer: exercise.answer,
        unitCode: row.unitCode,
        moduleCode: row.moduleCode,
        unitId: row.studyUnitId,
        sessionId: row.sessionId,
        dueAt: row.nextReviewAt,
        userAnswer: row.userAnswer,
      });
    }
    return Response.json({ ownerId: user.id, cards }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner(),
      p = input.safeParse(await readJson(request, 4000));
    if (!p.success)
      throw new IngestError(400, "INVALID_REVIEW", "Choose a saved attempt and rating.");
    const [row] = await prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT a.*,s."studyUnitId",s.version AS "currentVersion" FROM "LessonAttempt" a JOIN "StudySession" s ON s.id=a."sessionId" WHERE a.id=${p.data.id} AND a."studentId"=${user.id}`,
    );
    if (!row || !row.submitted || row.version !== row.currentVersion)
      throw new IngestError(
        409,
        "ATTEMPT_NOT_READY",
        "Save a submitted attempt from the current lesson first.",
      );
    await requireUnitAccess(user.id, row.studyUnitId);
    const now = new Date(),
      due =
        p.data.action === "queue"
          ? now
          : nextRecall(
              p.data.rating,
              row.lastReviewAt && row.nextReviewAt
                ? {
                    lastAssessedAt: new Date(row.lastReviewAt),
                    nextReviewAt: new Date(row.nextReviewAt),
                  }
                : null,
              now,
            );
    if (p.data.action === "rate" && !row.inReview)
      throw new IngestError(409, "NOT_QUEUED", "This attempt is not in the review queue.");
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "LessonAttempt" SET "inReview"=true,"nextReviewAt"=${due},"lastReviewAt"=${p.data.action === "rate" ? now : row.lastReviewAt} WHERE id=${row.id} AND "studentId"=${user.id}`,
    );
    return Response.json(
      { ownerId: user.id, nextReviewAt: due, masteryUpdated: false },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
