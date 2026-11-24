"use client";

import { useState, type FormEvent } from "react";
import { useStudentResource, studentRequest } from "../../lib/student/client";
import { editableSections } from "../../lib/content/factory-sections";
import type { ModuleCapabilities } from "../../lib/capabilities";
import type { editorDetails } from "../../lib/content/editorial";
import { ModuleCapabilitiesProvider } from "../module-capabilities";
import { ExerciseMarkdown } from "../exercise-markdown";
import { Markdown } from "../markdown";
import { ActionForm, Panel, field, type Json } from "./shared";
import styles from "./workspace.module.css";
import editorial from "./editorial.module.css";

type Unit = { id: string; code: string; title: string };
type Scope = {
  qualificationId: string;
  qualification: {
    institution: string;
    code: string;
    title: string;
    modules: { module: { code: string; title: string; studyUnits: Unit[] } }[];
  };
};
type Data = Json<Awaited<ReturnType<typeof editorDetails>>> & {
  ownerId: string;
  capabilities: ModuleCapabilities;
};
type Draft = NonNullable<Data["draft"]>;
type Send = <T extends { markdown?: string; ids?: string[] }>(
  input: Record<string, unknown>,
) => Promise<T | null>;

export function EditorialWorkspace({ initialModule }: { initialModule?: string }) {
  const list = useStudentResource<{ ownerId: string; scopes: Scope[] }>("/api/staff/editorial");
  const [qualificationId, setQualificationId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [selection, setSelection] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scopes = list.data?.ownerId === list.userId ? (list.data?.scopes ?? []) : [];
  const relevant = scopes.filter(
    (scope) =>
      !initialModule ||
      scope.qualification.modules.some((link) => link.module.code === initialModule),
  );
  const qualified = qualificationId || relevant[0]?.qualificationId || "";
  const units =
    relevant
      .find((scope) => scope.qualificationId === qualified)
      ?.qualification.modules.filter((link) => !initialModule || link.module.code === initialModule)
      .flatMap((link) => link.module.studyUnits) ?? [];
  const currentUnit = unitId || units[0]?.id || "";
  const query = new URLSearchParams({
    qualificationId: qualified,
    studyUnitId: currentUnit,
    draftId: selection,
  });
  const resource = useStudentResource<Data>(
    qualified && currentUnit ? "/api/staff/editorial?" + query : null,
  );
  const data = resource.data?.ownerId === resource.userId ? resource.data : null;

  async function send<T extends { markdown?: string; ids?: string[] }>(
    input: Record<string, unknown>,
  ) {
    if (busy || !data) return null;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await studentRequest<T>("/api/staff/editorial", "POST", {
        ...input,
        qualificationId: qualified,
        studyUnitId: currentUnit,
      });
      if (input.action !== "regenerate") {
        setMessage(
          input.action === "approve"
            ? "Approval recorded. This revision is ready for release staging."
            : "Saved.",
        );
        resource.reload();
      }
      return result;
    } catch (failure) {
      setError((failure as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function importDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("artifact");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_750_000) {
      setError("Choose a factory artifact JSON file under 1.75 MB.");
      return;
    }
    let artifact: unknown;
    try {
      artifact = JSON.parse(await file.text());
    } catch {
      setError("The file is not valid JSON.");
      return;
    }
    const result = await send({ action: "import", artifact });
    if (result?.ids?.[0]) {
      setSelection(result.ids[0]);
      form.reset();
    }
  }

  if (list.error) return <p role="alert">{list.error}</p>;
  if (list.loading) return <p role="status">Loading qualifications…</p>;
  if (!relevant.length) return <p>No editorial access is assigned for this module.</p>;

  return (
    <div className={styles.workspace}>
      <Panel title="Review queue">
        <div className={editorial.selectors}>
          <label>
            Qualification
            <select
              disabled={busy}
              value={qualified}
              onChange={(event) => {
                setQualificationId(event.target.value);
                setUnitId("");
                setSelection("");
              }}
            >
              {relevant.map((scope) => (
                <option key={scope.qualificationId} value={scope.qualificationId}>
                  {scope.qualification.institution} · {scope.qualification.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Study unit
            <select
              disabled={busy || !units.length}
              value={currentUnit}
              onChange={(event) => {
                setUnitId(event.target.value);
                setSelection("");
              }}
            >
              {!units.length && <option value="">No study units</option>}
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} · {unit.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Draft
            <select
              disabled={busy || !data?.drafts.length}
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">Select a draft</option>
              {data?.drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title} · {draft.status === "submitted" ? "staged" : draft.status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details>
          <summary>Import a generated artifact</summary>
          <form className={styles.form} onSubmit={importDraft}>
            <label>
              Factory session JSON
              <input name="artifact" type="file" accept=".json,application/json" required />
            </label>
            <button disabled={busy || !data}>Import for review</button>
          </form>
        </details>
        {busy && <p role="status">Working…</p>}
        {message && <p role="status">{message}</p>}
        {(resource.error || error) && <p role="alert">{resource.error || error}</p>}
      </Panel>
      {data?.draft && (
        <DraftEditor
          key={data.draft.id + data.draft.updatedAt}
          {...{ data, draft: data.draft, busy, send, actorId: resource.userId }}
        />
      )}
    </div>
  );
}

function DraftEditor({
  data,
  draft,
  busy,
  send,
  actorId,
}: {
  data: Data;
  draft: Draft;
  busy: boolean;
  send: Send;
  actorId?: string;
}) {
  const [source, setSource] = useState("");
  const [title, setTitle] = useState(draft.title);
  const [markdown, setMarkdown] = useState(draft.markdown);
  const [suggestion, setSuggestion] = useState(false);
  const selected = data.sources.find((item) => item.evidenceHash === source) ?? data.sources[0];
  const author = draft.authorId === actorId;
  const editable = author && (draft.status === "draft" || draft.status === "rejected");
  const clean = title === draft.title && markdown === draft.markdown;
  const revision = { draftId: draft.id, expectedUpdatedAt: draft.updatedAt };

  return (
    <ModuleCapabilitiesProvider capabilities={data.capabilities}>
      <div className={editorial.panes}>
        <Panel title="Source evidence">
          {data.missingEvidence ? (
            <p role="alert">{data.missingEvidence} locked evidence ranges are unavailable.</p>
          ) : null}
          {!!data.exclusions?.length && (
            <details>
              <summary>Excluded pages ({data.exclusions.length})</summary>
              <ul>
                {data.exclusions.map((item) => (
                  <li key={item.sourceId + ":" + item.first}>
                    {item.sourceId} · {item.first}–{item.last} · {item.note}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {selected ? (
            <>
              <label>
                Source and physical pages
                <select
                  value={selected.evidenceHash}
                  onChange={(event) => setSource(event.target.value)}
                >
                  {data.sources.map((item) => (
                    <option key={item.evidenceHash} value={item.evidenceHash}>
                      {item.sourceId} · {item.first}–{item.last}
                    </option>
                  ))}
                </select>
              </label>
              {selected.url ? (
                <>
                  <a href={selected.url} target="_blank" rel="noreferrer">
                    Open original PDF
                  </a>
                  <iframe
                    className={editorial.pdf}
                    src={selected.url}
                    title={"Source PDF pages " + selected.first + "–" + selected.last}
                    loading="lazy"
                  />
                </>
              ) : (
                <p>
                  Open the locked PDF in your local evidence store to compare the original page.
                </p>
              )}
              <p className={editorial.hash}>
                Edition SHA-256 <code>{selected.sha256}</code>
              </p>
              <details open>
                <summary>Reviewed source transcription</summary>
                <Markdown text={selected.reading} />
              </details>
            </>
          ) : (
            <p>No matching reviewed source pages.</p>
          )}
        </Panel>
        <Panel title="Vela lesson preview">
          <h3>{title}</h3>
          {draft.reviewNote && <p>{draft.reviewNote}</p>}
          <ExerciseMarkdown text={markdown} />
          {editable && (
            <>
              <details open={suggestion || undefined}>
                <summary>Edit Markdown</summary>
                {suggestion && <p role="status">Review the regenerated text before saving it.</p>}
                <ActionForm
                  busy={busy}
                  label="Save draft"
                  onAction={async () =>
                    !!(await send({ action: "edit", ...revision, title, markdown }))
                  }
                >
                  <label>
                    Lesson title
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Lesson Markdown
                    <textarea
                      value={markdown}
                      onChange={(event) => setMarkdown(event.target.value)}
                      rows={16}
                      required
                      maxLength={24000}
                    />
                  </label>
                </ActionForm>
              </details>
              <details>
                <summary>Regenerate a section</summary>
                {!clean && <p>Save your current edits before regenerating.</p>}
                <ActionForm
                  busy={busy || !clean}
                  label="Regenerate section"
                  onAction={async (form) => {
                    const result = await send({
                      action: "regenerate",
                      ...revision,
                      section: field(form, "section"),
                      guidance: field(form, "guidance"),
                    });
                    if (!result?.markdown) return false;
                    setMarkdown(result.markdown);
                    setSuggestion(true);
                    return true;
                  }}
                >
                  <label>
                    Section
                    <select name="section">
                      {editableSections.map((section) => (
                        <option key={section}>{section}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reviewer guidance
                    <textarea name="guidance" required minLength={5} maxLength={500} />
                  </label>
                </ActionForm>
              </details>
              <button
                type="button"
                disabled={busy || !clean}
                onClick={() => void send({ action: "stage", ...revision })}
              >
                Stage saved draft for approval
              </button>
            </>
          )}
          {draft.status === "submitted" && data.role === "admin" && !author && (
            <details open>
              <summary>Sign off on staged draft</summary>
              <ActionForm
                busy={busy}
                label="Approve revision"
                onAction={async (form) => {
                  return !!(await send({
                    action: "approve",
                    ...revision,
                    note: field(form, "note"),
                    sourceCompared: form.has("compared"),
                    verifiedExamples: form.has("examples"),
                  }));
                }}
              >
                <label>
                  <span>
                    <input type="checkbox" name="compared" required /> I compared the exact source
                    edition and page ranges.
                  </span>
                </label>
                <label>
                  <span>
                    <input type="checkbox" name="examples" required /> I independently checked the
                    examples and worked solutions.
                  </span>
                </label>
                <label>
                  Review evidence
                  <textarea name="note" minLength={25} maxLength={2000} required />
                </label>
              </ActionForm>
              <ActionForm
                busy={busy}
                label="Return for changes"
                onAction={async (form) =>
                  !!(await send({
                    action: "return",
                    ...revision,
                    note: field(form, "note"),
                  }))
                }
              >
                <label>
                  Corrections or misconceptions to address
                  <textarea name="note" minLength={25} maxLength={2000} required />
                </label>
              </ActionForm>
            </details>
          )}
        </Panel>
      </div>
    </ModuleCapabilitiesProvider>
  );
}
