import { randomUUID } from "node:crypto";
import { currentLessonEvidenceSql } from "../content/current-lesson-evidence";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { IngestError } from "../ingest/errors";
import type { Database } from "../ingest/repository";
import { generateQuiz, normalizeAnswer, proseSentences } from "./generator";
import type { DraftQuestion, Quiz, QuizResult, QuizSource } from "./types";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const generateInput = z
  .object({
    studyUnitId: id,
    provider: z
      .enum(["auto", "heuristic", "ollama", "cloudflare", "openai", "groq", "gemini", "openrouter"])
      .default("auto"),
  })
  .strict();
const submitInput = z
  .object({
    attemptId: id,
    answers: z
      .array(z.object({ questionId: id, value: z.string().max(500) }).strict())
      .min(1)
      .max(6),
  })
  .strict();
type StoredQuestion = DraftQuestion & { id: string; learningOutcomeId: string; points: number };

function input<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new IngestError(
      400,
      "INVALID_QUIZ_INPUT",
      "Check the study unit, quiz attempt and answers. Only supported quiz fields may be submitted.",
    );
  return result.data;
}

export function gradeQuiz(
  attemptId: string,
  studyUnitId: string,
  questions: StoredQuestion[],
  answers: { questionId: string; value: string }[],
): QuizResult {
  if (
    answers.length !== questions.length ||
    new Set(answers.map((answer) => answer.questionId)).size !== questions.length ||
    answers.some((answer) => !questions.some((question) => question.id === answer.questionId))
  )
    throw new IngestError(
      400,
      "INCOMPLETE_QUIZ",
      "Answer every question exactly once, using the questions issued for this attempt.",
    );
  const outcomes = new Map<string, { earned: number; possible: number }>();
  const feedback = questions.map((question) => {
    const value = answers.find((answer) => answer.questionId === question.id)!.value;
    const correct =
      question.kind === "MULTIPLE_CHOICE"
        ? value === question.answer.optionId
        : (question.answer.accepted ?? []).some(
            (answer) => normalizeAnswer(answer) === normalizeAnswer(value),
          );
    if (
      question.kind === "MULTIPLE_CHOICE" &&
      !question.options?.some((option) => option.id === value)
    )
      throw new IngestError(
        400,
        "INVALID_OPTION",
        "Select one of the options issued for each multiple-choice question.",
      );
    const earned = correct ? question.points : 0;
    const outcome = outcomes.get(question.learningOutcomeId) ?? { earned: 0, possible: 0 };
    outcome.earned += earned;
    outcome.possible += question.points;
    outcomes.set(question.learningOutcomeId, outcome);
    return {
      questionId: question.id,
      correct,
      earned,
      points: question.points,
      answer:
        question.kind === "MULTIPLE_CHOICE"
          ? question.options!.find((option) => option.id === question.answer.optionId)!.text
          : question.answer.accepted![0],
      explanation: question.explanation,
      sourceUrl: `/study/${encodeURIComponent(studyUnitId)}#chunk-${encodeURIComponent(question.sourceChunkId)}`,
    };
  });
  const earned = feedback.reduce((sum, item) => sum + item.earned, 0);
  const possible = feedback.reduce((sum, item) => sum + item.points, 0);
  return {
    attemptId,
    score: Math.round((100 * earned) / possible),
    earned,
    possible,
    correct: feedback.filter((item) => item.correct).length,
    total: feedback.length,
    feedback,
    mastery: [...outcomes].map(([learningOutcomeId, values]) => ({
      learningOutcomeId,
      score: values.earned / values.possible,
    })),
  };
}

