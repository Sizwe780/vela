"use client";
import { useState } from "react";
import { studentRequest, useStudentResource } from "../lib/student/client";
type Plan = {
  ownerId: string;
  policyVersion: string;
  counts: Record<string, number>;
  holds: { id: string; scope: string; targetId: string | null; reason: string }[];
  deletionRequests: {
    id: string;
    studentId: string | null;
    deadline: string;
    overdue: boolean;
    held: boolean;
  }[];
  inactivityCandidates: { studentId: string; lastRecordedAt: string }[];
  providerLogs: string;
};
export function RetentionPanel() {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const resource = useStudentResource<Plan>(open ? "/api/support/retention" : null);
  const data = resource.data?.ownerId === resource.userId ? resource.data : null;
  return (
    <details className="profile-learning-settings" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Retention review and legal holds</summary>
      <p>
        Preview only. No cleanup runs from this screen. Applying a bounded cleanup requires the
        operator runner or an explicitly enabled scheduled job.
      </p>
      {resource.error && <p role="alert">{resource.error}</p>}
      {data && (
        <>
          <p>Policy {data.policyVersion}</p>
          <dl>
            {Object.entries(data.counts).map(([key, count]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{count} eligible in this batch</dd>
              </div>
            ))}
          </dl>
          <h3>Deletion targets</h3>
          {data.deletionRequests.map((r) => (
            <p key={r.id}>
              {r.id} · account {r.studentId} · target {new Date(r.deadline).toLocaleDateString()} ·{" "}
              {r.held ? "On hold" : r.overdue ? "Overdue — review now" : "Pending review"}
            </p>
          ))}
          <h3>Inactivity review</h3>
          <p>
            {data.inactivityCandidates.length} accounts have no recent recorded study activity in
            the review window. Check authentication and other activity before sending a notice. Do
            not close an account without the required 30-day notice.
          </p>
          <p>{data.providerLogs}</p>
          <h3>Active holds</h3>
          {data.holds.map((h) => (
            <article key={h.id}>
              <strong>
                {h.scope} · {h.targetId ?? "Entire scope"}
              </strong>
              <p>{h.reason}</p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      "Release this retention hold? Eligible records may then be removed by maintenance.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await studentRequest("/api/support/retention", "POST", {
                      action: "release",
                      id: h.id,
                    });
                    resource.reload();
                    setNotice("Hold released.");
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : "Please retry.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Release hold
              </button>
            </article>
          ))}
          <form
            className="guest-contact-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              const form = e.currentTarget,
                f = new FormData(form);
              try {
                await studentRequest("/api/support/retention", "POST", {
                  action: "hold",
                  scope: f.get("scope"),
                  targetId: String(f.get("target") ?? "").trim() || null,
                  reason: f.get("reason"),
                  expiresAt: null,
                });
                form.reset();
                resource.reload();
                setNotice("Hold saved. It stays active until explicitly released.");
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Please retry.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Hold scope
              <select name="scope">
                <option value="account">Account records</option>
                <option value="support">Support request</option>
                <option value="moderation">Moderation post</option>
                <option value="delivery">Email delivery</option>
                <option value="security">Maintenance audit</option>
                <option value="all">All categories</option>
              </select>
            </label>
            <label>
              Account ID or record reference (blank holds the entire scope)
              <input name="target" maxLength={100} pattern="[a-zA-Z0-9_-]+" />
            </label>
            <label>
              Reason
              <textarea name="reason" minLength={10} maxLength={500} required />
            </label>
            <button disabled={busy} type="submit">
              Save hold
            </button>
          </form>
        </>
      )}
      <p role="status">{notice}</p>
    </details>
  );
}
