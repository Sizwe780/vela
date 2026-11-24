"use client";
import { useEffect, useRef, useState, type Ref } from "react";
import { SourceDrawer } from "../../../../components/source-drawer";
import { Markdown } from "../../../../components/markdown";
import { clipNote } from "../../../../lib/notes/input";
import { authClient } from "../../../../lib/auth/client";
import { downloadMarkdown } from "../../../../lib/study/download-markdown";
export type NoteClip = { id: string; title: string; text: string };
export function NotesDrawer({
  studyUnitId,
  clip,
  onClipHandled,
  triggerRef,
}: {
  studyUnitId: string;
  clip: NoteClip | null;
  onClipHandled?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const { data: session } = authClient.useSession();
  return (
    <Notebook
      key={`${session?.user?.id ?? "signed-out"}:${studyUnitId}`}
      studyUnitId={studyUnitId}
      clip={clip}
      onClipHandled={onClipHandled}
      triggerRef={triggerRef}
    />
  );
}
function Notebook({
  studyUnitId,
  clip,
  onClipHandled,
  triggerRef,
}: {
  studyUnitId: string;
  clip: NoteClip | null;
  onClipHandled?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false),
    [loaded, setLoaded] = useState(false),
    [text, setText] = useState(""),
    [status, setStatus] = useState(""),
    [preview, setPreview] = useState(false);
  const latest = useRef(""),
    saved = useRef(""),
    revision = useRef(0),
    applied = useRef(""),
    loading = useRef(false),
    flight = useRef<Promise<boolean> | null>(null);
  const owner = useRef("");
  async function load() {
    if (loading.current) return;
    loading.current = true;
    setStatus("Opening notebook…");
    try {
      const r = await fetch(`/api/notes?studyUnitId=${encodeURIComponent(studyUnitId)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error?.message ?? "Sign in to open your notes.");
      owner.current = d.ownerId;
      latest.current = saved.current = d.body;
      revision.current = d.revision;
      setText(d.body);
      setLoaded(true);
      setStatus("Saved");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      loading.current = false;
    }
  }
  function flush(): Promise<boolean> {
    if (flight.current) return flight.current;
    if (latest.current === saved.current) {
      setStatus("Saved");
      return Promise.resolve(true);
    }
    flight.current = (async () => {
      try {
        while (latest.current !== saved.current) {
          const snapshot = latest.current;
          setStatus("Saving…");
          const r = await fetch("/api/notes", {
            method: "PUT",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studyUnitId,
              body: snapshot,
              revision: revision.current,
              ownerId: owner.current,
            }),
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error?.message ?? "Save failed. Your draft remains here.");
          revision.current = d.revision;
          saved.current = snapshot;
        }
        setStatus("Saved");
        return true;
      } catch (e) {
        setStatus((e as Error).message);
        return false;
      } finally {
        flight.current = null;
      }
    })();
    return flight.current;
  }
  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded]);
  useEffect(() => {
    if (!clip || applied.current === clip.id) return;
    setOpen(true);
    if (!loaded) return;
    const next = clipNote(latest.current, clip.title, clip.text);
    applied.current = clip.id;
    onClipHandled?.();
    if (next.length > 16000) {
      setStatus("Notebook is full. Shorten it before clipping this card.");
      return;
    }
    latest.current = next;
    setText(next);
    setPreview(true);
    setStatus("Clip added · saving…");
  }, [clip, loaded, onClipHandled]);
  useEffect(() => {
    if (!loaded || text === saved.current) return;
    const timer = setTimeout(() => void flush(), 750);
    return () => clearTimeout(timer);
  }, [text, loaded]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(
    () => () => {
      if (latest.current !== saved.current) void flush();
    },
    [],
  );
  const close = () => {
    if (!loaded) {
      setOpen(false);
      return;
    }
    void flush().then((ok) => {
      if (ok) setOpen(false);
    });
  };
  return (
    <>
      <button ref={triggerRef} className="notes-trigger" onClick={() => setOpen(true)}>
        My Notes
      </button>
      {open && (
        <SourceDrawer label="My Notes" onClose={close}>
          <section className="notebook-panel">
            <header>
              <div>
                <small>YOUR PRIVATE NOTEBOOK</small>
                <h2>My Notes</h2>
              </div>
              <button aria-label="Close notes" onClick={close}>
                ×
              </button>
            </header>
            <p>Personal notes for this study unit · Markdown and LaTeX supported.</p>
            <div className="notebook-tabs">
              <button aria-pressed={!preview} onClick={() => setPreview(false)}>
                Write
              </button>
              <button aria-pressed={preview} onClick={() => setPreview(true)}>
                Preview
              </button>
            </div>
            {loaded ? (
              preview ? (
                <div className="note-preview">
                  <Markdown
                    text={text || "Your notebook is empty. Write a note or clip a companion card."}
                  />
                </div>
              ) : (
                <textarea
                  aria-label="Personal study notes"
                  maxLength={16000}
                  value={text}
                  onChange={(e) => {
                    latest.current = e.target.value;
                    setText(e.target.value);
                    setStatus("Unsaved changes");
                  }}
                  placeholder="What made the idea click? Write in your own words…"
                />
              )
            ) : (
              <button onClick={() => void load()}>Retry notebook</button>
            )}
            <footer>
              <span role="status">{status}</span>
              <small>{text.length.toLocaleString()} / 16,000</small>
              <button disabled={!loaded} onClick={() => void flush()}>
                Save now
              </button>
              <button
                disabled={!loaded || !text.trim()}
                onClick={() => downloadMarkdown(`notes-${studyUnitId}.md`, text)}
              >
                Download notes
              </button>
            </footer>
          </section>
        </SourceDrawer>
      )}
    </>
  );
}
