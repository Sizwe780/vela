import type { TutorMessage } from "./types";

export function messageText(message: TutorMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
}

export function chatHistory(messages: TutorMessage[]) {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = 20_000;
  for (const message of [...messages].reverse()) {
    if (history.length === 12 || remaining <= 0) break;
    if (message.role !== "user" && message.role !== "assistant") continue;
    const content = messageText(message).trim().slice(0, Math.min(4000, remaining));
    if (!content) continue;
    history.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return history;
}
