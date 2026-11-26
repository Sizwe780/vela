"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { StudyUnitView, TutorMessage, TutorMode, TutorPace } from "../lib/tutor/types";
import { chatHistory, messageText } from "../lib/tutor/chat-history";
import { SourceDrawer } from "./source-drawer";
import { type NoteClip } from "../app/study/[unitId]/components/NotesDrawer";

import { CompanionPanel } from "./workspace/companion-panel";
import { ReaderPanel } from "./workspace/reader-panel";
import { WorkspaceHeader } from "./workspace/workspace-header";
import {
  useWorkspaceFocus,
  useWorkspaceLayout,
  WorkspaceDivider,
} from "./workspace/workspace-display";
import { CompanionDock } from "./workspace/companion-dock";
import { PanelToggle } from "./workspace/panel-toggle";
import { ModuleCapabilitiesProvider } from "./module-capabilities";
import { universalCapabilities } from "../lib/capabilities";
import type { TeachingStrategy } from "./workspace/socratic-support";
import { SourceDrawerContent } from "./workspace/source-drawer-content";

export function StudyWorkspace({
  unit,
  initialSessionId,
}: {
  unit: StudyUnitView;
  initialSessionId?: string;
}) {
  const [activeSessionId, setActiveSessionId] = useState(
    initialSessionId ?? unit.sessions?.[0]?.id,
  );
  const sessionRef = useRef(activeSessionId);
  const sessionNavRef = useRef<(id: string, updateUrl?: boolean) => void>(() => {});
  sessionRef.current = activeSessionId;
  const [extraChunks, setExtraChunks] = useState<StudyUnitView["chunks"]>([]);
  const availableChunks = useMemo(
    () => [...unit.chunks, ...extraChunks],
    [unit.chunks, extraChunks],
  );
  const [noteClip, setNoteClip] = useState<NoteClip | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const display = useWorkspaceLayout();
  const { layout } = display;
  const focus = useWorkspaceFocus();
  const [mode, setMode] = useState<TutorMode>("academic");
  const [pace, setPace] = useState<TutorPace>("normal");
  const paceRef = useRef<TutorPace>("normal");
  const [strategy, setStrategy] = useState<TeachingStrategy>("coach");
  const strategyRef = useRef<TeachingStrategy>("coach"),
    hintRef = useRef<number | undefined>(undefined),
    lastQuestion = useRef("");
  strategyRef.current = strategy;
  useEffect(() => {
    if (!unit.capabilities?.debate) {
      setStrategy("coach");
      strategyRef.current = "coach";
    }
  }, [unit.capabilities?.debate]);
  useEffect(() => {
    if (!unit.capabilities?.pck) setMode("academic");
  }, [unit.capabilities?.pck]);
  const [aiChoice, setAIChoice] = useState(unit.preview ? "sample" : "default");
  const aiRef = useRef(aiChoice);
  aiRef.current = aiChoice;
  const [input, setInput] = useState("");
  const [companionOpen, setCompanionOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"reader" | "tutor">("reader");
  const [showLegacy, setShowLegacy] = useState(false);
  const hasStructured = unit.documents.some((document) => document.structuredContent);
  const visibleDocuments = useMemo(
    () =>
      hasStructured && !showLegacy
        ? unit.documents.filter((document) => document.structuredContent)
        : unit.documents,
    [unit.documents, hasStructured, showLegacy],
  );
  const [readerTab, setReaderTab] = useState<"text" | "outcomes" | "source">(
    unit.sessions?.length || unit.documents.some((document) => document.structuredContent)
      ? "text"
      : unit.moduleInfo?.sources.length
        ? "source"
        : "text",
  );
  const [readingIndex, setReadingIndex] = useState(0);
  const pagedDocuments =
    hasStructured && !unit.preview
      ? visibleDocuments.slice(
          Math.min(readingIndex, visibleDocuments.length - 1),
          Math.min(readingIndex, visibleDocuments.length - 1) + 1,
        )
      : visibleDocuments;
  const [sourceIndex, setSourceIndex] = useState(0);
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);
  const [following, setFollowing] = useState(true);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const chatScroll = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (unit.preview || !activeSessionId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/study-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId }),
        signal: controller.signal,
      }).catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [unit.id, unit.preview, activeSessionId]);
  useEffect(() => {
    const onPop = () => {
      const match = location.pathname.match(/\/sessions\/([^/]+)$/);
      const id = match ? decodeURIComponent(match[1]) : unit.sessions?.[0]?.id;
      if (id && unit.sessions?.some((s) => s.id === id)) sessionNavRef.current(id, false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [unit.sessions]);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<TutorMessage>({
        api: "/api/tutor",
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages[messages.length - 1];
          return {
            body: {
              studyUnitId: unit.id,
              ...(sessionRef.current ? { sessionId: sessionRef.current } : {}),
              mode: modeRef.current,
              strategy: strategyRef.current,
              pace: paceRef.current,
              ...(hintRef.current !== undefined ? { hintTier: hintRef.current } : {}),
              query: messageText(last),
              ...(["ollama", "cloudflare", "groq", "gemini", "openrouter", "openai"].includes(
                aiRef.current,
              )
                ? { provider: aiRef.current }
                : {}),
              history: chatHistory(messages.slice(0, -1)),
            },
          };
        },
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(
              body?.error?.message ?? "The tutor is temporarily unavailable. Please try again.",
            );
          }
          return response;
        },
      }),
    [unit.id],
  );
  const { messages, sendMessage, status, error, stop, setMessages, clearError, regenerate } =
    useChat<TutorMessage>({ id: `study-${unit.id}-${activeSessionId ?? "unit"}`, transport });
  const busy = status === "submitted" || status === "streaming";
  const selected = availableChunks.find((chunk) => chunk.id === selectedChunk);

  useEffect(() => {
    const readHash = () => {
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.replace(/^#chunk-/, ""));
      } catch {
        return;
      }
      if (id && unit.sessions?.length) {
        void openCitation(id);
        return;
      }
      if (availableChunks.some((chunk) => chunk.id === id)) {
        setSelectedChunk(id);
        const documentId = availableChunks.find((chunk) => chunk.id === id)?.documentId;
        const index = visibleDocuments.findIndex((document) =>
          document.ingestionIds?.includes(documentId ?? ""),
        );
        if (index >= 0) setReadingIndex(index);
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [availableChunks, visibleDocuments]);
  useEffect(() => {
    const scroll = chatScroll.current;
    if (scroll && messages.length && following) scroll.scrollTop = scroll.scrollHeight;
  }, [messages, status, following, layout, mobilePanel]);
  useEffect(() => {
    // Reset an empty conversation on navigation, without fighting manual welcome scrolling.
    if (!messages.length && chatScroll.current) chatScroll.current.scrollTop = 0;
  }, [messages.length, mode, activeSessionId, layout, mobilePanel]);
  useEffect(() => {
    const field = inputRef.current;
    if (field) {
      field.style.height = "auto";
      field.style.height = `${Math.min(field.scrollHeight, 130)}px`;
    }
  }, [input]);

  const previousSelection = useRef("");
  useEffect(() => {
    previousSelection.current = "";
    const selectedPassage = (event: Event) => {
      const selection = window.getSelection(),
        text = selection?.toString().trim() ?? "",
        reader = document.getElementById("workspace-reader");
      if (!text) {
        previousSelection.current = "";
        return;
      }
      if (
        !(event.target instanceof Element) ||
        event.target.closest("input,textarea,button,select,a,summary,math-field")
      )
        return;
      if (
        !selection ||
        !reader?.contains(selection.anchorNode) ||
        !reader.contains(selection.focusNode) ||
        text.length < 12 ||
        text.length > 2000 ||
        text === previousSelection.current
      )
        return;
      previousSelection.current = text;
      setInput(`Help me understand this passage:\n${text}`);
      setCompanionOpen(true);
      setMobilePanel("tutor");
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Shift") selectedPassage(event);
    };
    document.addEventListener("mouseup", selectedPassage);
    document.addEventListener("keyup", key);
    return () => {
      document.removeEventListener("mouseup", selectedPassage);
      document.removeEventListener("keyup", key);
    };
  }, [unit.id, activeSessionId]);

  async function openCitation(id: string) {
    if (!availableChunks.some((chunk) => chunk.id === id)) {
      try {
        const r = await fetch(
          `/api/chunks/${encodeURIComponent(id)}?unit=${encodeURIComponent(unit.id)}`,
        );
        if (!r.ok) return;
        const chunk = await r.json();
        setExtraChunks((c) => [...c, chunk]);
      } catch {
        return;
      }
    }
    setSelectedChunk(id);
    window.history.replaceState(null, "", `#chunk-${encodeURIComponent(id)}`);
  }
  function selectSession(id: string, updateUrl = true) {
    if (id === sessionRef.current) return;
    void stop();
    sessionRef.current = id;
    setActiveSessionId(id);
    if (updateUrl)
      window.history.pushState(
        null,
        "",
        `/study/${encodeURIComponent(unit.id)}/sessions/${encodeURIComponent(id)}`,
      );
    setMessages([]);
    clearError();
    setInput("");
    hintRef.current = undefined;
    lastQuestion.current = "";
    strategyRef.current = "coach";
    setStrategy("coach");
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(".session-heading h2");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  function askForHint(title: string, question: string) {
    setInput(`Help me with ${title}: ${question}\nGive a hint first.`);
    focusCompanion();
  }
  function focusCompanion() {
    setCompanionOpen(true);
    setMobilePanel("tutor");
    inputRef.current?.focus();
  }
  function closeCitation() {
    setSelectedChunk(null);
    window.history.replaceState(null, "", window.location.pathname);
  }
  function selectReading(index: number) {
    setReadingIndex(Math.max(0, Math.min(visibleDocuments.length - 1, index)));
    setSelectedChunk(null);
    window.history.replaceState(null, "", window.location.pathname);
  }
  async function ask(text: string, hintTier?: 1 | 2 | 3) {
    if (!text.trim() || busy) return;
    if (!unit.preview && hintTier === undefined && text.trim() === "Check my understanding") {
      changePace("transfer");
    }
    hintRef.current = hintTier;
    lastQuestion.current = text.trim();
    clearError();
    setFollowing(true);
    setInput("");
    setCompanionOpen(true);
    setMobilePanel("tutor");
    await sendMessage({ text: text.trim() });
  }
  function changePace(next: TutorPace) {
    if (busy) return;
    paceRef.current = next;
    setPace(next);
    if (next === "transfer") {
      strategyRef.current = "coach";
      setStrategy("coach");
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }
  function switchMode(next: TutorMode) {
    if (!busy) {
      setMode(next);
      clearError();
    }
  }
  const suggestions =
    mode === "academic"
      ? [
          "Explain this idea step by step",
          "Walk me through a worked example",
          "Check my understanding",
        ]
      : [
          "How would I teach this concept?",
          "What might a learner misunderstand?",
          "Suggest a formative assessment",
        ];

  sessionNavRef.current = selectSession;
  return (
    <ModuleCapabilitiesProvider capabilities={unit.capabilities ?? universalCapabilities}>
      <div
        ref={focus.workspace}
        className="workspace workspace-editorial"
        data-focus={focus.focused || undefined}
        data-companion-open={companionOpen || undefined}
      >
        <WorkspaceHeader
          fontSize={fontSize}
          setFontSize={setFontSize}
          messages={messages}
          activeSessionId={activeSessionId}
          unit={unit}
          dismissed={dismissed}
          onDismiss={() => setDismissed(true)}
          aiChoice={aiChoice}
          busy={busy}
          onProviderChange={(value) => {
            window.dispatchEvent(new Event("vela-stop-audio"));
            setAIChoice(value);
            setMessages([]);
            clearError();
            hintRef.current = undefined;
            lastQuestion.current = "";
          }}
          layout={layout}
          onLayoutChange={display.select}
          focused={focus.focused}
          onToggleFocus={focus.toggle}
          noteClip={noteClip}
          onClipHandled={() => setNoteClip(null)}
        />
        <PanelToggle
          panel={mobilePanel}
          onChange={(panel) => {
            setMobilePanel(panel);
            setCompanionOpen(panel === "tutor");
          }}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className={`split-layout layout-${layout}`}
          style={display.style}
        >
          <ReaderPanel
            activeSessionId={activeSessionId}
            unit={unit}
            mobilePanel={mobilePanel}
            readerTab={readerTab}
            setReaderTab={setReaderTab}
            fontSize={fontSize}
            setFontSize={setFontSize}
            messages={messages}
            sourceIndex={sourceIndex}
            setSourceIndex={setSourceIndex}
            hasStructured={hasStructured}
            showLegacy={showLegacy}
            setShowLegacy={setShowLegacy}
            visibleDocuments={visibleDocuments}
            pagedDocuments={pagedDocuments}
            readingIndex={readingIndex}
            setReadingIndex={setReadingIndex}
            selectReading={selectReading}
            onSessionChange={selectSession}
            onAsk={askForHint}
            onAskCompanion={focusCompanion}
          />
          <WorkspaceDivider width={display.width} onResize={display.update} />
          <CompanionDock
            open={companionOpen}
            onClose={() => {
              setCompanionOpen(false);
              setMobilePanel("reader");
              window.dispatchEvent(new Event("vela-stop-audio"));
            }}
          >
            <CompanionPanel
              studyUnitId={unit.id}
              sessionId={activeSessionId}
              mobilePanel={mobilePanel}
              sessionTitle={
                unit.sessions?.find((s) => s.id === activeSessionId)?.title ?? unit.title
              }
              mode={mode}
              pace={pace}
              onPaceChange={changePace}
              strategy={strategy}
              onStrategyChange={(next) => {
                if (busy) return;
                window.dispatchEvent(new Event("vela-stop-audio"));
                strategyRef.current = next;
                setStrategy(next);
                if (next === "debate") changePace("normal");
                hintRef.current = undefined;
                clearError();
              }}
              onHint={(tier) => void ask(input.trim() || lastQuestion.current, tier)}
              hasHintQuestion={!!(input.trim() || lastQuestion.current)}
              liveTutor={!unit.preview}
              busy={busy}
              switchMode={switchMode}
              ask={ask}
              messages={messages}
              chatScroll={chatScroll}
              setFollowing={setFollowing}
              suggestions={suggestions}
              setNoteClip={setNoteClip}
              openCitation={openCitation}
              status={status}
              error={error}
              submit={submit}
              inputRef={inputRef}
              input={input}
              setInput={setInput}
              stop={stop}
              onReset={() => {
                setMessages([]);
                clearError();
                setInput("");
                hintRef.current = undefined;
                lastQuestion.current = "";
              }}
              onRetry={() => {
                clearError();
                void regenerate();
              }}
            />
          </CompanionDock>
        </main>
        {!companionOpen && (
          <button className="companion-launcher" type="button" onClick={focusCompanion}>
            ✦ {busy ? "Companion is thinking…" : "Ask your companion"}
          </button>
        )}
        {selected && (
          <SourceDrawer onClose={closeCitation}>
            <SourceDrawerContent
              studyUnitId={unit.id}
              chunk={selected}
              preview={unit.preview}
              onClose={closeCitation}
            />
          </SourceDrawer>
        )}
      </div>
    </ModuleCapabilitiesProvider>
  );
}
