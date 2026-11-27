import { IngestError } from "../ingest/errors";

export type AIProvider = "openai" | "ollama" | "cloudflare" | "groq" | "gemini" | "openrouter";
export type VectorDimensions = 768 | 1536;
export type EmbeddingSpace = {
  provider: AIProvider;
  model: string;
  dimensions: VectorDimensions;
  baseUrl: string;
};

export function getAIConfig(override?: AIProvider) {
  const primaryProvider = process.env.AI_PROVIDER ?? "cloudflare";
  const provider = (override ?? primaryProvider) as AIProvider;
  if (!["openai", "ollama", "cloudflare", "groq", "gemini", "openrouter"].includes(provider))
    throw new IngestError(503, "INVALID_AI_CONFIG", "Unknown AI provider.");
  const local = provider === "ollama";
  const cloudflare = provider === "cloudflare";
  const groq = provider === "groq";
  const gemini = provider === "gemini";
  const openrouter = provider === "openrouter";
  const primary = provider === primaryProvider;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (cloudflare && !/^[a-f0-9]{32}$/i.test(account ?? ""))
    throw new IngestError(503, "AI_NOT_CONFIGURED", "Connect your Cloudflare account first.");
  const baseUrl = (
    cloudflare
      ? `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`
      : groq
        ? process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
        : gemini
          ? process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai"
          : openrouter
            ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
            : (primary ? process.env.OPENAI_BASE_URL : undefined) ||
              (local
                ? process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1"
                : "https://api.openai.com/v1")
  ).replace(/\/+$/, "");
  try {
    const url = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Invalid endpoint");
  } catch {
    throw new IngestError(
      503,
      "INVALID_AI_CONFIG",
      "OPENAI_BASE_URL must be an HTTP(S) API base URL without credentials, query or fragment.",
    );
  }
  const dimensions = Number(
    cloudflare
      ? "768"
      : (primary ? process.env.EMBEDDING_DIMENSIONS : undefined) || (local ? "768" : "1536"),
  );
  if (dimensions !== 768 && dimensions !== 1536)
    throw new IngestError(
      503,
      "INVALID_AI_CONFIG",
      "This schema supports EMBEDDING_DIMENSIONS of 768 or 1536.",
    );
  const model = cloudflare
    ? "@cf/baai/bge-base-en-v1.5"
    : (primary ? process.env.EMBEDDING_MODEL : undefined) ||
      (local ? "nomic-embed-text" : "text-embedding-3-small");
  const chatModel = cloudflare
    ? process.env.CLOUDFLARE_CHAT_MODEL || "@cf/mistralai/mistral-small-3.1-24b-instruct"
    : groq
      ? process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b"
      : gemini
        ? process.env.GEMINI_CHAT_MODEL || "gemini-3.1-flash-lite"
        : openrouter
          ? process.env.OPENROUTER_CHAT_MODEL || "openrouter/free"
          : (primary ? process.env.CHAT_MODEL : undefined) ||
            (local ? process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b" : "gpt-4o");
  const embeddingSpace: EmbeddingSpace = { provider, baseUrl, model, dimensions };
  return {
    provider: provider as AIProvider,
    baseUrl,
    chatModel,
    embeddingSpace,
    tutorMaxOutputTokens: local ? 192 : 1600,
    // Never send a saved OpenAI key to the local endpoint.
    apiKey: local
      ? "ollama"
      : cloudflare
        ? process.env.CLOUDFLARE_API_TOKEN
        : groq
          ? process.env.GROQ_API_KEY
          : gemini
            ? process.env.GEMINI_API_KEY
            : openrouter
              ? process.env.OPENROUTER_API_KEY
              : process.env.OPENAI_API_KEY,
    embeddingTimeoutMs: local ? 120_000 : 30_000,
    chatTimeoutMs: local ? 180_000 : 60_000,
  };
}

export function configuredAI(override?: AIProvider) {
  const config = getAIConfig(override);
  if (
    !config.apiKey &&
    !(config.provider === "cloudflare" && process.env.CLOUDFLARE_AUTH_MODE === "wrangler")
  )
    throw new IngestError(
      503,
      "AI_NOT_CONFIGURED",
      "Connect Cloudflare, set OPENAI_API_KEY for OpenAI, or start Ollama for local inference.",
    );
  return config;
}

export function embeddingProviderForChat(provider?: AIProvider): AIProvider | undefined {
  const primaryProvider = process.env.AI_PROVIDER ?? "cloudflare";
  if (
    (!provider || ["groq", "gemini", "openrouter"].includes(provider)) &&
    ["groq", "gemini", "openrouter"].includes(primaryProvider)
  ) {
    return "cloudflare";
  }
  return provider && ["groq", "gemini", "openrouter"].includes(provider) ? undefined : provider;
}
