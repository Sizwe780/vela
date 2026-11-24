import { createOpenAI } from "@ai-sdk/openai";
import { configuredAI, type AIProvider } from "./config";
import { providerCredential } from "./credentials";
import { normalizeCloudflareStream } from "./cloudflare-stream";
import { firstAvailableProvider } from "./fallback";

function buildProvider(config: ReturnType<typeof configuredAI>) {
  return createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey || "wrangler",
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${await providerCredential(config)}`);
      const response = await fetch(url, { ...init, headers });
      return config.provider === "cloudflare" ? normalizeCloudflareStream(response) : response;
    },
  });
}

/**
 * Returns an AI SDK LanguageModel for streaming (tutor route).
 *
 * When no explicit provider is requested the fallback chain is consulted so
 * the first available free-tier provider is used. An explicit provider from
 * the user request is honoured directly (key presence is still checked).
 */
export function createChatModel(override?: AIProvider, modelOverride?: string) {
  const config = override ? configuredAI(override) : firstAvailableProvider();
  const provider = buildProvider(config);
  // Explicit Chat Completions keeps this compatible with Ollama's /v1 endpoint.
  return provider.chat(modelOverride ?? config.chatModel);
}

/**
 * Same as createChatModel but accepts a pre-resolved config — used by
 * withFallback so the config is not resolved twice.
 */
export function createChatModelFromConfig(
  config: ReturnType<typeof configuredAI>,
  modelOverride?: string,
) {
  const provider = buildProvider(config);
  return provider.chat(modelOverride ?? config.chatModel);
}
