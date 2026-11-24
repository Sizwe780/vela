"use client";
import { useEffect, useRef, useState } from "react";
import { practiceSnapshot, type PracticeSnapshot } from "../../lib/math-practice/notebook";
type Saved = {
  id: string;
  title: string;
  reflection: string;
  kind: string;
  createdAt: string;
  snapshot: unknown;
};
export function PracticeNotebook({
  snapshot,
  onLoad,
  busy,
  initiallyOpen = false,
}: {
  snapshot: PracticeSnapshot;
  onLoad: (s: PracticeSnapshot) => Promise<void>;
  busy: boolean;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen),
    [title, setTitle] = useState(""),
    [reflection, setReflection] = useState(""),
    [kind, setKind] = useState("practice");
  const [entries, setEntries] = useState<Saved[]>([]),
    [owner, setOwner] = useState(""),
    [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    [more, setMore] = useState(false);
  const [pending, setPending] = useState(false),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<Saved | null>(null),
    [remove, setRemove] = useState("");
  const [reload, setReload] = useState(0);
  const retry = useRef<{ body: string; fingerprint: string } | null>(null);
  const boundOwner = useRef("");
  useEffect(() => {
    if (!open) return;
    const control = new AbortController();
    setOwner("");
    setEntries([]);
    setSelected(null);
    setRemove("");
    fetch(`/api/practice-notebook?page=${page}${filter ? `&kind=${filter}` : ""}`, {
      cache: "no-store",
      signal: control.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error?.message ?? "Sign in to use your private notebook.");
        return data;
      })
      .then((data) => {
        if (!control.signal.aborted) {
          if (boundOwner.current && boundOwner.current !== data.ownerId) {
            setStatus(
              "Your account changed. Export any work you want to keep, then reload this page.",
            );
            return;
          }
          boundOwner.current = data.ownerId;
          setOwner(data.ownerId);
          setEntries(data.entries);
          setMore(data.hasMore);
        }
      })
      .catch((e) => {
        if (!control.signal.aborted) setStatus(e.message);
      });
    return () => control.abort();
  }, [open, page, filter, reload]);
  async function save() {
    if (!owner || pending || busy) return;
    setPending(true);
    setStatus("");
    const data = { ownerId: owner, title, reflection, kind, snapshot };
    const fingerprint = JSON.stringify(data);
    if (!retry.current || retry.current.fingerprint !== fingerprint)
      retry.current = { fingerprint, body: JSON.stringify({ id: crypto.randomUUID(), ...data }) };
    try {
      const response = await fetch("/api/practice-notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: retry.current.body,
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error?.message ?? "Could not save. Keep your draft and retry.");
      setStatus("Saved a private copy. No mastery or grades were changed.");
      retry.current = null;
      setPage(0);
      setReload((v) => v + 1);
    } catch (e) {
      setStatus(
        e instanceof TypeError || e instanceof SyntaxError
          ? "Could not reach your notebook. Your draft is still here. Retry this save or export it."
          : e instanceof Error
            ? e.message
            : "Keep your draft and retry.",
      );
    } finally {
      setPending(false);
    }
  }
  async function deleteEntry(id: string) {
    setPending(true);
    try {
      const r = await fetch(`/api/practice-notebook?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw Error("Could not delete this entry. Reload your notebook and try again.");
      setRemove("");
      setSelected(null);
      setStatus("Entry deleted.");
      setReload((v) => v + 1);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  function download(entry: Saved) {
    const parsed = practiceSnapshot.safeParse(entry.snapshot);
    if (!parsed.success && entry.id !== "draft") {
      setStatus("This saved format is not supported.");
      return;
    }
    const s = parsed.success ? parsed.data : snapshot;
    const text = [
      `# ${entry.title}`,
      entry.kind === "mistake" ? "Mistake to revisit" : "Practice copy",
      s.context,
      `Starting expression: ${s.reference}`,
      `Check: ${s.matrix ? "matrix row operation" : s.mode}; variable: ${s.variable}`,
      ...s.lines.map(
        (line, i) =>
          `Step ${i + 1}: ${line.latex}${s.matrix ? `\nDeclared operation: ${JSON.stringify(line.operation)}` : ""}`,
      ),
      `Draft: ${s.draft}`,
      `Reflection: ${entry.reflection}`,
      "Personal practice inputs only. Previous checks are not grades or proof of correctness.",
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vela-practice.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details
      className="practice-notebook"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>My practice notebook</summary>
      <p>
        Save a private copy of your inputs and reflection. Reopening replaces the current scratchpad
        and rechecks its saved lines locally. No AI call or assessment credit.
      </p>
      <label>
        Entry title
        <input
          aria-label="Notebook entry title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Reflection
        <textarea
          aria-label="Practice reflection"
          maxLength={4000}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What confused you? What will you try differently?"
        />
      </label>
      <label>
        Save as
        <select
          aria-label="Notebook entry type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="practice">Practice</option>
          <option value="mistake">Mistake to revisit</option>
        </select>
      </label>
      <div className="math-actions">
        <button
          type="button"
          disabled={!owner || busy || pending || !title.trim()}
          onClick={() => void save()}
        >
          {pending ? "Working…" : "Save copy to notebook"}
        </button>
        <button
          type="button"
          onClick={() =>
            download({
              id: "draft",
              title: title || "My practice draft",
              reflection,
              kind,
              snapshot,
              createdAt: new Date().toISOString(),
            })
          }
        >
          Export current draft
        </button>
        <button type="button" disabled={pending} onClick={() => setReload((v) => v + 1)}>
          Refresh notebook
        </button>
      </div>
      <p role="status">{status}</p>
      <label>
        Show entries
        <select
          aria-label="Notebook filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All saved work</option>
          <option value="mistake">Mistakes to revisit</option>
          <option value="practice">Practice copies</option>
        </select>
      </label>
      {owner && !entries.length && <p>No saved entries on this page.</p>}
      <ul className="notebook-entries">
        {entries.map((entry) => (
          <li key={entry.id}>
            <h3>{entry.title}</h3>
            <p>
              {entry.kind === "mistake" ? "Mistake to revisit" : "Practice"} ·{" "}
              {new Date(entry.createdAt).toLocaleDateString()}
            </p>
            <p className="notebook-reflection">{entry.reflection}</p>
            <div className="math-actions">
              <button type="button" disabled={pending || busy} onClick={() => setSelected(entry)}>
                Reopen work
              </button>
              <button type="button" onClick={() => download(entry)}>
                Export text
              </button>
              <button type="button" disabled={pending || busy} onClick={() => setRemove(entry.id)}>
                Delete entry
              </button>
            </div>
            {selected?.id === entry.id && (
              <div className="notebook-confirm">
                <p>
                  Replace the current scratchpad? Save or export any work you want to keep first.
                </p>
                <button
                  type="button"
                  disabled={busy || pending}
                  onClick={async () => {
                    const result = practiceSnapshot.safeParse(entry.snapshot);
                    if (!result.success) {
                      setStatus("Unsupported saved format.");
                      return;
                    }
                    setSelected(null);
                    setTitle(entry.title);
                    setReflection(entry.reflection);
                    setKind(entry.kind);
                    await onLoad(result.data);
                  }}
                >
                  Replace and recheck
                </button>
                <button type="button" onClick={() => setSelected(null)}>
                  Keep current work
                </button>
              </div>
            )}
            {remove === entry.id && (
              <div className="notebook-confirm">
                <p>Delete this saved copy permanently?</p>
                <button type="button" disabled={pending} onClick={() => void deleteEntry(entry.id)}>
                  Confirm deletion
                </button>
                <button type="button" onClick={() => setRemove("")}>
                  Cancel deletion
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="math-actions">
        <button
          type="button"
          disabled={page === 0 || pending}
          onClick={() => setPage((v) => v - 1)}
        >
          Previous notebook page
        </button>
        <span>Page {page + 1}</span>
        <button type="button" disabled={!more || pending} onClick={() => setPage((v) => v + 1)}>
          Next notebook page
        </button>
      </div>
    </details>
  );
}
