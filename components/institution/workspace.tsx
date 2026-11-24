"use client";
import Link from "next/link";
import { useState } from "react";
import { studentRequest, useStudentResource } from "../../lib/student/client";
import type { institutionWorkspace } from "../../lib/institution/workspace";
import { institutionPermissions } from "../../lib/institution/input";
import { ActionForm, Panel, field, type Json } from "../teaching/shared";
import styles from "../teaching/workspace.module.css";

type Workspace = Json<Awaited<ReturnType<typeof institutionWorkspace>>>;
type Section = (typeof institutionPermissions)[number];
type Report = { ownerId: string; scopes: Workspace["scope"][]; workspace?: Workspace };
const label: Record<Section, string> = {
  curriculum: "Curriculum",
  directory: "People",
  reports: "Reporting",
  access: "Permissions",
  integrations: "Integrations",
};

export function InstitutionWorkspace() {
  const list = useStudentResource<Report>("/api/institution");
  const [chosen, setInstitution] = useState("");
  const [tab, setTab] = useState<Section | "">("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const institution = chosen || list.data?.scopes[0]?.institution || "";
  const query = new URLSearchParams({ institution, q: filter });
  const resource = useStudentResource<Report>(institution ? "/api/institution?" + query : null);
  const data = resource.data?.ownerId === resource.userId ? resource.data?.workspace : undefined;

  async function send(input: Record<string, unknown>) {
    if (busy || !data) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await studentRequest("/api/institution", "POST", { ...input, institution });
      setNotice("Changes saved.");
      resource.reload();
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <p role={resource.error || list.error ? "alert" : "status"}>
        {resource.error || list.error || "Loading institution workspace…"}
      </p>
    );
  const sections = institutionPermissions.filter(
    (permission) => data.scope.owner || data.scope.permissions.includes(permission),
  );
  const active = sections.find((section) => section === tab) ?? sections[0];
  return (
    <div className={styles.workspace}>
      <Panel title="Institution">
        <label>
          Manage institution
          <select
            value={institution}
            disabled={busy}
            onChange={(event) => {
              setInstitution(event.target.value);
              setTab("");
              setFilter("");
              setNotice("");
              setError("");
            }}
          >
            {list.data?.scopes.map((scope) => (
              <option key={scope.institution}>{scope.institution}</option>
            ))}
          </select>
        </label>
      </Panel>
      <nav className="vela-switcher" aria-label="Institution sections">
        {sections.map((section) => (
          <button
            type="button"
            key={section}
            aria-pressed={active === section}
            onClick={() => setTab(section)}
          >
            {label[section]}
          </button>
        ))}
      </nav>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {active === "curriculum" && <Curriculum {...{ data, busy, send }} />}
      {(active === "directory" || active === "access") && (
        <Panel
          title={
            active === "access" ? "Delegated institution permissions" : "Institution directory"
          }
        >
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              setFilter(field(new FormData(event.currentTarget), "search"));
            }}
          >
            <label>
              Find an account
              <input
                name="search"
                type="search"
                maxLength={80}
                defaultValue={filter}
                placeholder="Name or email"
              />
            </label>
            <button type="submit">Search accounts</button>
          </form>
          {!data.directory.length && <p>No accounts match this search.</p>}
          {data.directory.map((person) => {
            const member = data.members.find((entry) => entry.studentId === person.id);
            const enrollments = data.enrollments.filter((entry) => entry.studentId === person.id);
            return (
              <details key={person.id} className={styles.entry}>
                <summary>
                  {person.name} · {person.email}
                </summary>
                <p>{person.verified ? "Email verified" : "Email unverified"}</p>
                {active === "access" ? (
                  member?.owner ? (
                    <p>Institution owner</p>
                  ) : data.scope.owner ? (
                    <ActionForm
                      busy={busy}
                      label="Save permissions"
                      onAction={(form) =>
                        send({
                          action: "setPermissions",
                          studentId: person.id,
                          permissions: form.getAll("permissions"),
                        })
                      }
                    >
                      <fieldset>
                        <legend>Institution permissions</legend>
                        {institutionPermissions.map((permission) => (
                          <label key={permission}>
                            <span>
                              <input
                                name="permissions"
                                type="checkbox"
                                value={permission}
                                defaultChecked={member?.permissions.includes(permission)}
                              />{" "}
                              {label[permission]}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    </ActionForm>
                  ) : (
                    <p>
                      {member?.permissions.map((permission) => label[permission]).join(", ") ||
                        "No institution permissions"}
                    </p>
                  )
                ) : enrollments.length ? (
                  enrollments.map((entry) => (
                    <ActionForm
                      key={entry.id + entry.status}
                      busy={busy}
                      label="Update enrolment"
                      onAction={(form) =>
                        send({
                          action: "setEnrollment",
                          enrollmentId: entry.id,
                          status: field(form, "status"),
                        })
                      }
                    >
                      <label>
                        {entry.qualificationModule.qualification.code} ·{" "}
                        {entry.qualificationModule.module.code}
                        <select name="status" defaultValue={entry.status}>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                      </label>
                    </ActionForm>
                  ))
                ) : (
                  <p>No recent enrolments.</p>
                )}
              </details>
            );
          })}
          {active === "directory" && (
            <p>
              Showing up to 100 accounts and the latest 200 enrolments. Use qualification
              invitations in the <Link href="/staff">teaching workspace</Link> if you also have
              qualification access.
            </p>
          )}
        </Panel>
      )}
      {active === "access" && (
        <Panel title="Institution audit history">
          {!data.audit.length && <p>Changes to this institution will appear here.</p>}
          <ul>
            {data.audit.map((entry) => (
              <li key={entry.id}>
                {entry.action.replace(/([a-z])([A-Z])/g, "$1 $2")} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {active === "reports" && (
        <Panel title="Enrolment report">
          <a href={"/api/institution?" + new URLSearchParams({ institution, export: "report" })}>
            Download CSV
          </a>
          {!data.reports.length && <p>No qualifications to report.</p>}
          {data.reports.map((report) => (
            <article className={styles.entry} key={report.qualification}>
              <h3>
                {report.qualification} · {report.title}
              </h3>
              <p>
                {report.modules} modules · {report.active} active · {report.completed} completed ·{" "}
                {report.withdrawn} withdrawn
              </p>
            </article>
          ))}
        </Panel>
      )}
      {active === "integrations" && (
        <Panel title="Sign-in and delivery">
          <dl>
            <dt>Email delivery</dt>
            <dd>{data.emailDelivery}</dd>
            <dt>AI provider</dt>
            <dd>{data.aiProvider ?? "Configuration needed"}</dd>
          </dl>
          <p>
            Provider credentials are held in Neon Auth. Enable an already configured provider to
            offer institution sign-in.
          </p>
          <ActionForm
            busy={busy}
            label="Save sign-in settings"
            onAction={(form) =>
              send({
                action: "setSso",
                provider: field(form, "provider"),
                enabled: form.has("enabled"),
              })
            }
          >
            <label>
              Sign-in provider
              <select name="provider" defaultValue={data.integrations?.ssoProvider ?? "google"}>
                {data.providerOptions.map((option) => (
                  <option key={option.provider} value={option.provider}>
                    {option.provider === "google" ? "Google Workspace" : "Microsoft Entra ID"} ·{" "}
                    {option.available ? "configured" : "configuration needed"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={data.integrations?.ssoEnabled}
                />{" "}
                Offer institution sign-in
              </span>
            </label>
          </ActionForm>
          {data.integrations?.ssoEnabled && (
            <Link href={"/auth/institution?institution=" + encodeURIComponent(institution)}>
              Open institution sign-in
            </Link>
          )}
        </Panel>
      )}
    </div>
  );
}

function Curriculum({
  data,
  busy,
  send,
}: {
  data: Workspace;
  busy: boolean;
  send: (input: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <div className={styles.grid}>
      <Panel title="Create a qualification">
        <ActionForm
          reset
          busy={busy}
          label="Create qualification"
          onAction={(form) =>
            send({
              action: "createQualification",
              code: field(form, "code"),
              title: field(form, "title"),
              stream: field(form, "stream"),
              streamTitle: field(form, "streamTitle"),
              saqaId: field(form, "saqa"),
              nqfExitLevel: Number(field(form, "level")),
            })
          }
        >
          <label>
            Qualification code
            <input name="code" required maxLength={32} />
          </label>
          <label>
            Qualification title
            <input name="title" required maxLength={160} />
          </label>
          <label>
            Stream code
            <input name="stream" required maxLength={32} />
          </label>
          <label>
            Stream title
            <input name="streamTitle" required maxLength={160} />
          </label>
          <label>
            SAQA ID
            <input name="saqa" inputMode="numeric" pattern="[0-9]+" required maxLength={15} />
          </label>
          <label>
            NQF exit level
            <input name="level" type="number" min={1} max={10} defaultValue={7} required />
          </label>
        </ActionForm>
      </Panel>
      <Panel title="Qualifications and modules">
        <p>
          Archiving closes new enrolments and preserves access for existing learners. New
          qualifications start closed to self-enrolment.
        </p>
        {data.curriculum.map((qualification) => (
          <details key={qualification.id} className={styles.entry}>
            <summary>
              {qualification.code} · {qualification.stream} · {qualification.title}
              {qualification.archivedAt ? " · Archived" : ""}
            </summary>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void send({
                  action: "archiveQualification",
                  qualificationId: qualification.id,
                  archived: !qualification.archivedAt,
                })
              }
            >
              {qualification.archivedAt ? "Restore qualification" : "Archive qualification"}
            </button>
            <ul>
              {qualification.modules.map((link) => (
                <li key={link.module.id} className={styles.entry}>
                  <p>
                    {link.module.code} · {link.module.title} · Year {link.studyYear}
                    {link.archivedAt ? " · Archived" : ""}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "archiveModule",
                        qualificationId: qualification.id,
                        moduleId: link.module.id,
                        archived: !link.archivedAt,
                      })
                    }
                  >
                    {link.archivedAt ? "Restore module" : "Archive module"}
                  </button>
                </li>
              ))}
            </ul>
            {!qualification.archivedAt && (
              <ActionForm
                reset
                busy={busy}
                label="Add module"
                onAction={(form) =>
                  send({
                    action: "addModule",
                    qualificationId: qualification.id,
                    code: field(form, "code"),
                    title: field(form, "title"),
                    studyYear: Number(field(form, "year")),
                  })
                }
              >
                <label>
                  Module code
                  <input name="code" required maxLength={32} />
                </label>
                <label>
                  Module title
                  <input name="title" required maxLength={160} />
                </label>
                <label>
                  Study year
                  <input name="year" type="number" min={1} max={15} defaultValue={1} required />
                </label>
              </ActionForm>
            )}
          </details>
        ))}
      </Panel>
    </div>
  );
}
