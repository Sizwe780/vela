import { z } from "zod";
import { createRealtime, rawSql } from "@neon/realtime/server";
import { requireLearner } from "../../../lib/auth/server";
import { requireUnitAccess } from "../../../lib/enrollment/access";
import { prisma } from "../../../lib/db";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { IngestError } from "../../../lib/ingest/errors";
import { Prisma, type DiscussionPost } from "../../../generated/app-client";
import { identifier, privateHeaders, socialInput, socialFailure } from "../../../lib/social/common";
import { readDiscussionSource, scopedStaff, peerAlias } from "../../../lib/social/discussions";
const source = z
  .object({
    studyUnitId: identifier,
    sourceType: z.enum(["session", "chunk"]),
    sourceId: identifier,
  })
  .strict();
const posting = source
  .extend({
    ownerId: identifier,
    id: z.string().uuid(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    anchor: z.string().regex(/^[a-f0-9]{64}$/),
    body: z.string().trim().min(1).max(2000),
    parentId: z.string().uuid().nullable().optional(),
  })
  .strict();
const moderation = z
  .object({ ownerId: identifier, id: z.string().uuid(), action: z.enum(["remove", "report"]) })
  .strict();
export async function GET(request: Request) {
  try {
    const learner = await requireLearner(),
      params = new URL(request.url).searchParams;
    const input = socialInput(source, {
      studyUnitId: params.get("studyUnitId"),
      sourceType: params.get("sourceType"),
      sourceId: params.get("sourceId"),
    });
    await requireUnitAccess(learner.id, input.studyUnitId);
    const current = await readDiscussionSource(prisma, input);
    if (params.get("expectedOwner") && params.get("expectedOwner") !== learner.id)
      throw new IngestError(409, "ACCOUNT_CHANGED", "Reload discussions for this account.");
    const requestedAnchor = params.get("anchor");
    const anchor = current.paragraphs.some((p) => p.anchor === requestedAnchor)
      ? requestedAnchor
      : null;
    const where = { ...input, sourceHash: current.sourceHash, deletedAt: null };
    const counts = await prisma.discussionPost.groupBy({
      by: ["anchor"],
      where: { ...where, parentId: null },
      _count: { id: true },
    });
    const staff = await scopedStaff(current.moduleId, [learner.id]);
    const roots = anchor
      ? await prisma.discussionPost.findMany({
          where: { ...where, anchor, parentId: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 21,
          include: { _count: { select: { reports: true } } },
        })
      : [];
    const replyRows = roots.length
      ? await prisma.$queryRaw<(DiscussionPost & { reportCount: number })[]>(Prisma.sql`
      SELECT r.*, (SELECT count(*)::int FROM "DiscussionReport" report WHERE report."postId"=r.id) AS "reportCount" FROM (
        SELECT p.*,row_number() OVER(PARTITION BY p."parentId" ORDER BY p."createdAt" DESC,p.id DESC) AS rank
        FROM "DiscussionPost" p WHERE p."parentId" IN (${Prisma.join(roots.slice(0, 20).map((p) => p.id))}) AND p."deletedAt" IS NULL AND p."studyUnitId"=${input.studyUnitId} AND p."sourceHash"=${current.sourceHash} AND p."sourceId"=${input.sourceId} AND p."sourceType"=${input.sourceType}
      ) r WHERE r.rank<=20 ORDER BY r."createdAt" DESC,r.id DESC`)
      : [];
    const replies = replyRows.map((p) => ({ ...p, _count: { reports: p.reportCount } }));
    const authors = await scopedStaff(current.moduleId, [
      learner.id,
      ...new Set([...roots, ...replies].map((p) => p.studentId)),
    ]);
    function publicPost(p: (typeof roots)[number]) {
      return {
        id: p.id,
        body: p.body,
        createdAt: p.createdAt,
        alias: peerAlias(p.studentId, input.sourceType + ":" + input.sourceId),
        staff: authors.has(p.studentId),
        mine: p.studentId === learner.id,
        canRemove: p.studentId === learner.id || staff.has(learner.id),
        reports: staff.has(learner.id) ? p._count.reports : undefined,
      };
    }
    const threads = roots.slice(0, 20).map((root) => ({
      ...publicPost(root),
      replies: replies
        .filter((p) => p.parentId === root.id)
        .slice(0, 20)
        .reverse()
        .map(publicPost),
    }));
    let live = null;
    if (
      params.get("live") === "1" &&
      process.env.NEON_REALTIME_URL &&
      process.env.NEON_REALTIME_SECRET
    ) {
      const realtime = createRealtime({
        secret: process.env.NEON_REALTIME_SECRET,
        db: decodeURIComponent(new URL(process.env.DATABASE_URL!).pathname.slice(1)),
      });
      const query = rawSql<{ id: string; count: number }>(
        `SELECT p.anchor AS id,count(*)::int AS count FROM "DiscussionPost" p WHERE p."studyUnitId"=$2 AND p."sourceType"=$3 AND p."sourceId"=$4 AND p."sourceHash"=$5 AND p."parentId" IS NULL AND p."deletedAt" IS NULL AND EXISTS(SELECT 1 FROM "StudyUnit" u JOIN "Enrollment" e ON e."moduleId"=u."moduleId" WHERE u.id=$2 AND e."studentId"=$1 AND e.status IN ('active','completed')) GROUP BY p.anchor ORDER BY p.anchor LIMIT 200`,
        [learner.id, input.studyUnitId, input.sourceType, input.sourceId, current.sourceHash],
      );
      live = { url: process.env.NEON_REALTIME_URL, sealedQuery: await realtime.seal({ query }) };
    }
    return Response.json(
      {
        ownerId: learner.id,
        sourceHash: current.sourceHash,
        paragraphs: current.paragraphs,
        counts: counts.map((c) => ({ id: c.anchor, count: c._count.id })),
        threads,
        hasOlderThreads: roots.length > 20,
        canModerate: staff.has(learner.id),
        live,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return socialFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner(),
      input = socialInput(posting, await readJson(request));
    if (input.ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Copy your draft and reload before posting.",
      );
    await requireUnitAccess(learner.id, input.studyUnitId);
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${"discussion:" + learner.id},0))) post_gate`;
        const current = await readDiscussionSource(tx, input);
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${learner.id + ":" + current.moduleId},0))) enrollment_gate`;
        if (
          !(await tx.enrollment.findFirst({
            where: {
              studentId: learner.id,
              moduleId: current.moduleId,
              status: { in: ["active", "completed"] },
            },
          }))
        )
          throw new IngestError(
            403,
            "ENROLLMENT_REQUIRED",
            "Enroll before joining this discussion.",
          );
        if (
          current.sourceHash !== input.sourceHash ||
          !current.paragraphs.some((p) => p.anchor === input.anchor)
        )
          throw new IngestError(
            409,
            "PARAGRAPH_CHANGED",
            "The source changed. Keep your draft and reload its current paragraphs.",
          );
        const existing = await tx.discussionPost.findUnique({ where: { id: input.id } });
        if (existing) {
          if (
            existing.studentId !== learner.id ||
            existing.studyUnitId !== input.studyUnitId ||
            existing.sourceId !== input.sourceId ||
            existing.sourceType !== input.sourceType ||
            existing.sourceHash !== input.sourceHash ||
            existing.anchor !== input.anchor ||
            existing.body !== input.body ||
            existing.parentId !== (input.parentId ?? null) ||
            existing.deletedAt
          )
            throw new IngestError(
              409,
              "POST_CONFLICT",
              "This post ID is already in use. Refresh before posting a new message.",
            );
          return { id: existing.id };
        }
        if (input.parentId) {
          const parent = await tx.discussionPost.findFirst({
            where: {
              id: input.parentId,
              studyUnitId: input.studyUnitId,
              sourceId: input.sourceId,
              sourceType: input.sourceType,
              sourceHash: input.sourceHash,
              anchor: input.anchor,
              parentId: null,
              deletedAt: null,
            },
          });
          if (!parent)
            throw new IngestError(
              409,
              "THREAD_UNAVAILABLE",
              "This discussion is no longer available for replies.",
            );
        }
        if (
          (await tx.discussionPost.count({
            where: { studentId: learner.id, createdAt: { gte: new Date(Date.now() - 3600000) } },
          })) >= 20
        )
          throw new IngestError(
            429,
            "POST_LIMIT",
            "You have reached 20 posts this hour. Return later to continue.",
          );
        const { sourceHash, anchor, id, body, parentId, sourceId, sourceType, studyUnitId } = input;
        return tx.discussionPost.create({
          data: {
            id,
            studentId: learner.id,
            studyUnitId,
            sourceType,
            sourceId,
            sourceHash,
            anchor,
            body,
            parentId,
          },
          select: { id: true },
        });
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return Response.json(result, { headers: privateHeaders });
  } catch (e) {
    return socialFailure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner(),
      input = socialInput(moderation, await readJson(request));
    if (input.ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Reload before moderating posts.",
      );
    const post = await prisma.discussionPost.findUnique({
      where: { id: input.id },
      include: { studyUnit: { select: { moduleId: true } } },
    });
    if (!post) throw new IngestError(404, "POST_NOT_FOUND", "Post not found.");
    if (!(input.action === "remove" && post.studentId === learner.id))
      await requireUnitAccess(learner.id, post.studyUnitId);
    if (input.action === "report") {
      if (post.deletedAt) throw new IngestError(410, "POST_REMOVED", "This post was removed.");
      await prisma.discussionReport.upsert({
        where: { postId_studentId: { postId: post.id, studentId: learner.id } },
        create: { postId: post.id, studentId: learner.id },
        update: {},
      });
    } else {
      const staff = await scopedStaff(post.studyUnit.moduleId, [learner.id]);
      if (post.studentId !== learner.id && !staff.has(learner.id))
        throw new IngestError(
          403,
          "MODERATION_REQUIRED",
          "Only the author or scoped staff can remove this post.",
        );
      await prisma.discussionPost.update({
        where: { id: post.id },
        data: { body: "", deletedAt: new Date() },
      });
    }
    return Response.json({ done: true }, { headers: privateHeaders });
  } catch (e) {
    return socialFailure(e);
  }
}
