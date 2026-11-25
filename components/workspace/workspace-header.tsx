"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import type { StudyUnitView } from "../../lib/tutor/types";
import { AccountMenu } from "../account-menu";
import { MobileTools } from "../mobile-tools";
import { LearningNav } from "../learning-nav";
import { SourceLibrary } from "../../app/study/[unitId]/components/SourceLibrary";
import { ProgressTracker } from "../../app/study/[unitId]/components/ProgressTracker";
import { NotesDrawer, type NoteClip } from "../../app/study/[unitId]/components/NotesDrawer";
import { RecallDrawer } from "../../app/study/[unitId]/components/RecallDrawer";

export function WorkspaceHeader({
  unit,
  activeSessionId,
  dismissed,
  onDismiss,
  aiChoice,
  busy,
  onProviderChange,
  layout,
  onLayoutChange,
  focused,
  onToggleFocus,
  noteClip,
  onClipHandled,
}: {
  unit: StudyUnitView;
  activeSessionId?: string;
  dismissed: boolean;
  onDismiss: () => void;
  aiChoice: string;
  busy: boolean;
  onProviderChange: (value: string) => void;
  layout: string;
  onLayoutChange: (value: string) => void;
  focused: boolean;
  onToggleFocus: () => void;
  noteClip: NoteClip | null;
  onClipHandled: () => void;
}) {
  const notesTrigger = useRef<HTMLButtonElement>(null);
  const sourceTrigger = useRef<HTMLButtonElement>(null);
  const recallTrigger = useRef<HTMLButtonElement>(null);
  const openTool = (close: () => void, trigger: { current: HTMLButtonElement | null }) => {
    close();
    requestAnimationFrame(() => trigger.current?.click());
  };
  return (
    <header className="workspace-nav">
      <Link href="/" className="workspace-logo" aria-label="Vela learning home">
        <Image src="/logo.png" alt="Vela" width={28} height={28} className="workspace-logo-img" priority />
        vela<span>.</span>
      </Link>
      <span className="workspace-focus-context">
        {unit.moduleCode} · {unit.title}
      </span>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">My learning</Link>
        <span>›</span>
        <Link href={unit.moduleId ? `/modules/${unit.moduleId}` : "/"}>{unit.moduleCode}</Link>
        <span>›</span>
        <Link href={`/study/${unit.id}${unit.preview ? "" : "/sessions"}`}>
          Unit {String(unit.position).padStart(2, "0")}
        </Link>
        {activeSessionId && (
          <>
            <span>›</span>
            <span>
              Session{" "}
              {String(
                (unit.sessions?.findIndex((s) => s.id === activeSessionId) ?? 0) + 1,
              ).padStart(2, "0")}
            </span>
          </>
        )}
      </nav>
      {unit.preview && !dismissed && (
        <button
          className="sample-pill"
          title="Sample reading and illustrative criteria. Click to dismiss."
          onClick={onDismiss}
        >
          Sample · ×
        </button>
      )}
      <div className="workspace-actions">
        {!unit.preview && (
          <label className="provider-control">
            <span className="scope-dot" />
            <select
              aria-label="Tutor source"
              title="AI provider"
              value={aiChoice}
              disabled={busy}
              onChange={(e) => onProviderChange(e.target.value)}
            >
              <option value="default">Configured AI</option>
              <option value="ollama">Ollama · local</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="groq">Groq · free tier</option>
              <option value="gemini">Gemini · free tier</option>
              <option value="openrouter">OpenRouter · free routes</option>
            </select>
          </label>
        )}
        <select
          className="workspace-preset"
          aria-label="Workspace layout"
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value)}
        >
          <option value="reader">Reader Focus</option>
          <option value="split">Balanced Split</option>
          <option value="theater">Companion Focus</option>
          {layout === "custom" && <option value="custom">Custom split</option>}
        </select>
        <ProgressTracker unitId={unit.id} />
        {!unit.preview && <SourceLibrary triggerRef={sourceTrigger} unitId={unit.id} />}
        <NotesDrawer
          triggerRef={notesTrigger}
          studyUnitId={unit.id}
          clip={noteClip}
          onClipHandled={onClipHandled}
        />
        <RecallDrawer
          triggerRef={recallTrigger}
          studyUnitId={unit.id}
          chat=""
          triggerLabel="Practice active recall"
        />
        <AccountMenu />
      </div>
      <button
        type="button"
        className="workspace-focus-button"
        aria-pressed={focused}
        aria-label={focused ? "Exit focus mode" : "Enter focus mode"}
        onClick={onToggleFocus}
      >
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          {focused ? (
            <path d="M3 7h4V3m10 4h-4V3M3 13h4v4m10-4h-4v4" />
          ) : (
            <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" />
          )}
        </svg>
        <span>{focused ? "Exit focus" : "Focus"}</span>
      </button>
      <MobileTools label="Study tools" maxWidth={960}>
        {(close) => (
          <>
            <LearningNav />
            <div className="mobile-tool-buttons">
              <button type="button" onClick={() => openTool(close, notesTrigger)}>
                My Notes
              </button>
              {!unit.preview && (
                <button type="button" onClick={() => openTool(close, sourceTrigger)}>
                  Source library
                </button>
              )}
              <button type="button" onClick={() => openTool(close, recallTrigger)}>
                Practice active recall
              </button>
            </div>
            {!unit.preview && (
              <label>
                AI provider
                <select
                  aria-label="Tutor source"
                  disabled={busy}
                  value={aiChoice}
                  onChange={(e) => onProviderChange(e.target.value)}
                >
                  <option value="default">Configured AI</option>
                  <option value="ollama">Ollama · local</option>
                  <option value="cloudflare">Cloudflare</option>
                  <option value="groq">Groq · free tier</option>
                  <option value="gemini">Gemini · free tier</option>
                  <option value="openrouter">OpenRouter · free routes</option>
                </select>
              </label>
            )}
            <ProgressTracker unitId={unit.id} />
            <AccountMenu />
          </>
        )}
      </MobileTools>
    </header>
  );
}
