import { Prisma } from "@prisma/client";
import { requireLearner } from "../../../../lib/auth/server";
import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { prisma } from "../../../../lib/db";
import { retentionDatabase as database } from "../../../../lib/account/retention-runtime";
import { attemptInput, saveAttempt } from "../../../../lib/practice/attempts";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError } from "../../../../lib/ingest/errors";
import { studentFailure, privateHeaders } from "../../../../lib/student/http";
import { publishedStudyUnit } from "../../../../lib/study/published-units";
async function scope(owner: string, unit: string, id: string) {
  const unitId = await requireUnitAccess(owner, unit);
  const session = await prisma.studySession.findFirst({
    where: { id, studyUnitId: unitId, studyUnit: publishedStudyUnit },
    select: { id: true, version: true, markdown: true },
  });
  if (!session) throw new IngestError(404, "SESSION_MISSING", "Lesson not available.");
  return session;
}
export async function GET(request: Request) {
  try {
    const user = await requireLearner(),
      p = new URL(request.url).searchParams;
    const session = await scope(user.id, p.get("studyUnitId") ?? "", p.get("sessionId") ?? "");
    if (Number(p.get("version")) !== session.version)
      throw new IngestError(409, "SESSION_CHANGED", "Reload the current lesson version.");
    const rows = await database.query(
      Prisma.sql`SELECT * FROM "LessonAttempt" WHERE "studentId"=${user.id} AND "sessionId"=${session.id} AND version=${session.version} ORDER BY "updatedAt" LIMIT 100`,
    );
    return Response.json({ ownerId: user.id, attempts: rows }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function PUT(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner(),
      p = attemptInput.safeParse(await readJson(request, 24000));
    if (!p.success)
      throw new IngestError(
        400,
        "INVALID_ATTEMPT",
        "Check the answer fields; scores and feedback cannot be supplied by the client.",
      );
    const session = await scope(user.id, p.data.studyUnitId, p.data.sessionId);
    return Response.json(
      { ownerId: user.id, attempt: await saveAttempt(database, user.id, p.data, session) },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
