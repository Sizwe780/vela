import { requireUnitAccess } from "../../../lib/enrollment/access";
import { randomUUID } from "node:crypto";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { Prisma } from "../../../generated/app-client";
import { noteInput } from "../../../lib/notes/input";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { IngestError, publicError } from "../../../lib/ingest/errors";
function failure(e: unknown) {
  const f = publicError(
    e instanceof IngestError
      ? e
      : new IngestError(
          503,
          "NOTES_UNAVAILABLE",
          "Notes could not be saved. Your draft is still in the editor.",
        ),
  );
  return Response.json({ error: f.error }, { status: f.status });
}
export async function GET(request: Request) {
  try {
    const learner = await requireLearner();
    const studyUnitId = new URL(request.url).searchParams.get("studyUnitId");
    if (!studyUnitId || studyUnitId.length > 100)
      throw new IngestError(400, "INVALID_UNIT", "Choose a study unit.");
    if (!(await prisma.studyUnit.findUnique({ where: { id: studyUnitId }, select: { id: true } })))
      throw new IngestError(404, "UNIT_NOT_FOUND", "Study unit not found.");
    await requireUnitAccess(learner.id, studyUnitId);
    const note = await prisma.studyNote.findUnique({
      where: { studentId_studyUnitId: { studentId: learner.id, studyUnitId } },
      select: { body: true, revision: true, updatedAt: true },
    });
    return Response.json(
      { ...(note ?? { body: "", revision: 0, updatedAt: null }), ownerId: learner.id },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const parsed = noteInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_NOTE",
        "Notes must be at most 16,000 characters with a valid revision.",
      );
    const { studyUnitId, body, revision } = parsed.data;
    await requireUnitAccess(learner.id, studyUnitId);
    if (parsed.data.ownerId && parsed.data.ownerId !== learner.id)
      throw new IngestError(
        409,
        "NOTE_SESSION_CHANGED",
        "Your account changed. Copy this draft before opening the current account's notebook.",
      );
    if (!(await prisma.studyUnit.findUnique({ where: { id: studyUnitId }, select: { id: true } })))
      throw new IngestError(404, "UNIT_NOT_FOUND", "Study unit not found.");
    const rows = await prisma.$queryRaw<{ revision: number; updatedAt: Date }[]>(Prisma.sql`
      INSERT INTO "StudyNote" ("id","studentId","studyUnitId","body","revision") VALUES (${randomUUID()},${learner.id},${studyUnitId},${body},1)
      ON CONFLICT ("studentId","studyUnitId") DO UPDATE SET "body"=EXCLUDED."body", "revision"="StudyNote"."revision"+1,"updatedAt"=CURRENT_TIMESTAMP
      WHERE "StudyNote"."revision"=${revision}
      RETURNING "revision","updatedAt"`);
    if (!rows.length)
      throw new IngestError(
        409,
        "NOTE_CONFLICT",
        "This notebook changed in another tab. Copy your draft, then reload before saving.",
      );
    return Response.json(rows[0], { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return failure(e);
  }
}
