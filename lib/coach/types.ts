import { z } from "zod";
export const coachContextInput = z
  .object({ studyUnitId: z.string().min(1).max(100), sessionId: z.string().min(1).max(100) })
  .strict();
export const photoInput = coachContextInput
  .extend({
    image: z
      .string()
      .max(1_800_000)
      .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
  })
  .strict();
export const workStep = z
  .object({
    number: z.number().int().min(1).max(12),
    latex: z.string().max(600),
    description: z.string().max(400),
    uncertain: z.boolean(),
  })
  .strict();
export const transcriptionSchema = z
  .object({ steps: z.array(workStep).min(1).max(12), notice: z.string().max(500) })
  .strict()
  .superRefine((v, ctx) => {
    if (v.steps.some((s, i) => s.number !== i + 1))
      ctx.addIssue({ code: "custom", message: "Steps must be numbered in order." });
  });
export const diagnosisInput = coachContextInput
  .extend({
    steps: z
      .array(
        z
          .object({
            number: z.number().int().min(1).max(12),
            latex: z.string().max(600),
            description: z.string().max(400),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    question: z.string().max(1000),
    confirmed: z.literal(true),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.steps.some((s, i) => s.number !== i + 1))
      ctx.addIssue({ code: "custom", message: "Steps must be numbered in order." });
  });
export const diagnosisSchema = z
  .object({
    summary: z.string().min(1).max(600),
    steps: z
      .array(
        z
          .object({
            number: z.number().int().min(1).max(12),
            status: z.enum(["consistent", "revisit", "uncertain"]),
            feedback: z.string().min(1).max(700),
            hint: z.string().max(400),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    nextQuestion: z.string().min(1).max(400),
  })
  .strict();
export const teachInput = z.discriminatedUnion("action", [
  coachContextInput.extend({ action: z.literal("start") }).strict(),
  z
    .object({
      action: z.literal("submit"),
      attemptId: z.string().uuid(),
      explanation: z.string().trim().min(40).max(4000),
    })
    .strict(),
]);
export const rubricIds = ["correctness", "reasoning", "clarity", "example"] as const;
const facet = z
  .object({
    id: z.enum(rubricIds),
    score: z.number().min(0).max(1),
    learnerQuote: z.string().max(220),
    referenceQuote: z.string().max(220),
    feedback: z.string().min(1).max(450),
  })
  .strict();
export const conceptualGrade = z
  .object({
    supported: z.boolean(),
    confidence: z.enum(["high", "low"]),
    facets: z.array(facet).length(4),
    misconceptions: z
      .array(
        z
          .object({
            quote: z.string().min(1).max(220),
            referenceQuote: z.string().min(8).max(220),
            explanation: z.string().min(1).max(450),
            repairPrompt: z.string().min(1).max(300),
          })
          .strict(),
      )
      .max(4),
    nextQuestion: z.string().min(1).max(400),
    summary: z.string().min(1).max(600),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.facets.map((f) => f.id)).size !== 4)
      ctx.addIssue({ code: "custom", message: "Each rubric facet is required once." });
  });
export type WorkStep = z.infer<typeof workStep>;
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export type ConceptualGrade = z.infer<typeof conceptualGrade>;
export type ConceptChallenge = {
  id: string;
  question: string;
  sessionTitle: string;
  outcome: string;
  expiresAt: string;
  rubric: { id: (typeof rubricIds)[number]; label: string }[];
};
export type ConceptResult = {
  attemptId: string;
  grade: ConceptualGrade;
  verified: boolean;
  score: number;
  pointsEarned: number;
  bestPoints: number;
  masteryUpdated: boolean;
};
