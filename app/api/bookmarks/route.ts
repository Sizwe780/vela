import { publishedStudyUnit } from "../../../lib/study/published-units";
import { createHash } from "node:crypto";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { requireUnitAccess } from "../../../lib/enrollment/access";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { IngestError } from "../../../lib/ingest/errors";
import { bookmarkInput, sourceId } from "../../../lib/student/input";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const params = new URL(request.url).searchParams;
    const cursor = params.get("cursor");
    const selectedType = params.get("sourceType"),
      selectedSource = params.get("sourceId");
    if (
      (selectedType && !["session", "chunk"].includes(selectedType)) ||
      (selectedSource && !sourceId.safeParse(selectedSource).success)
    )
      throw new IngestError(400, "INVALID_SOURCE", "Choose a valid saved source.");
    if (
      cursor &&
      (!sourceId.safeParse(cursor).success ||
        !(await prisma.studyBookmark.findFirst({
          where: { id: cursor, studentId: user.id },
          select: { id: true },
        })))
    )
      throw new IngestError(
        404,
        "BOOKMARK_NOT_FOUND",
        "Saved item cursor not found for this account.",
      );
    const bookmarks = await prisma.studyBookmark.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        studentId: user.id,
        ...(selectedType ? { sourceType: selectedType as "session" | "chunk" } : {}),
        ...(selectedSource ? { sourceId: selectedSource } : {}),
        studyUnit: {
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
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 51,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        quote: true,
        title: true,
        createdAt: true,
        studyUnit: {
          select: { id: true, code: true, title: true, module: { select: { code: true } } },
        },
      },
    });
    return Response.json(
      {
        bookmarks: bookmarks.slice(0, 50),
        nextCursor: bookmarks.length > 50 ? bookmarks[49].id : null,
        ownerId: user.id,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const p = bookmarkInput.safeParse(await readJson(request));
    if (!p.success)
      throw new IngestError(
        400,
        "INVALID_BOOKMARK",
        "Choose a session or chunk and a passage up to 2,000 characters.",
      );
    const input = p.data;
    const unit = await requireUnitAccess(user.id, input.studyUnitId);
    let title: string | undefined;
    if (input.sourceType === "session") {
      const s = await prisma.studySession.findFirst({
        where: { id: input.sourceId, studyUnitId: unit },
        select: { title: true },
      });
      title = s?.title;
    } else {
      const c = await prisma.contentChunk.findFirst({
        where: { id: input.sourceId, learningOutcome: { studyUnitId: unit } },
        select: { title: true },
      });
      title = c?.title;
    }
    if (!title)
      throw new IngestError(
        404,
        "SOURCE_NOT_FOUND",
        "The saved source must belong to this study unit.",
      );
    const quoteHash = createHash("sha256").update(input.quote).digest("hex");
    const key = {
      studentId: user.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      quoteHash,
    };
    const b = await prisma.studyBookmark.upsert({
      where: { studentId_sourceType_sourceId_quoteHash: key },
      create: { ...key, studyUnitId: unit, quote: input.quote, title },
      update: { title },
    });
    return Response.json({ id: b.id }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const p = sourceId.safeParse(new URL(request.url).searchParams.get("id"));
    if (!p.success) throw new IngestError(400, "INVALID_BOOKMARK", "Choose a saved item.");
    const deleted = await prisma.studyBookmark.deleteMany({
      where: { id: p.data, studentId: user.id },
    });
    if (!deleted.count)
      throw new IngestError(404, "BOOKMARK_NOT_FOUND", "Saved item not found for your account.");
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
