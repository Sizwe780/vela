import { z } from "zod";
import { checkQuantity } from "../math-practice/quantity";
import { parseLearningBlocks } from "./exercises";
import { mathSpans } from "./math";
import { parseWidgetBlocks, widgetDirective, widgetSchema } from "./widget-registry";

const line = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .regex(/^[^\r\n]+$/);
const paragraph = z.string().trim().min(20).max(2000);
const quantity = z
  .object({
    value: z.string().trim().min(1).max(30),
    unit: z.string().trim().min(1).max(80),
  })
  .strict();
const exercise = z.object({ title: line, problem: paragraph, gatedAnswer: paragraph }).strict();
const practice = z
  .object({
    type: z.enum(["recognition", "procedure", "error_correction", "transfer"]),
    q: paragraph,
    a: paragraph,
  })
  .strict();
export const cognitiveLevels = [
  "recognition",
  "procedure",
  "error_correction",
  "transfer",
] as const;
const headings = {
  recognition: "Recognition",
  procedure: "Procedure",
  error_correction: "Error correction",
  transfer: "Transfer",
};

export const sessionSchema = z
  .object({
    title: line,
    learningGoal: paragraph,
    prerequisites: z.array(line).min(1).max(8),
    intuition: paragraph,
    whyThisWorks: paragraph,
    visualExplanation: paragraph,
    visualWidget: widgetSchema.nullable(),
    procedure: paragraph,
    workedExample: exercise,
    interpretation: paragraph,
    commonMistakes: z.array(paragraph).min(1).max(5),
    practiceQuestions: z.array(practice).length(4),
    application: paragraph,
    pauseAndPredict: z.object({ prompt: paragraph, solution: paragraph }).strict(),
    concepts: z.array(line).min(1).max(12),
    quantitativeChecks: z
      .array(
        z
          .object({
            label: line,
            value: quantity,
            equivalent: quantity,
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((session, ctx) => {
    if (
      new Set(session.practiceQuestions.map((question) => question.type)).size !==
      cognitiveLevels.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["practiceQuestions"],
        message: "Use each cognitive level exactly once.",
      });
    for (const [index, claim] of session.quantitativeChecks.entries()) {
      const result = checkQuantity(claim.equivalent, claim.value);
      if (result.status !== "equivalent")
        ctx.addIssue({
          code: "custom",
          path: ["quantitativeChecks", index],
          message: result.message,
        });
    }
    function checkText(value: unknown, path: (string | number)[]) {
      if (
        typeof value === "string" &&
        (/^\s*(?:#{1,6}\s|:::)/m.test(value) ||
          /<(?:script|iframe|object|embed)\b|javascript\s*:/i.test(value))
      ) {
        ctx.addIssue({
          code: "custom",
          path,
          message: "Use prose or formulas here. The session renderer owns headings and directives.",
        });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => checkText(item, [...path, index]));
      } else if (typeof value === "object" && value) {
        for (const [key, item] of Object.entries(value)) checkText(item, [...path, key]);
      }
    }
    checkText(session, []);
  });

export type DeclarativeSession = z.infer<typeof sessionSchema>;

export function renderSession(session: DeclarativeSession) {
  const attempt = (title: string, question: string, answer: string) =>
    [":::exercise " + title, question, ":::answer", answer, ":::end"].join("\n");
  const questions = cognitiveLevels.map((level) => {
    const q = session.practiceQuestions.find((question) => question.type === level)!;
    return "### " + headings[level] + "\n" + attempt(headings[level], q.q, q.a);
  });
  return [
    "## Learning goal\n" + session.learningGoal,
    "## Prerequisites\n" + session.prerequisites.map((item) => "- " + item).join("\n"),
    "## Intuition first\n" + session.intuition,
    "## Why this works\n" + session.whyThisWorks,
    "## Visual exploration\n" +
      session.visualExplanation +
      (session.visualWidget ? "\n\n" + widgetDirective(session.visualWidget) : ""),
    "## Procedure\n" + session.procedure,
    "### Original worked example\n" +
      attempt(
        session.workedExample.title,
        session.workedExample.problem,
        session.workedExample.gatedAnswer,
      ),
    "## Interpretation\n" + session.interpretation,
    "## Common mistakes\n" + session.commonMistakes.map((item) => "- " + item).join("\n"),
    "## Assessment\n" + questions.join("\n\n"),
    "## Application\n" + session.application,
    "## Pause and Predict\n" +
      attempt(
        "Pause and Predict",
        session.pauseAndPredict.prompt,
        session.pauseAndPredict.solution,
      ),
  ].join("\n\n");
}

export function validateSessionMarkdown(text: string) {
  mathSpans(text);
  const { blocks, errors } = parseLearningBlocks(text);
  if (errors.length) throw new Error(errors[0]);
  for (const block of blocks) {
    if (block.type === "text") {
      const directiveErrors = parseWidgetBlocks(block.text).errors;
      if (directiveErrors.length) throw new Error(directiveErrors[0]);
    } else {
      for (const part of [block.question, block.answer]) {
        const parsed = parseWidgetBlocks(part);
        if (parsed.errors.length || parsed.blocks.some((item) => item.type === "widget"))
          throw new Error("Place interactive widgets in the teaching text, before the exercise.");
      }
    }
  }
}