export function createQuizEngine(db: Database, generator: typeof generateQuiz = generateQuiz) {
  return {
    async generate(studentId: string, value: unknown, signal?: AbortSignal): Promise<Quiz> {
      const { studyUnitId, provider: requested } = input(generateInput, value);
      if (
        !(await db.query(Prisma.sql`SELECT "id" FROM "StudyUnit" WHERE "id" = ${studyUnitId}`))
          .length
      )
        throw new IngestError(404, "UNIT_NOT_FOUND", "The study unit was not found.");
      const candidates = await db.query<QuizSource>(Prisma.sql`
        SELECT "id", "learningOutcomeId", "title", "body" FROM (
          SELECT c."id", c."learningOutcomeId", c."title", c."body", c."position" AS "chunkPosition", lo."position" AS "outcomePosition",
            row_number() OVER (PARTITION BY c."learningOutcomeId", c."body" ORDER BY c."createdAt", c."id") AS "copy"
          FROM "ContentChunk" c JOIN "LearningOutcome" lo ON lo."id" = c."learningOutcomeId" JOIN "Ingestion" i ON i.id=c."ingestionId"
          WHERE lo."studyUnitId" = ${studyUnitId} AND ${currentLessonEvidenceSql} AND NOT EXISTS (SELECT 1 FROM "Ingestion" blank WHERE blank.id=c."ingestionId" AND blank."structuredContent"->'parser'->>'profile'='verified-blank-page') AND c."body" IS NOT NULL AND length(trim(c."body")) > 0
        ) sources WHERE "copy" = 1 ORDER BY "outcomePosition",
          length(regexp_replace("body", '[^[:alpha:]]', '', 'g'))::float / length("body") DESC,
          "chunkPosition", "id" LIMIT 24`);
      // Formula-heavy PDFs often start with headings and worked-expression
      // fragments. Select three usable prose passages from a bounded candidate
      // pool instead of generating questions from damaged mathematical layout.
      const sources = [...candidates]
        .sort(
          (a, b) =>
            Math.min(proseSentences(b.body).length, 8) - Math.min(proseSentences(a.body).length, 8),
        )
        .slice(0, 3);
      if (!sources.length)
        throw new IngestError(
          409,
          "NO_INGESTED_CONTENT",
          "This unit needs ingested study text before a quiz can be created. The sample preview does not award mastery.",
        );
      const generated = await generator(sources, requested, signal);
      const attemptId = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const questions = await db.transaction(async (tx) => {
        // Serialize question-position allocation with other quizzes of this unit.
        await tx.query(
          Prisma.sql`SELECT "id" FROM "StudyUnit" WHERE "id" = ${studyUnitId} FOR UPDATE`,
        );
        await tx.query(
          Prisma.sql`INSERT INTO "QuizAttempt" ("id", "studentId", "studyUnitId", "provider", "expiresAt") VALUES (${attemptId}, ${studentId}, ${studyUnitId}, ${generated.provider}, ${expiresAt}) RETURNING "id"`,
        );
        const issued = [];
        for (const draft of generated.questions) {
          const source = sources.find((source) => source.id === draft.sourceChunkId);
          if (!source) throw new Error("Unrecognized quiz source");
          await tx.query(
            Prisma.sql`SELECT "id" FROM "LearningOutcome" WHERE "id" = ${source.learningOutcomeId} FOR UPDATE`,
          );
          const [{ position }] = await tx.query<{ position: number }>(
            Prisma.sql`SELECT COALESCE(MAX("position"), 0)::int + 1 AS "position" FROM "QuizQuestion" WHERE "learningOutcomeId" = ${source.learningOutcomeId}`,
          );
          const questionId = randomUUID();
          await tx.query(
            Prisma.sql`INSERT INTO "QuizQuestion" ("id", "learningOutcomeId", "kind", "prompt", "options", "answer", "explanation", "points", "position", "updatedAt", "quizAttemptId", "sourceChunkId") VALUES (${questionId}, ${source.learningOutcomeId}, ${draft.kind}::"QuestionKind", ${draft.prompt}, ${JSON.stringify(draft.options)}::jsonb, ${JSON.stringify(draft.answer)}::jsonb, ${draft.explanation}, 1, ${position}, CURRENT_TIMESTAMP, ${attemptId}, ${draft.sourceChunkId}) RETURNING "id"`,
          );
          issued.push({
            id: questionId,
            kind: draft.kind,
            prompt: draft.prompt,
            options: draft.options,
            sourceChunkId: draft.sourceChunkId,
            points: 1,
          });
        }
        return issued;
      });
      return {
        attemptId,
        studyUnitId,
        provider: generated.provider,
        notice: generated.notice,
        expiresAt: expiresAt.toISOString(),
        questions,
      };
    },
    async submit(studentId: string, value: unknown): Promise<QuizResult> {
      const { attemptId, answers } = input(submitInput, value);
      return db.transaction(async (tx) => {
        const [attempt] = await tx.query<{
          studyUnitId: string;
          expired: boolean;
          result: QuizResult | null;
        }>(
          Prisma.sql`SELECT "studyUnitId", "expiresAt" < CURRENT_TIMESTAMP AS "expired", "result" FROM "QuizAttempt" WHERE "id" = ${attemptId} AND "studentId" = ${studentId} FOR UPDATE`,
        );
        if (!attempt)
          throw new IngestError(
            404,
            "ATTEMPT_NOT_FOUND",
            "This quiz attempt was not found for your account.",
          );
        if (attempt.result) return attempt.result;
        if (attempt.expired)
          throw new IngestError(
            410,
            "QUIZ_EXPIRED",
            "This quiz expired. Start a fresh practice attempt.",
          );
        const questions = await tx.query<StoredQuestion>(
          Prisma.sql`SELECT "id", "learningOutcomeId", "kind", "prompt", "options", "answer", "explanation", "points", "sourceChunkId" FROM "QuizQuestion" WHERE "quizAttemptId" = ${attemptId} ORDER BY "position", "id"`,
        );
        if (!questions.length)
          throw new IngestError(
            409,
            "QUIZ_CONTENT_CHANGED",
            "Quiz content changed. Start a fresh practice attempt.",
          );
        const result = gradeQuiz(attemptId, attempt.studyUnitId, questions, answers);
        // Stable lock ordering plus atomic upserts preserve attempt counts when
        // separate quizzes for the same learner finish concurrently.
        for (const mastery of [...result.mastery].sort((a, b) =>
          a.learningOutcomeId.localeCompare(b.learningOutcomeId),
        )) {
          await tx.query(Prisma.sql`INSERT INTO "StudentMastery" ("id", "studentId", "learningOutcomeId", "score", "attempts", "lastAssessedAt", "nextReviewAt", "updatedAt") VALUES (${randomUUID()}, ${studentId}, ${mastery.learningOutcomeId}, ${mastery.score}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
            ON CONFLICT ("studentId", "learningOutcomeId") DO UPDATE SET "score" = EXCLUDED."score", "attempts" = "StudentMastery"."attempts" + 1, "lastAssessedAt" = EXCLUDED."lastAssessedAt", "nextReviewAt" = EXCLUDED."nextReviewAt", "updatedAt" = CURRENT_TIMESTAMP RETURNING "id"`);
        }
        await tx.query(
          Prisma.sql`UPDATE "QuizAttempt" SET "submittedAt" = CURRENT_TIMESTAMP, "result" = ${JSON.stringify(result)}::jsonb WHERE "id" = ${attemptId} RETURNING "id"`,
        );
        return result;
      });
    },
  };
}
