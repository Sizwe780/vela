import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Database, QueryDatabase } from "../ingest/repository";
import {
  retentionPolicy as policy,
  beforeMonths,
  beforeDays,
  retentionHeld,
  type Hold,
  type RetentionScope,
  deletionDeadline,
} from "./retention-policy";

function notHeld(scope: RetentionScope, targets: Prisma.Sql[], accounts: Prisma.Sql[], now: Date) {
  const match = (values: Prisma.Sql[]) =>
    values.length ? Prisma.sql`h."targetId" IN (${Prisma.join(values)})` : Prisma.sql`false`;
  return Prisma.sql`NOT EXISTS (SELECT 1 FROM "RetentionHold" h WHERE h."releasedAt" IS NULL AND (h."expiresAt" IS NULL OR h."expiresAt">${now}) AND ((h.scope='all' AND (h."targetId" IS NULL OR ${match([...targets, ...accounts])})) OR (h.scope=${scope} AND (h."targetId" IS NULL OR ${match(targets)})) OR (h.scope='account' AND (h."targetId" IS NULL OR ${match(accounts)}))))`;
}
export async function activeRetentionHolds(db: QueryDatabase, now = new Date()) {
  return db.query<Hold>(
    Prisma.sql`SELECT id,scope,"targetId",reason,"createdAt","expiresAt","releasedAt" FROM "RetentionHold" WHERE "releasedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt">${now}) ORDER BY "createdAt" DESC LIMIT 1000`,
  );
}
export async function retentionPlan(db: QueryDatabase, now = new Date()) {
  const limit = policy.batchLimit,
    closed = beforeMonths(now, policy.closedCaseMonths),
    logs = beforeDays(now, policy.deliveryDays),
    leases = beforeDays(now, policy.expiredLeaseHours / 24);
  const [holds, support, moderation, delivery, welcome, rooms, timers, runs, requests, inactive] =
    await Promise.all([
      activeRetentionHolds(db, now),
      db.query<{ id: string }>(
        Prisma.sql`SELECT r.id FROM "SupportRequest" r WHERE r.status IN ('resolved','cancelled') AND r."updatedAt"<${closed} AND ${notHeld("support", [Prisma.sql`r.id`], [Prisma.sql`r."studentId"`], now)} ORDER BY r."updatedAt",r.id LIMIT ${limit}`,
      ),
      db.query<{ postId: string; studentId: string }>(
        Prisma.sql`SELECT r."postId",r."studentId" FROM "DiscussionReport" r JOIN "DiscussionPost" p ON p.id=r."postId" WHERE r."createdAt"<${closed} AND p."deletedAt"<${closed} AND ${notHeld("moderation", [Prisma.sql`r."postId"`], [Prisma.sql`r."studentId"`, Prisma.sql`p."studentId"`], now)} ORDER BY r."createdAt",r."postId",r."studentId" LIMIT ${limit}`,
      ),
      db.query<{ id: string }>(
        Prisma.sql`SELECT d.id FROM "EmailDelivery" d WHERE d.kind<>'welcome' AND d.status IN ('sent','failed','suppressed','uncertain') AND d."updatedAt"<${logs} AND ${notHeld("delivery", [Prisma.sql`d.id`], [Prisma.sql`d."studentId"`], now)} ORDER BY d."updatedAt",d.id LIMIT ${limit}`,
      ),
      db.query<{ id: string }>(
        Prisma.sql`SELECT d.id FROM "EmailDelivery" d WHERE d.kind='welcome' AND d.status IN ('sent','failed','suppressed','uncertain') AND d."updatedAt"<${logs} AND (d."providerMessageId" IS NOT NULL OR d."errorCode" IS NOT NULL OR d."claimedAt" IS NOT NULL OR d.attempts<>0) AND ${notHeld("delivery", [Prisma.sql`d.id`], [Prisma.sql`d."studentId"`], now)} ORDER BY d."updatedAt",d.id LIMIT ${limit}`,
      ),
      db.query<{ studentId: string; moduleId: string }>(
        Prisma.sql`SELECT r."studentId",r."moduleId" FROM "StudyRoomPresence" r WHERE r."expiresAt"<${leases} AND ${notHeld("account", [Prisma.sql`r."studentId"`], [Prisma.sql`r."studentId"`], now)} ORDER BY r."expiresAt",r."studentId" LIMIT ${limit}`,
      ),
      db.query<{ studentId: string }>(
        Prisma.sql`SELECT r."studentId" FROM "StudyPresence" r WHERE r."lastPulseAt"<${leases} AND ${notHeld("account", [Prisma.sql`r."studentId"`], [Prisma.sql`r."studentId"`], now)} ORDER BY r."lastPulseAt",r."studentId" LIMIT ${limit}`,
      ),
      db.query<{ id: string }>(
        Prisma.sql`SELECT r.id FROM "RetentionRun" r WHERE r."createdAt"<${logs} AND ${notHeld("security", [Prisma.sql`r.id`], [Prisma.sql`r."actorId"`], now)} ORDER BY r."createdAt",r.id LIMIT ${limit}`,
      ),
      db.query<{ id: string; studentId: string | null; createdAt: Date }>(
        Prisma.sql`SELECT id,"studentId","createdAt" FROM "SupportRequest" WHERE category='deletion' AND status IN ('open','in_review') ORDER BY "createdAt" LIMIT ${limit}`,
      ),
      db.query<{ studentId: string; lastRecordedAt: Date }>(
        Prisma.sql`SELECT p."studentId",GREATEST(p."updatedAt",COALESCE((SELECT max(s."updatedAt") FROM "StudyPosition" s WHERE s."studentId"=p."studentId"),p."createdAt"),COALESCE((SELECT max(s."updatedAt") FROM "StudyActivityDay" s WHERE s."studentId"=p."studentId"),p."createdAt"),COALESCE((SELECT max(s."updatedAt") FROM "StudyNote" s WHERE s."studentId"=p."studentId"),p."createdAt"),COALESCE((SELECT max(s."createdAt") FROM "QuizAttempt" s WHERE s."studentId"=p."studentId"),p."createdAt"),COALESCE((SELECT max(s."createdAt") FROM "SupportRequest" s WHERE s."studentId"=p."studentId"),p."createdAt")) AS "lastRecordedAt" FROM "StudentProfile" p WHERE p."createdAt"<${beforeMonths(now, policy.inactivityMonths)} ORDER BY p."updatedAt" LIMIT ${limit}`,
      ),
    ]);
  const targets = { support, moderation, delivery, welcome, rooms, timers, runs };
  return {
    policyVersion: policy.version,
    asOf: now.toISOString(),
    holds,
    targets,
    counts: Object.fromEntries(Object.entries(targets).map(([key, rows]) => [key, rows.length])),
    batchLimit: limit,
    mayHaveMore: Object.values(targets).some((rows) => rows.length === limit),
    deletionRequests: requests.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      deadline: deletionDeadline(r.createdAt).toISOString(),
      overdue: deletionDeadline(r.createdAt) < now,
      held: retentionHeld(holds, "support", [r.id], [r.studentId], now),
    })),
    inactivityCandidates: inactive
      .filter((r) => r.lastRecordedAt < beforeMonths(now, policy.inactivityMonths))
      .map((r) => ({
        studentId: r.studentId,
        lastRecordedAt: r.lastRecordedAt.toISOString(),
        requiresAuthAndNoticeReview: true,
      })),
    providerLogs:
      "Azure/Cloudflare log expiry and managed backups require separate operator configuration; this process does not erase them.",
  };
}
export async function runRetention(db: Database, actorId: string, apply = false, now = new Date()) {
  return db.transaction(async (tx) => {
    await tx.query(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended('vela:retention',0))::text`,
    );
    const plan = await retentionPlan(tx, now),
      deleted: Record<string, number> = {};
    const remove = async (key: string, sql: Prisma.Sql) => {
      deleted[key] = (await tx.query(sql)).length;
    };
    if (apply) {
      const t = plan.targets,
        closed = beforeMonths(now, policy.closedCaseMonths),
        logs = beforeDays(now, policy.deliveryDays),
        leases = beforeDays(now, 1);
      if (t.support.length)
        await remove(
          "support",
          Prisma.sql`DELETE FROM "SupportRequest" WHERE id IN (${Prisma.join(t.support.map((r) => r.id))}) AND status IN ('resolved','cancelled') AND "updatedAt"<${closed} RETURNING id`,
        );
      if (t.delivery.length)
        await remove(
          "delivery",
          Prisma.sql`DELETE FROM "EmailDelivery" WHERE id IN (${Prisma.join(t.delivery.map((r) => r.id))}) AND kind<>'welcome' AND status IN ('sent','failed','suppressed','uncertain') AND "updatedAt"<${logs} RETURNING id`,
        );
      if (t.welcome.length)
        await remove(
          "welcomeMetadata",
          Prisma.sql`UPDATE "EmailDelivery" SET "providerMessageId"=NULL,"errorCode"=NULL,"claimedAt"=NULL,attempts=0 WHERE id IN (${Prisma.join(t.welcome.map((r) => r.id))}) AND kind='welcome' AND status IN ('sent','failed','suppressed','uncertain') AND "updatedAt"<${logs} RETURNING id`,
        );
      if (t.moderation.length)
        await remove(
          "moderation",
          Prisma.sql`DELETE FROM "DiscussionReport" WHERE ("postId","studentId") IN (${Prisma.join(t.moderation.map((r) => Prisma.sql`(${r.postId},${r.studentId})`))}) AND "createdAt"<${closed} AND EXISTS (SELECT 1 FROM "DiscussionPost" p WHERE p.id="DiscussionReport"."postId" AND p."deletedAt"<${closed}) RETURNING "postId"`,
        );
      if (t.rooms.length)
        await remove(
          "rooms",
          Prisma.sql`DELETE FROM "StudyRoomPresence" WHERE ("studentId","moduleId") IN (${Prisma.join(t.rooms.map((r) => Prisma.sql`(${r.studentId},${r.moduleId})`))}) AND "expiresAt"<${leases} RETURNING "studentId"`,
        );
      if (t.timers.length)
        await remove(
          "timers",
          Prisma.sql`DELETE FROM "StudyPresence" WHERE "studentId" IN (${Prisma.join(t.timers.map((r) => r.studentId))}) AND "lastPulseAt"<${leases} RETURNING "studentId"`,
        );
      if (t.runs.length)
        await remove(
          "runs",
          Prisma.sql`DELETE FROM "RetentionRun" WHERE id IN (${Prisma.join(t.runs.map((r) => r.id))}) AND "createdAt"<${logs} RETURNING id`,
        );
    }
    await tx.query(
      Prisma.sql`INSERT INTO "RetentionRun"(id,"actorId",mode,"policyVersion",counts) VALUES (${randomUUID()},${actorId},${apply ? "apply" : "preview"},${policy.version},${JSON.stringify({ eligible: plan.counts, deleted, overdue: plan.deletionRequests.filter((r) => r.overdue).length, inactivityCandidates: plan.inactivityCandidates.length })}::jsonb) RETURNING id`,
    );
    return { ...plan, mode: apply ? "apply" : "preview", deleted };
  });
}
