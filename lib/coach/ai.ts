import { z } from "zod";
import { configuredAI, type AIProvider } from "../ai/config";
import { providerCredential } from "../ai/credentials";
import { IngestError } from "../ingest/errors";
import { withFallback, markProviderExhausted } from "../ai/fallback";
import { asSchema } from "ai";

// Older Ollama grammar engines reject large bounded string repetitions.
// Keep object shape in the grammar; application Zod still enforces every length.
export function localGrammarSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(localGrammarSchema);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== "maxLength" && k !== "minLength")
        .map(([k, v]) => [k, localGrammarSchema(v)]),
    );
  return value;
}

export type CoachMessage = {
  role: "system" | "user";
  content:
    string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
};

export function decodeCoachJSON<T>(schema: z.ZodType<T>, text: string): T {
  if (text.length > 24000)
    throw new IngestError(
      503,
      "COACH_OUTPUT",
      "The tutor response could not be checked. Please retry.",
    );
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return schema.parse(JSON.parse(clean));
  } catch {
    throw new IngestError(
      503,
      "COACH_OUTPUT",
      "The tutor returned an incomplete response. Nothing was graded; please retry.",
    );
  }
}

/**
 * Sends a structured-JSON request to the coach model and returns the parsed
 * result. Uses the provider fallback chain automatically — if the preferred
 * provider is exhausted or rate-limited the next available provider is tried.
 *
 * Vision requests (photo diagnosis) always use Cloudflare because only
 * Cloudflare and OpenAI support the image_url message format reliably, and
 * the vision model env var is Cloudflare-specific. Vision requests do not
 * participate in the fallback chain.
 */
export async function coachJSON<T>(
  schema: z.ZodType<T>,
  messages: CoachMessage[],
  options: {
    signal?: AbortSignal;
    vision?: boolean;
    provider?: AIProvider;
    maxTokens?: number;
    nativeSchema?: boolean;
    model?: string;
  } = {},
): Promise<T> {
  // Vision is Cloudflare-only — do not fall back for multimodal requests.
  if (options.vision) {
    return coachJSONSingle(schema, messages, options);
  }

  return withFallback(options.provider, (config) =>
    coachJSONSingle(schema, messages, { ...options, provider: config.provider }),
  );
}

async function coachJSONSingle<T>(
  schema: z.ZodType<T>,
  messages: CoachMessage[],
  options: {
    signal?: AbortSignal;
    vision?: boolean;
    provider?: AIProvider;
    maxTokens?: number;
    nativeSchema?: boolean;
    model?: string;
  },
): Promise<T> {
  const config = configuredAI(options.provider ?? "cloudflare");
  const model =
    options.model ??
    (config.provider === "cloudflare"
      ? process.env.CLOUDFLARE_COACH_MODEL || "@cf/mistralai/mistral-small-3.1-24b-instruct"
      : config.provider === "groq"
        ? process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile"
        : config.provider === "gemini"
          ? process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash"
          : config.provider === "openrouter"
            ? process.env.OPENROUTER_CHAT_MODEL || "meta-llama/llama-3.1-8b-instruct:free"
            : config.provider === "ollama"
              ? options.vision
                ? process.env.OLLAMA_VISION_MODEL
                : process.env.OLLAMA_CHAT_MODEL || config.chatModel
              : process.env.OPENAI_COACH_MODEL || "gpt-4o-mini");

  if (!model)
    throw new IngestError(
      503,
      "VISION_NOT_CONFIGURED",
      "Photo transcription needs a configured vision model. Cloudflare is available as the default.",
    );

  const local = config.provider === "ollama";
  const native = local && options.nativeSchema && !options.vision;
  const tokens = Math.min(
    native ? 768 : 2200,
    Math.max(128, Math.floor(options.maxTokens ?? 2200)),
  );

  const response = await fetch(
    native
      ? `${config.baseUrl.replace(/\/v1$/, "")}/api/chat`
      : `${config.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await providerCredential(config)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        stream: false,
        ...(native
          ? {
              format: localGrammarSchema(await asSchema(schema).jsonSchema),
              options: { temperature: 0, num_ctx: 3072, num_predict: tokens },
              keep_alive: "30m",
            }
          : { max_tokens: tokens, response_format: { type: "json_object" } }),
      }),
      signal: AbortSignal.any([
        ...(options.signal ? [options.signal] : []),
        AbortSignal.timeout(60000),
      ]),
    },
  );

  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) {
      // Let withFallback handle the chain advancement.
      markProviderExhausted(config.provider);
      throw new IngestError(
        503,
        "AI_ALLOWANCE",
        "The AI allowance is temporarily exhausted. Vela is trying another provider.",
      );
    }
    throw new IngestError(
      503,
      "COACH_UNAVAILABLE",
      "The tutor could not complete this request. Your work is still here; please retry.",
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No coach response");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 150000) {
        await reader.cancel();
        throw new Error("Coach response limit");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  let text: string;
  try {
    const json = JSON.parse(Buffer.concat(parts).toString("utf8"));
    text = native ? json.message?.content : json.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw Error();
  } catch {
    throw new IngestError(
      503,
      "COACH_OUTPUT",
      "The AI response was incomplete. No mastery was awarded.",
    );
  }

  return decodeCoachJSON(schema, text);
}
