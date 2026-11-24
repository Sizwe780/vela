"use client";
import { createContext, useContext, type ReactNode } from "react";
import { normalizeParagraph } from "../../lib/social/text";
export type Paragraph = { anchor: string; text: string };
export const DiscussionContext = createContext<{
  paragraphs: Paragraph[];
  counts: Record<string, number>;
  open: (anchor: string) => void;
} | null>(null);
export function DiscussionParagraph({ raw, children }: { raw: string; children: ReactNode }) {
  const scope = useContext(DiscussionContext),
    paragraph = scope?.paragraphs.find((p) => p.text === normalizeParagraph(raw));
  if (!scope || !paragraph) return <p>{children}</p>;
  const count = scope.counts[paragraph.anchor] ?? 0;
  return (
    <div className="annotated-paragraph" data-discussion-anchor={paragraph.anchor}>
      <p>{children}</p>
      <button
        type="button"
        className="discussion-badge"
        onClick={() => scope.open(paragraph.anchor)}
      >
        {count
          ? `${count} ${count === 1 ? "discussion" : "discussions"}`
          : "Discuss this paragraph"}
      </button>
    </div>
  );
}
