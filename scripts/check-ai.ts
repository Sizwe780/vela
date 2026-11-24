import "dotenv/config";
import { generateText } from "ai";
import { configuredAI, type AIProvider } from "../lib/ai/config";
import { createChatModelFromConfig } from "../lib/ai/chat-model";
import { embedTokens } from "../lib/ingest/embeddings";
import { encodeText } from "../lib/ingest/chunker";
import { providerChainStatus, firstAvailableProvider } from "../lib/ai/fallback";

const PROBE = "What is 7 plus 9? Answer in one short sentence.";
const EMBED_TEXT = "A derivative measures the instantaneous rate of change.";

async function checkProvider(provider: AIProvider): Promise<void> {
  console.log(`\n── ${provider.toUpperCase()} ─────────────────────────────`);
  let config: ReturnType<typeof configuredAI>;
  try {
    config = configuredAI(provider);
  } catch (e) {
    console.log(`  SKIP  ${e instanceof Error ? e.message : "not configured"}`);
    return;
  }
  console.log(`  Chat model : ${config.chatModel}`);
  console.log(`  Embed model: ${config.embeddingSpace.model} (${config.embeddingSpace.dimensions}d)`);
  console.log(`  Base URL   : ${config.baseUrl}`);

  // Chat probe
  try {
    const response = await generateText({
      model: createChatModelFromConfig(config),
      prompt: PROBE,
      maxOutputTokens: 40,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(30_000),
    });
    if (!response.text.trim()) throw new Error("Empty response");
    console.log(`  PASS chat  : ${response.text.trim().slice(0, 120)}`);
  } catch (e) {
    console.log(`  FAIL chat  : ${e instanceof Error ? e.message : "unknown"}`);
  }

  // Embedding probe — only for providers with an embedding endpoint
  if (!["groq", "gemini", "openrouter"].includes(provider)) {
    try {
      const vectors = await embedTokens([encodeText(EMBED_TEXT)], {
        purpose: "query",
        texts: [EMBED_TEXT],
        provider,
        signal: AbortSignal.timeout(30_000),
      });
      console.log(`  PASS embed : ${vectors[0].length} dims, first value ${vectors[0][0].toFixed(4)}`);
    } catch (e) {
      console.log(`  FAIL embed : ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    console.log(`  SKIP embed : chat-only provider — retrieval uses primary embedding space`);
  }
}

async function main() {
  const arg = process.argv[2] as AIProvider | "chain" | undefined;

  if (arg === "chain" || !arg) {
    console.log("\n═══ Provider chain status ════════════════════════════");
    const statuses = providerChainStatus();
    for (const s of statuses) {
      const flag = s.available ? "✓ available" : s.exhausted ? "✗ exhausted" : s.overSoftCap ? "✗ over cap" : !s.hasKey ? "✗ no key" : "✗ unknown";
      console.log(`  ${s.provider.padEnd(12)} ${flag}`);
    }

    try {
      const best = firstAvailableProvider();
      console.log(`\n  First available: ${best.provider} (${best.chatModel})`);
    } catch (e) {
      console.log(`\n  No provider available: ${e instanceof Error ? e.message : "unknown"}`);
    }

    if (!arg) return; // chain-only summary, no individual probes
  }

  const providers: AIProvider[] = arg && arg !== "chain"
    ? [arg as AIProvider]
    : ["cloudflare", "groq", "gemini", "openrouter", "ollama"];

  for (const provider of providers) {
    await checkProvider(provider);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "AI check failed.");
  process.exitCode = 1;
});
