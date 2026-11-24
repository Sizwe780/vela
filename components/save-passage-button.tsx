"use client";
import { useState } from "react";
export function SavePassageButton({
  studyUnitId,
  sourceId,
  sourceType,
  quote = "",
  label = "Save to library",
}: {
  studyUnitId: string;
  sourceId: string;
  sourceType: "session" | "chunk";
  quote?: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  async function save() {
    setPending(true);
    setNotice("");
    try {
      const r = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyUnitId, sourceType, sourceId, quote }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error?.message ?? "Could not save. Please retry.");
      window.dispatchEvent(new Event("vela-bookmarks"));
      setNotice("Saved to your library.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }
  return (
    <span className="save-passage">
      <button type="button" disabled={pending} onClick={() => void save()}>
        {pending ? "Saving…" : label}
      </button>
      <span role="status">{notice}</span>
    </span>
  );
}
