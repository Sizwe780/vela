"use client";
import { useState } from "react";
import { studentRequest } from "../../lib/student/client";
import { structuredDocumentSchema, documentSourceUrl } from "../../lib/content/structured";
import { Markdown } from "../markdown";
import { ActionForm, Panel, field, type WorkspaceProps } from "./shared";
import styles from "./workspace.module.css";

export function ContentTools({
  actorId,
  data,
  qualificationId,
  busy,
  send,
  sourceUnitId,
  setSourceUnitId,
}: WorkspaceProps & {
  actorId: string;
  sourceUnitId: string;
  setSourceUnitId: (id: string) => void;
}) {
  const units = data.qualification.modules.flatMap((link) => link.module.studyUnits);
  const [unitId, setUnitId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [baseVersion, setBaseVersion] = useState<number>();
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const unit = units.find((row) => row.id === unitId);

  async function loadSession() {
    setLoadError("");
    if (!sessionId) return;
    setLoadingSession(true);
    try {
      const result = await studentRequest<{
        session: { title: string; markdown: string; version: number };
      }>(
        `/api/staff/workspace?qualificationId=${encodeURIComponent(qualificationId)}&sessionId=${encodeURIComponent(sessionId)}`,
      );
      setBaseVersion(result.session.version);
      setTitle(result.session.title);
      setMarkdown(result.session.markdown);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setLoadingSession(false);
    }
  }

  return (
    <div className={styles.grid}>
      <Panel title="Author a lesson">
        <ActionForm
          busy={busy || loadingSession}
          label="Save lesson draft"
          onAction={async () => {
            if (sessionId && baseVersion === undefined) {
              setLoadError("Load the published lesson before editing it.");
              return false;
            }
            const saved = await send({
              action: "saveLesson",
              studyUnitId: unitId,
              sessionId: sessionId || undefined,
              baseVersion,
              title,
              markdown,
            });
            if (saved) {
              setTitle("");
              setMarkdown("");
            }
            return saved;
          }}
        >
          <label>
            Study unit
            <select
              required
              disabled={loadingSession}
              value={unitId}
              onChange={(event) => {
                setUnitId(event.target.value);
                setSessionId("");
                setBaseVersion(undefined);
                setLoadError("");
                setTitle("");
                setMarkdown("");
              }}
            >
              <option value="">Choose a study unit</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session
            <select
              disabled={!unit || loadingSession}
              value={sessionId}
              onChange={(event) => {
                setSessionId(event.target.value);
                setBaseVersion(undefined);
                setLoadError("");
                setTitle("");
                setMarkdown("");
              }}
            >
              <option value="">Append a new session</option>
              {unit?.sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · v{item.version}
                </option>
              ))}
            </select>
          </label>
          {sessionId && (
            <button type="button" disabled={loadingSession} onClick={() => void loadSession()}>
              Load published lesson
            </button>
          )}
          {loadError && <p role="alert">{loadError}</p>}
          <label>
            Lesson title
            <input
              required
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Lesson Markdown
            <textarea
              required
              value={markdown}
              maxLength={24000}
              onChange={(event) => setMarkdown(event.target.value)}
            />
          </label>
        </ActionForm>
      </Panel>
      <Panel title="Review queue and releases">
        {!data.drafts.length && <p>Saved drafts and published revisions appear here.</p>}
        {data.drafts.map((draft) => (
          <details className={styles.entry} key={draft.id}>
            <summary>
              {draft.title} ·{" "}
              {draft.publishVersion ? `published v${draft.publishVersion}` : draft.status}
            </summary>
            {draft.reviewNote && <p>{draft.reviewNote}</p>}
            {draft.authorId === actorId && ["draft", "rejected"].includes(draft.status) ? (
              <ActionForm
                key={draft.updatedAt}
                label="Save changes"
                busy={busy}
                onAction={(form) =>
                  send({
                    action: "saveLesson",
                    draftId: draft.id,
                    studyUnitId: draft.studyUnitId,
                    expectedUpdatedAt: draft.updatedAt,
                    title: field(form, "title"),
                    markdown: field(form, "markdown"),
                  })
                }
              >
                <label>
                  Draft title
                  <input name="title" required defaultValue={draft.title} maxLength={160} />
                </label>
                <label>
                  Draft Markdown
                  <textarea
                    name="markdown"
                    required
                    defaultValue={draft.markdown}
                    maxLength={24000}
                  />
                </label>
              </ActionForm>
            ) : (
              <details>
                <summary>Preview lesson</summary>
                <Markdown text={draft.markdown} />
              </details>
            )}
            {draft.authorId === actorId && draft.status === "draft" && (
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void send({
                      action: "submitLesson",
                      draftId: draft.id,
                      expectedUpdatedAt: draft.updatedAt,
                    })
                  }
                >
                  Submit saved draft
                </button>
              </div>
            )}
            {draft.status === "submitted" &&
              draft.authorId !== actorId &&
              data.role === "admin" && (
                <ActionForm
                  busy={busy}
                  label="Save review decision"
                  onAction={(form) =>
                    send({
                      action: "reviewLesson",
                      draftId: draft.id,
                      decision: field(form, "decision"),
                      note: field(form, "note"),
                    })
                  }
                >
                  <label>
                    Review decision
                    <select name="decision">
                      <option value="reject">Return for changes</option>
                      <option value="publish">Publish reviewed lesson</option>
                    </select>
                  </label>
                  <label>
                    Review evidence
                    <textarea
                      name="note"
                      required
                      maxLength={2000}
                      placeholder="Record source, content, and answer-key checks."
                    />
                  </label>
                </ActionForm>
              )}
            {draft.previous &&
              typeof draft.previous === "object" &&
              "markdown" in draft.previous &&
              typeof draft.previous.markdown === "string" && (
                <details>
                  <summary>Previous published version</summary>
                  <Markdown text={draft.previous.markdown} />
                </details>
              )}
          </details>
        ))}
      </Panel>
      <Panel title="Source conversion review">
        <label>
          Inspect a study unit
          <select
            className={styles.selector}
            value={sourceUnitId}
            onChange={(event) => setSourceUnitId(event.target.value)}
          >
            <option value="">Choose a study unit</option>
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.title}
              </option>
            ))}
          </select>
        </label>
        {sourceUnitId && !data.sources.length && (
          <p>This unit has no structured conversions to review.</p>
        )}
        {data.sources.map((source) => {
          const parsed = structuredDocumentSchema.safeParse(source.structuredContent);
          const review = data.sourceReviews.find((row) => row.ingestionId === source.id);
          return (
            <details className={styles.entry} key={source.id}>
              <summary>
                {source.sourceName ?? "Source conversion"} · {review?.status ?? "awaiting review"}
              </summary>
              {parsed.success && (
                <>
                  <p>
                    Pages {parsed.data.source.pageStart}–{parsed.data.source.pageEnd} ·{" "}
                    {parsed.data.parser.review}
                  </p>
                  <a href={documentSourceUrl(parsed.data)} target="_blank" rel="noreferrer">
                    Compare original PDF
                  </a>
                  {parsed.data.blocks.map((block) =>
                    block.type === "markdown" ? (
                      <Markdown key={block.id} text={block.markdown} />
                    ) : (
                      <p key={block.id}>{block.caption}</p>
                    ),
                  )}
                </>
              )}
              <ActionForm
                key={review?.updatedAt}
                busy={busy}
                label="Record source review"
                onAction={(form) =>
                  send({
                    action: "reviewSource",
                    ingestionId: source.id,
                    status: field(form, "status"),
                    note: field(form, "note"),
                  })
                }
              >
                <label>
                  Disposition
                  <select name="status" defaultValue={review?.status ?? "held"}>
                    <option value="held">Hold for correction</option>
                    <option value="compared">Compared with source</option>
                  </select>
                </label>
                <label>
                  Source review notes
                  <textarea name="note" defaultValue={review?.note} required maxLength={2000} />
                </label>
              </ActionForm>
            </details>
          );
        })}
      </Panel>
    </div>
  );
}
