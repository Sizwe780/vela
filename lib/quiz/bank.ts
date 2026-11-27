import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { unitBanks } from "../../content/assessments/unit-banks";
import type { DraftQuestion, QuizProvider, QuizSource } from "./types";
import { generateQuiz } from "./generator";
import { IngestError } from "../ingest/errors";

const item = z
  .object({
    prompt: z.string().min(12).max(1000),
    explanation: z.string().min(15).max(2000),
    options: z.array(z.string().min(1)).length(4).optional(),
    accepted: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((q) => !!q.options !== !!q.accepted, "Use choices or an accepted answer, never both.")
  .refine((q) => !q.options || new Set(q.options).size === 4, "Choices must be distinct.");
export const quizBanks = z
  .record(z.string().regex(/^[A-Z0-9]+-U\d+$/), z.array(item).min(2).max(20))
  .parse(unitBanks);
export const quizBankHash = createHash("sha256").update(JSON.stringify(quizBanks)).digest("hex");
const bankCatalog: Record<string, typeof quizBanks> = { UNISA: quizBanks };
export function bankQuiz(
  code: string,
  sources: QuizSource[],
  institution = "UNISA",
): DraftQuestion[] {
  const bank = bankCatalog[institution]?.[code];
  if (!bank?.length)
    throw new IngestError(
      409,
      "QUIZ_BANK_NOT_READY",
      "This unit’s question bank is awaiting editorial preparation. You can still practise the lesson examples and active recall.",
    );
  if (!sources.length)
    throw new IngestError(
      409,
      "NO_QUIZ_REFERENCE",
      "A published unit reading is needed before issuing this practice set.",
    );
  return bank.slice(0, 6).map((q) => {
    const order = q.options ? [...q.options] : null;
    // Rotate complete, authored options; never invent distractors from random words.
    if (order) {
      const shift = randomInt(order.length);
      order.push(...order.splice(0, shift));
    }
    const options = order?.map((text, i) => ({ id: String.fromCharCode(97 + i), text })) ?? null;
    const words = q.prompt.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const source = [...sources].sort(
      (a, b) =>
        words.filter((w) => b.body.toLowerCase().includes(w)).length -
        words.filter((w) => a.body.toLowerCase().includes(w)).length,
    )[0];
    return {
      sourceChunkId: source.id,
      kind: options ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
      prompt: q.prompt,
      options,
      answer: options
        ? { optionId: options.find((o) => o.text === q.options![0])!.id }
        : { accepted: q.accepted },
      explanation: q.explanation,
    };
  });
}
export async function generateUnitQuiz(
  code: string,
  sources: QuizSource[],
  requested: QuizProvider,
  signal?: AbortSignal,
  ai = generateQuiz,
  institution = "UNISA",
) {
  if (requested !== "auto" && requested !== "heuristic") {
    const result = await ai(sources, requested, signal);
    if (result.provider !== "heuristic") return result;
  }
  return {
    questions: bankQuiz(code, sources, institution),
    provider: "bank",
    notice: `Original Vela practice · fixed unit bank v1 (${quizBankHash.slice(0, 8)}). Reading links are unit references. This short practice set is not an institutional examination or a complete exam-readiness measure.`,
  };
}
