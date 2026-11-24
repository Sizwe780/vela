/**
 * Provider fallback chain and per-day budget tracking.
 *
 * Order: cloudflare → groq → gemini → openrouter → ollama
 *
 * Rules:
 * - Only free tiers are used. No silent escalation to a paid provider.
 * - A provider is skipped when its API key is absent, its daily budget
 *   counter has been marked exhausted, or it returns HTTP 429.
 * - Budget counters live in process memory keyed by "provider:YYYY-MM-DD".
 *   They reset automatically when the date changes. A server restart also
 *   resets them, which is acceptable — the next 429 will re-mark exhaustion.
 * - Ollama is always last. It has no key requirement and no daily cap.
 * - Callers receive the first working provider config and model, or throw
 *   AI_ALL_PROVIDERS_EXHAUSTED if none are available.
 */

import { configuredAI, type AIProvider } from "./config";
import { IngestError } from "../ingest/errors";

// ---------------------------------------------------------------------------
// Budget tracking
// ---------------------------------------------------------------------------

type BudgetEntry = { count: number; exhausted: boolean };
const budgets = new Map<string, BudgetEntry>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function budgetKey(provider: AIProvider): string {
  return `${provider}:${today()}`;
}

export function recordProviderRequest(provider: AIProvider): void {
  const key = budgetKey(provider);
  const entry = budgets.get(key) ?? { count: 0, exhausted: false };
  entry.count++;
  budgets.set(key, entry);
}

export function markProviderExhausted(provider: AIProvider): void {
  const key = budgetKey(provider);
  const entry = budgets.get(key) ?? { count: 0, exhausted: false };
  entry.exhausted = true;
  budgets.set(key, entry);
}

export function isProviderExhausted(provider: AIProvider): boolean {
  return budgets.get(budgetKey(provider))?.exhausted ?? false;
}

// Soft threshold: mark exhausted before hitting the hard 429 wall.
// Cloudflare free tier is ~10,000 "neurons"/day; conservative chat limit ~400.
// Groq free: 14,400 req/day on Llama-3.3-70B; set soft cap at 400 to stay safe.
// Gemini free: 1,500 req/day on 2.5 Flash; soft cap at 100.
// OpenRouter free models: no documented daily cap but rate-limited; soft cap at 200.
const SOFT_CAPS: Partial<Record<AIProvider, number>> = {
  cloudflare: 400,
  groq: 400,
  gemini: 100,
  openrouter: 200,
};

export function checkSoftCap(provider: AIProvider): boolean {
  const cap = SOFT_CAPS[provider];
  if (!cap) return false;
  const count = budgets.get(budgetKey(provider))?.count ?? 0;
  return count >= cap;
}

// ---------------------------------------------------------------------------
// Chain definition
// ---------------------------------------------------------------------------

// Embedding-capable providers used for RAG retrieval.
// Groq, Gemini, and OpenRouter are chat-only — retrieval falls back to the
// primary embedding space (cloudflare or ollama) via embeddingProviderForChat.
const CHAT_CHAIN: AIProvider[] = ["cloudflare", "groq", "gemini", "openrouter", "ollama"];

function hasKey(provider: AIProvider): boolean {
  if (provider === "ollama") return true; // No key required.
  const env = process.env;
  switch (provider) {
    case "cloudflare":
      return (
        /^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID ?? "") &&
        !!(env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_AUTH_MODE === "wrangler")
      );
    case "groq":
      return !!env.GROQ_API_KEY;
    case "gemini":
      return !!env.GEMINI_API_KEY;
    case "openrouter":
      return !!env.OPENROUTER_API_KEY;
    case "openai":
      return !!env.OPENAI_API_KEY;
  }
}

function isAvailable(provider: AIProvider): boolean {
  return hasKey(provider) && !isProviderExhausted(provider) && !checkSoftCap(provider);
}

/**
 * Returns the first available provider config in chain order.
 * Skips providers with no key, exhausted budget, or over soft cap.
 * Throws if nothing is available.
 */
export function firstAvailableProvider(preferred?: AIProvider): ReturnType<typeof configuredAI> {
  // If the caller explicitly requested a provider, honour it — but still
  // require its key to be present.
  if (preferred) {
    if (!hasKey(preferred))
      throw new IngestError(
        503,
        "AI_NOT_CONFIGURED",
        `The requested provider "${preferred}" is not configured. Add its API key.`,
      );
    return configuredAI(preferred);
  }

  for (const provider of CHAT_CHAIN) {
    if (!isAvailable(provider)) continue;
    try {
      return configuredAI(provider);
    } catch {
      // configuredAI throws if keys are missing; treat as unavailable.
      continue;
    }
  }

  throw new IngestError(
    503,
    "AI_ALL_PROVIDERS_EXHAUSTED",
    "All AI providers are currently unavailable or have reached their free daily limit. " +
      "Start Ollama locally or try again after the daily allowance resets.",
  );
}

/**
 * Attempts an async operation with automatic provider chain fallback.
 *
 * fn receives the resolved config for the current attempt.
 * If fn throws an IngestError with code AI_ALLOWANCE or AI_RATE_LIMIT,
 * the provider is marked exhausted and the next chain member is tried.
 * Any other error propagates immediately.
 *
 * @param preferred  Explicit provider from the user request (optional).
 * @param fn         The operation to attempt.
 */
export async function withFallback<T>(
  preferred: AIProvider | undefined,
  fn: (config: ReturnType<typeof configuredAI>) => Promise<T>,
): Promise<T> {
  const chain = preferred ? [preferred] : CHAT_CHAIN;

  let lastError: unknown;

  for (const provider of chain) {
    if (!isAvailable(provider)) continue;

    let config: ReturnType<typeof configuredAI>;
    try {
      config = configuredAI(provider);
    } catch {
      continue;
    }

    try {
      recordProviderRequest(provider);
      return await fn(config);
    } catch (error) {
      if (
        error instanceof IngestError &&
        (error.code === "AI_ALLOWANCE" || error.code === "AI_RATE_LIMIT")
      ) {
        markProviderExhausted(provider);
        lastError = error;
        // Try the next provider in chain.
        continue;
      }
      // All other errors (network, auth, bad output, abort) propagate.
      throw error;
    }
  }

  // If a preferred provider was exhausted, fall through to the full chain.
  if (preferred) {
    return withFallback(undefined, fn);
  }

  throw lastError instanceof IngestError
    ? lastError
    : new IngestError(
        503,
        "AI_ALL_PROVIDERS_EXHAUSTED",
        "All AI providers are currently unavailable or have reached their free daily limit. " +
          "Start Ollama locally or try again after the daily allowance resets.",
      );
}

/**
 * Returns a human-readable status of all providers in the chain.
 * Useful for the ai:check script and health endpoints.
 */
export function providerChainStatus(): {
  provider: AIProvider;
  hasKey: boolean;
  exhausted: boolean;
  overSoftCap: boolean;
  available: boolean;
}[] {
  return CHAT_CHAIN.map((provider) => ({
    provider,
    hasKey: hasKey(provider),
    exhausted: isProviderExhausted(provider),
    overSoftCap: checkSoftCap(provider),
    available: isAvailable(provider),
  }));
}
