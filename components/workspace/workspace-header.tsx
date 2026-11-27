"use client";
import { SearchTrigger } from "../search-trigger";
import Link from "next/link";
import Image from "next/image";
import { velaLogoSrc } from "../vela-logo";
import { StudyTimer } from "../study-timer";
import type { TutorMessage } from "../../lib/tutor/types";
import { messageText } from "../../lib/tutor/chat-history";
import { useEffect, useRef } from "react";
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
  fontSize,
  setFontSize,
  messages,
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
  fontSize: number;
  setFontSize: (update: (value: number) => number) => void;
  messages: TutorMessage[];
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
  useEffect(() => {
    const open = () => recallTrigger.current?.click();
    window.addEventListener("vela-open-recall", open);
    return () => window.removeEventListener("vela-open-recall", open);
  }, []);
  useEffect(() => {
    const dismiss = (event: Event) => {
      document
        .querySelectorAll<HTMLDetailsElement>(
          ".workspace-display-menu[open],.workspace-more-menu[open]",
        )
        .forEach((menu) => {
          if (!menu.contains(event.target as Node)) menu.open = false;
        });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document
        .querySelectorAll<HTMLDetailsElement>(
          ".workspace-display-menu[open],.workspace-more-menu[open]",
        )
        .forEach((menu) => {
          menu.open = false;
          menu.querySelector<HTMLElement>("summary")?.focus();
        });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
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
        <Image
          src={velaLogoSrc}
          alt="Vela"
          width={28}
          height={28}
          className="workspace-logo-img"
          priority
        />
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
        <details className="workspace-display-menu">
          <summary>Display</summary>
          <div className="workspace-popover">
            <strong>Make space to learn</strong>
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
            <div className="text-size-control" aria-label="Reading text size">
              <button
                type="button"
                aria-label="Decrease text size"
                disabled={fontSize <= 15}
                onClick={() => setFontSize((v) => Math.max(15, v - 1))}
              >
                A−
              </button>
              <span>{fontSize} px</span>
              <button
                type="button"
                aria-label="Increase text size"
                disabled={fontSize >= 21}
                onClick={() => setFontSize((v) => Math.min(21, v + 1))}
              >
                A+
              </button>
            </div>
            <small>Open the companion to use a split layout. Drag its divider to fine-tune.</small>
          </div>
        </details>
        <ProgressTracker unitId={unit.id} />
        {!unit.preview && (
          <SourceLibrary hiddenTrigger triggerRef={sourceTrigger} unitId={unit.id} />
        )}
        {!unit.preview && activeSessionId && (
          <StudyTimer key={activeSessionId} compact sessionId={activeSessionId} />
        )}
        <details className="workspace-more-menu">
          <summary aria-label="More study tools">⋯</summary>
          <div className="workspace-popover">
            {!unit.preview && (
              <details className="advanced-tutor-settings">
                <summary>Advanced tutor settings</summary>
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
              </details>
            )}
            {!unit.preview && (
              <button
                type="button"
                onClick={(event) => {
                  const menu = event.currentTarget.closest("details.workspace-more-menu");
                  if (menu instanceof HTMLDetailsElement) {
                    menu.open = false;
                    menu.querySelector<HTMLElement>("summary")?.focus();
                  }
                  requestAnimationFrame(() => sourceTrigger.current?.click());
                }}
              >
                Source library
              </button>
            )}
            <SearchTrigger />
          </div>
        </details>
        <NotesDrawer
          triggerRef={notesTrigger}
          studyUnitId={unit.id}
          clip={noteClip}
          onClipHandled={onClipHandled}
        />
        <RecallDrawer
          triggerRef={recallTrigger}
          studyUnitId={unit.id}
          chat={messages
            .filter((m) => m.role === "assistant")
            .map(messageText)
            .join("\n\n")}
          triggerLabel="Practice active recall"
        />
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
      <AccountMenu />
      <MobileTools label="Study tools" maxWidth={960} glyph="☰">
        {(close) => (
          <>
            <LearningNav />
            <button
              type="button"
              onClick={() => {
                close();
                onToggleFocus();
              }}
            >
              {focused ? "Exit focus mode" : "Enter focus mode"}
            </button>
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
              <details className="advanced-tutor-settings">
                <summary>Advanced tutor settings</summary>
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
              </details>
            )}
            <ProgressTracker unitId={unit.id} />
          </>
        )}
      </MobileTools>
    </header>
  );
}
