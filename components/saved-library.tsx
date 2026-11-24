"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentResource, studentRequest } from "../lib/student/client";
import styles from "./student-pages.module.css";
type Bookmark = {
  id: string;
  sourceType: "session" | "chunk";
  sourceId: string;
  quote: string;
  title: string;
  studyUnit: { id: string; title: string; module: { code: string } };
};
export function SavedLibrary() {
  const { data, error, loading, reload } = useStudentResource<{
    bookmarks: Bookmark[];
    nextCursor: string | null;
    ownerId: string;
  }>("/api/bookmarks");
  const [extra, setExtra] = useState<{
    ownerId: string;
    items: Bookmark[];
    nextCursor: string | null;
  } | null>(null);
  useEffect(() => setExtra(null), [data]);
  async function more() {
    const cursor = extra?.ownerId === data?.ownerId ? extra?.nextCursor : data?.nextCursor;
    if (!cursor || !data) return;
    setPending("more");
    try {
      const page = await studentRequest<{
        bookmarks: Bookmark[];
        nextCursor: string | null;
        ownerId: string;
      }>(`/api/bookmarks?cursor=${encodeURIComponent(cursor)}`);
      setExtra((e) => ({
        ownerId: page.ownerId,
        items: [...(e?.ownerId === page.ownerId ? e.items : []), ...page.bookmarks],
        nextCursor: page.nextCursor,
      }));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setPending(null);
    }
  }
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  async function remove(id: string) {
    setPending(id);
    try {
      await studentRequest(`/api/bookmarks?id=${encodeURIComponent(id)}`, "DELETE");
      setNotice("Saved item removed.");
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setPending(null);
    }
  }
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || (loading ? "Loading your saved library…" : "Sign in to see saved items.")}
      </p>
    );
  const extras = extra?.ownerId === data.ownerId ? extra : null;
  const bookmarks = [...data.bookmarks, ...(extras?.items ?? [])];
  return (
    <>
      <p>
        Bookmark a session or select a passage inside a lesson to save it here. Sources remain
        subject to your current enrollment.
      </p>
      <p role="status">{notice}</p>
      {!bookmarks.length && (
        <section className={styles.card}>
          <h2>No saved items yet</h2>
          <p>Open a lesson and choose “Bookmark session” to save it here.</p>
          <Link className={styles.link} href="/">
            Go to my learning
          </Link>
        </section>
      )}
      {bookmarks.map((b) => (
        <article className={styles.card} key={b.id}>
          <small>
            {b.studyUnit.module.code} · {b.studyUnit.title}
          </small>
          <h2>{b.title}</h2>
          {b.quote && (
            <>
              <small>Your saved selection</small>
              <blockquote className={styles.quote}>{b.quote}</blockquote>
            </>
          )}
          <div className={styles.row}>
            <Link
              className={styles.link}
              href={
                b.sourceType === "session"
                  ? `/study/${b.studyUnit.id}/sessions/${b.sourceId}`
                  : `/study/${b.studyUnit.id}#chunk-${encodeURIComponent(b.sourceId)}`
              }
            >
              Open source
            </Link>
            <button disabled={pending === b.id} type="button" onClick={() => void remove(b.id)}>
              Remove saved item
            </button>
          </div>
        </article>
      ))}
      {(extras ? extras.nextCursor : data.nextCursor) && (
        <button
          className={styles.button}
          disabled={pending === "more"}
          type="button"
          onClick={() => void more()}
        >
          Load more saved items
        </button>
      )}
    </>
  );
}
