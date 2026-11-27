"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PracticeSession } from "./written-practice";
export type Draft = {
  text?: string;
  values?: Record<number, string>;
  units?: Record<number, string>;
  choice?: number | null;
};
export type SavedAttempt = {
  id?: string;
  title: string;
  question: string;
  draft: Draft;
  status: string;
  isLocallyChecked: boolean;
  aiFeedback?: any;
  submitted: boolean;
  revision: number;
  dirty?: boolean;
  mutation?: string;
  conflict?: boolean;
};
type Store = {
  records: Record<string, SavedAttempt>;
  change: (
    key: string,
    title: string,
    question: string,
    draft: Draft,
    submitted?: boolean,
    checked?: boolean,
  ) => void;
  flush: (key: string) => Promise<void>;
  review: (key: string, result: any) => void;
  queue: (key: string) => Promise<void>;
  notice: string;
};
const Context = createContext<Store | null>(null);
const prefix = "vela:lesson-attempts:v1:";
export function clearLessonDrafts() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  window.dispatchEvent(new Event("vela-clear-lesson-drafts"));
}
export function LessonAttemptProvider({
  session,
  children,
}: {
  session: PracticeSession | null;
  children: ReactNode;
}) {
  const [records, setRecords] = useState<Record<string, SavedAttempt>>({}),
    [notice, setNotice] = useState("");
  const current = useRef(records),
    scope = useRef(session),
    ready = useRef(false),
    running = useRef(false),
    abort = useRef<AbortController | null>(null);
  current.current = records;
  scope.current = session;
  const key = session?.ownerId
    ? `${prefix}${session.ownerId}:${session.sessionId}:${session.version}`
    : "";
  function commit(next: Record<string, SavedAttempt>) {
    current.current = next;
    setRecords(next);
    if (key)
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        setNotice("Device storage is unavailable; keep this page open until answers sync.");
      }
  }
  function fromServer(row: any): SavedAttempt {
    return {
      id: row.id,
      title: row.title,
      question: row.question,
      draft: row.userAnswer,
      status: row.status,
      isLocallyChecked: row.isLocallyChecked,
      aiFeedback: row.aiFeedback,
      submitted: row.submitted,
      revision: row.revision,
    };
  }
  async function load(signal: AbortSignal) {
    if (!session?.ownerId) return;
    try {
      const q = new URLSearchParams({
        studyUnitId: session.studyUnitId,
        sessionId: session.sessionId,
        version: String(session.version),
      });
      const response = await fetch("/api/practice/attempts?" + q, { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message ?? "Saved practice is unavailable.");
      if (signal.aborted || data.ownerId !== session.ownerId) return;
      const merged = { ...current.current };
      for (const row of data.attempts) {
        const id = row.title + "\n" + row.question,
          local = merged[id];
        if (!local?.dirty) merged[id] = fromServer(row);
        else if (
          JSON.stringify(local.draft) === JSON.stringify(row.userAnswer) &&
          local.submitted === row.submitted
        )
          merged[id] = fromServer(row);
        else if (local.revision !== row.revision) merged[id] = { ...local, conflict: true };
      }
      ready.current = true;
      commit(merged);
      setNotice(
        Object.values(merged).some((r) => r.conflict)
          ? "A newer answer exists in another tab. Your draft is kept locally; compare before replacing it."
          : "",
      );
    } catch (e) {
      if (!signal.aborted) {
        ready.current = true;
        setNotice(
          navigator.onLine
            ? "Saved practice could not load; your device draft is preserved. Reconnect to retry."
            : "Offline: answers are saved on this device and will sync when you reconnect.",
        );
      }
    }
  }
  useEffect(() => {
    ready.current = false;
    abort.current?.abort();
    const c = new AbortController();
    abort.current = c;
    let cached = {};
    if (key)
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          cached = Object.fromEntries(
            Object.entries(parsed).filter(([, value]) => {
              const row = value as SavedAttempt;
              return (
                row &&
                typeof row.title === "string" &&
                typeof row.question === "string" &&
                row.draft &&
                typeof row.draft === "object" &&
                Number.isInteger(row.revision)
              );
            }),
          );
        }
      } catch {}
    commit(cached);
    if (session?.ownerId) void load(c.signal);
    else ready.current = true;
    const online = () => {
      void load(c.signal);
    };
    const clear = () => {
      abort.current?.abort();
      c.abort();
      current.current = {};
      setRecords({});
      ready.current = false;
      setNotice("Device practice cache cleared. Reload this lesson to retrieve saved answers.");
    };
    window.addEventListener("vela-clear-lesson-drafts", clear);
    window.addEventListener("online", online);
    return () => {
      abort.current?.abort();
      c.abort();
      window.removeEventListener("online", online);
      window.removeEventListener("vela-clear-lesson-drafts", clear);
    };
  }, [key]);
  async function performFlush(id: string) {
    const row = current.current[id],
      s = scope.current;
    if (!row?.dirty || !s?.ownerId) return;
    if (row.conflict)
      throw Error("A newer saved answer exists. Resolve the conflict below before syncing.");
    const signal = abort.current?.signal;
    const response = await fetch("/api/practice/attempts", {
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: s.ownerId,
        studyUnitId: s.studyUnitId,
        sessionId: s.sessionId,
        version: s.version,
        title: row.title,
        question: row.question,
        draft: row.draft,
        submitted: row.submitted,
        revision: row.revision,
        mutationId: row.mutation,
      }),
      signal,
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409)
        commit({ ...current.current, [id]: { ...current.current[id], conflict: true } });
      throw Error(data.error?.message ?? "Answer sync failed.");
    }
    if (
      scope.current?.ownerId !== s.ownerId ||
      scope.current?.sessionId !== s.sessionId ||
      signal?.aborted
    )
      return;
    const latest = current.current[id];
    commit({
      ...current.current,
      [id]:
        latest?.mutation === row.mutation
          ? fromServer(data.attempt)
          : { ...latest, revision: data.attempt.revision },
    });
  }
  const flights = useRef(new Map<string, Promise<void>>());
  async function flush(id: string): Promise<void> {
    const pending = flights.current.get(id);
    if (pending) {
      await pending;
      if (current.current[id]?.dirty) return flush(id);
      return;
    }
    const job = performFlush(id);
    flights.current.set(id, job);
    try {
      await job;
    } finally {
      flights.current.delete(id);
    }
  }
  useEffect(() => {
    if (!ready.current || running.current || !session?.ownerId) return;
    const ids = Object.keys(records).filter((id) => records[id].dirty && !records[id].conflict);
    if (!ids.length) return;
    const timer = setTimeout(async () => {
      running.current = true;
      let synced = true;
      try {
        for (const id of ids) await flush(id);
        setNotice("Answers saved.");
      } catch (e) {
        synced = false;
        setNotice(e instanceof Error ? e.message : "Changes remain on this device.");
      } finally {
        running.current = false;
        if (synced && Object.values(current.current).some((r) => r.dirty && !r.conflict))
          setRecords({ ...current.current });
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [records, key]);
  const store: Store = {
    records,
    notice,
    flush,
    change(id, title, question, draft, submitted = false, checked = false) {
      const old = current.current[id];
      commit({
        ...current.current,
        [id]: {
          ...old,
          title,
          question,
          draft,
          submitted,
          status: checked ? "checked" : "tried",
          isLocallyChecked: checked,
          aiFeedback: null,
          revision: old?.revision ?? 0,
          dirty: true,
          mutation: crypto.randomUUID(),
        },
      });
    },
    review(id, result) {
      const old = current.current[id];
      if (old)
        commit({
          ...current.current,
          [id]: {
            ...old,
            status: "reviewed",
            aiFeedback: result,
            revision: result.attemptRevision ?? old.revision,
            dirty: false,
          },
        });
    },
    async queue(id) {
      await flush(id);
      const row = current.current[id];
      if (!row?.id) throw Error("Save this attempt online before adding it to review.");
      const response = await fetch("/api/practice/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "queue", id: row.id }),
        signal: abort.current?.signal,
      });
      if (!response.ok) throw Error("Review card was not saved. Retry when online.");
      setNotice("Added to your private Review queue.");
    },
  };
  return (
    <Context.Provider value={store}>
      {children}
      {notice && (
        <p className="practice-save-notice" role="status">
          {notice}
          {notice !== "Answers saved." && (
            <button
              type="button"
              onClick={() => {
                const c = new AbortController();
                abort.current = c;
                void load(c.signal);
              }}
            >
              Retry sync
            </button>
          )}
        </p>
      )}
      {Object.entries(records)
        .filter(([, r]) => r.conflict)
        .map(([id, r]) => (
          <div className="practice-conflict" key={id}>
            <p>A newer answer is saved for {r.title}. Your draft is still here.</p>
            <button
              type="button"
              onClick={async () => {
                if (!session) return;
                const q = new URLSearchParams({
                  studyUnitId: session.studyUnitId,
                  sessionId: session.sessionId,
                  version: String(session.version),
                });
                try {
                  const response = await fetch("/api/practice/attempts?" + q, {
                    cache: "no-store",
                  });
                  if (!response.ok) throw Error();
                  const data = await response.json();
                  if (data.ownerId !== session.ownerId) return;
                  const row = data.attempts.find((a: any) => a.title + "\n" + a.question === id);
                  if (row) commit({ ...current.current, [id]: fromServer(row) });
                } catch {
                  setNotice("Could not retrieve the saved answer. Your draft is preserved.");
                }
              }}
            >
              Use saved answer
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!session) return;
                try {
                  const q = new URLSearchParams({
                    studyUnitId: session.studyUnitId,
                    sessionId: session.sessionId,
                    version: String(session.version),
                  });
                  const response = await fetch("/api/practice/attempts?" + q, {
                    cache: "no-store",
                  });
                  const data = await response.json();
                  if (!response.ok || data.ownerId !== session.ownerId) throw Error();
                  const row = data.attempts.find((a: any) => a.title + "\n" + a.question === id);
                  commit({
                    ...current.current,
                    [id]: {
                      ...current.current[id],
                      revision: row?.revision ?? 0,
                      conflict: false,
                      dirty: true,
                      mutation: crypto.randomUUID(),
                    },
                  });
                } catch {
                  setNotice("Reconnect to compare and sync this draft.");
                }
              }}
            >
              Keep my draft instead
            </button>
          </div>
        ))}
    </Context.Provider>
  );
}
export function useLessonAttempts() {
  return useContext(Context);
}
