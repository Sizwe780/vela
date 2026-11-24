import { generateText, Output } from "ai";
import { createChatModel } from "../ai/chat-model";
import type { AIProvider } from "../ai/config";
import type { GenerateStep } from "./factory";

export function factoryModel(provider: AIProvider, signal?: AbortSignal): GenerateStep {
  const model = createChatModel(provider, process.env.CONTENT_FACTORY_MODEL || undefined);
  const timeoutMs = Number(process.env.CONTENT_FACTORY_TIMEOUT_MS ?? 150000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000)
    throw new Error("CONTENT_FACTORY_TIMEOUT_MS must be between 1000 and 600000.");
  return async (system, prompt, maxOutputTokens, schema) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const result = await generateText({
      model,
      system,
      prompt,
      maxOutputTokens,
      ...(provider === "ollama" && schema ? { output: Output.object({ schema }) } : {}),
      temperature: 0.2,
      maxRetries: 0,
      abortSignal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    return result.text;
  };
}
