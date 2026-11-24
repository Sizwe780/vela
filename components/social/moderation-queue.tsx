"use client";
import { useState } from "react";
import Link from "next/link";
import { useStudentResource, studentRequest } from "../../lib/student/client";
import { Markdown } from "../markdown";
export function ModerationQueue() {
  const { data, error, reload } = useStudentResource<{
      ownerId: string;
      posts: {
        id: string;
        body: string;
        alias: string;
        reports: number;
        moduleCode: string;
        unitTitle: string;
        href: string;
      }[];
    }>("/api/discussions/moderation"),
    [confirm, setConfirm] = useState(""),
    [notice, setNotice] = useState("");
  async function remove(id: string) {
    if (!data) return;
    try {
      await studentRequest("/api/discussions", "PATCH", {
        ownerId: data.ownerId,
        id,
        action: "remove",
      });
      setConfirm("");
      setNotice("Reported post removed.");
      reload();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <section aria-label="Reported peer posts">
      <p>
        Only reported posts in your scoped, enrolled modules appear. Reports are not findings of
        wrongdoing. This view shows up to 100 current reported posts.
      </p>
      {error && <p role="status">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {data?.posts.map((p) => (
        <article className="discussion-thread" key={p.id}>
          <h2>
            {p.moduleCode} · {p.unitTitle}
          </h2>
          <small>
            {p.alias} · {p.reports} reports
          </small>
          <Markdown text={p.body} citations={[]} />
          <Link href={p.href}>Open unit</Link>
          <button onClick={() => setConfirm(p.id)}>Review removal</button>
          {confirm === p.id && (
            <>
              <p>Remove this post from the learning group?</p>
              <button onClick={() => void remove(p.id)}>Confirm removal</button>
              <button onClick={() => setConfirm("")}>Keep post</button>
            </>
          )}
        </article>
      ))}
      {data && !data.posts.length && <p>No reported posts in your current scope.</p>}
    </section>
  );
}
