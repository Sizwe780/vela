import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { readJson } from "../../../lib/ingest/http";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { notebookInput } from "../../../lib/math-practice/notebook";
import { logServerError } from "../../../lib/log-error";
const headers = { "Cache-Control": "private, no-store" };
function failure(e: unknown) {
  if (!(e instanceof IngestError)) logServerError("practice-notebook", e);
  const f = publicError(
    e instanceof IngestError
      ? e
      : new IngestError(
          503,
          "NOTEBOOK_UNAVAILABLE",
          "Your notebook is unavailable. Keep your draft and try again.",
        ),
  );
  return Response.json({ error: f.error }, { status: f.status, headers });
}
export async function GET(request: Request) {
  try {
    const { id: studentId } = await requireLearner();
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((k) => !["page", "kind"].includes(k)) ||
      !/^\d{1,2}$/.test(params.get("page") ?? "0") ||
      (params.has("kind") && !["practice", "mistake"].includes(params.get("kind")!))
    )
      throw new IngestError(400, "INVALID_FILTER", "Choose a valid notebook page and filter.");
    const page = Number(params.get("page") ?? 0);
    if (page > 5) throw new IngestError(400, "INVALID_PAGE", "Choose a valid notebook page.");
    const entries = await prisma.practiceNotebook.findMany({
      where: { studentId, ...(params.has("kind") ? { kind: params.get("kind")! } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page * 20,
      take: 21,
      select: {
        id: true,
        title: true,
        reflection: true,
        kind: true,
        snapshot: true,
        createdAt: true,
      },
    });
    return Response.json(
      { ownerId: studentId, entries: entries.slice(0, 20), hasMore: entries.length > 20 },
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const { id: studentId } = await requireLearner();
    const parsed = notebookInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_PRACTICE",
        "Use a title, safe notation, and at most 20 steps. Entries must be below 64 KB.",
      );
    const { id, ownerId, ...data } = parsed.data;
    if (ownerId !== studentId)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Copy your draft before opening this account's notebook.",
      );
    const record = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 8173))) notebook_gate`;
        const existing = await tx.practiceNotebook.findUnique({ where: { id } });
        if (existing) {
          if (
            existing.studentId !== studentId ||
            existing.title !== data.title ||
            existing.reflection !== data.reflection ||
            existing.kind !== data.kind
          )
            throw new IngestError(
              409,
              "SAVE_CONFLICT",
              "That save already exists. Reload your notebook before saving a new copy.",
            );
          // JSONB object key order is not stable; compare normalized validated snapshots.
          const old = notebookInput.safeParse({
            ...data,
            id,
            ownerId,
            snapshot: existing.snapshot,
          });
          if (!old.success || JSON.stringify(old.data.snapshot) !== JSON.stringify(data.snapshot))
            throw new IngestError(
              409,
              "SAVE_CONFLICT",
              "This save contains different work. Save a new copy.",
            );
          return { id: existing.id };
        }
        if ((await tx.practiceNotebook.count({ where: { studentId } })) >= 100)
          throw new IngestError(
            409,
            "NOTEBOOK_FULL",
            "You have 100 saved entries. Export and delete an older entry to make room.",
          );
        return tx.practiceNotebook.create({
          data: { id, studentId, ...data },
          select: { id: true },
        });
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return Response.json(record, { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertTutorOrigin(request);
    const { id: studentId } = await requireLearner();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-f0-9-]{36}$/i.test(id))
      throw new IngestError(400, "INVALID_ENTRY", "Choose a saved entry.");
    const result = await prisma.practiceNotebook.deleteMany({ where: { id, studentId } });
    if (!result.count) throw new IngestError(404, "ENTRY_NOT_FOUND", "Saved entry not found.");
    return Response.json({ deleted: true }, { headers });
  } catch (e) {
    return failure(e);
  }
}
