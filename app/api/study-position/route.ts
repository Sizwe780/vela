import { publishedStudyUnit } from "../../../lib/study/published-units";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { requireModuleAccess } from "../../../lib/enrollment/access";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { IngestError } from "../../../lib/ingest/errors";
import { positionInput } from "../../../lib/student/input";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
export async function GET() {
  try {
    const user = await requireLearner();
    const positions = await prisma.studyPosition.findMany({
      where: {
        studentId: user.id,
        session: { studyUnit: publishedStudyUnit },
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
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        moduleId: true,
        sessionId: true,
        updatedAt: true,
        session: {
          select: {
            title: true,
            studyUnit: {
              select: {
                id: true,
                code: true,
                title: true,
                module: { select: { code: true, title: true } },
              },
            },
          },
        },
      },
    });
    return Response.json({ positions }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function POST(request: Request) {
  const openedAt = new Date();
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const p = positionInput.safeParse(await readJson(request));
    if (!p.success) throw new IngestError(400, "INVALID_POSITION", "Choose a session.");
    const session = await prisma.studySession.findFirst({
      where: { id: p.data.sessionId, studyUnit: publishedStudyUnit },
      select: { id: true, studyUnit: { select: { moduleId: true } } },
    });
    if (!session) throw new IngestError(404, "SESSION_NOT_FOUND", "Session not found.");
    await requireModuleAccess(user.id, session.studyUnit.moduleId);
    await prisma.$executeRaw`INSERT INTO "StudyPosition"("studentId","moduleId","sessionId","updatedAt") VALUES(${user.id},${session.studyUnit.moduleId},${session.id},${openedAt}) ON CONFLICT("studentId","moduleId") DO UPDATE SET "sessionId"=EXCLUDED."sessionId","updatedAt"=EXCLUDED."updatedAt" WHERE "StudyPosition"."updatedAt"<EXCLUDED."updatedAt"`;
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
