"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import { authClient } from "../../lib/auth/client";
import { studentRequest } from "../../lib/student/client";
import { Markdown } from "../markdown";
import { DiscussionContext, type Paragraph } from "./discussion-context";
import { LiveAggregate, type LiveQuery } from "./live-aggregate";
type Count = { id: string; count: number };
type Post = {
  id: string;
  body: string;
  createdAt: string;
  alias: string;
  staff: boolean;
  mine: boolean;
  canRemove: boolean;
  reports?: number;
};
type Thread = Post & { replies: Post[] };
type Data = {
  ownerId: string;
  sourceHash: string;
  paragraphs: Paragraph[];
  counts: Count[];
  threads: Thread[];
  hasOlderThreads: boolean;
  canModerate: boolean;
  live: LiveQuery<Count> | null;
};
export function DiscussionScope(props: ComponentProps<typeof BoundDiscussionScope>) {
  const { data: session } = authClient.useSession();
  return <BoundDiscussionScope key={session?.user?.id ?? "guest"} {...props} />;
}
function BoundDiscussionScope({
  studyUnitId,
  sourceType,
  sourceId,
  children,
}: {
  studyUnitId: string;
  sourceType: "session" | "chunk";
  sourceId: string;
  children: ReactNode;
}) {
  const [enabled, setEnabled] = useState(false),
    [data, setData] = useState<Data | null>(null),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [selected, setSelected] = useState(""),
    [reply, setReply] = useState<string | null>(null),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [status, setStatus] = useState("connecting"),
    [revision, setRevision] = useState(0),
    [confirmRemove, setConfirmRemove] = useState("");
  const bound = useRef<{ ownerId: string; sourceHash: string } | null>(null),
    retry = useRef<{ fingerprint: string; body: unknown } | null>(null),
    panel = useRef<HTMLDivElement>(null);
  const query = `studyUnitId=${encodeURIComponent(studyUnitId)}&sourceType=${sourceType}&sourceId=${encodeURIComponent(sourceId)}`;
  const accept = useCallback((next: Data) => {
    if (
      bound.current &&
      (bound.current.ownerId !== next.ownerId || bound.current.sourceHash !== next.sourceHash)
    ) {
      setStale(true);
      setNotice(
        "Your account or source revision changed. Copy your draft, then disable and re-enable discussions to use current paragraphs.",
      );
      return;
    }
    bound.current = { ownerId: next.ownerId, sourceHash: next.sourceHash };
    setData((old) => ({ ...next, live: next.live ?? old?.live ?? null }));
    setCounts(Object.fromEntries(next.counts.map((c) => [c.id, c.count])));
  }, []);
  useEffect(() => {
    if (!enabled || stale) return;
    const c = new AbortController();
    let working = false;
    const load = async (initial = false) => {
      if (working || document.hidden) return;
      working = true;
      try {
        const next = await studentRequest<Data>(
          `/api/discussions?${query}${selected ? `&anchor=${selected}` : ""}${initial && !bound.current ? "&live=1" : ""}`,
          "GET",
          undefined,
          c.signal,
        );
        if (!c.signal.aborted) accept(next);
      } catch (e) {
        if (!c.signal.aborted) {
          setNotice((e as Error).message);
          if ([401, 403, 409].includes((e as Error & { status?: number }).status ?? 0))
            setStale(true);
        }
      } finally {
        working = false;
      }
    };
    void load(true);
    const interval = setInterval(() => void load(), 15000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      c.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, stale, query, selected, revision, accept]);
  const open = useCallback((anchor: string) => {
    setData((d) => (d ? { ...d, threads: [] } : d));
    setSelected(anchor);
    setReply(null);
    setNotice("");
    setConfirmRemove("");
    setTimeout(() => panel.current?.focus(), 0);
  }, []);
  useEffect(() => {
    if (!enabled || stale || sourceType !== "session" || !data) return;
    const select = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      if (
        !detail ||
        typeof detail !== "object" ||
        !("sessionId" in detail) ||
        !("anchor" in detail)
      )
        return;
      const paragraph = data.paragraphs.find(
        (item) => detail.sessionId === sourceId && detail.anchor === item.anchor,
      );
      if (paragraph) open(paragraph.anchor);
    };
    window.addEventListener("vela-discuss-selection", select);
    return () => window.removeEventListener("vela-discuss-selection", select);
  }, [enabled, stale, sourceType, sourceId, data, open]);
  const onRows = useCallback(
    (rows: readonly Count[]) => setCounts(Object.fromEntries(rows.map((c) => [c.id, c.count]))),
    [],
  );
  const refresh = useCallback(async () => {
    const next = await studentRequest<Data>(
      `/api/discussions?${query}&live=1&expectedOwner=${encodeURIComponent(bound.current?.ownerId ?? "")}`,
    );
    if (next.sourceHash !== bound.current?.sourceHash || !next.live) {
      setStale(true);
      throw Error("Discussion source changed");
    }
    return next.live.sealedQuery;
  }, [query]);
  const key = `${data?.sourceHash ?? ""}:${selected}:${reply ?? "question"}`,
    draft = drafts[key] ?? "";
  async function post() {
    if (!data || !selected || !draft.trim() || busy || stale) return;
    setBusy(true);
    setNotice("");
    const input = {
      studyUnitId,
      sourceType,
      sourceId,
      ownerId: data.ownerId,
      sourceHash: data.sourceHash,
      anchor: selected,
      body: draft,
      parentId: reply,
    };
    const fingerprint = JSON.stringify(input);
    if (retry.current?.fingerprint !== fingerprint)
      retry.current = { fingerprint, body: { id: crypto.randomUUID(), ...input } };
    try {
      await studentRequest("/api/discussions", "POST", retry.current!.body);
      retry.current = null;
      setDrafts((d) => ({ ...d, [key]: "" }));
      setReply(null);
      setNotice("Posted to this paragraph's enrolled learning group.");
      setRevision((v) => v + 1);
    } catch (e) {
      setNotice(`${(e as Error).message} Your draft is still here.`);
    } finally {
      setBusy(false);
    }
  }
  async function moderate(id: string, action: "remove" | "report") {
    if (!data || busy) return;
    setBusy(true);
    try {
      await studentRequest("/api/discussions", "PATCH", { id, action, ownerId: data.ownerId });
      setConfirmRemove("");
      setNotice(action === "report" ? "Report saved for scoped staff review." : "Post removed.");
      setRevision((v) => v + 1);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function renderPost(p: Post) {
    return (
      <div className="peer-post" key={p.id}>
        <small>
          {p.mine ? "You" : p.alias}
          {p.staff ? " · Staff" : ""} · {new Date(p.createdAt).toLocaleString()}
        </small>
        <Markdown text={p.body} citations={[]} />
        {!!p.reports && (
          <strong>
            {p.reports} {p.reports === 1 ? "report" : "reports"} · staff review
          </strong>
        )}
        <div className="peer-actions">
          {p.canRemove && (
            <button type="button" disabled={busy} onClick={() => setConfirmRemove(p.id)}>
              Remove post
            </button>
          )}
          {!p.mine && (
            <button type="button" disabled={busy} onClick={() => void moderate(p.id, "report")}>
              Report post
            </button>
          )}
        </div>
        {confirmRemove === p.id && (
          <div>
            <p>Remove this shared post?</p>
            <button disabled={busy} onClick={() => void moderate(p.id, "remove")}>
              Confirm removal
            </button>
            <button onClick={() => setConfirmRemove("")}>Keep post</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <section className="discussion-scope" aria-label="Paragraph discussions">
      <div className="discussion-opt-in">
        <button
          type="button"
          aria-pressed={enabled}
          onClick={() => {
            if (!enabled) {
              bound.current = null;
              setData(null);
              setStale(false);
              setSelected("");
              setNotice("");
            }
            setEnabled((v) => !v);
          }}
        >
          {enabled ? "Disable peer discussions" : "Enable peer discussions"}
        </button>
        <small>
          Optional · posts are shared with enrolled peers. Private notes and highlights are never
          posted automatically.
        </small>
      </div>
      <DiscussionContext.Provider
        value={enabled && data && !stale ? { paragraphs: data.paragraphs, counts, open } : null}
      >
        {children}
      </DiscussionContext.Provider>
      {enabled && (
        <div className="peer-discussions" ref={panel} tabIndex={-1}>
          <h3>Discuss a paragraph</h3>
          <button type="button" disabled={busy || stale} onClick={() => setRevision((v) => v + 1)}>
            Refresh discussions
          </button>
          <p>
            Avoid personal details. Peers can read your posts; authors and scoped staff can remove
            them. Peer explanations are not official answers or AI evidence.
          </p>
          {data && (
            <>
              <small>
                {status === "live"
                  ? "Discussion counts live · replies refresh every 15 seconds"
                  : "Periodic discussion updates · every 15 seconds"}
              </small>
              <label>
                Choose a paragraph
                <select
                  aria-label="Discussion paragraph"
                  value={selected}
                  onChange={(e) => open(e.target.value)}
                >
                  <option value="">Choose a current paragraph</option>
                  {data.paragraphs.map((p, i) => (
                    <option key={p.anchor} value={p.anchor}>
                      {i + 1}. {p.text.slice(0, 100)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {selected && data && (
            <>
              <blockquote>
                <Markdown
                  text={data.paragraphs.find((p) => p.anchor === selected)?.text ?? ""}
                  citations={[]}
                />
              </blockquote>
              {data.threads.map((thread) => (
                <article className="discussion-thread" key={thread.id}>
                  {renderPost(thread)}
                  {thread.replies.map(renderPost)}
                  <button
                    type="button"
                    disabled={busy || stale}
                    onClick={() => setReply(thread.id)}
                  >
                    Reply to this discussion
                  </button>
                </article>
              ))}
              {data.hasOlderThreads && <p>Showing the latest 20 discussions for this paragraph.</p>}
              <label>
                {reply ? "Your reply" : "Your question or explanation"}
                <textarea
                  aria-label="Shared discussion draft"
                  maxLength={2000}
                  value={draft}
                  disabled={busy}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                />
              </label>
              {reply && (
                <button onClick={() => setReply(null)}>Start a new discussion instead</button>
              )}
              <button
                type="button"
                disabled={busy || stale || !draft.trim()}
                onClick={() => void post()}
              >
                {busy ? "Saving…" : reply ? "Post reply" : "Post discussion"}
              </button>
            </>
          )}
          {notice && <p role="status">{notice}</p>}
        </div>
      )}
      {enabled && data?.live && !stale && (
        <LiveAggregate
          key={data.ownerId + data.sourceHash}
          live={data.live}
          ownerId={data.ownerId}
          onRows={onRows}
          onStatus={setStatus}
          refresh={refresh}
        />
      )}
    </section>
  );
}
