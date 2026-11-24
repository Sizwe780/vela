"use client";
import { useRef, useState, type Ref } from "react";
import Link from "next/link";
import { Markdown } from "../../../../components/markdown";
import { SourceDrawer } from "../../../../components/source-drawer";
import { notifyProgress } from "../../../../lib/progress-events";
type Card = { id: string; prompt: string; answer: string };
export function RecallDrawer({
  studyUnitId,
  chat,
  chatSourceId,
  triggerLabel = "Recall queue",
  triggerRef,
  inline = false,
  onOpenChange,
}: {
  studyUnitId: string;
  chat: string;
  chatSourceId?: string;
  triggerLabel?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  inline?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [cards, setCards] = useState<Card[]>([]),
    [index, setIndex] = useState(0),
    [revealed, reveal] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const operation = useRef(false);
  async function request(body: unknown) {
    const r = await fetch("/api/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error?.message ?? "Request failed");
    return data;
  }
  async function load(includeFuture = false) {
    if (operation.current) return;
    operation.current = true;
    setOpen(true);
    onOpenChange?.(true);
    setBusy(true);
    setCards([]);
    setNotice("Preparing your recall queue…");
    try {
      const data = await request({
        action: "queue",
        studyUnitId,
        includeFuture,
        ...(chat && chatSourceId
          ? { chat: { text: chat.slice(-12000), chunkId: chatSourceId } }
          : {}),
      });
      setCards(data.cards);
      setIndex(0);
      reveal(false);
      setNotice(
        data.cards.length
          ? "Try to answer before revealing. Ratings are personal self-assessments."
          : "You're caught up. Return when reviews are due, or practice ahead.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function rate(rating: number) {
    if (operation.current || !cards[index]) return;
    operation.current = true;
    setBusy(true);
    try {
      const data = await request({ action: "rate", studyUnitId, chunkId: cards[index].id, rating });
      notifyProgress();
      setIndex((i) => i + 1);
      reveal(false);
      setNotice(`Saved · Next review ${new Date(data.nextReviewAt).toLocaleString()}`);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  function close() {
    setOpen(false);
    onOpenChange?.(false);
  }
  const content = open ? (
    <section
      className={inline ? "review-flashcard" : "recall-drawer recall-modal"}
      aria-label={inline ? "Active recall" : undefined}
    >
      <header>
        <div>
          <small>RETRIEVE · REFLECT · REMEMBER</small>
          <h2>Practice active recall</h2>
        </div>
        <button type="button" onClick={close}>
          Close recall
        </button>
      </header>
      <p role="status">{notice}</p>
      {cards[index] ? (
        <>
          <span className="recall-count">
            Card {index + 1} of {cards.length}
          </span>
          <div className="recall-question">
            <Markdown text={cards[index].prompt} />
          </div>
          <button className="reveal-answer" onClick={() => reveal(!revealed)}>
            Reveal / hide answer
          </button>
          {revealed && (
            <>
              <div className="recall-answer">
                <Markdown text={cards[index].answer} />
              </div>
              <a
                href={`/study/${studyUnitId}#chunk-${cards[index].id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check the source ↗
              </a>
              <p>How easily did you recall it?</p>
              <div className="recall-ratings">
                {[
                  { label: "Again", value: 0 },
                  { label: "Good", value: 0.7 },
                  { label: "Easy", value: 1 },
                ].map((r) => (
                  <button disabled={busy} key={r.label} onClick={() => void rate(r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        !busy && <button onClick={() => void load(true)}>Practice ahead / retry</button>
      )}
      <footer>
        <Link href={`/study/${studyUnitId}/quiz`}>Open full assessment ↗</Link>
      </footer>
    </section>
  ) : null;
  return (
    <>
      <button
        className={triggerLabel === "Recall queue" ? undefined : "practice-link"}
        ref={triggerRef}
        type="button"
        aria-expanded={inline ? open : undefined}
        onClick={() => (inline && open ? close() : void load())}
      >
        {triggerLabel}
      </button>
      {inline
        ? content
        : content && (
            <SourceDrawer label="Active recall" onClose={close}>
              {content}
            </SourceDrawer>
          )}
    </>
  );
}
