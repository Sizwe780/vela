"use client";
import { useModuleCapabilities } from "../module-capabilities";
import { SocraticSupport, type TeachingStrategy } from "./socratic-support";
import { CoachTools } from "../coach/coach-tools";
import type { RefObject, FormEvent } from "react";
import type { TutorMode, TutorMessage, TutorPace } from "../../lib/tutor/types";
import type { NoteClip } from "../../app/study/[unitId]/components/NotesDrawer";
import { VoiceTutor } from "../../app/study/[unitId]/components/VoiceTutor";
import { CompanionChat as CompanionAnswer } from "../../app/study/[unitId]/components/CompanionChat";
import { messageText } from "../../lib/tutor/chat-history";
import { Icon } from "../icons";
import { CitationList } from "./citation-list";
import Link from "next/link";
import { NewChatControl } from "./new-chat-control";
const modeLabels = { academic: "Academic Master", pck: "CAPS Didactics / PCK" };
type CompanionPanelProps = {
  studyUnitId: string;
  sessionId?: string;
  mobilePanel: "reader" | "tutor";
  sessionTitle: string;
  mode: TutorMode;
  pace: TutorPace;
  onPaceChange: (pace: TutorPace) => void;
  strategy: TeachingStrategy;
  onStrategyChange: (strategy: TeachingStrategy) => void;
  onHint: (tier: 1 | 2 | 3) => void;
  hasHintQuestion: boolean;
  liveTutor: boolean;
  busy: boolean;
  switchMode: (mode: TutorMode) => void;
  ask: (text: string) => Promise<void>;
  messages: TutorMessage[];
  chatScroll: RefObject<HTMLDivElement | null>;
  setFollowing: (value: boolean) => void;
  suggestions: string[];
  setNoteClip: (clip: NoteClip) => void;
  openCitation: (id: string) => Promise<void>;
  status: string;
  error: Error | undefined;
  submit: (event: FormEvent) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (value: string) => void;
  stop: () => void | Promise<void>;
  onReset: () => void;
  onClose: () => void;
  onRetry: () => void;
};
export function CompanionPanel({
  studyUnitId,
  sessionId,
  mobilePanel,
  sessionTitle,
  mode,
  pace,
  onPaceChange,
  strategy,
  onStrategyChange,
  onHint,
  hasHintQuestion,
  liveTutor,
  busy,
  switchMode,
  ask,
  messages,
  chatScroll,
  setFollowing,
  suggestions,
  setNoteClip,
  openCitation,
  status,
  error,
  submit,
  inputRef,
  input,
  setInput,
  stop,
  onReset,
  onClose,
  onRetry,
}: CompanionPanelProps) {
  const capabilities = useModuleCapabilities();
  return (
    <section
      className={`tutor-panel ${mobilePanel === "tutor" ? "mobile-active" : ""}`}
      id="workspace-companion"
      aria-label="Learning companion"
    >
      <header className="companion-header">
        <button
          type="button"
          className="companion-mark"
          title="Academic Master briefing (Ctrl/Cmd + Shift + K)"
          aria-label="Open Academic Master briefing"
          onClick={() => window.dispatchEvent(new CustomEvent("vela-open-master"))}
        >
          ✦
        </button>
        <div className="mode-toggle" role="group" aria-label="Tutor mode">
          <button
            type="button"
            aria-pressed={mode === "academic"}
            disabled={busy}
            onClick={() => switchMode("academic")}
          >
            Academic Master
          </button>
          {capabilities.pck && (
            <button
              type="button"
              aria-pressed={mode === "pck"}
              disabled={busy}
              onClick={() => switchMode("pck")}
            >
              CAPS PCK
            </button>
          )}
        </div>
        {liveTutor && (
          <VoiceTutor
            key={`${studyUnitId}:${sessionId ?? "unit"}:${mode}`}
            studyUnitId={studyUnitId}
            busy={busy}
            onTranscript={ask}
            answer={
              messages
                .filter((m) => m.role === "assistant")
                .map(messageText)
                .at(-1) ?? ""
            }
          />
        )}
        <NewChatControl
          key={`${studyUnitId}:${sessionId ?? "unit"}`}
          disabled={busy}
          onConfirm={() => {
            window.dispatchEvent(new Event("vela-stop-audio"));
            onReset();
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        />
        <button
          type="button"
          className="companion-close"
          onClick={onClose}
          title="Close companion"
          aria-label="Close companion"
        >
          <svg
            viewBox="0 0 20 20"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>
      <div className="tutor-session-context">
        <span className="scope-dot" /> <span>Session context</span> <strong>{sessionTitle}</strong>
        {!liveTutor && <span className="preview-response-label">Sample responses</span>}
        {liveTutor && strategy === "debate" && (
          <span className="preview-response-label">Socratic debate</span>
        )}
      </div>
      <div
        className="chat-scroll"
        ref={chatScroll}
        onScroll={() => {
          const element = chatScroll.current;
          if (element)
            setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 100);
        }}
      >
        {!messages.length && (
          <div className="chat-welcome">
            <div className="welcome-ornament">
              <Icon name="sparkle" size={30} />
            </div>
            <h3>
              {mode === "academic" ? (
                <>
                  Let’s make sense
                  <br />
                  of it, together.
                </>
              ) : (
                <>
                  Understand it.
                  <br />
                  Then help it click.
                </>
              )}
            </h3>
            <p>
              {mode === "academic"
                ? "A tricky definition, a missing step, or a question you’re still forming—start wherever you are."
                : "Explore misconceptions, meaningful examples and ways to see what your learners understand."}
            </p>
            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>
                  <span>{suggestion}</span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
            </div>
            <div className="grounding-note">
              <Icon name="link" size={14} />
              <span>Follow the sources back to your study text.</span>
            </div>
          </div>
        )}
        <div
          className="messages"
          role="log"
          aria-label="Tutor conversation"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.map((message) => {
            const citationPart = message.parts.find((part) => part.type === "data-citations");
            const data = citationPart?.type === "data-citations" ? citationPart.data : undefined;
            const text = message.parts
              .flatMap((part) => (part.type === "text" ? [part.text] : []))
              .join("\n");
            return (
              <article key={message.id} className={`chat-message ${message.role}`}>
                <div className="message-byline">
                  {message.role === "user" ? (
                    <>
                      <span className="message-avatar user-avatar">Y</span>You
                    </>
                  ) : (
                    <>
                      <span className="message-avatar">
                        <Icon name="sparkle" size={13} />
                      </span>
                      {data ? modeLabels[data.mode] : "Learning companion"}
                      {data?.preview && <span className="sample-tag">PREVIEW</span>}
                      {data?.strategy === "debate" && (
                        <span className="teaching-tag">Socratic debate</span>
                      )}
                      {data?.hintTier && <span className="teaching-tag">Hint {data.hintTier}</span>}
                    </>
                  )}
                </div>
                {message.role === "user" ? (
                  <p className="user-message-text">{text}</p>
                ) : (
                  <>
                    <CompanionAnswer
                      onClip={(title, text) =>
                        setNoteClip({ id: crypto.randomUUID(), title, text })
                      }
                      text={text}
                      citations={data?.sources ?? []}
                      onCitation={openCitation}
                    />
                    {!text && busy && (
                      <span className="thinking">
                        Finding the thread<span>•••</span>
                      </span>
                    )}
                    {data?.refresher && (
                      <p className="grounded-refresher">
                        <Link href={data.refresher.href}>
                          Try this refresher · {data.refresher.title}
                        </Link>
                      </p>
                    )}
                    {data?.sources.length ? (
                      <CitationList
                        citations={data.sources}
                        preview={data.preview}
                        onCitation={openCitation}
                      />
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>
        {status === "submitted" && (
          <div className="retrieval-status" role="status">
            <span className="pulse-dot" />
            Reading the relevant passages…
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            <strong>A small pause in the conversation</strong>
            <p>{error.message}</p>
            <button type="button" onClick={onRetry}>
              Try again <Icon name="reset" size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="composer-area">
        <div className="composer">
          {(liveTutor || capabilities.math || capabilities.calculus || capabilities.matrix) && (
            <CoachTools
              pace={liveTutor ? pace : undefined}
              onPaceChange={liveTutor ? onPaceChange : undefined}
              key={sessionId}
              studyUnitId={studyUnitId}
              sessionId={sessionId}
              busy={busy}
              onAsk={(text) => void ask(text)}
              onInsertMath={(latex) => {
                setInput((input + ` $${latex}$`).slice(0, 4000));
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              guidance={
                liveTutor
                  ? (close) => (
                      <SocraticSupport
                        strategy={strategy}
                        onStrategy={onStrategyChange}
                        onHint={(tier) => {
                          close();
                          onHint(tier);
                        }}
                        busy={busy}
                        hasQuestion={hasHintQuestion}
                      />
                    )
                  : undefined
              }
            />
          )}
          <form onSubmit={submit} className="composer-entry">
            <label className="sr-only" htmlFor="tutor-query">
              Ask your learning companion
            </label>
            <textarea
              ref={inputRef}
              id="tutor-query"
              rows={1}
              maxLength={4000}
              placeholder={mode === "academic" ? "Ask a question…" : "Ask about teaching…"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (input.trim() && !busy) void ask(input);
                }
              }}
              disabled={busy}
            />
            {busy ? (
              <button
                type="button"
                className="send-button stop-button"
                aria-label="Stop response"
                onClick={() => void stop()}
              >
                <Icon name="stop" size={15} />
              </button>
            ) : (
              <button
                type="submit"
                className="send-button"
                aria-label="Send message"
                disabled={!input.trim()}
              >
                <Icon name="send" size={19} />
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
