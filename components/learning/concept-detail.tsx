"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { studentRequest, useStudentResource } from "../../lib/student/client";
import { notifyProgress } from "../../lib/progress-events";
import type {
  ConceptQuestion,
  ConceptFeedback,
  LearningView,
  LearningConcept,
} from "../../lib/learning/types";
import { ExerciseMarkdown } from "../exercise-markdown";
import { Markdown } from "../markdown";
export function ConceptDetail({
  node,
  view,
  onSaved,
}: {
  node: LearningConcept;
  view: LearningView;
  onSaved: () => void;
}) {
  const [moduleId, setModule] = useState(node.mappings[0].moduleId),
    [question, setQuestion] = useState<ConceptQuestion | null>(null),
    [choice, setChoice] = useState(""),
    [feedback, setFeedback] = useState<ConceptFeedback | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => {
    const reset = () => {
      setQuestion(null);
      setFeedback(null);
      setChoice("");
    };
    window.addEventListener("vela-concept-reset", reset);
    return () => window.removeEventListener("vela-concept-reset", reset);
  }, []);
  const mapping = node.mappings.find((m) => m.moduleId === moduleId) ?? node.mappings[0];
  const notes = useStudentResource<{ body: string; ownerId: string }>(
    notesOpen ? `/api/notes?studyUnitId=${encodeURIComponent(mapping.unitId)}` : null,
  );
  async function issue() {
    setBusy(true);
    setError("");
    try {
      const q = await studentRequest<ConceptQuestion>("/api/concept-check", "POST", {
        action: "issue",
        ownerId: view.ownerId,
        conceptId: node.id,
        moduleId: mapping.moduleId,
      });
      setQuestion(q);
      setFeedback(null);
      setChoice("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!question) return;
    setBusy(true);
    setError("");
    try {
      const result = await studentRequest<ConceptFeedback>("/api/concept-check", "POST", {
        action: "submit",
        ownerId: view.ownerId,
        checkId: question.id,
        choice,
      });
      setFeedback(result);
      notifyProgress();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="concept-detail" aria-label="Selected concept">
      <span className="eyebrow">A SHORT REFRESHER · READING TIME VARIES</span>
      <h2>{node.title}</h2>
      <p>
        {node.probability === null
          ? "Ready to practise. Read the refresher and try a check to get your first estimate."
          : `${Math.round(node.probability * 100)}% practice estimate from ${node.observations} independent checks. ${node.observations < 3 ? `Complete ${3 - node.observations} more checks for a better-supported estimate.` : "Keep practising to strengthen the evidence."}`}
      </p>
      <ExerciseMarkdown text={node.refresher} />
      <div className="learning-actions">
        {[...new Map(node.mappings.map((m) => [m.moduleId, m])).values()].length > 1 && (
          <label>
            Practice in module
            <select
              value={moduleId}
              disabled={busy || (!!question && !feedback)}
              onChange={(e) => {
                setModule(e.target.value);
                setQuestion(null);
                setFeedback(null);
                setNotesOpen(false);
              }}
            >
              {[...new Map(node.mappings.map((m) => [m.moduleId, m])).values()].map((m) => (
                <option key={m.moduleId} value={m.moduleId}>
                  {m.moduleCode}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link href={mapping.href}>Open {mapping.moduleCode} lesson</Link>
        <button type="button" onClick={() => setNotesOpen((v) => !v)}>
          {notesOpen ? "Close private notes" : "View my notes for this unit"}
        </button>
      </div>
      {notesOpen && (
        <aside className="concept-private-notes">
          <h3>My private unit notes</h3>
          {notes.loading ? (
            <p>Loading notes…</p>
          ) : notes.error ? (
            <p role="status">{notes.error}</p>
          ) : notes.data?.ownerId === view.ownerId ? (
            <Markdown text={notes.data.body || "No saved notes for this unit yet."} />
          ) : null}
        </aside>
      )}
      <h3>Check this concept</h3>
      <p className="learning-caption">
        Attempt the check independently. Feedback updates this concept only. Repeated identical
        items do not add observations. These estimates are not proctored or institutional marks.
      </p>
      {!question || feedback ? (
        <button type="button" disabled={busy} onClick={() => void issue()}>
          {question ? "Try another variation" : "Start a focused check"}
        </button>
      ) : null}
      {question && (
        <div className="concept-check">
          <Markdown text={question.prompt} />
          <fieldset disabled={busy || !!feedback}>
            <legend>Select one answer</legend>
            {question.options.map((o) => (
              <label className="check-option" key={o.id}>
                <input
                  type="radio"
                  name={question.id}
                  value={o.id}
                  checked={choice === o.id}
                  onChange={() => setChoice(o.id)}
                />
                <Markdown text={o.text} />
              </label>
            ))}
          </fieldset>
          {!feedback && (
            <button type="button" disabled={!choice || busy} onClick={() => void submit()}>
              Check my answer
            </button>
          )}
        </div>
      )}
      {feedback && (
        <section className="concept-feedback" role="status">
          <h3>{feedback.correct ? "Correct" : "A useful place to review"}</h3>
          <Markdown text={feedback.explanation} />
          <p>{feedback.notice}</p>
          <p>
            {Math.round(feedback.probability * 100)}% provisional estimate · {feedback.observations}{" "}
            observations
          </p>
          {!feedback.correct && node.prerequisites.length > 0 && (
            <p>
              Possible prerequisites to check:{" "}
              {node.prerequisites.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("vela-open-master", {
                        detail: { conceptId: id, moduleId: mapping.moduleId },
                      }),
                    )
                  }
                >
                  {view.concepts.find((n) => n.id === id)?.title ?? "Prerequisite"}
                </button>
              ))}
              . This result alone does not identify the cause of an error.
            </p>
          )}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {node.connections.map((c) => (
        <aside key={c.label} className="concept-bridge">
          <h3>{c.label}</h3>
          <p>{c.text}</p>
        </aside>
      ))}
    </article>
  );
}
