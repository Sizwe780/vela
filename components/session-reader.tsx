"use client";
import { useStudentResource } from "../lib/student/client";
import { PrerequisiteLinks } from "./learning/prerequisite-links";
import { SessionTools } from "./session-tools";
import { StudyTimer } from "./study-timer";
import { useEffect, useState } from "react";
import { notifyProgress } from "../lib/progress-events";
import { ExerciseMarkdown } from "./exercise-markdown";
import { Markdown } from "./markdown";
import { inlineSessionVisual } from "../lib/content/inline-visual";
import type { StudyUnitView } from "../lib/tutor/types";
import { DiscussionScope } from "./social/discussion-scope";
import { StudyRoom } from "./social/study-room";
function LessonBody({
  highlights,
  markdown,
  visual,
  onAsk,
}: {
  highlights?: string[];
  markdown: string;
  visual: string | null;
  onAsk?: (title: string, question: string) => void;
}) {
  return (
    <ExerciseMarkdown
      highlights={highlights}
      text={inlineSessionVisual(markdown, visual)}
      onAsk={onAsk}
    />
  );
}
export function SessionReader({
  unit,
  activeSessionId,
  onSessionChange,
  onAsk,
}: {
  unit: StudyUnitView;
  activeSessionId?: string;
  onSessionChange?: (id: string) => void;
  onAsk?: (title: string, question: string) => void;
}) {
  const sessions = unit.sessions ?? [];
  const index = Math.max(
    0,
    sessions.findIndex((s) => s.id === activeSessionId),
  );
  const [done, setDone] = useState<string[]>([]),
    [notice, setNotice] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    void fetch(`/api/sessions?unit=${encodeURIComponent(unit.id)}`, {
      signal: c.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error("Progress unavailable");
        return r.json();
      })
      .then((d) => setDone(d.completed))
      .catch(() => {
        if (!c.signal.aborted) setNotice("Progress unavailable. You can still read every session.");
      });
    return () => c.abort();
  }, [unit.id]);
  const session = sessions[index];
  const saved = useStudentResource<{ bookmarks: { quote: string }[] }>(
    session ? `/api/bookmarks?sourceType=session&sourceId=${encodeURIComponent(session.id)}` : null,
  );
  useEffect(() => {
    const reload = () => saved.reload();
    window.addEventListener("vela-bookmarks", reload);
    return () => window.removeEventListener("vela-bookmarks", reload);
  }, [saved.reload]);
  const highlights = saved.data?.bookmarks.map((b) => b.quote).filter(Boolean) ?? [];
  if (!session) return null;
  async function complete() {
    setNotice("Saving milestone…");
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, complete: true }),
      });
      if (!r.ok) throw Error();
      setDone((d) => [...new Set([...d, session.id])]);
      notifyProgress();
      setNotice("Milestone saved. Choose your next session when ready.");
    } catch {
      setNotice("Progress was not saved. Please retry.");
    }
  }
  return (
    <section id={`session-${session.id}`} className="session-reader">
      <div className="session-progress">
        <span>
          YOUR LEARNING PATH · {done.length}/{sessions.length}{" "}
          {sessions.length === 1 ? "milestone" : "milestones"}
        </span>
        <progress
          aria-label="Session milestones completed"
          max={sessions.length}
          value={done.length}
        />
        <details>
          <summary>Choose a session</summary>
          <nav aria-label="Learning sessions">
            {sessions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={index === i ? "step" : undefined}
                onClick={() => onSessionChange?.(s.id)}
              >
                <span>{done.includes(s.id) ? "✓" : i + 1}</span>
                {s.title}
              </button>
            ))}
          </nav>
        </details>
      </div>
      <div className="session-heading">
        <small>
          VELA-WRITTEN · SESSION {index + 1}
          {session.version ? ` · v${session.version}` : ""}
        </small>
        <h2 tabIndex={-1}>{session.title}</h2>
      </div>
      {(session.version ?? 1) > 1 && (
        <p className="revision-notice">
          Expanded lesson · saved milestones are retained. Revisit the new checks; completion is
          separate from assessed mastery.
        </p>
      )}
      {!unit.preview && unit.moduleId && (
        <PrerequisiteLinks moduleId={unit.moduleId} sessionId={session.id} />
      )}
      <div className="session-actions">
        <SessionTools
          key={`tools:${session.id}`}
          studyUnitId={unit.id}
          sessionId={session.id}
          lesson={session}
        />
        {!unit.preview && <StudyTimer sessionId={session.id} />}
        {!unit.preview && unit.moduleId && saved.userId && (
          <button type="button" aria-expanded={roomOpen} onClick={() => setRoomOpen((v) => !v)}>
            {roomOpen ? "Close study room" : "Study room"}
          </button>
        )}
      </div>
      {roomOpen && unit.moduleId && saved.userId && (
        <StudyRoom
          key={unit.moduleId + ":" + saved.userId}
          moduleId={unit.moduleId}
          ownerId={saved.userId}
        />
      )}
      <DiscussionScope
        key={`discussion:${session.id}`}
        studyUnitId={unit.id}
        sourceType="session"
        sourceId={session.id}
      >
        <LessonBody
          key={`lesson:${session.id}`}
          highlights={highlights}
          onAsk={onAsk}
          markdown={session.markdown}
          visual={session.visual}
        />
      </DiscussionScope>
      <button
        className="practice-link"
        disabled={done.includes(session.id)}
        onClick={() => void complete()}
      >
        {done.includes(session.id) ? "Milestone complete ✓" : "Mark milestone complete"}
      </button>
      <nav className="session-sequence" aria-label="Session sequence">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onSessionChange?.(sessions[index - 1].id)}
        >
          ← Previous session
        </button>
        <a href={`/study/${unit.id}/sessions`}>All sessions</a>
        <button
          type="button"
          disabled={index === sessions.length - 1}
          onClick={() => onSessionChange?.(sessions[index + 1].id)}
        >
          Next session →
        </button>
      </nav>
      <p role="status">{notice}</p>
    </section>
  );
}
