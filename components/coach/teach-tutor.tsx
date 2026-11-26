"use client";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "../markdown";
import { MathInsert } from "../math/math-insert";
import { notifyProgress } from "../../lib/progress-events";
import type { ConceptChallenge, ConceptResult } from "../../lib/coach/types";
export function TeachTutor({ studyUnitId, sessionId }: { studyUnitId: string; sessionId: string }) {
  const [challenge, setChallenge] = useState<ConceptChallenge | null>(null),
    [explanation, setExplanation] = useState(""),
    [result, setResult] = useState<ConceptResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(action: "start" | "submit") {
    setBusy(true);
    setError("");
    const c = new AbortController();
    controller.current = c;
    try {
      const response = await fetch("/api/tutor/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "start"
            ? { action, studyUnitId, sessionId }
            : { action, attemptId: challenge?.id, explanation },
        ),
        signal: c.signal,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message || "The conceptual tutor is unavailable.");
      if (action === "start") {
        setChallenge(data);
        setResult(null);
      } else {
        setResult(data);
        if (data.masteryUpdated) notifyProgress();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="coach-section" aria-label="Teach the tutor">
      <h3>Teach it simply. Understand it deeply.</h3>
      <p>
        Explain the idea in your own words. I will look for accuracy, why it works, a clear
        explanation and an original example with its conditions.
      </p>
      {!challenge ? (
        <button type="button" disabled={busy} onClick={() => void send("start")}>
          {busy ? "Preparing practice…" : "Start teaching this session"}
        </button>
      ) : (
        <>
          <div className="coach-question">
            <Markdown text={challenge.question} />
            <small>Learning outcome: {challenge.outcome}</small>
            <ul>
              {challenge.rubric.map((r) => (
                <li key={r.id}>{r.label}</li>
              ))}
            </ul>
          </div>
          <label>
            Your explanation
            <textarea
              aria-label="Your explanation"
              rows={7}
              minLength={40}
              maxLength={4000}
              value={explanation}
              disabled={busy || !!result}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Start with an everyday intuition, then explain why the rule follows. Add your own example and state a limitation."
            />
          </label>
          <small>{explanation.length}/4000 characters · at least 40</small>
          <MathInsert
            disabled={busy || !!result}
            onInsert={(latex) => setExplanation((v) => (v + ` $${latex}$`).slice(0, 4000))}
          />
          <p className="coach-privacy">
            Your submitted explanation and AI feedback are saved to your account for conceptual
            practice. This is AI-assisted feedback, not an institutional mark or a complete proof of
            mastery.
          </p>
          {!result && (
            <button
              type="button"
              disabled={busy || explanation.trim().length < 40}
              onClick={() => void send("submit")}
            >
              {busy ? "Reviewing your explanation…" : "Review my explanation"}
            </button>
          )}
          {result && (
            <div className="concept-result" role="status">
              <h3>
                {result.verified
                  ? `${Math.round(result.score * 100)}% · conceptual practice`
                  : "Feedback needs a closer review"}
              </h3>
              <p>
                {result.verified
                  ? `+${result.pointsEarned} ${result.pointsEarned === 1 ? "conceptual point" : "conceptual points"} · personal best ${result.bestPoints}/10 for this outcome`
                  : `No mastery or points were recorded because the evidence checks were incomplete or the model was uncertain.`}
              </p>
              <Markdown text={result.grade.summary} />
              {result.grade.facets.map((f) => (
                <article key={f.id} className="concept-facet">
                  <strong>
                    {challenge.rubric.find((r) => r.id === f.id)?.label} ·{" "}
                    {Math.round(f.score * 100)}%
                  </strong>
                  {f.learnerQuote && <blockquote>{f.learnerQuote}</blockquote>}
                  <Markdown text={f.feedback} />
                </article>
              ))}
              {result.grade.misconceptions.map((m, i) => (
                <article className="work-step revisit" key={i}>
                  <h4>Revisit this idea</h4>
                  <blockquote>{m.quote}</blockquote>
                  <Markdown text={m.explanation} />
                  <Markdown text={m.repairPrompt} />
                </article>
              ))}
              <div className="coach-question">
                <strong>Pause and predict</strong>
                <Markdown text={result.grade.nextQuestion} />
              </div>
              <button type="button" disabled={busy} onClick={() => void send("start")}>
                Try another explanation
              </button>
              <p>
                Points reward improvement: each outcome is capped at 10 conceptual points. Reading
                completion is separate.
              </p>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="coach-error">
          {error} Your draft is preserved.
        </p>
      )}
      {error && challenge && !result && (
        <button type="button" disabled={busy} onClick={() => void send("start")}>
          Start a fresh attempt
        </button>
      )}
    </section>
  );
}
