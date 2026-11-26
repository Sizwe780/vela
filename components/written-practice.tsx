"use client";
import { createContext, useEffect, useId, useRef, useState } from "react";
import { Markdown } from "./markdown";

export type PracticeSession = {
  ownerId: string;
  studyUnitId: string;
  sessionId: string;
  version: number;
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
  revealed,
  onStatus,
}: {
  session: PracticeSession | null;
  title: string;
  question: string;
  revealed: boolean;
  onStatus: (status: "tried" | "reviewed") => void;
}) {
  const id = useId();
  const [attempt, setAttempt] = useState("");
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
      const response = await fetch("/api/practice/check", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...session, title, question, attempt }),
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
  return (
    <div className="inline-practice written-practice" aria-busy={busy}>
      <label htmlFor={id}>
        Your answer or working{" "}
        <span className="practice-status">
          {result
            ? `${labels[result.verdict]} · AI review`
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
        placeholder="Explain your reasoning, show your steps, or give a value with units…"
        onChange={(e) => {
          setAttempt(e.target.value);
          setResult(null);
          setError("");
          onStatus("tried");
        }}
      />
      <button type="button" disabled={busy || !session?.ownerId} onClick={() => void check()}>
        {busy ? "Checking your attempt…" : "Check my attempt"}
      </button>
      <div role="status" aria-live="polite">
        {error && <p>{error}</p>}
        {result && (
          <div className="practice-review-feedback">
            <Markdown text={result.feedback} />
            <p>
              <strong>Next step</strong>
            </p>
            <Markdown text={result.nextStep} />
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
