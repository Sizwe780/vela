"use client";
import { useState } from "react";
import { studentNavUpdate, studentRequest, useStudentResource } from "../../lib/student/client";
import { rubricPoints, type Rubric } from "../../lib/teaching/input";
import type { learnerClassroom } from "../../lib/teaching/read";
import Link from "next/link";
import { Markdown } from "../markdown";
import { ActionForm, Panel, field, type Json } from "./shared";
import styles from "./workspace.module.css";

export function LearnerClassroom() {
  const resource =
    useStudentResource<Json<Awaited<ReturnType<typeof learnerClassroom>>>>("/api/classroom");
  const [busy, setBusy] = useState("");
  const [invitation, setInvitation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const data = resource.data?.ownerId === resource.userId ? resource.data : null;
  if (!data)
    return (
      <p role={resource.error ? "alert" : "status"}>
        {resource.error || "Loading your classroom…"}
      </p>
    );
  return (
    <div className={styles.workspace}>
      <p role={error ? "alert" : "status"}>{message}</p>
      {!data.assignments.length && !data.announcements.length && (
        <section className="classroom-welcome">
          <span className="eyebrow">LEARNING WITH AN INSTRUCTOR</span>
          <h2>Your class, when you need one.</h2>
          <p>
            Classroom brings instructor assignments, deadlines and feedback together. Independent
            learners can use every enrolled lesson and practice tool without joining a class.
          </p>
          <div className="classroom-preview" aria-label="What Classroom offers">
            <article>
              <span>01</span>
              <h3>Upcoming work</h3>
              <p>Assignments with clear deadlines and rubrics.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Useful feedback</h3>
              <p>Read your instructor’s comments alongside your submission.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Stay connected</h3>
              <p>Keep course announcements in one place.</p>
            </article>
          </div>
          <p>Have an invitation? Paste the complete link shared by your instructor.</p>
          <form
            className="classroom-invite"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy("invite");
              setError(false);
              setMessage("");
              try {
                const link = new URL(invitation, window.location.origin);
                const token = link.hash.slice(1);
                if (
                  link.origin !== window.location.origin ||
                  link.pathname !== "/classroom/invitation" ||
                  !/^([a-f0-9]{64})$/.test(token)
                )
                  throw Error("Use the complete Vela invitation link from your instructor.");
                await studentRequest("/api/classroom", "POST", { action: "claim", token });
                setInvitation("");
                window.dispatchEvent(new Event(studentNavUpdate));
                resource.reload();
                setMessage("Invitation accepted.");
              } catch (error) {
                setError(true);
                setMessage(
                  error instanceof Error ? error.message : "Invitation could not be accepted.",
                );
              } finally {
                setBusy("");
              }
            }}
          >
            <label>
              Invitation link
              <input
                type="url"
                value={invitation}
                onChange={(event) => setInvitation(event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <button type="submit" disabled={!!busy || !invitation.trim()}>
              Join with invitation
            </button>
          </form>
          <Link href="/profile#learning-preferences">Plan your own study periods →</Link>
        </section>
      )}
      <div className={styles.grid}>
        <Panel title="Assignments">
          {!data.assignments.length && <p>Your instructors’ assignments will appear here.</p>}
          {data.assignments.map((assignment) => {
            const submission = assignment.submissions[0];
            const rubric = assignment.rubric as Rubric;
            const score = submission?.scores
              ? rubricPoints(rubric, submission.scores as number[])
              : null;
            const closed = new Date(assignment.dueAt) <= new Date();
            return (
              <details className={styles.entry} key={assignment.id}>
                <summary>
                  {assignment.title} ·{" "}
                  {score ? "Graded" : submission ? "Submitted" : closed ? "Closed" : "Open"}
                </summary>
                <p>
                  {assignment.qualificationModule.module.code} · Due{" "}
                  {new Date(assignment.dueAt).toLocaleString()}
                </p>
                <Markdown text={assignment.instructions} />
                <h3>Rubric</h3>
                <ul>
                  {rubric.map((criterion, i) => (
                    <li key={criterion.label}>
                      {criterion.label} · {score && `${(submission.scores as number[])[i]} / `}
                      {criterion.max}
                    </li>
                  ))}
                </ul>
                {score && (
                  <p className={styles.feedback}>
                    <strong>
                      Feedback · {score.points}/{score.total}
                    </strong>
                    <br />
                    {submission.feedback}
                  </p>
                )}
                {(closed || submission?.gradedAt) && submission && (
                  <details>
                    <summary>Your submission</summary>
                    <Markdown text={submission.body} />
                  </details>
                )}
                {!closed && !submission?.gradedAt && (
                  <ActionForm
                    key={submission?.submittedAt ?? "new"}
                    busy={!!busy}
                    label={submission ? "Update submission" : "Submit assignment"}
                    onAction={async (form) => {
                      if (busy) return false;
                      setBusy(assignment.id);
                      setError(false);
                      setMessage("Saving your submission…");
                      try {
                        await studentRequest("/api/classroom", "POST", {
                          action: "submit",
                          assignmentId: assignment.id,
                          body: field(form, "work"),
                          expectedSubmittedAt: submission?.submittedAt,
                        });
                        window.dispatchEvent(new Event(studentNavUpdate));
                        setMessage("Submission saved.");
                        resource.reload();
                        return true;
                      } catch (e) {
                        setError(true);
                        setMessage((e as Error).message);
                        return false;
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <label>
                      Your work
                      <textarea
                        name="work"
                        required
                        maxLength={24000}
                        defaultValue={submission?.body}
                      />
                    </label>
                  </ActionForm>
                )}
              </details>
            );
          })}
        </Panel>
        <Panel title="Announcements">
          {!data.announcements.length && (
            <p>Announcements from your instructors will appear here.</p>
          )}
          {data.announcements.map((item) => (
            <article className={styles.entry} key={item.id}>
              <h3>{item.title}</h3>
              <p>
                {item.qualification.teachingSettings?.displayName || item.qualification.title} ·{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
              <Markdown text={item.body} />
              {item.qualification.teachingSettings?.supportEmail && (
                <a href={`mailto:${item.qualification.teachingSettings.supportEmail}`}>
                  Contact qualification support
                </a>
              )}
            </article>
          ))}
        </Panel>
      </div>
    </div>
  );
}
