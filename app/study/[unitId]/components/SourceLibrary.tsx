"use client";
import { useState, type Ref } from "react";
import { SourceDrawer } from "../../../../components/source-drawer";
import { StructuredReading } from "../../../../components/structured-document";
import type { StructuredDocument } from "../../../../lib/content/structured";
type Page = { id: string; document: string; pageStart: number; review: string };
export function SourceLibrary({
  unitId,
  triggerRef,
  hiddenTrigger = false,
}: {
  unitId: string;
  triggerRef?: Ref<HTMLButtonElement>;
  hiddenTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [pages, setPages] = useState<Page[]>([]),
    [document, setDocument] = useState<StructuredDocument | null>(null),
    [notice, setNotice] = useState("");
  async function show() {
    setOpen(true);
    setNotice("Loading source index…");
    try {
      const r = await fetch(`/api/reading?unit=${unitId}`);
      if (!r.ok) throw Error();
      setPages((await r.json()).pages);
      setNotice("");
    } catch {
      setNotice("Source index unavailable. Please retry.");
    }
  }
  async function choose(id: string) {
    setDocument(null);
    setNotice("Loading page…");
    try {
      const r = await fetch(`/api/reading?unit=${unitId}&id=${id}`);
      if (!r.ok) throw Error();
      setDocument((await r.json()).document);
      setNotice("");
    } catch {
      setNotice("Page unavailable. Please retry.");
    }
  }
  return (
    <>
      <button
        hidden={hiddenTrigger}
        ref={triggerRef}
        className="notes-trigger"
        onClick={() => void show()}
      >
        Source library
      </button>
      {open && (
        <SourceDrawer label="Source library" onClose={() => setOpen(false)}>
          <h2>
            Source library · {pages.length} {pages.length === 1 ? "page" : "pages"}
          </h2>
          <p>
            Converted reference text and source illustrations. Machine OCR may contain recognition
            errors; compare equations with the original PDF. Vela-written sessions are your primary
            learning path.
          </p>
          <label>
            Reference page{" "}
            <select
              aria-label="Reference page"
              defaultValue=""
              onChange={(e) => void choose(e.target.value)}
            >
              <option value="" disabled>
                Choose a page
              </option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.document} · PDF page {p.pageStart} ·{" "}
                  {p.review === "source-compared" ? "Reviewed" : "Machine OCR"}
                </option>
              ))}
            </select>
          </label>
          <p role="status">{notice}</p>
          {document && <StructuredReading document={document} />}
        </SourceDrawer>
      )}
    </>
  );
}
