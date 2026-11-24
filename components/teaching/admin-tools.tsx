"use client";
import { useState } from "react";
import { ActionForm, ModuleOptions, Panel, field, person, type WorkspaceProps } from "./shared";
import styles from "./workspace.module.css";

export function AdminTools({ data, busy, send }: WorkspaceProps) {
  const [inviteRole, setInviteRole] = useState<"staff" | "student">("staff");
  const settings = data.qualification.teachingSettings;
  return (
    <div className={styles.grid}>
      <Panel title="Qualification settings">
        <ActionForm
          busy={busy}
          label="Save qualification settings"
          onAction={(form) =>
            send({
              action: "settings",
              displayName: field(form, "name"),
              supportEmail: field(form, "email"),
              allowSelfEnrollment: form.has("selfEnroll"),
            })
          }
        >
          <label>
            Display name
            <input
              name="name"
              required
              defaultValue={settings?.displayName ?? data.qualification.title}
            />
          </label>
          <label>
            Support email
            <input type="email" name="email" required defaultValue={settings?.supportEmail ?? ""} />
          </label>
          <label>
            <span>
              <input
                name="selfEnroll"
                type="checkbox"
                defaultChecked={settings?.allowSelfEnrollment ?? true}
              />{" "}
              Allow self-enrolment
            </span>
          </label>
        </ActionForm>
        <h3>Module enrolment</h3>
        {data.qualification.modules.map((link) => (
          <div className={styles.entry} key={link.module.id}>
            <p>
              {link.module.code} · {link.acceptingEnrollments ? "Open" : "Closed"}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void send({
                    action: "moduleAccess",
                    moduleId: link.module.id,
                    acceptingEnrollments: !link.acceptingEnrollments,
                  })
                }
              >
                {link.acceptingEnrollments ? "Close self-enrolment" : "Open self-enrolment"}
              </button>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="Invite users">
        <ActionForm
          busy={busy}
          reset
          label="Create invitation link"
          onAction={(form) =>
            send({
              action: "invite",
              email: field(form, "email"),
              role: inviteRole,
              moduleId: inviteRole === "student" ? field(form, "moduleId") : undefined,
            })
          }
        >
          <label>
            Invite email
            <input name="email" required type="email" />
          </label>
          <label>
            Invitation role
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value === "staff" ? "staff" : "student")
              }
            >
              <option value="staff">Instructor</option>
              <option value="student">Learner</option>
            </select>
          </label>
          {inviteRole === "student" && (
            <label>
              Invited module
              <select name="moduleId" required>
                <ModuleOptions data={data} />
              </select>
            </label>
          )}
        </ActionForm>
        {data.invitations.map((item) => (
          <div className={styles.entry} key={item.id}>
            <p>
              {item.email} · {item.role} ·{" "}
              {item.usedAt
                ? "accepted"
                : item.revokedAt
                  ? "revoked"
                  : new Date(item.expiresAt) < new Date()
                    ? "expired"
                    : `expires ${new Date(item.expiresAt).toLocaleDateString()}`}
            </p>
            {!item.usedAt && !item.revokedAt && new Date(item.expiresAt) >= new Date() && (
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: "revokeInvite", inviteId: item.id })}
                >
                  Revoke invitation
                </button>
              </div>
            )}
          </div>
        ))}
      </Panel>
      <Panel title="Staff access">
        {data.members.map((member) => (
          <ActionForm
            key={member.studentId + member.role}
            busy={busy}
            label="Update access"
            onAction={(form) =>
              send({
                action: "membership",
                studentId: member.studentId,
                role: field(form, "role"),
              })
            }
          >
            <label>
              {member.profile.displayName ?? member.studentId}
              <select name="role" defaultValue={member.role}>
                <option value="staff">Instructor</option>
                <option value="admin">Qualification administrator</option>
                <option value="remove">Remove qualification access</option>
              </select>
            </label>
          </ActionForm>
        ))}
      </Panel>
      <Panel title="Learner enrolments">
        <p>Showing the latest 300 enrolments in this qualification.</p>
        {data.enrollments.map((entry) => (
          <ActionForm
            key={entry.id + entry.status}
            busy={busy}
            label="Update enrolment"
            onAction={(form) =>
              send({
                action: "enrollmentStatus",
                enrollmentId: entry.id,
                status: field(form, "status"),
              })
            }
          >
            <label>
              {person(data, entry.studentId)} ·{" "}
              {
                data.qualification.modules.find((link) => link.module.id === entry.moduleId)?.module
                  .code
              }
              <select name="status" defaultValue={entry.status}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </label>
          </ActionForm>
        ))}
      </Panel>
      <Panel title="Audit history">
        <p>Latest 50 actions in this qualification.</p>
        <ul>
          {data.audit.map((entry) => (
            <li className={styles.entry} key={entry.id}>
              <strong>{entry.action.replace(/([a-z])([A-Z])/g, "$1 $2")}</strong> ·{" "}
              {new Date(entry.createdAt).toLocaleString()}
              <br />
              <small>
                By{" "}
                {data.members.find((person) => person.studentId === entry.actorId)?.profile
                  .displayName ?? entry.actorId}{" "}
                · {entry.targetId}
              </small>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
