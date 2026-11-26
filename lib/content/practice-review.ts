import { createHash } from "node:crypto";
import { z } from "zod";
import { parseLearningBlocks } from "./exercises";
import { IngestError } from "../ingest/errors";
import { mathSpans, normalizeMath } from "./math";

export const practiceReviewInput = z
  .object({
    ownerId: z.string().min(1).max(100),
    studyUnitId: z.string().min(1).max(100),
    sessionId: z.string().min(1).max(100),
    version: z.number().int().positive(),
    title: z.string().min(1).max(500),
    question: z.string().min(1).max(12000),
    attempt: z.string().trim().min(1).max(6000),
  })
  .strict();

export const practiceReviewSchema = z
  .object({
    verdict: z.enum(["correct", "partial", "incorrect", "unverified"]),
    confidence: z.enum(["high", "low"]),
    feedback: z.string().min(1).max(1000),
    nextStep: z.string().min(1).max(500),
    learnerQuote: z.string().max(250),
    referenceQuote: z.string().max(250),
  })
  .strict();
export type PracticeReview = z.infer<typeof practiceReviewSchema>;
export type PracticeReviewRequest = z.infer<typeof practiceReviewInput>;
type Session = { id: string; version: number; markdown: string; title: string };
type Dependencies = {
  access: (owner: string, unit: string) => Promise<string>;
  session: (unit: string, session: string) => Promise<Session | null>;
  review: (evidence: {
    question: string;
    answer: string;
    attempt: string;
  }) => Promise<PracticeReview>;
};
const fingerprint = (session: Session) =>
  createHash("sha256").update(session.markdown).digest("hex");

/** Formative feedback only. No grade, progress or mastery writes. */
export async function reviewPractice(
  owner: string,
  input: PracticeReviewRequest,
  deps: Dependencies,
) {
  if (owner !== input.ownerId)
    throw new IngestError(409, "ACCOUNT_CHANGED", "Your account changed. Reload before checking.");
  const unit = await deps.access(owner, input.studyUnitId);
  const session = await deps.session(unit, input.sessionId);
  if (!session || session.version !== input.version)
    throw new IngestError(
      409,
      "SESSION_CHANGED",
      "This lesson changed. Reload it before checking your attempt.",
    );
  const parsed = parseLearningBlocks(session.markdown);
  const matches = parsed.blocks.filter(
    (b) => b.type === "exercise" && b.title === input.title && b.question === input.question,
  );
  if (parsed.errors.length || matches.length !== 1 || matches[0].type !== "exercise")
    throw new IngestError(
      409,
      "EXERCISE_CHANGED",
      "This practice could not be matched to the published lesson. Reload and retry.",
    );
  const exercise = matches[0];
  const sourceHash = fingerprint(session);
  if (exercise.answer.length > 16000 || /solution unavailable/i.test(exercise.answer))
    throw new IngestError(
      422,
      "REFERENCE_UNAVAILABLE",
      "This practice needs a reviewed solution before automatic feedback is available.",
    );
  const result = practiceReviewSchema.parse(
    await deps.review({
      question: exercise.question,
      answer: exercise.answer,
      attempt: input.attempt,
    }),
  );
  // A model cannot claim a confident conclusion without quotes from both actual inputs.
  const supported =
    result.learnerQuote.trim().length >= 1 &&
    result.referenceQuote.trim().length >= 1 &&
    input.attempt.includes(result.learnerQuote) &&
    exercise.answer.includes(result.referenceQuote);
  let renderable = true;
  try {
    result.feedback = normalizeMath(result.feedback);
    result.nextStep = normalizeMath(result.nextStep);
    mathSpans(result.feedback);
    mathSpans(result.nextStep);
  } catch {
    renderable = false;
  }
  if (!supported || !renderable || result.confidence === "low") {
    result.verdict = "unverified";
    result.feedback =
      "This attempt could not be checked confidently. Compare your reasoning with the worked solution or ask your companion for a focused explanation.";
    result.nextStep =
      "Keep your attempt and check the assumptions, reasoning and required units against the lesson.";
  }
  await deps.access(owner, input.studyUnitId);
  const current = await deps.session(unit, input.sessionId);
  if (!current || current.version !== session.version || fingerprint(current) !== sourceHash)
    throw new IngestError(
      409,
      "SESSION_CHANGED",
      "This lesson changed while checking. Reload before retrying.",
    );
  // Evidence quotes support validation internally; do not reveal the reference answer before its gate.
  return {
    ownerId: owner,
    verdict: result.verdict,
    feedback: result.feedback,
    nextStep: result.nextStep,
    method: "ai" as const,
    masteryUpdated: false as const,
  };
}
