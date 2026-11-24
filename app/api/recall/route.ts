import { authoredLessonPrefix } from "../../../lib/content/current-lesson-evidence";
import { requireUnitAccess } from "../../../lib/enrollment/access";
import { z } from "zod";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { publicError, IngestError } from "../../../lib/ingest/errors";
import { nextRecall } from "../../../lib/recall/schedule";
import { selectRecallExercise } from "../../../lib/recall/authored";
import { Prisma } from "../../../generated/app-client";
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("queue"),
    studyUnitId: z.string().min(1).max(100),
    includeFuture: z.boolean().optional(),
    chat: z
      .object({ text: z.string().min(1).max(12000), chunkId: z.string().min(1).max(100) })
      .optional(),
  }),
  z.object({
    action: z.literal("rate"),
    studyUnitId: z.string().min(1).max(100),
    chunkId: z.string().min(1).max(100),
    rating: z.number().min(0).max(1),
  }),
]);
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const parsed = inputSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_RECALL",
        "Provide a unit, action and a rating between zero and one.",
      );
    const input = parsed.data;
    await requireUnitAccess(learner.id, input.studyUnitId);
    if (input.action === "queue") {
      const mastery = await prisma.studentMastery.findMany({
        where: { studentId: learner.id, learningOutcome: { studyUnitId: input.studyUnitId } },
        select: { learningOutcomeId: true, nextReviewAt: true },
      });
      const due = mastery
        .filter((m) => !m.nextReviewAt || m.nextReviewAt <= new Date())
        .map((m) => m.learningOutcomeId);
      const eligible = {
        studyUnitId: input.studyUnitId,
        ...(!input.includeFuture
          ? { OR: [{ mastery: { none: { studentId: learner.id } } }, { id: { in: due } }] }
          : {}),
      };
      const structured = await prisma.ingestion.count({
        where: {
          learningOutcome: { studyUnitId: input.studyUnitId },
          structuredContent: { not: Prisma.DbNull },
        },
      });
      const currentAuthoredText = await prisma.studySession.findMany({
        where: { studyUnitId: input.studyUnitId },
        select: { markdown: true, concepts: true, studyUnit: { select: { code: true } } },
      });
      const activeEdition = currentAuthoredText.some(
        ({ concepts, studyUnit }) =>
          studyUnit.code.startsWith("BPT1501-") ||
          (concepts &&
            typeof concepts === "object" &&
            !Array.isArray(concepts) &&
            concepts.lessonVoice === "direct-teaching"),
      )
        ? {
            NOT: {
              ingestion: {
                sourceName: { startsWith: authoredLessonPrefix },
                sourceText: { notIn: currentAuthoredText.map(({ markdown }) => markdown) },
              },
            },
          }
        : {};
      const [authoredChunks, chunks] = await Promise.all([
        prisma.contentChunk.findMany({
          where: {
            learningOutcome: eligible,
            ...activeEdition,
            chunkIndex: 0,
            ingestion: { sourceName: { startsWith: "Vela original / " } },
          },
          select: {
            id: true,
            learningOutcomeId: true,
            ingestion: { select: { sourceText: true } },
          },
          take: 36,
          orderBy: [{ ingestion: { sourceName: "asc" } }, { createdAt: "desc" }],
        }),
        prisma.contentChunk.findMany({
          where: {
            learningOutcome: eligible,
            NOT: {
              ingestion: {
                is: {
                  structuredContent: { path: ["parser", "profile"], equals: "verified-blank-page" },
                },
              },
            },
            AND: [activeEdition],
            body: { not: null },
            ...(structured
              ? {
                  ingestion: {
                    OR: [
                      { structuredContent: { not: Prisma.DbNull } },
                      { sourceName: { startsWith: "Vela original / " } },
                    ],
                  },
                }
              : {}),
          },
          select: {
            id: true,
            body: true,
            learningOutcomeId: true,
            learningOutcome: { select: { description: true } },
          },
          take: 60,
          orderBy: { position: "asc" },
        }),
      ]);
      const authored = authoredChunks.flatMap((chunk) => {
        if (!chunk.ingestion) return [];
        const checkpoint = selectRecallExercise(chunk.ingestion.sourceText);
        return checkpoint
          ? [
              {
                id: chunk.id,
                outcomeId: chunk.learningOutcomeId,
                prompt: checkpoint.question,
                answer: checkpoint.answer,
              },
            ]
          : [];
      });
      const taught = new Set(authored.map((card) => card.outcomeId));
      const seen = new Set<string>();
      const fallback = chunks
        .filter((c) => {
          if (taught.has(c.learningOutcomeId) || !c.body || seen.has(c.body)) return false;
          seen.add(c.body);
          return true;
        })
        .slice(0, 12)
        .map((c) => ({
          id: c.id,
          outcomeId: c.learningOutcomeId,
          prompt: `What concept or method would you use for this outcome?\n\n${c.learningOutcome.description}`,
          answer:
            c.body?.match(/\$\$[\s\S]*?\$\$|(?<!\$)\$[^\n$]+\$/)?.[0] ??
            c.body
              ?.split(/\n\s*\n/)
              .find((p) => /definition|defined|means|teaching|misconception|\bis\b/i.test(p)) ??
            c.body,
        }));
      const prompts = new Set<string>();
      const cards = [...authored, ...fallback]
        .filter((card) => {
          if (prompts.has(card.prompt)) return false;
          prompts.add(card.prompt);
          return true;
        })
        .slice(0, 12);
      if (input.chat) {
        const source = await prisma.contentChunk.findFirst({
          where: { id: input.chat.chunkId, learningOutcome: { studyUnitId: input.studyUnitId } },
          select: { id: true, learningOutcomeId: true },
        });
        if (!source)
          throw new IngestError(
            400,
            "INVALID_CHAT_SOURCE",
            "Conversation cards need a source in this unit.",
          );
        cards.unshift({
          id: source.id,
          outcomeId: source.learningOutcomeId,
          prompt:
            "Recall this conversation's explanation; verify it against the cited source before rating.",
          answer: input.chat.text,
        });
      }
      return Response.json({ cards }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const chunk = await prisma.contentChunk.findFirst({
      where: { id: input.chunkId, learningOutcome: { studyUnitId: input.studyUnitId } },
      select: { learningOutcomeId: true },
    });
    if (!chunk)
      throw new IngestError(
        404,
        "SOURCE_NOT_FOUND",
        "This source does not belong to the selected unit.",
      );
    const mastery = await prisma.$transaction(async (tx) => {
      const key = { studentId: learner.id, learningOutcomeId: chunk.learningOutcomeId };
      const prior = await tx.studentMastery.findUnique({
        where: { studentId_learningOutcomeId: key },
      });
      const now = new Date(),
        next = nextRecall(input.rating, prior, now);
      return tx.studentMastery.upsert({
        where: { studentId_learningOutcomeId: key },
        create: {
          ...key,
          score: input.rating,
          attempts: 1,
          lastAssessedAt: now,
          nextReviewAt: next,
        },
        update: {
          score: input.rating,
          attempts: { increment: 1 },
          lastAssessedAt: now,
          nextReviewAt: next,
        },
      });
    });
    return Response.json({
      score: mastery.score,
      nextReviewAt: mastery.nextReviewAt,
      kind: "self-assessment",
    });
  } catch (error) {
    const failure = publicError(
      error instanceof IngestError
        ? error
        : new IngestError(503, "RECALL_UNAVAILABLE", "Recall is unavailable. Please retry."),
    );
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
