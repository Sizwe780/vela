import "dotenv/config";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { emailConfig, recallDay } from "../lib/email/config";
import { sendEmail } from "../lib/email/provider";
import { EmailSendError } from "../lib/email/errors";
import { emailTemplate } from "../lib/email/templates";
const config = emailConfig();
if (!config || config.mode !== "test")
  throw Error("Configure EMAIL_MODE=test and the approved test inbox first.");
const preview = process.argv.find((a) => a.startsWith("--preview="))?.slice(10) ?? "test";
if (!["test", "welcome", "recall"].includes(preview))
  throw Error("Use --preview=test, welcome or recall");
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 2,
  }),
});
async function main() {
  try {
    // Operator-only transport test: the approved inbox need not be a Vela learner.
    // This never changes a learner's email, mastery, or reminder consent.
    const inboxHash = createHash("sha256").update(config!.testRecipient).digest("hex").slice(0, 24);
    const dedupeKey = `operator-preview:${inboxHash}:${preview}:${recallDay(new Date())}`;
    await db.emailDelivery.createMany({
      data: [
        { id: randomUUID(), studentId: `operator-test:${inboxHash}`, kind: "test", dedupeKey },
      ],
      skipDuplicates: true,
    });
    const job = await db.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<
        { acquired: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(hashtext('vela-email-claims')) AS acquired`;
      if (!lock[0]?.acquired) return null;
      if (process.argv.includes("--retry-rejected"))
        await tx.emailDelivery.updateMany({
          where: {
            dedupeKey,
            status: "failed",
            errorCode: {
              in: [
                "RESEND_HTTP_401",
                "RESEND_HTTP_403",
                "RESEND_HTTP_422",
                "RESEND_KEY_INVALID",
                "RESEND_TEST_INBOX_MISMATCH",
                "RESEND_SENDER_NOT_VERIFIED",
              ],
            },
          },
          data: { status: "queued" },
        });
      const row = await tx.emailDelivery.findUniqueOrThrow({ where: { dedupeKey } });
      if (row.status !== "queued") return null;
      const day = new Date().toISOString().slice(0, 10);
      await tx.emailBudget.upsert({ where: { day }, create: { day }, update: {} });
      const budget = await tx.emailBudget.updateMany({
        where: { day, attempts: { lt: config!.dailyLimit } },
        data: { attempts: { increment: 1 } },
      });
      if (!budget.count) return null;
      return tx.emailDelivery.update({
        where: { id: row.id },
        data: { status: "sending", claimedAt: new Date(), attempts: { increment: 1 } },
      });
    });
    if (job) {
      const content = emailTemplate(
        preview as "test" | "welcome" | "recall",
        config!,
        "Vela learner",
        preview === "recall" ? 3 : 0,
      );
      if (preview !== "test") {
        content.subject = `[Preview] ${content.subject}`;
        const note =
          "Delivery preview: any review counts are sample data. This test does not subscribe you to reminders.";
        content.text = note + "\n\n" + content.text;
        content.html = content.html.replace(
          "<main ",
          '<p style="padding:16px;text-align:center">' + note + "</p><main ",
        );
      }
      try {
        const id = await sendEmail(config!, { id: job.id, to: config!.testRecipient, ...content });
        await db.emailDelivery.update({
          where: { id: job.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            providerMessageId: `${config!.provider}:${id}`,
            errorCode: null,
          },
        });
      } catch (e) {
        await db.emailDelivery.update({
          where: { id: job.id },
          data: {
            status: e instanceof EmailSendError && !e.uncertain ? "failed" : "uncertain",
            errorCode: e instanceof EmailSendError ? e.code : "OUTCOME_UNKNOWN",
          },
        });
      }
    }
    const receipt = await db.emailDelivery.findUnique({
      where: { dedupeKey },
      select: { status: true, sentAt: true, errorCode: true },
    });
    console.log(JSON.stringify({ provider: config!.provider, mode: "test", preview, ...receipt }));
    if (receipt?.status !== "sent") process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(JSON.stringify({ error: "EMAIL_TEST_FAILED", code: e?.code }));
  process.exitCode = 1;
});
