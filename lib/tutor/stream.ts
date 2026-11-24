import { randomUUID } from "node:crypto";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type LanguageModel,
} from "ai";
import type { TutorMessage, TutorMode, Citation } from "./types";

type ResponseInput = {
  citations: Citation[];
  mode: TutorMode;
  strategy?: "debate";
  hintTier?: number;
  refresher?: { title: string; href: string };
  preview?: boolean;
  text?: string;
  system?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  model?: LanguageModel;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export function tutorStreamResponse(input: ResponseInput) {
  const stream = createUIMessageStream<TutorMessage>({
    onError: () => "The tutor could not finish this response. Please try again.",
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: randomUUID() });
      writer.write({
        type: "data-citations",
        id: "retrieved-sources",
        data: {
          sources: input.citations,
          mode: input.mode,
          preview: input.preview ?? false,
          ...(input.strategy ? { strategy: input.strategy } : {}),
          ...(input.hintTier !== undefined ? { hintTier: input.hintTier } : {}),
          ...(input.refresher ? { refresher: input.refresher } : {}),
        },
      });
      if (input.text !== undefined) {
        const id = randomUUID();
        writer.write({ type: "text-start", id });
        for (const delta of input.text.match(/\S+\s*/g) ?? []) {
          if (input.signal?.aborted) break;
          writer.write({ type: "text-delta", id, delta });
          if (input.preview) await new Promise((resolve) => setTimeout(resolve, 12));
        }
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish", finishReason: "stop" });
        return;
      }
      if (!input.model || !input.messages) throw new Error("Missing tutor model or messages");
      const result = streamText({
        model: input.model,
        system: input.system,
        messages: input.messages,
        temperature: 0.3,
        maxOutputTokens: input.maxOutputTokens ?? 1600,
        maxRetries: 1,
        abortSignal: input.signal,
        onError: ({ error }) => {
          console.warn(
            "Tutor stream failed:",
            error instanceof Error ? error.name : "UnknownError",
            error && typeof error === "object" && "statusCode" in error
              ? String(error.statusCode)
              : "no-status",
          );
        },
      });
      writer.merge(
        result.toUIMessageStream<TutorMessage>({
          sendStart: false,
          onError: () => "The tutor could not finish this response. Please try again.",
        }),
      );
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: { "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
