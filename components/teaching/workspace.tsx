"use client";
import { useState } from "react";
import { studentRequest, useStudentResource } from "../../lib/student/client";
import type { teachingWorkspace } from "../../lib/teaching/read";
import { StaffAnalytics } from "../staff-analytics";
import { AdminTools } from "./admin-tools";
import { ClassroomTools } from "./classroom-tools";
import { ContentTools } from "./content-tools";
import { Panel, type Json } from "./shared";
import styles from "./workspace.module.css";

type Report = Json<Awaited<ReturnType<typeof teachingWorkspace>>>;

export function TeachingWorkspace() {
  const list = useStudentResource<Report>("/api/staff/workspace");
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"overview" | "content" | "classroom" | "admin">("overview");
  const [assignmentId, setAssignmentId] = useState("");
  const [sourceUnitId, setSourceUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [invitation, setInvitation] = useState("");
  const qualificationId = selected || list.data?.scopes[0]?.qualificationId || "";
  const query = new URLSearchParams({ qualificationId });
  if (tab === "classroom" && assignmentId) query.set("assignmentId", assignmentId);
  if (tab === "content" && sourceUnitId) query.set("sourceUnitId", sourceUnitId);
  const resource = useStudentResource<Report>(
    qualificationId ? `/api/staff/workspace?${query}` : null,
  );
  const data = resource.data?.ownerId === resource.userId ? resource.data?.workspace : null;

  async function send(input: Record<string, unknown>) {
    if (busy || !data) return false;
    setBusy(true);
    setFailed(false);
    setMessage("");
    setInvitation("");
    try {
      const result = await studentRequest<{ inviteToken?: string }>(
        "/api/staff/workspace",
        "POST",
        { ...input, qualificationId },
      );
      if (result.inviteToken)
        setInvitation(`${window.location.origin}/classroom/invitation#${result.inviteToken}`);
      setMessage("Saved.");
      resource.reload();
      list.reload();
      return true;
    } catch (e) {
      setFailed(true);
      setMessage((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (list.error) return <p role="alert">{list.error}</p>;
  if (!list.data) return <p role="status">Loading your qualifications…</p>;
  if (!list.data.scopes.length) return <p>No staff qualifications are assigned to this account.</p>;

  return (
    <div className={styles.workspace}>
      <Panel title="Teaching scope">
        <label>
          Qualification
          <select
            className={styles.selector}
            value={qualificationId}
            disabled={busy}
            onChange={(event) => {
              setSelected(event.target.value);
              setAssignmentId("");
              setSourceUnitId("");
              setTab("overview");
              setInvitation("");
              setMessage("");
            }}
          >
            {list.data.scopes.map((scope) => (
              <option value={scope.qualificationId} key={scope.qualificationId}>
                {scope.qualification.institution} · {scope.qualification.code} ·{" "}
                {scope.role === "admin" ? "Administrator" : "Instructor"}
              </option>
            ))}
          </select>
        </label>
      </Panel>
      {resource.error && <p role="alert">{resource.error}</p>}
      {!data && !resource.error && <p role="status">Loading the teaching workspace…</p>}
      {data && (
        <>
          <nav className="vela-switcher" aria-label="Teaching workspace sections">
            <button
              type="button"
              aria-pressed={tab === "overview"}
              onClick={() => setTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              aria-pressed={tab === "content"}
              onClick={() => setTab("content")}
            >
              Lessons and sources
            </button>
            <button
              type="button"
              aria-pressed={tab === "classroom"}
              onClick={() => setTab("classroom")}
            >
              Classroom
            </button>
            {data.role === "admin" && (
              <button type="button" aria-pressed={tab === "admin"} onClick={() => setTab("admin")}>
                Administration
              </button>
            )}
          </nav>
          <p role={failed ? "alert" : "status"}>{busy ? "Saving…" : message}</p>
          {invitation && (
            <Panel title="Invitation ready">
              <p>
                Share this link privately with the invitee. They’ll need to verify the invited email
                to accept.
              </p>
              <label>
                Invitation link
                <input
                  className={styles.selector}
                  readOnly
                  value={invitation}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invitation);
                      setMessage("Invitation link copied.");
                    } catch {
                      setMessage("Select the invitation link and copy it.");
                    }
                  }}
                >
                  Copy invitation link
                </button>
              </div>
            </Panel>
          )}
          {tab === "overview" && (
            <>
              <div className={styles.grid}>
                <Panel title="Lessons awaiting review">
                  <p>
                    {data.drafts.filter((draft) => draft.status === "submitted").length} in the
                    recent review queue
                  </p>
                </Panel>
                <Panel title="Assignments">
                  <p>
                    {data.assignments.length} recent assignments ·{" "}
                    {data.assignments.reduce(
                      (total, assignment) => total + assignment._count.submissions,
                      0,
                    )}{" "}
                    submissions
                  </p>
                </Panel>
                <Panel title="Reporting">
                  <a
                    href={`/api/staff/workspace?qualificationId=${encodeURIComponent(qualificationId)}&export=modules`}
                  >
                    Download module report (CSV)
                  </a>
                </Panel>
              </div>
              <StaffAnalytics />
            </>
          )}
          {tab === "content" && (
            <ContentTools
              key={qualificationId}
              actorId={resource.userId ?? ""}
              {...{ data, qualificationId, busy, send, sourceUnitId, setSourceUnitId }}
            />
          )}
          {tab === "classroom" && (
            <ClassroomTools
              key={qualificationId}
              {...{ data, qualificationId, busy, send, assignmentId, setAssignmentId }}
            />
          )}
          {tab === "admin" && data.role === "admin" && (
            <AdminTools key={qualificationId} {...{ data, qualificationId, busy, send }} />
          )}
        </>
      )}
    </div>
  );
}
