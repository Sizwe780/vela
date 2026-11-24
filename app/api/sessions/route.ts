import { publishedStudyUnitSql } from "../../../lib/study/published-units";
import { readJson } from "../../../lib/ingest/http";
import { requireUnitAccess } from "../../../lib/enrollment/access";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { z } from "zod";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const unit = new URL(request.url).searchParams.get("unit");
    await requireUnitAccess(user.id, unit ?? "");
    const rows = await prisma.sessionProgress.findMany({
      where: { studentId: user.id, session: { studyUnitId: unit ?? "" } },
      select: { sessionId: true },
    });
    return Response.json(
      { completed: rows.map((r) => r.sessionId) },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    const f = publicError(e);
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private,no-store" } },
    );
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = z
      .object({ sessionId: z.string().max(100), complete: z.boolean() })
      .strict()
      .safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(400, "INVALID_SESSION", "Choose a valid session and completion state.");
    const input = parsed.data;
    const session = await prisma.studySession.findUnique({
      where: { id: input.sessionId },
      select: { studyUnitId: true, studyUnit: { select: { moduleId: true } } },
    });
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
    await requireUnitAccess(user.id, session.studyUnitId);
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${user.id + ":" + session.studyUnit.moduleId},0))) enrollment_gate`;

        const access = await tx.enrollment.findFirst({
          where: {
            studentId: user.id,
            moduleId: session.studyUnit.moduleId,
            status: { in: ["active", "completed"] },
          },
          select: { id: true },
        });
        if (!access)
          throw new IngestError(403, "ENROLLMENT_REQUIRED", "Enroll before updating progress.");
        if (input.complete) {
          const milestone = await tx.sessionProgress.upsert({
            where: { studentId_sessionId: { studentId: user.id, sessionId: input.sessionId } },
            create: { studentId: user.id, sessionId: input.sessionId },
            update: {},
            include: { session: { select: { studyUnitId: true } } },
          });
          // Completion initializes tracking without overwriting assessed scores or review dates.
          const outcomes = await tx.learningOutcome.findMany({
            where: { studyUnitId: milestone.session.studyUnitId },
            select: { id: true },
          });
          await tx.studentMastery.createMany({
            data: outcomes.map((o) => ({ studentId: user.id, learningOutcomeId: o.id, score: 0 })),
            skipDuplicates: true,
          });
        } else
          await tx.sessionProgress.deleteMany({
            where: { studentId: user.id, sessionId: input.sessionId },
          });
        await tx.$executeRaw`UPDATE "Enrollment" e SET status=CASE WHEN EXISTS(SELECT 1 FROM "StudySession" s JOIN "StudyUnit" u ON u.id=s."studyUnitId" WHERE ${publishedStudyUnitSql} AND u."moduleId"=e."moduleId") AND NOT EXISTS(SELECT 1 FROM "StudySession" s JOIN "StudyUnit" u ON u.id=s."studyUnitId" WHERE ${publishedStudyUnitSql} AND u."moduleId"=e."moduleId" AND NOT EXISTS(SELECT 1 FROM "SessionProgress" p WHERE p."sessionId"=s.id AND p."studentId"=${user.id})) THEN 'completed'::"EnrollmentStatus" ELSE 'active'::"EnrollmentStatus" END,"updatedAt"=CURRENT_TIMESTAMP WHERE e."studentId"=${user.id} AND e.status IN ('active','completed') AND e."moduleId"=(SELECT "moduleId" FROM "StudyUnit" WHERE id=${session!.studyUnitId})`;
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return Response.json({ saved: true });
  } catch (e) {
    const f = publicError(e);
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private,no-store" } },
    );
  }
}
