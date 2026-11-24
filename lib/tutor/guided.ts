import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { coachJSON, type CoachMessage } from "../coach/ai";
import { normalizeMath, mathSpans } from "../content/math";
import { getAIConfig } from "../ai/config";
import { IngestError } from "../ingest/errors";
import type { TutorInput } from "./input";
const text = (n: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(n)
    .refine((s) => !s.includes(":::") && !/<\/?(?:render_widget|widget|script)\b/i.test(s));
const question = text(260).refine((s) => (s.match(/\?/g) || []).length === 1, "Ask one question.");
const nudge = z.object({ principle: text(200), question }).strict();
const structure = z.object({ move: text(220), reason: text(220), question }).strict();
const parallel = z
  .object({
    actualResult: text(200),
    parallelResult: text(200),
    title: text(80),
    problem: text(600),
    solution: text(2600),
    question,
  })
  .strict();
const debate = z.object({ challenge: text(500), question }).strict();
const transfer = z
  .object({
    feedback: z
      .string()
      .trim()
      .max(400)
      .refine((value) => !/[?\r\n]|:::|</.test(value)),
    question: question.refine((value) => !/[\r\n]/.test(value) && /\?$/.test(value)),
    prerequisite: z
      .string()
      .regex(/^[a-z][a-z0-9.-]{1,80}$/)
      .optional(),
  })
  .strict();
export type GuidedDraft =
  | z.infer<typeof nudge>
  | z.infer<typeof structure>
  | z.infer<typeof parallel>
  | z.infer<typeof debate>
  | z.infer<typeof transfer>;
export type GuidedGenerator = (
  schema: z.ZodType<any>,
  messages: CoachMessage[],
) => Promise<GuidedDraft>;
function compact(value: string) {
  return value
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\[()[\]]|[${}\s]/g, "")
    .replace(/^[a-z]\s*=/i, "")
    .toLowerCase();
}
function numeric(value: string) {
  const v = compact(value);
  if (!/^[+-]?\d{1,9}(?:\.\d{1,6})?(?:\/[+-]?\d{1,9}(?:\.\d{1,6})?)?$/.test(v)) return null;
  const [a, b = 1] = v.split("/").map(Number);
  return b !== 0 && Number.isFinite(a / b) ? a / b : null;
}
export function sameGuidedResult(a: string, b: string) {
  const x = numeric(a),
    y = numeric(b);
  return (
    compact(a) === compact(b) ||
    (x !== null && y !== null && Math.abs(x - y) <= 1e-10 * Math.max(1, Math.abs(x), Math.abs(y)))
  );
}
function checkParallel(d: z.infer<typeof parallel>, query: string) {
  if (
    /^(?:different (?:example question|equation with the same answer)|short original worked solution)/i.test(
      d.problem.trim(),
    ) ||
    /ask the learner to transfer/i.test(d.question)
  )
    throw Error("The draft contains placeholders rather than an example.");
  if (sameGuidedResult(d.actualResult, d.parallelResult) || compact(d.problem) === compact(query))
    throw Error("Choose a genuinely different example and final result.");
  // Also inspect explicit solution assignments, rather than trusting result metadata alone.
  for (const match of d.solution.matchAll(/(?:^|\s|\$)([a-z])\s*=\s*([^\n$]+)/gi))
    if (sameGuidedResult(d.actualResult, match[2]))
      throw Error(
        "The worked solution still reveals the actual task result. Choose another example.",
      );
}
export async function guidedReply(
  input: TutorInput,
  system: string,
  options: {
    signal?: AbortSignal;
    generate?: GuidedGenerator;
    localEvidence?: string;
    prerequisites?: readonly { id: string; title: string }[];
    onPrerequisite?: (id: string) => void;
  } = {},
) {
  const transferTurn =
    input.pace === "transfer" && input.hintTier === undefined && input.strategy !== "debate";
  const prerequisites =
    transferTurn &&
    input.history.filter((m) => m.role === "assistant").length >= 2 &&
    input.history.filter((m) => m.role === "user").length >= 2
      ? (options.prerequisites ?? [])
      : [];
  const schema =
    input.strategy === "debate"
      ? debate
      : transferTurn
        ? transfer
        : input.hintTier === 1
          ? nudge
          : input.hintTier === 2
            ? structure
            : parallel;
  const format =
    input.strategy === "debate"
      ? 'JSON {"challenge":"one concise hypothetical counter-position, not an endorsement","question":"one focused question?"}. If no claim exists, briefly invite one in challenge and ask for it in question.'
      : transferTurn
        ? 'JSON {"feedback":"one short response to the learner’s latest attempt, or an empty string for the first turn","question":"one focused question?"}. Use only the active evidence. Start with one targeted concept or procedural step. When the learner answers, briefly respond to the exact attempt and ask for one next step. After a correct explanation, use one changed context or parameter to test transfer. Avoid compound requests, lists of questions and complete solutions. Math and chemistry use dollar-delimited LaTeX and mhchem.' +
          (prerequisites.length
            ? ` You may add "prerequisite" with one of these exact IDs only if two learner attempts show the same concrete difficulty in that skill: ${JSON.stringify(prerequisites)}. Present it as a refresher to try.`
            : "")
        : input.hintTier === 1
          ? 'JSON {"principle":"one relevant principle, with no instruction to isolate, calculate or execute the task","question":"one noticing question?"}. Do not outline the solution method.'
          : input.hintTier === 2
            ? 'JSON {"move":"one next logical move, without performing it","reason":"why it is appropriate","question":"one next-step question?"}. No intermediate or final results.'
            : 'JSON {"actualResult":"privately determine the actual task result, never quote it in any visible field","parallelResult":"independently checked DIFFERENT result","title":"Original parallel example","problem":"different example question","solution":"short original worked solution to the parallel example only","question":"ask the learner to transfer the principle to their own task?"}. A different equation with the same answer is forbidden. Do not include exercise delimiters; the server adds them. Use dollar-delimited mathematical Markdown.';
  const local =
    input.provider === "ollama" || (!input.provider && process.env.AI_PROVIDER === "ollama");
  if (local && !process.env.OLLAMA_GUIDED_MODEL)
    throw new IngestError(
      503,
      "LOCAL_GUIDED_NOT_READY",
      "Local guided tutoring needs a validated model. Choose Cloudflare for now; no provider was switched automatically.",
    );
  const localPolicy = local
    ? readFileSync(resolve(process.cwd(), ".vela/specs/tutor-scaffolding-local-spec.md"), "utf8")
    : "";
  if (local && !localPolicy.includes("Version: 1.0.0"))
    throw Error("Unsupported local tutor policy");
  const trustedSystem = local
    ? localPolicy +
      "\nCurrent mode: " +
      input.mode +
      "\nBEGIN CURRENT EVIDENCE DATA\n" +
      (options.localEvidence ?? "No selected evidence; ask for clarification.") +
      "\nEND CURRENT EVIDENCE DATA"
    : system;
  const messages: CoachMessage[] = [
    {
      role: "system",
      content:
        trustedSystem +
        "\nOUTPUT CONTRACT: Return only valid JSON in the exact shape below; this replaces the usual Markdown heading/exercise format for this drafting step. Do not add keys. " +
        format,
    },
    {
      role: "user",
      content: JSON.stringify({
        query: input.query,
        history: local ? input.history.slice(-2) : input.history,
      }),
    },
  ];
  const generate =
    options.generate ??
    ((s, m) =>
      coachJSON(s, m, {
        signal: options.signal,
        provider: getAIConfig(input.provider).provider,
        maxTokens: input.hintTier === 3 ? (local ? 600 : 900) : 300,
        nativeSchema: local,
        model: local ? process.env.OLLAMA_GUIDED_MODEL : undefined,
      }));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Some cloud models keep combining questions despite the retry prompt.
      // On the second Deep transfer attempt, keep the first complete question
      // from the same grounded draft and validate it against the usual limits.
      const draftSchema =
        attempt === 1 && transferTurn && !local
          ? transfer.extend({
              question: text(700)
                .transform((value) => {
                  const end = value.indexOf("?");
                  return end < 0 ? value : value.slice(0, end + 1);
                })
                .pipe(transfer.shape.question),
            })
          : schema;
      const d = draftSchema.parse(await generate(draftSchema, messages));
      let body: string;
      if ("actualResult" in d) {
        checkParallel(d, input.query);
        body = `## Core Answer\n\n:::exercise ${d.title}\n${d.problem}\n:::answer\n${d.solution}\n:::end\n\n${d.question}`;
      } else if ("feedback" in d)
        body = `## Core Answer\n\n${d.feedback ? d.feedback + "\n\n" : ""}${d.question}`;
      else if ("challenge" in d)
        body = `## Core Answer\n\nHypothetical challenge: ${d.challenge}\n\n${d.question}`;
      else if ("move" in d) body = `## Core Answer\n\n${d.move} ${d.reason}\n\n${d.question}`;
      else body = `## Core Answer\n\n${d.principle}\n\n${d.question}`;
      if (!("actualResult" in d) && (body.match(/\?/g) ?? []).length !== 1)
        throw Error("Ask exactly one question.");
      const normalized = normalizeMath(body);
      mathSpans(normalized);
      if (
        "prerequisite" in d &&
        d.prerequisite &&
        prerequisites.some((node) => node.id === d.prerequisite)
      ) {
        options.onPrerequisite?.(d.prerequisite);
      }
      if (input.strategy === "debate" && normalized.split(/\s+/).length > 100)
        throw Error("Keep the challenge concise.");
      return normalized;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof IngestError && error.code !== "COACH_OUTPUT") throw error;
      if (attempt === 1)
        throw new IngestError(
          503,
          "HINT_REVIEW_REQUIRED",
          "The guided response did not pass its format/example checks. Your question is still here; please retry. No mastery was changed.",
        );
      messages.push({
        role: "system",
        content:
          "The candidate failed validation. Redraft from scratch. Return all required JSON fields, one question, valid math and no exercise control markers. If a parallel example is required, privately solve both tasks and use a different final result; never include the actual result in visible fields.",
      });
    }
  }
  throw Error("Guided response unavailable");
}
