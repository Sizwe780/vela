"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SavePassageButton } from "./save-passage-button";
import { parseLearningBlocks } from "../lib/content/exercises";
import { downloadMarkdown } from "../lib/study/download-markdown";
export function SessionTools({
  studyUnitId,
  sessionId,
  lesson,
}: {
  studyUnitId: string;
  sessionId: string;
  lesson?: { title: string; markdown: string };
}) {
  const [quote, setQuote] = useState("");
  const [notice, setNotice] = useState("");
  const [discussionAnchor, setDiscussionAnchor] = useState<string>();
  const container = useRef<HTMLDivElement>(null);
  const href = `/study/${studyUnitId}/sessions/${sessionId}`;
  useEffect(() => {
    setQuote("");
    setDiscussionAnchor(undefined);
    const selection = () => {
      const s = window.getSelection();
      const reader = container.current?.closest(".session-reader");
      if (s && reader?.contains(s.anchorNode) && reader.contains(s.focusNode)) {
        const text = s.toString().trim();
        if (text && text.length <= 2000) {
          setQuote(text);
          const paragraph = s.anchorNode?.parentElement?.closest<HTMLElement>(
            "[data-discussion-anchor]",
          );
          setDiscussionAnchor(
            paragraph?.contains(s.focusNode) ? paragraph.dataset.discussionAnchor : undefined,
          );
        }
      }
    };
    document.addEventListener("selectionchange", selection);
    return () => document.removeEventListener("selectionchange", selection);
  }, [sessionId]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, location.origin).toString());
      setNotice("Session link copied.");
    } catch {
      setNotice("Use the session permalink to copy this address.");
    }
  }
  return (
    <div ref={container} className="session-tools" role="toolbar" aria-label="Session tools">
      <div>
        <SavePassageButton
          studyUnitId={studyUnitId}
          sourceType="session"
          sourceId={sessionId}
          label="Bookmark session"
        />
        <button type="button" onClick={() => void copy()}>
          Copy session link
        </button>
        <Link href={href}>Session permalink ↗</Link>
        {lesson && (
          <button
            type="button"
            onClick={() => {
              const reading = parseLearningBlocks(lesson.markdown).blocks.map((block) =>
                block.type === "text" ? block.text : `### ${block.title}\n\n${block.question}`,
              );
              downloadMarkdown(
                `lesson-${sessionId}.md`,
                `# ${lesson.title}\n\n${reading.join("\n\n")}\n`,
              );
            }}
          >
            Download reading
          </button>
        )}
      </div>
      {quote && (
        <div>
          <p>
            Selected passage: {quote.slice(0, 150)}
            {quote.length > 150 ? "…" : ""}
          </p>
          <SavePassageButton
            key={quote}
            studyUnitId={studyUnitId}
            sourceType="session"
            sourceId={sessionId}
            quote={quote}
            label="Save highlighted passage"
          />
          {discussionAnchor && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("vela-discuss-selection", {
                    detail: { sessionId, anchor: discussionAnchor },
                  }),
                )
              }
            >
              Discuss selected paragraph
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setQuote("");
              setDiscussionAnchor(undefined);
            }}
          >
            Clear selection
          </button>
        </div>
      )}
      <small role="status">{notice}</small>
    </div>
  );
}
