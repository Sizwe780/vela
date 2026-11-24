import { z } from "zod";
import { createRealtime } from "@neon/realtime/server";
import { requireLearner } from "../../../lib/auth/server";
import { requireModuleAccess } from "../../../lib/enrollment/access";
import { prisma } from "../../../lib/db";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { identifier, privateHeaders, socialInput, socialFailure } from "../../../lib/social/common";
import { roomCountQuery } from "../../../lib/social/room-query";
import { IngestError } from "../../../lib/ingest/errors";
const mutation = z
  .object({
    ownerId: identifier,
    moduleId: identifier,
    trackingId: z.string().uuid(),
    action: z.enum(["join", "pulse", "leave"]),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const learner = await requireLearner(),
      params = new URL(request.url).searchParams,
      moduleId = params.get("moduleId");
    if (!moduleId) {
      const modules = await prisma.module.findMany({
        where: {
          qualifications: {
            some: {
              enrollments: {
                some: { studentId: learner.id, status: { in: ["active", "completed"] } },
              },
            },
          },
        },
        select: { id: true, code: true, title: true, institution: true },
        orderBy: { code: "asc" },
        take: 200,
      });
      return Response.json({ ownerId: learner.id, modules }, { headers: privateHeaders });
    }
    socialInput(identifier, moduleId);
    await requireModuleAccess(learner.id, moduleId);
    if (params.get("expectedOwner") && params.get("expectedOwner") !== learner.id)
      throw new IngestError(409, "ACCOUNT_CHANGED", "Your account changed. Reload this room.");
    const query = roomCountQuery(learner.id, moduleId);
    // Counts use the same authorization predicates as the sealed live query.
    const count = await prisma.$queryRaw<
      { others: number }[]
    >`SELECT count(*)::int AS others FROM "StudyRoomPresence" p WHERE p."moduleId"=${moduleId} AND p."studentId"<>${learner.id} AND p."expiresAt">CURRENT_TIMESTAMP AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=p."studentId" AND e."moduleId"=${moduleId} AND e.status IN ('active','completed'))`;
    let live = null;
    if (
      params.get("live") === "1" &&
      process.env.NEON_REALTIME_SECRET &&
      process.env.NEON_REALTIME_URL
    ) {
      const realtime = createRealtime({
        secret: process.env.NEON_REALTIME_SECRET,
        db: decodeURIComponent(new URL(process.env.DATABASE_URL!).pathname.slice(1)),
      });
      live = { url: process.env.NEON_REALTIME_URL, sealedQuery: await realtime.seal({ query }) };
    }
    return Response.json(
      { ownerId: learner.id, others: count[0].others, serverTime: Date.now(), live },
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
      input = socialInput(mutation, await readJson(request));
    if (input.ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Reload this room before joining.",
      );
    await requireModuleAccess(learner.id, input.moduleId);
    await prisma.$executeRaw`DELETE FROM "StudyRoomPresence" WHERE ("studentId","moduleId") IN (SELECT "studentId","moduleId" FROM "StudyRoomPresence" WHERE "moduleId"=${input.moduleId} AND "expiresAt"<CURRENT_TIMESTAMP-INTERVAL '1 day' LIMIT 100)`;
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${learner.id + ":" + input.moduleId},0))) enrollment_gate`;
        if (
          !(await tx.enrollment.findFirst({
            where: {
              studentId: learner.id,
              moduleId: input.moduleId,
              status: { in: ["active", "completed"] },
            },
          }))
        )
          throw new IngestError(403, "ENROLLMENT_REQUIRED", "Enroll before joining this room.");
        if (input.action === "leave") {
          await tx.studyRoomPresence.deleteMany({
            where: {
              studentId: learner.id,
              moduleId: input.moduleId,
              trackingId: input.trackingId,
            },
          });
          return { joined: false };
        }
        const previous = await tx.studyRoomPresence.findUnique({
          where: { studentId_moduleId: { studentId: learner.id, moduleId: input.moduleId } },
        });
        if (
          previous &&
          previous.trackingId !== input.trackingId &&
          previous.expiresAt.getTime() > Date.now()
        )
          throw new IngestError(
            409,
            "ROOM_OTHER_TAB",
            "This module's room is already active in another tab. Leave there or wait 90 seconds.",
          );
        if (
          input.action === "pulse" &&
          (!previous ||
            previous.trackingId !== input.trackingId ||
            previous.expiresAt.getTime() <= Date.now())
        )
          throw new IngestError(
            409,
            "ROOM_EXPIRED",
            "Your room presence expired. Join again when ready.",
          );
        const expiresAt = new Date(Date.now() + 90000);
        await tx.studyRoomPresence.upsert({
          where: { studentId_moduleId: { studentId: learner.id, moduleId: input.moduleId } },
          create: {
            studentId: learner.id,
            moduleId: input.moduleId,
            trackingId: input.trackingId,
            expiresAt,
          },
          update: { trackingId: input.trackingId, expiresAt },
        });
        return { joined: true, expiresAt };
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return Response.json({ ...result, serverTime: Date.now() }, { headers: privateHeaders });
  } catch (e) {
    return socialFailure(e);
  }
}
