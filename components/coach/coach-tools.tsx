"use client";
import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SourceDrawer } from "../source-drawer";
import { useModuleCapabilities } from "../module-capabilities";
import { MathInsert } from "../math/math-insert";
import { Icon } from "../icons";
const PhotoDiagnosis = dynamic(() => import("./photo-diagnosis").then((m) => m.PhotoDiagnosis), {
  ssr: false,
  loading: () => <p>Opening photo tools…</p>,
});
const Visuals = dynamic(() => import("../sandboxes/gallery").then((m) => m.SandboxGallery), {
  ssr: false,
});
const TeachTutor = dynamic(() => import("./teach-tutor").then((m) => m.TeachTutor), {
  ssr: false,
  loading: () => <p>Opening conceptual practice…</p>,
});
export function CoachTools({
  studyUnitId,
  sessionId,
  onAsk,
  onInsertMath,
  guidance,
  busy,
}: {
  studyUnitId: string;
  sessionId?: string;
  onAsk: (text: string) => void;
  onInsertMath: (latex: string) => void;
  guidance?: (close: () => void) => ReactNode;
  busy: boolean;
}) {
  const capabilities = useModuleCapabilities();
  const enrolled = studyUnitId !== "demo" && !!sessionId;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"guidance" | "math" | "photo" | "teach" | "visuals">(
    guidance ? "guidance" : capabilities.math ? "math" : "visuals",
  );
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        className="coach-tools-trigger"
        aria-label="Tutor tools"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          window.dispatchEvent(new Event("vela-stop-audio"));
          setOpen(true);
        }}
      >
        <Icon name="sparkle" size={16} /> <span>Tools</span>
      </button>
      {open && (
        <SourceDrawer label="Tutor tools" onClose={() => setOpen(false)}>
          <div className="coach-panel">
            <header>
              <h2>Academic Master tools</h2>
              <button type="button" aria-label="Close tutor tools" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            <div className="coach-tabs" role="group" aria-label="Learning tools">
              {guidance && (
                <button
                  type="button"
                  aria-pressed={tab === "guidance"}
                  onClick={() => setTab("guidance")}
                >
                  Think it through
                </button>
              )}
              {capabilities.math && (
                <button type="button" aria-pressed={tab === "math"} onClick={() => setTab("math")}>
                  Insert math
                </button>
              )}
              {enrolled && capabilities.math && (
                <button
                  type="button"
                  aria-pressed={tab === "photo"}
                  onClick={() => setTab("photo")}
                >
                  Snap & diagnose
                </button>
              )}
              {enrolled && (
                <button
                  type="button"
                  aria-pressed={tab === "teach"}
                  onClick={() => setTab("teach")}
                >
                  Teach the tutor
                </button>
              )}
              {(capabilities.matrix || capabilities.calculus) && (
                <button
                  type="button"
                  aria-pressed={tab === "visuals"}
                  onClick={() => setTab("visuals")}
                >
                  Visual sandboxes
                </button>
              )}
            </div>
            {tab === "guidance" ? (
              guidance?.(close)
            ) : tab === "math" ? (
              <MathInsert
                embedded
                disabled={busy}
                onInsert={(latex) => {
                  close();
                  onInsertMath(latex);
                }}
              />
            ) : tab === "visuals" ? (
              <Visuals />
            ) : sessionId && tab === "photo" ? (
              <PhotoDiagnosis
                studyUnitId={studyUnitId}
                sessionId={sessionId}
                onAsk={(text) => {
                  setOpen(false);
                  onAsk(text);
                }}
              />
            ) : sessionId ? (
              <TeachTutor studyUnitId={studyUnitId} sessionId={sessionId} />
            ) : null}
          </div>
        </SourceDrawer>
      )}
    </>
  );
}
