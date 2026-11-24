import { z } from "zod";
import { IngestError } from "../ingest/errors";

const schema = z
  .object({
    query: z.string().trim().min(1).max(4000),
    studyUnitId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    sessionId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,100}$/)
      .optional(),
    mode: z.enum(["academic", "pck"]),
    strategy: z.enum(["coach", "debate"]).default("coach"),
    pace: z.enum(["normal", "transfer"]).optional(),
    hintTier: z.number().int().min(1).max(3).optional(),
    live: z.boolean().optional(),
    provider: z.enum(["ollama", "cloudflare", "openai", "groq", "gemini", "openrouter"]).optional(),
    history: z
      .array(
        z
          .object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .strict()
  .refine(
    (v) => !(v.strategy === "debate" && v.hintTier !== undefined),
    "Choose debate or a hint tier, not both.",
  );
export type TutorInput = z.infer<typeof schema>;

export function parseTutorInput(value: unknown): TutorInput {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new IngestError(
      400,
      "INVALID_TUTOR_INPUT",
      "Provide a query (1–4,000 characters), studyUnitId and mode: academic or pck. History is limited to 12 user/assistant messages.",
    );
  const input = result.data;
  if (
    [input.query, ...input.history.map((message) => message.content)].some((text) =>
      text.includes("\u0000"),
    )
  )
    throw new IngestError(400, "INVALID_TEXT", "Messages cannot contain NUL characters.");
  if (input.history.reduce((sum, message) => sum + message.content.length, 0) > 20_000)
    throw new IngestError(
      413,
      "HISTORY_TOO_LARGE",
      "Start a new conversation or shorten the chat history.",
    );
  return input;
}
