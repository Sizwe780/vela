import { IngestError } from "./errors";
import { configuredAI, getAIConfig, type AIProvider } from "../ai/config";
import { providerCredential } from "../ai/credentials";

export type EmbeddingContext = {
  purpose: "query" | "document";
  texts: string[];
  signal?: AbortSignal;
  provider?: AIProvider;
};
export type Embedder = (inputs: number[][], context?: EmbeddingContext) => Promise<number[][]>;

export function assertVectors(
  vectors: number[][],
  count: number,
  dimensions = getAIConfig().embeddingSpace.dimensions,
) {
  if (
    vectors.length !== count ||
    vectors.some(
      (vector) =>
        !Array.isArray(vector) ||
        vector.length !== dimensions ||
        vector.some((n) => typeof n !== "number" || !Number.isFinite(n)) ||
        !vector.some((n) => n !== 0),
    )
  ) {
    throw new IngestError(
      502,
      "INVALID_EMBEDDINGS",
      "The embedding provider returned invalid vectors.",
    );
  }
}

export const embedTokens: Embedder = async (inputs, context) => {
  const config = configuredAI(context?.provider);
  const { model, dimensions } = config.embeddingSpace;
  const local = config.provider === "ollama";
  const textInput = config.provider !== "openai";
  if (textInput && (!context || context.texts.length !== inputs.length))
    throw new IngestError(
      500,
      "MISSING_EMBEDDING_TEXT",
      "Local and Cloudflare embeddings require the original query or chunk text.",
    );
  const nomic = local && model.split(":")[0] === "nomic-embed-text";
  const texts = context?.texts.map((text) =>
    nomic ? `${context.purpose === "query" ? "search_query" : "search_document"}: ${text}` : text,
  );
  const batchSize = local ? 8 : 32;
  const vectors: number[][] = [];
  // At most 16,000 tokens per batch; keep request size and provider limits bounded.
  for (let offset = 0; offset < inputs.length; offset += batchSize) {
    const batch = inputs.slice(offset, offset + batchSize);
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await providerCredential(config)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          ...(!textInput ? { dimensions } : {}),
          encoding_format: "float",
          input: textInput ? texts!.slice(offset, offset + batchSize) : batch,
        }),
        signal: context?.signal
          ? AbortSignal.any([context.signal, AbortSignal.timeout(config.embeddingTimeoutMs)])
          : AbortSignal.timeout(config.embeddingTimeoutMs),
        cache: "no-store",
      });
    } catch {
      throw new IngestError(
        503,
        "EMBEDDING_UNAVAILABLE",
        "The embedding service timed out or is unavailable. Retry the request.",
      );
    }
    if (!response.ok) {
      if (response.status === 429) {
        const data = (await response.json().catch(() => null)) as {
          errors?: { code?: number }[];
        } | null;
        const daily =
          config.provider === "cloudflare" &&
          Array.isArray(data?.errors) &&
          data.errors.some((e) => e?.code === 4006);
        throw new IngestError(
          503,
          daily ? "AI_ALLOWANCE" : "AI_RATE_LIMIT",
          daily
            ? "Cloudflare's daily free AI allowance is exhausted. Try again after it resets. Your study text, notes and concept checks remain available."
            : "The AI service is temporarily rate limited. Please retry later; no paid provider was selected.",
        );
      }
      await response.body?.cancel();
      throw new IngestError(
        response.status >= 500 ? 503 : 502,
        "EMBEDDING_PROVIDER_ERROR",
        "The embedding service rejected the request. Check the configured model and retry.",
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new IngestError(
        502,
        "INVALID_EMBEDDINGS",
        "The embedding service returned invalid JSON.",
      );
    }
    const entries = (data as { data?: { index: number; embedding: number[] }[] } | null)?.data;
    if (
      !Array.isArray(entries) ||
      entries.length !== batch.length ||
      entries.some((entry) => !entry || !Number.isInteger(entry.index))
    )
      throw new IngestError(
        502,
        "INVALID_EMBEDDINGS",
        "The embedding service returned an incomplete or invalid batch.",
      );
    const ordered = [...entries].sort((a, b) => a.index - b.index);
    if (ordered.some((entry, index) => !entry || entry.index !== index))
      throw new IngestError(
        502,
        "INVALID_EMBEDDINGS",
        "The embedding service returned invalid indexes.",
      );
    const batchVectors = ordered.map((entry) => entry.embedding);
    assertVectors(batchVectors, batch.length, dimensions);
    vectors.push(...batchVectors);
  }
  return vectors;
};
