"use client";
import { useEffect, useRef, useState } from "react";
import { SourceDrawer } from "./source-drawer";
import { Markdown } from "./markdown";
import { studentRequest, useStudentResource } from "../lib/student/client";
import { notifyProgress } from "../lib/progress-events";
type Card = { id: string; prompt: string; answer: string; unitId: string; code: string };
export function DailyReview({
  units,
}: {
  units: { id: string; code: string; due: number; newOutcomes: number }[];
}) {
  const { userId } = useStudentResource<unknown>(null);
  const [open, setOpen] = useState(false),
    [cards, setCards] = useState<Card[]>([]),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null),
    owner = useRef(userId);
  owner.current = userId;
  useEffect(() => {
    pending.current?.abort();
    setOpen(false);
    setBusy(false);
    setNotice("");
    setCards([]);
    return () => pending.current?.abort();
  }, [userId]);
  async function start() {
    if (!userId || busy) return;
    const who = userId,
      controller = new AbortController();
    pending.current = controller;
    setOpen(true);
    setBusy(true);
    setNotice("Preparing a short, mixed review…");
    setIndex(0);
    setRevealed(false);
    try {
      const selected = [...units]
        .filter((u) => u.due || u.newOutcomes)
        .sort((a, b) => b.due - a.due)
        .slice(0, 4);
      const queues: Card[][] = [];
      for (const unit of selected) {
        const data = await studentRequest<{ cards: Omit<Card, "unitId" | "code">[] }>(
          "/api/recall",
          "POST",
          { action: "queue", studyUnitId: unit.id },
          controller.signal,
        );
        queues.push(
          data.cards.slice(0, 3).map((c) => ({ ...c, unitId: unit.id, code: unit.code })),
        );
      }
      const interleaved = Array.from({ length: 3 }, (_, i) =>
        queues.flatMap((q) => (q[i] ? [q[i]] : [])),
      ).flat();
      if (owner.current !== who || controller.signal.aborted) return;
      setCards(interleaved);
      setNotice(
        interleaved.length
          ? "A short mixed set, usually about 10 minutes. Stop whenever you need to. Ratings are self-assessments, not grades."
          : "No review cards are ready. Open a lesson to practise its examples.",
      );
    } catch (e) {
      if (!controller.signal.aborted) setNotice(e instanceof Error ? e.message : "Please retry.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function rate(rating: number) {
    if (busy || !cards[index] || !userId) return;
    const who = userId;
    setBusy(true);
    try {
      await studentRequest("/api/recall", "POST", {
        action: "rate",
        studyUnitId: cards[index].unitId,
        chunkId: cards[index].id,
        rating,
      });
      if (owner.current !== who) return;
      notifyProgress();
      setIndex((i) => i + 1);
      setRevealed(false);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Rating was not saved. Retry.");
    } finally {
      if (owner.current === who) setBusy(false);
    }
  }
  function close() {
    pending.current?.abort();
    setBusy(false);
    setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        className="primary-button"
        disabled={busy || !units.some((u) => u.due || u.newOutcomes)}
        onClick={() => void start()}
      >
        Start daily review · about 10 min
      </button>
      {open && (
        <SourceDrawer label="Daily review" onClose={close}>
          <section className="daily-review">
            <header>
              <h2>Your daily review</h2>
              <button type="button" onClick={close}>
                Close ×
              </button>
            </header>
            <p role="status">{notice}</p>
            {!!cards.length && (
              <progress aria-label="Daily review completed" max={cards.length} value={index} />
            )}{" "}
            {cards[index] ? (
              <>
                <small>
                  {cards[index].code} · {index + 1}/{cards.length}
                </small>
                <Markdown text={cards[index].prompt} />
                <button type="button" disabled={busy} onClick={() => setRevealed((v) => !v)}>
                  {revealed ? "Hide answer" : "Show answer"}
                </button>
                {revealed && (
                  <>
                    <Markdown text={cards[index].answer} />
                    <div className="filter-pills">
                      {[
                        ["Again", 0.2],
                        ["Good", 0.7],
                        ["Easy", 1],
                      ].map(([label, value]) => (
                        <button
                          key={label}
                          type="button"
                          disabled={busy}
                          onClick={() => void rate(Number(value))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : !busy && cards.length > 0 ? (
              <p>Review complete. Your next reviews have been scheduled.</p>
            ) : null}
          </section>
        </SourceDrawer>
      )}
    </>
  );
}
