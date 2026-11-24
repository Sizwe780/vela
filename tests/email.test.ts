import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { emailConfig, mayEmail, recallDay, recallSendWindow } from "../lib/email/config";
import { EmailSendError, sendBrevo } from "../lib/email/brevo";
import { emailTemplate } from "../lib/email/templates";
import { readUnsubscribeToken, unsubscribeToken } from "../lib/email/unsubscribe";
import { dueCount, enqueueDueReminders } from "../lib/email/service";
import { sendEmail } from "../lib/email/provider";
import type { PrismaClient } from "../generated/app-client";
const env = {
  EMAIL_PROVIDER: "brevo",
  EMAIL_MODE: "test",
  BREVO_API_KEY: "fake-test-key",
  EMAIL_FROM: "sender@example.org",
  EMAIL_REPLY_TO: "support@example.org",
  EMAIL_TEST_RECIPIENT: "owner@example.org",
  EMAIL_APP_URL: "http://localhost:3200",
  EMAIL_UNSUBSCRIBE_SECRET: "test-secret-".repeat(5),
  EMAIL_DAILY_LIMIT: "250",
};
const config = emailConfig(env)!;
test("Resend sandbox cannot become live and stays below its daily free allowance", () => {
  const settings = {
    ...env,
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "fake-resend-key",
    EMAIL_FROM: "onboarding@resend.dev",
    EMAIL_DAILY_LIMIT: "85",
  };
  assert.ok(emailConfig(settings));
  assert.equal(
    emailConfig({ ...settings, EMAIL_MODE: "live", EMAIL_APP_URL: "https://vela.example.org" }),
    null,
  );
  assert.equal(emailConfig({ ...settings, EMAIL_DAILY_LIMIT: "100" }), null);
});
test("Resend uses HTTP idempotency and signed one-click unsubscribe headers", async () => {
  const resend = emailConfig({
    ...env,
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "fake-resend-key",
    EMAIL_FROM: "onboarding@resend.dev",
    EMAIL_DAILY_LIMIT: "85",
  })!;
  const id = randomUUID();
  const content = emailTemplate(
    "recall",
    resend,
    "Owner",
    2,
    "http://localhost:3200/email/unsubscribe?token=signed",
  );
  const receipt = await sendEmail(
    resend,
    { id, to: resend.testRecipient, ...content },
    async (url, init) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(new Headers(init!.headers).get("Idempotency-Key"), id);
      const body = JSON.parse(init!.body as string);
      assert.deepEqual(body.to, [resend.testRecipient]);
      assert.equal(
        body.headers["List-Unsubscribe"],
        "<http://localhost:3200/api/email/unsubscribe?token=signed>",
      );
      return Response.json({ id: "resend-receipt" });
    },
  );
  assert.equal(receipt, "resend-receipt");
  await assert.rejects(
    sendEmail(resend, { id, to: "another@example.org", ...content }, async () => {
      throw Error("must not send");
    }),
    (e: unknown) => e instanceof EmailSendError && e.code === "TEST_RECIPIENT_BLOCKED",
  );
});
test("email configuration fails closed; live mail requires HTTPS and a bounded budget", () => {
  assert.equal(emailConfig({}), null);
  assert.equal(emailConfig({ ...env, EMAIL_MODE: "disabled" }), null);
  for (const overrides of [
    { BREVO_API_KEY: "" },
    { EMAIL_UNSUBSCRIBE_SECRET: "short" },
    { EMAIL_DAILY_LIMIT: "301" },
    { EMAIL_MODE: "live" },
    { EMAIL_APP_URL: "https://user:secret@example.org" },
    { EMAIL_APP_URL: "https://example.org/path" },
    { EMAIL_APP_URL: "http://evil.invalid" },
  ])
    assert.equal(emailConfig({ ...env, ...overrides }), null);
  assert.ok(emailConfig({ ...env, EMAIL_MODE: "live", EMAIL_APP_URL: "https://vela.example.org" }));
  assert.equal(mayEmail(config, "OWNER@example.org"), true);
  assert.equal(mayEmail(config, "another@example.org"), false);
});
test("recall uses a single South African calendar day and daytime window", () => {
  assert.equal(recallDay(new Date("2026-11-17T22:01:00Z")), "2026-11-18");
  assert.equal(recallSendWindow(new Date("2026-11-17T06:59:59Z")), false);
  assert.equal(recallSendWindow(new Date("2026-11-17T07:00:00Z")), true);
  assert.equal(recallSendWindow(new Date("2026-11-17T15:59:59Z")), true);
  assert.equal(recallSendWindow(new Date("2026-11-17T16:00:00Z")), false);
});
test("unsubscribe signatures reject tampering and are bound to a consent generation", () => {
  const date = new Date("2026-11-17T08:00:00Z");
  const token = unsubscribeToken("student-1", date, config.unsubscribeSecret);
  assert.deepEqual(readUnsubscribeToken(token, config.unsubscribeSecret), {
    studentId: "student-1",
    consentAt: date,
  });
  assert.equal(readUnsubscribeToken(token, "another-secret".repeat(5)), null);
  assert.equal(readUnsubscribeToken("X" + token, config.unsubscribeSecret), null);
  assert.equal(readUnsubscribeToken(token + ".extra", config.unsubscribeSecret), null);
  assert.notEqual(
    token,
    unsubscribeToken("student-1", new Date(date.getTime() + 1), config.unsubscribeSecret),
  );
});
test("email templates escape untrusted names and keep notes/answers out of the digest", () => {
  const email = emailTemplate(
    "recall",
    config,
    '<img src=x onerror="alert(1)">',
    3,
    "https://example.org/email/unsubscribe?token=signed",
  );
  assert.ok(!email.html.includes("<img"));
  assert.match(email.html, /&lt;img/);
  assert.match(email.text, /3 learning outcomes ready for review/);
  assert.match(email.text, /Stop recall reminders/);
  assert.match(emailTemplate("welcome", config, "Student", 0).text, /\/onboarding/);
});
test("Brevo adapter sends to the approved inbox and includes a stable idempotency key", async () => {
  const id = randomUUID();
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    const payload = JSON.parse(init!.body as string);
    assert.deepEqual(payload.to, [{ email: config.testRecipient }]);
    assert.equal(payload.headers.idempotencyKey, id);
    assert.equal(payload.replyTo.email, config.replyTo);
    return Response.json({ messageId: "provider-receipt" }, { status: 201 });
  };
  const message = { id, to: config.testRecipient, ...emailTemplate("test", config, "Owner", 0) };
  assert.equal(await sendBrevo(config, message, fetcher), "provider-receipt");
  await assert.rejects(
    sendBrevo(config, { ...message, to: "another@example.org" }, fetcher),
    (e: unknown) => e instanceof EmailSendError && e.code === "TEST_RECIPIENT_BLOCKED",
  );
  assert.equal(calls, 1);
});
test("ambiguous send failures cannot be blindly retried; only explicit throttling is retryable", async () => {
  const message = {
    id: randomUUID(),
    to: config.testRecipient,
    ...emailTemplate("test", config, "Owner", 0),
  };
  for (const [status, retryable, uncertain] of [
    [429, true, false],
    [500, false, true],
    [403, false, false],
  ] as const) {
    await assert.rejects(
      sendBrevo(
        config,
        message,
        async () => new Response("provider detail must not be logged", { status }),
      ),
      (e: unknown) =>
        e instanceof EmailSendError &&
        e.retryable === retryable &&
        e.uncertain === uncertain &&
        !e.message.includes("provider detail"),
    );
  }
  await assert.rejects(
    sendBrevo(config, message, async () => {
      throw Error("socket closed");
    }),
    (e: unknown) => e instanceof EmailSendError && e.uncertain && !e.retryable,
  );
});
test("email migration enforces unique deliveries, valid states and a hard budget ceiling", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      'CREATE TABLE "StudentProfile" ("studentId" TEXT PRIMARY KEY,"emailReminders" BOOLEAN DEFAULT false); INSERT INTO "StudentProfile" VALUES(\'legacy\',true)',
    );
    await pg.exec(
      await readFile("prisma/migrations/20261118090000_email_delivery/migration.sql", "utf8"),
    );
    assert.equal(
      (await pg.query<{ emailReminders: boolean }>('SELECT "emailReminders" FROM "StudentProfile"'))
        .rows[0].emailReminders,
      false,
    );
    await pg.exec(
      `INSERT INTO "EmailDelivery" (id,"dedupeKey","studentId",kind,"updatedAt") VALUES('one','welcome:test','test','welcome',now())`,
    );
    await assert.rejects(
      pg.exec(
        `INSERT INTO "EmailDelivery" (id,"dedupeKey","studentId",kind,"updatedAt") VALUES('two','welcome:test','test','welcome',now())`,
      ),
    );
    await assert.rejects(pg.exec(`UPDATE "EmailDelivery" SET status='anything'`));
    await assert.rejects(pg.exec(`INSERT INTO "EmailBudget" VALUES('2026-11-17',281)`));
  } finally {
    await pg.close();
  }
});
test("due digest SQL excludes withdrawn, unverified and unconsented learners; retries deduplicate", async () => {
  const pg = new PGlite();
  const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    await pg.exec(`CREATE SCHEMA neon_auth; CREATE TABLE neon_auth."user"(id UUID PRIMARY KEY,email TEXT,"emailVerified" BOOLEAN);
      CREATE TABLE "StudentProfile"("studentId" TEXT PRIMARY KEY,"emailReminders" BOOLEAN DEFAULT false);
      CREATE TABLE "Module"(id TEXT PRIMARY KEY,institution TEXT,code TEXT);
      CREATE TABLE "StudyUnit"(id TEXT PRIMARY KEY,"moduleId" TEXT,code TEXT);
      CREATE TABLE "LearningOutcome"(id TEXT PRIMARY KEY,"studyUnitId" TEXT);
      CREATE TABLE "StudentMastery"(id TEXT PRIMARY KEY,"studentId" TEXT,"learningOutcomeId" TEXT,"nextReviewAt" TIMESTAMP);
      CREATE TABLE "Enrollment"("studentId" TEXT,"moduleId" TEXT,status TEXT);`);
    await pg.exec(
      await readFile("prisma/migrations/20261118090000_email_delivery/migration.sql", "utf8"),
    );
    const owner = "00000000-0000-4000-8000-000000000001";
    let seed = `INSERT INTO neon_auth."user" VALUES('owner','owner@example.org',true),('unverified','owner@example.org',false),('no-consent','owner@example.org',true);
      INSERT INTO "StudentProfile"("studentId","emailReminders","emailConsentAt","emailConsentVersion") VALUES('owner',true,'2026-11-16','recall-daily-v1'),('unverified',true,'2026-11-16','recall-daily-v1'),('no-consent',false,NULL,NULL);
      INSERT INTO "Module" VALUES('active-module','UNISA','MAT1503'),('withdrawn-module','UNISA','MAT1512');
      INSERT INTO "StudyUnit" VALUES('active-unit','active-module','U1'),('withdrawn-unit','withdrawn-module','U1');
      INSERT INTO "LearningOutcome" VALUES('a','active-unit'),('w','withdrawn-unit');
      INSERT INTO "Enrollment" VALUES('owner','active-module','active'),('owner','withdrawn-module','withdrawn'),('unverified','active-module','active'),('no-consent','active-module','active');
      INSERT INTO "StudentMastery" VALUES('m1','owner','a','2026-11-16'),('m2','owner','w','2026-11-16'),('m3','unverified','a','2026-11-16'),('m4','no-consent','a','2026-11-16');`;
    for (const [label, id] of [
      ["owner", owner],
      ["unverified", "00000000-0000-4000-8000-000000000002"],
      ["no-consent", "00000000-0000-4000-8000-000000000003"],
    ])
      seed = seed.replaceAll(`'${label}'`, `'${id}'`);
    await pg.exec(seed);
    const db = {
      async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
        const sql = strings.reduce((text, part, i) => text + (i ? `$${i}` : "") + part, "");
        return (await pg.query(sql, values)).rows;
      },
      emailDelivery: {
        async createMany({
          data,
        }: {
          data: {
            id: string;
            studentId: string;
            kind: string;
            consentAt: Date;
            dedupeKey: string;
          }[];
        }) {
          let count = 0;
          for (const row of data)
            count += (
              await pg.query(
                'INSERT INTO "EmailDelivery"(id,"studentId",kind,"consentAt","dedupeKey","updatedAt") VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT DO NOTHING RETURNING id',
                [row.id, row.studentId, row.kind, row.consentAt, row.dedupeKey],
              )
            ).rows.length;
          return { count };
        },
      },
    } as unknown as PrismaClient;
    const now = new Date("2026-11-17T09:00:00Z");
    assert.equal(await dueCount(db, owner, now), 1);
    assert.equal(await enqueueDueReminders(db, now), 1);
    assert.equal(await enqueueDueReminders(db, now), 0);
    await pg.exec(
      `UPDATE "StudentProfile" SET "emailConsentAt"='2026-11-17' WHERE "studentId"='${owner}'`,
    );
    assert.equal(
      await enqueueDueReminders(db, now),
      0,
      "re-subscribing cannot send a second digest on the same day",
    );
    const jobs = (await pg.query<{ studentId: string }>('SELECT "studentId" FROM "EmailDelivery"'))
      .rows;
    assert.deepEqual(jobs, [{ studentId: owner }]);
  } finally {
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    await pg.close();
  }
});
