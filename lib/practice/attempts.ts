import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseLearningBlocks } from "../content/exercises";
import { practiceCheck, checkPracticeQuantity } from "../content/practice-checks";
import { IngestError } from "../ingest/errors";
import type { Database } from "../ingest/repository";
export const draftSchema = z
  .object({
    text: z.string().max(6000).optional(),
    values: z.record(z.string().max(100)).optional(),
    units: z.record(z.string().max(100)).optional(),
    choice: z.number().int().min(0).max(50).nullable().optional(),
  })
  .strict();
export const attemptInput = z
  .object({
    ownerId: z.string().min(1).max(100),
    studyUnitId: z.string().min(1).max(100),
    sessionId: z.string().min(1).max(100),
    version: z.number().int().positive(),
    title: z.string().min(1).max(500),
    question: z.string().min(1).max(12000),
    draft: draftSchema,
    submitted: z.boolean().default(false),
    revision: z.number().int().min(0),
    mutationId: z.string().uuid().optional(),
  })
  .strict();
export type AttemptInput = z.infer<typeof attemptInput>;
export type AttemptRow = {
  id: string;
  studentId: string;
  sessionId: string;
  version: number;
  title: string;
  question: string;
  questionKey: string;
  userAnswer: z.infer<typeof draftSchema>;
  status: string;
  isLocallyChecked: boolean;
  aiFeedback: unknown;
  submitted: boolean;
  revision: number;
  updatedAt: Date;
  inReview: boolean;
};
export const exerciseKey = (title: string, question: string) =>
  createHash("sha256")
    .update(title + "\n" + question)
    .digest("hex");
export function checkedDraft(question: string, draft: AttemptInput["draft"]) {
  const spec = practiceCheck(question);
  if (!spec) return false;
  if (spec.kind === "quantity")
    return spec.fields.every(
      (f, i) => checkPracticeQuantity(draft.values?.[i] ?? "", draft.units?.[i] ?? "", f).correct,
    );
  return (
    draft.choice !== null && draft.choice !== undefined && !!spec.choices[draft.choice]?.correct
  );
}
export function matchExercise(markdown: string, title: string, question: string) {
  const p = parseLearningBlocks(markdown);
  if (
    p.errors.length ||
    p.blocks.filter((b) => b.type === "exercise" && b.title === title && b.question === question)
      .length !== 1
  )
    throw new IngestError(
      409,
      "EXERCISE_CHANGED",
      "This question changed. Reload the current lesson before saving.",
    );
}
export async function saveAttempt(
  db: Database,
  owner: string,
  input: AttemptInput,
  session: { version: number; markdown: string },
) {
  if (input.ownerId !== owner)
    throw new IngestError(409, "ACCOUNT_CHANGED", "Sign in again before saving practice.");
  if (input.version !== session.version)
    throw new IngestError(
      409,
      "SESSION_CHANGED",
      "The lesson has a new version. Your older draft remains separate.",
    );
  matchExercise(session.markdown, input.title, input.question);
  const key = exerciseKey(input.title, input.question),
    checked = input.submitted && checkedDraft(input.question, input.draft);
  return db.transaction(async (tx) => {
    await tx.query(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${"vela:attempt:" + owner + ":" + input.sessionId + ":" + key},0))::text`,
    );
    const [old] = await tx.query<AttemptRow>(
      Prisma.sql`SELECT * FROM "LessonAttempt" WHERE "studentId"=${owner} AND "sessionId"=${input.sessionId} AND version=${input.version} AND "questionKey"=${key} FOR UPDATE`,
    );
    if ((old?.revision ?? 0) !== input.revision)
      throw new IngestError(
        409,
        "ATTEMPT_CONFLICT",
        "A newer answer was saved in another tab. Reload before replacing it.",
      );
    const [row] = await tx.query<AttemptRow>(
      Prisma.sql`INSERT INTO "LessonAttempt"(id,"studentId","sessionId",version,"questionKey",title,question,"userAnswer",status,"isLocallyChecked",submitted) VALUES (${randomUUID()},${owner},${input.sessionId},${input.version},${key},${input.title},${input.question},${JSON.stringify(input.draft)}::jsonb,${checked ? "checked" : "tried"},${checked},${input.submitted}) ON CONFLICT ("studentId","sessionId",version,"questionKey") DO UPDATE SET "userAnswer"=EXCLUDED."userAnswer",status=EXCLUDED.status,"isLocallyChecked"=EXCLUDED."isLocallyChecked",submitted=EXCLUDED.submitted,"aiFeedback"=NULL,revision="LessonAttempt".revision+1,"updatedAt"=CURRENT_TIMESTAMP RETURNING *`,
    );
    if (input.submitted)
      await tx.query(
        Prisma.sql`INSERT INTO "LessonAttemptSubmission"(id,"attemptId","mutationId",answer,"isLocallyChecked") VALUES (${randomUUID()},${row.id},${input.mutationId ?? randomUUID()},${JSON.stringify(input.draft)}::jsonb,${checked}) ON CONFLICT ("attemptId","mutationId") DO NOTHING RETURNING id`,
      );
    return row;
  });
}
