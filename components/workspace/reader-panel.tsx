"use client";
import type { Dispatch, SetStateAction, CSSProperties } from "react";
import type { StudyUnitView, TutorMessage } from "../../lib/tutor/types";
import { messageText } from "../../lib/tutor/chat-history";
import { Icon } from "../icons";
import { Markdown } from "../markdown";
import { StructuredReading } from "../structured-document";
import { TangentExplorer } from "../tangent-explorer";
import { SessionReader } from "../session-reader";
import { RecallDrawer } from "../../app/study/[unitId]/components/RecallDrawer";
type ReaderTab = "text" | "outcomes" | "source";
type ReaderPanelProps = {
  activeSessionId?: string;
  unit: StudyUnitView;
  mobilePanel: "reader" | "tutor";
  readerTab: ReaderTab;
  setReaderTab: (tab: ReaderTab) => void;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  messages: TutorMessage[];
  sourceIndex: number;
  setSourceIndex: (index: number) => void;
  hasStructured: boolean;
  showLegacy: boolean;
  setShowLegacy: (show: boolean) => void;
  visibleDocuments: StudyUnitView["documents"];
  pagedDocuments: StudyUnitView["documents"];
  readingIndex: number;
  setReadingIndex: (index: number) => void;
  selectReading: (index: number) => void;
  onSessionChange: (id: string) => void;
  onAsk: (title: string, question: string) => void;
  onAskCompanion: () => void;
};
export function ReaderPanel({
  activeSessionId,
  unit,
  mobilePanel,
  readerTab,
  setReaderTab,
  fontSize,
  setFontSize,
  messages,
  sourceIndex,
  setSourceIndex,
  hasStructured,
  showLegacy,
  setShowLegacy,
  visibleDocuments,
  pagedDocuments,
  readingIndex,
  setReadingIndex,
  selectReading,
  onSessionChange,
  onAsk,
  onAskCompanion,
}: ReaderPanelProps) {
  return (
    <section
      className={`reader-panel ${mobilePanel === "reader" ? "mobile-active" : ""}`}
      data-reading-session={(!!unit.sessions?.length && readerTab === "text") || undefined}
      id="workspace-reader"
      aria-label="Study material"
    >
      <div className="panel-toolbar">
        <div className="reader-tabs">
          {unit.moduleInfo?.sources.length ? (
            <button
              type="button"
              aria-pressed={readerTab === "source"}
              onClick={() => setReaderTab("source")}
            >
              Original PDF
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={readerTab === "text"}
            onClick={() => setReaderTab("text")}
          >
            <Icon name="book" size={15} />
            Study text
          </button>
          <button
            type="button"
            aria-pressed={readerTab === "outcomes"}
            onClick={() => setReaderTab("outcomes")}
          >
            Learning outcomes <span>{unit.outcomes.length}</span>
          </button>
        </div>
      </div>
      <div className="reader-scroll" style={{ "--reading-size": `${fontSize}px` } as CSSProperties}>
        <article className="study-article">
          <div className="eyebrow unit-eyebrow">
            STUDY UNIT {String(unit.position).padStart(2, "0")}
            <span />
            {unit.moduleCode}
          </div>
          <h1>{unit.title}</h1>
          <p className="unit-description">
            {activeSessionId
              ? unit.sessions?.find((session) => session.id === activeSessionId)?.title
              : "Overview and study materials"}
          </p>
          {unit.moduleInfo && (
            <details className="module-info">
              <summary>
                <strong>
                  NQF {unit.moduleInfo.nqfLevel} · {unit.moduleInfo.credits}{" "}
                  {unit.moduleInfo.credits === 1 ? "credit" : "credits"} ·{" "}
                  {unit.moduleInfo.delivery}
                </strong>
              </summary>
              <p>{unit.moduleInfo.scopeNote}</p>
              <p>{unit.moduleInfo.extractionNote}</p>
              <small>
                Assessment weights, exam minimum and proctoring rules await a current tutorial
                letter.
              </small>
            </details>
          )}
          <div className="article-meta">
            <span>
              <Icon name="book" size={14} />
              {unit.sessions?.length
                ? `${unit.sessions.length} ${unit.sessions.length === 1 ? "learning session" : "learning sessions"}`
                : `${visibleDocuments.length} ${visibleDocuments.length === 1 ? "reading" : "readings"}`}
            </span>
            <span>
              <Icon name="check" size={14} />
              {unit.outcomes.length}{" "}
              {unit.outcomes.length === 1 ? "learning outcome" : "learning outcomes"}
            </span>
          </div>
          {readerTab === "source" && unit.moduleInfo ? (
            <section className="original-source">
              <label>
                Source document
                <select
                  aria-label="Source document"
                  value={sourceIndex}
                  onChange={(event) => setSourceIndex(Number(event.target.value))}
                >
                  {unit.moduleInfo.sources.map((source, index) => (
                    <option value={index} key={source.url}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>
              <a
                href={unit.moduleInfo.sources[sourceIndex]?.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original PDF in a new tab ↗
              </a>
              <iframe title="Original study PDF" src={unit.moduleInfo.sources[sourceIndex]?.url} />
            </section>
          ) : readerTab === "outcomes" ? (
            <section className="outcomes-list">
              <h2>What you’ll work towards</h2>
              <p>Use these outcomes to guide your reading and your questions.</p>
              {unit.outcomes.length ? (
                unit.outcomes.map((outcome, index) => (
                  <article key={outcome.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <small>{outcome.code}</small>
                      <h3>{outcome.description}</h3>
                    </div>
                  </article>
                ))
              ) : (
                <p>Learning outcomes have not been added yet.</p>
              )}
            </section>
          ) : (
            <>
              {hasStructured && (
                <details className="module-info">
                  <summary>
                    <strong>Math-aware reading</strong>
                  </summary>
                  <p>
                    {unit.moduleInfo?.conversion
                      ? `${unit.moduleInfo.conversion.converted} of ${unit.moduleInfo.conversion.total} source pages are available; ${unit.moduleInfo.conversion.needsReview} need review. `
                      : ""}
                    Structured readings below cover their stated pages. The tutor uses available
                    converted pages. Earlier text extraction is retained for reference; its
                    mathematics may be damaged.
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={showLegacy}
                      onChange={(event) => {
                        setShowLegacy(event.target.checked);
                        setReadingIndex(0);
                      }}
                    />{" "}
                    Show legacy text extraction
                  </label>
                </details>
              )}
              {hasStructured && visibleDocuments.length > 1 && (
                <nav className="reading-pagination" aria-label="Reading navigation">
                  <button
                    type="button"
                    disabled={readingIndex <= 0}
                    onClick={() => selectReading(readingIndex - 1)}
                  >
                    Previous
                  </button>
                  <label>
                    Reading page
                    <select
                      aria-label="Reading page"
                      value={Math.min(readingIndex, visibleDocuments.length - 1)}
                      onChange={(event) => selectReading(Number(event.target.value))}
                    >
                      {visibleDocuments.map((document, index) => (
                        <option key={document.id} value={index}>
                          {index + 1}. {document.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={readingIndex >= visibleDocuments.length - 1}
                    onClick={() => selectReading(readingIndex + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
              {unit.sessions?.length ? (
                <SessionReader
                  activeSessionId={activeSessionId}
                  unit={unit}
                  onSessionChange={onSessionChange}
                  onAsk={onAsk}
                />
              ) : pagedDocuments.length ? (
                pagedDocuments.map((document, index) => (
                  <section className="study-document" key={document.id}>
                    {visibleDocuments.length > 1 && (
                      <div className="document-label">
                        READING {(hasStructured && !unit.preview ? readingIndex : 0) + index + 1} ·{" "}
                        {document.title}
                      </div>
                    )}
                    {document.structuredContent ? (
                      <StructuredReading document={document.structuredContent} />
                    ) : (
                      <Markdown text={document.text} approvedLessonFigures />
                    )}
                    {unit.preview && index === 0 && <TangentExplorer />}
                  </section>
                ))
              ) : (
                <div className="empty-reading">
                  <Icon name="book" size={30} />
                  <h2>Your reading is on its way</h2>
                  <p>
                    Study text hasn’t been added to this unit yet. You can review its learning
                    outcomes in the meantime.
                  </p>
                </div>
              )}
              <div className="reading-footer">
                <span className="little-sparkle">✦</span>
                <p>Understanding grows one good question at a time.</p>
                <button type="button" onClick={onAskCompanion}>
                  Ask your companion <Icon name="arrow" size={15} />
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
