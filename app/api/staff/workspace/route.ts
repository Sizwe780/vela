import { revalidateTag } from "next/cache";
import { requireLearner } from "../../../../lib/auth/server";
import { prisma } from "../../../../lib/db";
import { IngestError } from "../../../../lib/ingest/errors";
import { readJson } from "../../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
import { teachingWorkspace } from "../../../../lib/teaching/read";
import { commandSchema } from "../../../../lib/teaching/input";
import { teachingRole, transactionLock } from "../../../../lib/teaching/scope";
import {
  reviewLesson,
  reviewSource,
  saveLesson,
  submitLesson,
} from "../../../../lib/teaching/content";
import { classroomCommand } from "../../../../lib/teaching/classroom";
import { adminCommand } from "../../../../lib/teaching/admin";

export const maxDuration = 120;

function csvCell(value: string | number) {
  const text = String(value);
  return '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const query = new URL(request.url).searchParams;
    const qualification = query.get("qualificationId") ?? undefined;
    const sessionId = query.get("sessionId");
    if (sessionId && qualification) {
      await teachingRole(prisma, user.id, qualification);
      const session = await prisma.studySession.findFirst({
        where: {
          id: sessionId,
          studyUnit: { module: { qualifications: { some: { qualificationId: qualification } } } },
        },
        select: { id: true, title: true, markdown: true, version: true },
      });
      if (!session)
        throw new IngestError(
          404,
          "TEACHING_ITEM_MISSING",
          "Published session not found in this qualification.",
        );
      return Response.json({ session }, { headers: privateHeaders });
    }
    const report = await teachingWorkspace(
      user.id,
      qualification,
      query.get("assignmentId") ?? undefined,
      query.get("sourceUnitId") ?? undefined,
    );
    if (query.get("export") === "modules" && report.workspace) {
      const rows = [
        ["Module", "Title", "Learners enrolled", "Study units", "Published sessions"],
        ...report.workspace.qualification.modules.map(({ module, _count }) => [
          module.code,
          module.title,
          _count.enrollments,
          module.studyUnits.length,
          module.studyUnits.reduce((count, unit) => count + unit.sessions.length, 0),
        ]),
      ];
      return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="module-report.csv"',
        },
      });
    }
    return Response.json(report, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = commandSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_TEACHING_COMMAND",
        "Review the required fields for this action.",
      );
    const input = parsed.data;
    const result = await prisma.$transaction(
      async (tx) => {
        await transactionLock(tx, `vela:qualification:${input.qualificationId}`);
        await teachingRole(tx, user.id, input.qualificationId);
        switch (input.action) {
          case "saveLesson":
            return saveLesson(tx, user.id, input);
          case "submitLesson":
            return submitLesson(tx, user.id, input);
          case "reviewLesson":
            await teachingRole(tx, user.id, input.qualificationId, true);
            return reviewLesson(tx, user.id, input);
          case "reviewSource":
            return reviewSource(tx, user.id, input);
          case "createCohort":
          case "cohortMember":
          case "createAssignment":
          case "grade":
          case "announce":
            return classroomCommand(tx, user.id, input);
          default:
            await teachingRole(tx, user.id, input.qualificationId, true);
            return adminCommand(tx, user.id, input);
        }
      },
      { maxWait: 10_000, timeout: 90_000 },
    );
    if (input.action === "reviewLesson" && input.decision === "publish")
      revalidateTag("curriculum", "max");
    return Response.json({ ok: true, ...result }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
