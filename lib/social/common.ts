import { z } from "zod";
import { IngestError, publicError } from "../ingest/errors";
import { logServerError } from "../log-error";
export const privateHeaders = { "Cache-Control": "private, no-store" };
export const identifier = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export function socialInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const p = schema.safeParse(value);
  if (!p.success)
    throw new IngestError(
      400,
      "INVALID_SOCIAL_INPUT",
      "Choose a valid room or current paragraph and keep posts below 2,000 characters.",
    );
  return p.data;
}
export function socialFailure(e: unknown) {
  if (!(e instanceof IngestError)) logServerError("social-learning", e);
  const f = publicError(
    e instanceof IngestError
      ? e
      : new IngestError(
          503,
          "SOCIAL_UNAVAILABLE",
          "Shared learning is temporarily unavailable. Keep your draft and retry.",
        ),
  );
  return Response.json({ error: f.error }, { status: f.status, headers: privateHeaders });
}
export function pomodoro(now: number) {
  const cycle = 30 * 60000,
    elapsed = ((now % cycle) + cycle) % cycle,
    focus = elapsed < 25 * 60000;
  return { phase: focus ? "Focus" : "Break", remainingMs: (focus ? 25 * 60000 : cycle) - elapsed };
}
