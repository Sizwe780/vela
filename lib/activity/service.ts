import type { PrismaClient } from "../../generated/app-client";
import type { z } from "zod";
import { IngestError } from "../ingest/errors";
import { activityInput } from "./input";
import { allocateStudyTime, LEASE_MS } from "./time";
export async function recordStudyActivity(
  db: PrismaClient,
  studentId: string,
  input: z.infer<typeof activityInput>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${"study-time:" + studentId},0))) activity_gate`;
      const current = await tx.studyPresence.findUnique({ where: { studentId } });
      const owns =
        current?.trackingId === input.trackingId && current.sessionId === input.sessionId;
      if (input.action === "stop" && !owns) return { state: "paused", secondsAdded: 0 };
      const session = await tx.studySession.findUnique({
        where: { id: input.sessionId },
        select: { studyUnit: { select: { moduleId: true } } },
      });
      if (!session) {
        if (input.action === "stop") {
          await tx.studyPresence.deleteMany({
            where: { studentId, trackingId: input.trackingId, sessionId: input.sessionId },
          });
          return { state: "paused", secondsAdded: 0 };
        }
        throw new IngestError(404, "SESSION_NOT_FOUND", "Choose a published learning session.");
      }
      const moduleId = session.studyUnit.moduleId;
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${studentId + ":" + moduleId},0))) enrollment_gate`;
      const access = await tx.enrollment.findFirst({
        where: { studentId, moduleId, status: { in: ["active", "completed"] } },
        select: { id: true },
      });
      if (!access) {
        if (input.action === "stop") {
          await tx.studyPresence.deleteMany({
            where: { studentId, trackingId: input.trackingId, sessionId: input.sessionId },
          });
          return { state: "paused", secondsAdded: 0 };
        }
        throw new IngestError(403, "ENROLLMENT_REQUIRED", "Enroll before recording study time.");
      }
      const now = new Date();
      if (input.action === "start") {
        if (
          current &&
          current.trackingId !== input.trackingId &&
          now.getTime() - current.lastPulseAt.getTime() < LEASE_MS &&
          !input.takeover
        )
          throw new IngestError(
            409,
            "TIMER_ACTIVE_ELSEWHERE",
            "Your timer is active in another tab. Choose Track in this tab to switch.",
          );
        await tx.studyPresence.upsert({
          where: { studentId },
          create: {
            studentId,
            trackingId: input.trackingId,
            sessionId: input.sessionId,
            lastPulseAt: now,
          },
          update: { trackingId: input.trackingId, sessionId: input.sessionId, lastPulseAt: now },
        });
        return { state: "tracking", secondsAdded: 0 };
      }
      if (!owns || !current)
        throw new IngestError(409, "TIMER_EXPIRED", "Your timer paused. Resume it to continue.");
      const slices = allocateStudyTime(current.lastPulseAt, now);
      for (const slice of slices)
        await tx.studyActivityDay.upsert({
          where: { studentId_day_moduleId: { studentId, day: slice.day, moduleId } },
          create: { studentId, day: slice.day, moduleId, seconds: slice.seconds },
          update: { seconds: { increment: slice.seconds } },
        });
      if (input.action === "stop")
        await tx.studyPresence.deleteMany({
          where: { studentId, trackingId: input.trackingId, sessionId: input.sessionId },
        });
      else await tx.studyPresence.update({ where: { studentId }, data: { lastPulseAt: now } });
      return {
        state: input.action === "stop" ? "paused" : "tracking",
        secondsAdded: slices.reduce((sum, s) => sum + s.seconds, 0),
      };
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
