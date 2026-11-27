"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStudentResource, studentRequest } from "../lib/student/client";
import { Markdown } from "./markdown";
export function LessonReviewQueue({
  moduleCode = "",
  unitId,
  onDueChange,
}: {
  moduleCode?: string;
  unitId?: string;
  onDueChange?: (count: number) => void;
}) {
  const r = useStudentResource<{
    ownerId: string;
    cards: {
      id: string;
      title: string;
      question: string;
      answer: string;
      unitCode: string;
      moduleCode: string;
      unitId: string;
      sessionId: string;
      dueAt: string;
    }[];
  }>("/api/practice/review");
  const data = r.data?.ownerId === r.userId ? r.data : null;
  const [shown, setShown] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const cards =
    data?.cards.filter(
      (card) =>
        (!moduleCode || card.moduleCode === moduleCode) && (!unitId || card.unitId === unitId),
    ) ?? [];
  const due = cards.filter((card) => new Date(card.dueAt) <= new Date()).length;
  useEffect(() => {
    onDueChange?.(due);
  }, [due, onDueChange]);
  if (!cards.length)
    return r.error ? (
      <p role="status">Lesson review cards are unavailable. Your other reviews remain available.</p>
    ) : null;
  return (
    <section className="lesson-review-queue">
      <h2>From your lesson attempts</h2>
      <p>
        Saved missed checks. Ratings schedule another practice; they do not award assessed mastery.
      </p>
      {cards.map((card) => (
        <details key={card.id}>
          <summary>
            {card.unitCode} · {card.title} ·{" "}
            {new Date(card.dueAt) <= new Date() ? "Due now" : "Later"}
          </summary>
          <Markdown text={card.question} />
          <button type="button" onClick={() => setShown(shown === card.id ? null : card.id)}>
            Reveal / hide worked answer
          </button>
          {shown === card.id && (
            <>
              <Markdown text={card.answer} />
              <div className="exercise-actions">
                {[
                  ["Again", 0],
                  ["Good", 0.7],
                  ["Easy", 1],
                ].map(([label, rating]) => (
                  <button
                    type="button"
                    key={label}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await studentRequest("/api/practice/review", "POST", {
                          action: "rate",
                          id: card.id,
                          rating,
                        });
                        setShown(null);
                        r.reload();
                        setNotice("Next review saved.");
                      } catch (e) {
                        setNotice(e instanceof Error ? e.message : "Retry when online.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <Link href={`/study/${card.unitId}/sessions/${card.sessionId}`}>Return to lesson</Link>
        </details>
      ))}
      <p role="status">{notice}</p>
    </section>
  );
}
