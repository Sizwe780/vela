import { retiredOrientation } from "../study/published-units";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/app-client";
import {
  EMAIL_CONSENT_VERSION,
  emailConfig,
  mayEmail,
  recallDay,
  recallSendWindow,
  type EmailConfig,
} from "./config";
import { EmailSendError } from "./errors";
import { sendEmail } from "./provider";
import { emailTemplate } from "./templates";
import { readUnsubscribeToken, unsubscribeToken } from "./unsubscribe";

type QueueDb = Pick<PrismaClient, "emailDelivery">;
type DueLearner = { studentId: string; consentAt: Date; due: number };
export async function enqueueWelcome(db: QueueDb, studentId: string) {
  await db.emailDelivery.createMany({
    data: [{ id: randomUUID(), studentId, kind: "welcome", dedupeKey: `welcome:${studentId}` }],
    skipDuplicates: true,
  });
}
export async function dueCount(
  db: Prisma.TransactionClient | PrismaClient,
  studentId: string,
  now = new Date(),
) {
  const rows = await db.$queryRaw<
    { due: number }[]
  >`SELECT count(DISTINCT sm.id)::int AS due FROM "StudentMastery" sm JOIN "LearningOutcome" lo ON lo.id=sm."learningOutcomeId" JOIN "StudyUnit" u ON u.id=lo."studyUnitId" WHERE NOT (u.code = ${retiredOrientation.unitCode} AND EXISTS (SELECT 1 FROM "Module" m WHERE m.id=u."moduleId" AND m.institution=${retiredOrientation.institution} AND m.code=${retiredOrientation.moduleCode})) AND sm."studentId"=${studentId} AND sm."nextReviewAt"<=${now} AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=sm."studentId" AND e."moduleId"=u."moduleId" AND e.status IN ('active','completed'))`;
  return rows[0]?.due ?? 0;
}
export async function enqueueDueReminders(db: PrismaClient, now = new Date()) {
  if (!recallSendWindow(now)) return 0;
  const config = emailConfig();
  if (!config) return 0;
  const learners = await db.$queryRaw<
    DueLearner[]
  >`SELECT p."studentId",p."emailConsentAt" AS "consentAt",count(DISTINCT sm.id)::int AS due FROM "StudentProfile" p JOIN neon_auth."user" a ON a.id::text=p."studentId" JOIN "StudentMastery" sm ON sm."studentId"=p."studentId" JOIN "LearningOutcome" lo ON lo.id=sm."learningOutcomeId" JOIN "StudyUnit" u ON u.id=lo."studyUnitId" WHERE NOT (u.code = ${retiredOrientation.unitCode} AND EXISTS (SELECT 1 FROM "Module" m WHERE m.id=u."moduleId" AND m.institution=${retiredOrientation.institution} AND m.code=${retiredOrientation.moduleCode})) AND p."emailReminders"=true AND p."emailConsentAt" IS NOT NULL AND p."emailConsentVersion"=${EMAIL_CONSENT_VERSION} AND a."emailVerified"=true AND sm."nextReviewAt"<=${now} AND (${config.mode === "live"} OR lower(a.email)=${config.testRecipient}) AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=p."studentId" AND e."moduleId"=u."moduleId" AND e.status IN ('active','completed')) GROUP BY p."studentId",p."emailConsentAt" ORDER BY p."studentId" LIMIT 1000`;
  if (!learners.length) return 0;
  const result = await db.emailDelivery.createMany({
    data: learners.map((l) => ({
      id: randomUUID(),
      studentId: l.studentId,
      kind: "recall",
      consentAt: l.consentAt,
      dedupeKey: `recall:${l.studentId}:${recallDay(now)}`,
    })),
    skipDuplicates: true,
  });
  return result.count;
}
export async function stopReminders(db: PrismaClient, token: string) {
  const parsed = readUnsubscribeToken(token, process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "");
  if (!parsed) return "invalid";
  return db.$transaction(async (tx) => {
    // Same row lock as dispatch: a committed opt-out wins before any later send.
    await tx.$queryRaw`SELECT "studentId" FROM "StudentProfile" WHERE "studentId"=${parsed.studentId} FOR UPDATE`;
    const current = await tx.studentProfile.findUnique({
      where: { studentId: parsed.studentId },
      select: { emailReminders: true, emailConsentAt: true },
    });
    if (current?.emailReminders && current.emailConsentAt?.getTime() !== parsed.consentAt.getTime())
      return "stale";
    const result = await tx.studentProfile.updateMany({
      where: {
        studentId: parsed.studentId,
        emailConsentAt: parsed.consentAt,
        emailReminders: true,
      },
      data: { emailReminders: false },
    });
    if (result.count)
      await tx.emailDelivery.updateMany({
        where: {
          studentId: parsed.studentId,
          kind: "recall",
          consentAt: parsed.consentAt,
          status: "queued",
        },
        data: { status: "suppressed", errorCode: "UNSUBSCRIBED" },
      });
    return "stopped";
  });
}
async function claim(db: PrismaClient, config: EmailConfig, now: Date) {
  return db.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<
        { acquired: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(hashtext('vela-email-claims')) AS acquired`;
      if (!lock[0]?.acquired) return null;
      // A crashed/ambiguous send is never automatically repeated beyond provider idempotency TTL.
      await tx.emailDelivery.updateMany({
        where: { status: "sending", claimedAt: { lt: new Date(now.getTime() - 10 * 60_000) } },
        data: { status: "uncertain", errorCode: "WORKER_INTERRUPTED" },
      });
      // Expire old digests before reserving free-tier budget; a backlog must not starve today's reviews.
      await tx.emailDelivery.updateMany({
        where: {
          kind: "recall",
          status: "queued",
          NOT: { dedupeKey: { endsWith: ":" + recallDay(now) } },
        },
        data: { status: "suppressed", errorCode: "DIGEST_EXPIRED" },
      });
      const candidates = await tx.$queryRaw<
        { id: string }[]
      >`SELECT d.id FROM "EmailDelivery" d JOIN neon_auth."user" a ON a.id::text=d."studentId" WHERE d.status='queued' AND d."availableAt"<=${now} AND a."emailVerified"=true AND (d.kind<>'recall' OR ${recallSendWindow(now)}) AND (${config.mode === "live"} OR lower(a.email)=${config.testRecipient}) ORDER BY d."availableAt",d."createdAt" LIMIT 1`;
      const job = candidates[0]
        ? await tx.emailDelivery.findUnique({ where: { id: candidates[0].id } })
        : null;
      if (!job) return null;
      const day = now.toISOString().slice(0, 10);
      await tx.emailBudget.upsert({ where: { day }, create: { day }, update: {} });
      const reserved = await tx.emailBudget.updateMany({
        where: { day, attempts: { lt: config.dailyLimit } },
        data: { attempts: { increment: 1 } },
      });
      if (!reserved.count) return null;
      return tx.emailDelivery.update({
        where: { id: job.id },
        data: { status: "sending", claimedAt: now, attempts: { increment: 1 } },
      });
    },
    { timeout: 15000 },
  );
}
async function deliver(
  db: PrismaClient,
  config: EmailConfig,
  job: NonNullable<Awaited<ReturnType<typeof claim>>>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "studentId" FROM "StudentProfile" WHERE "studentId"=${job.studentId} FOR UPDATE`;
      const users = await tx.$queryRaw<
        { email: string; name: string | null; emailVerified: boolean }[]
      >`SELECT email,name,"emailVerified" FROM neon_auth."user" WHERE id::text=${job.studentId}`;
      const user = users[0];
      const finish = async (status: string, errorCode: string) => {
        await tx.emailDelivery.update({ where: { id: job.id }, data: { status, errorCode } });
        return status;
      };
      if (!user) return finish("suppressed", "ACCOUNT_UNAVAILABLE");
      if (!mayEmail(config, user.email)) return finish("suppressed", "TEST_RECIPIENT_BLOCKED");
      if (!user.emailVerified) {
        await tx.emailDelivery.update({
          where: { id: job.id },
          data: {
            status: "queued",
            attempts: { decrement: 1 },
            availableAt: new Date(Date.now() + 6 * 3600_000),
            errorCode: "AWAITING_VERIFICATION",
          },
        });
        return "waiting";
      }
      const profile = await tx.studentProfile.findUnique({ where: { studentId: job.studentId } });
      let due = 0;
      let unsubscribeUrl: string | undefined;
      if (job.kind === "recall") {
        if (
          !profile?.emailReminders ||
          profile.emailConsentVersion !== EMAIL_CONSENT_VERSION ||
          !profile.emailConsentAt ||
          profile.emailConsentAt.getTime() !== job.consentAt?.getTime()
        )
          return finish("suppressed", "CONSENT_REVOKED");
        if (!recallSendWindow(new Date())) {
          await tx.emailDelivery.update({
            where: { id: job.id },
            data: {
              status: "queued",
              attempts: { decrement: 1 },
              availableAt: new Date(Date.now() + 3600_000),
            },
          });
          return "waiting";
        }
        // An old queued digest must not arrive on a later day alongside a fresh digest.
        if (!job.dedupeKey.endsWith(":" + recallDay(new Date())))
          return finish("suppressed", "DIGEST_EXPIRED");
        due = await dueCount(tx, job.studentId);
        if (!due) return finish("suppressed", "NOTHING_DUE");
        unsubscribeUrl = `${config.origin}/email/unsubscribe?token=${unsubscribeToken(job.studentId, profile.emailConsentAt, config.unsubscribeSecret)}`;
      }
      const content = emailTemplate(
        job.kind as "welcome" | "recall" | "test",
        config,
        profile?.displayName ?? user.name ?? "learner",
        due,
        unsubscribeUrl,
      );
      try {
        const receipt = await sendEmail(config, { id: job.id, to: user.email, ...content });
        const providerMessageId = `${config.provider}:${receipt}`;
        await tx.emailDelivery.update({
          where: { id: job.id },
          data: { status: "sent", providerMessageId, sentAt: new Date(), errorCode: null },
        });
        return "sent";
      } catch (e) {
        if (!(e instanceof EmailSendError)) throw e;
        if (e.retryable && job.attempts < 3) {
          await tx.emailDelivery.update({
            where: { id: job.id },
            data: {
              status: "queued",
              availableAt: new Date(Date.now() + 3600_000),
              errorCode: e.code,
            },
          });
          return "deferred";
        }
        return finish(e.uncertain ? "uncertain" : "failed", e.code);
      }
    },
    { maxWait: 10000, timeout: 25000 },
  );
}
export async function runEmailBatch(db: PrismaClient, limit = 5) {
  const config = emailConfig();
  if (!config) return { status: "not-connected", queued: 0, results: {} };
  const queued = await enqueueDueReminders(db);
  const results: Record<string, number> = {};
  for (let i = 0; i < Math.min(Math.max(limit, 1), 10); i++) {
    const job = await claim(db, config, new Date());
    if (!job) break;
    try {
      const status = await deliver(db, config, job);
      results[status] = (results[status] ?? 0) + 1;
    } catch {
      await db.emailDelivery
        .updateMany({
          where: { id: job.id, status: "sending" },
          data: { status: "uncertain", errorCode: "TRANSACTION_OUTCOME_UNKNOWN" },
        })
        .catch(() => {});
      results.uncertain = (results.uncertain ?? 0) + 1;
    }
  }
  return { status: config.mode, queued, results };
}
