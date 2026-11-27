import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { isSupportOperator } from "../../../../lib/account/support";
import { retentionPlan } from "../../../../lib/account/retention";
import { retentionDatabase } from "../../../../lib/account/retention-runtime";
import { retentionPolicy } from "../../../../lib/account/retention-policy";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError } from "../../../../lib/ingest/errors";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("hold"),
      scope: z.enum(["all", "account", "support", "moderation", "delivery", "security"]),
      targetId: id.nullable(),
      reason: z.string().trim().min(10).max(500),
      expiresAt: z.string().datetime().nullable(),
    })
    .strict(),
  z.object({ action: z.literal("release"), id }).strict(),
]);
async function operator() {
  const user = await requireLearner();
  if (!(await isSupportOperator(prisma, user)))
    throw new IngestError(
      403,
      "SUPPORT_REQUIRED",
      "Retention controls require the configured support operator.",
    );
  return user;
}
export async function GET() {
  try {
    const user = await operator();
    const { targets, ...plan } = await retentionPlan(retentionDatabase);
    return Response.json({ ownerId: user.id, ...plan }, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await operator();
    const parsed = input.safeParse(await readJson(request, 12000));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_HOLD",
        "Choose a scope, reference and reason for the hold.",
      );
    const command = parsed.data;
    if (
      command.action === "hold" &&
      command.expiresAt &&
      Date.parse(command.expiresAt) <= Date.now()
    )
      throw new IngestError(
        400,
        "EXPIRED_HOLD",
        "A hold expiry must be in the future, or leave it open-ended.",
      );
    await retentionDatabase.transaction(async (tx) => {
      await tx.query(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended('vela:retention',0))::text`,
      );
      if (command.action === "hold")
        await tx.query(
          Prisma.sql`INSERT INTO "RetentionHold"(id,scope,"targetId",reason,"createdBy","expiresAt") VALUES (${randomUUID()},${command.scope},${command.targetId},${command.reason},${user.id},${command.expiresAt ? new Date(command.expiresAt) : null}) RETURNING id`,
        );
      else {
        const changed = await tx.query(
          Prisma.sql`UPDATE "RetentionHold" SET "releasedAt"=CURRENT_TIMESTAMP,"releasedBy"=${user.id} WHERE id=${command.id} AND "releasedAt" IS NULL RETURNING id`,
        );
        if (!changed.length)
          throw new IngestError(
            409,
            "HOLD_CHANGED",
            "This hold is already released or does not exist.",
          );
      }
      await tx.query(
        Prisma.sql`INSERT INTO "RetentionRun"(id,"actorId",mode,"policyVersion",counts) VALUES (${randomUUID()},${user.id},${command.action},${retentionPolicy.version},${JSON.stringify({ changes: 1 })}::jsonb) RETURNING id`,
      );
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}
