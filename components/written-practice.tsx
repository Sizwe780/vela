"use client";
import { useLessonAttempts } from "./lesson-attempt-store";
import { createContext, useEffect, useId, useRef, useState } from "react";
import { ExerciseReferences } from "./references/exercise-references";
import { AnswerSymbols } from "./math/answer-symbols";
import { Markdown } from "./markdown";

export type PracticeSession = {
  ownerId: string;
  title?: string;
  studyUnitId: string;
  sessionId: string;
  version: number;
  moduleCode?: string;
  moduleInstitution?: string;
};
export const PracticeSessionContext = createContext<PracticeSession | null>(null);
type Result = {
  ownerId: string;
  verdict: "correct" | "partial" | "incorrect" | "unverified";
  feedback: string;
  nextStep: string;
  method: "ai";
  masteryUpdated: false;
};
const labels = {
  correct: "Looks correct",
  partial: "Partly correct",
  incorrect: "Try again",
  unverified: "Needs review",
};

export function WrittenPractice({
  session,
  title,
  question,
  practiceId,
  revealed,
  onStatus,
}: {
  session: PracticeSession | null;
  title: string;
  question: string;
  practiceId: string;
  revealed: boolean;
  onStatus: (status: "tried" | "reviewed") => void;
}) {
  const id = useId();
  const store = useLessonAttempts();
  const [fallback, setFallback] = useState("");
  const record = store?.records[practiceId];
  const attempt = record?.draft.text ?? fallback;
  const setAttempt = (text: string) => {
    setFallback(text);
    store?.change(practiceId, title, question, { text });
  };
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function check() {
    if (pending.current || !session?.ownerId) return;
    if (!attempt.trim()) {
      setError("Write your answer or working first.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    onStatus("tried");
    try {
      store?.change(practiceId, title, question, { text: attempt }, true, false);
      await store?.flush(practiceId);
      const response = await fetch("/api/practice/check", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: session.ownerId,
          studyUnitId: session.studyUnitId,
          sessionId: session.sessionId,
          version: session.version,
          title,
          question,
          attempt,
        }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.message ?? "Feedback is unavailable. Keep your attempt and retry.",
        );
      const review = payload as Result;
      if (!controller.signal.aborted && review.ownerId === session.ownerId) {
        setResult(review);
        store?.review(practiceId, review);
        onStatus("reviewed");
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Feedback is unavailable. Keep your attempt and retry.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        pending.current = null;
      }
    }
  }
  const feedback = result ?? (record?.aiFeedback as Result | null);
  return (
    <div className="inline-practice written-practice" aria-busy={busy}>
      <label htmlFor={id}>
        Your answer or working{" "}
        <span className="practice-status">
          {feedback
            ? `${labels[feedback!.verdict]} · AI review`
            : revealed
              ? "Answer explored"
              : attempt.trim()
                ? "Tried"
                : "Unanswered"}
        </span>
      </label>
      <textarea
        id={id}
        value={attempt}
        maxLength={6000}
        disabled={busy}
        placeholder={
          /\b(?:mass|volume|force|velocity|speed|density|pressure|units?|temperature|distance|time)\b/i.test(
            question,
          )
            ? "Show your working and include the appropriate units…"
            : /\$|formula|matrix|equation|calculate/i.test(question)
              ? "Enter your expression and explain the steps…"
              : "Explain your reasoning in your own words…"
        }
        onChange={(e) => {
          setAttempt(e.target.value);
          setResult(null);
          setError("");
          onStatus("tried");
        }}
      />
      <ExerciseReferences
        onInsert={(text) => {
          if (!busy) {
            setAttempt(attempt + (attempt ? "\n" : "") + text);
            setResult(null);
            onStatus("tried");
          }
        }}
      />
      <AnswerSymbols
        question={question}
        value={attempt}
        disabled={busy}
        onChange={(value) => {
          setAttempt(value.slice(0, 6000));
          setResult(null);
          setError("");
          onStatus("tried");
        }}
      />
      <button type="button" disabled={busy || !session?.ownerId} onClick={() => void check()}>
        {busy ? "Checking your attempt…" : "Check my attempt"}
      </button>
      {feedback && ["incorrect", "partial"].includes(feedback.verdict) && (
        <button
          type="button"
          onClick={() => void store?.queue(practiceId).catch((e) => setError(e.message))}
        >
          Send missed check to Review queue
        </button>
      )}
      <div role="status" aria-live="polite">
        {error && (
          <>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void store?.queue(practiceId).catch((e) => setError(e.message))}
            >
              Save this attempt for review
            </button>
          </>
        )}
        {feedback && (
          <div className="practice-review-feedback">
            <Markdown text={feedback.feedback} />
            <p>
              <strong>Next step</strong>
            </p>
            <Markdown text={feedback.nextStep} />
          </div>
        )}
      </div>
      <small>
        {session
          ? "AI feedback against this lesson's worked solution; it can make mistakes. No grade or assessed mastery is awarded."
          : "Automatic feedback needs an online, signed-in published lesson. Offline, compare your attempt with the worked answer."}
      </small>
    </div>
  );
}
