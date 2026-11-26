"use client";
import { rubricPoints, type Rubric } from "../../lib/teaching/input";
import { Markdown } from "../markdown";
import {
  ActionForm,
  CohortOptions,
  ModuleOptions,
  Panel,
  field,
  person,
  type WorkspaceProps,
} from "./shared";
import styles from "./workspace.module.css";

export function ClassroomTools({
  data,
  busy,
  send,
  assignmentId,
  setAssignmentId,
}: WorkspaceProps & {
  assignmentId: string;
  setAssignmentId: (id: string) => void;
}) {
  const selected = data.assignments.find((item) => item.id === assignmentId);
  const roster = [
    ...new Set(
      data.enrollments.filter((item) => item.status !== "withdrawn").map((item) => item.studentId),
    ),
  ];
  return (
    <div className={styles.grid}>
      <Panel title="Cohorts">
        <ActionForm
          busy={busy}
          label="Create cohort"
          reset
          onAction={(form) => send({ action: "createCohort", name: field(form, "name") })}
        >
          <label>
            Cohort name
            <input name="name" required maxLength={160} />
          </label>
        </ActionForm>
        {data.cohorts.map((cohort) => (
          <details className={styles.entry} key={cohort.id}>
            <summary>
              {cohort.name} · {cohort.members.length}{" "}
              {cohort.members.length === 1 ? "learner" : "learners"}
            </summary>
            <ul>
              {cohort.members.map((member) => (
                <li key={member.studentId} className={styles.actions}>
                  {person(data, member.studentId)}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "cohortMember",
                        cohortId: cohort.id,
                        studentId: member.studentId,
                        member: false,
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <ActionForm
              busy={busy}
              label="Add to cohort"
              reset
              onAction={(form) =>
                send({
                  action: "cohortMember",
                  cohortId: cohort.id,
                  studentId: field(form, "student"),
                  member: true,
                })
              }
            >
              <label>
                Enrolled learner
                <select name="student" required defaultValue="">
                  <option value="">Choose learner</option>
                  {roster
                    .filter((id) => !cohort.members.some((member) => member.studentId === id))
                    .map((id) => (
                      <option key={id} value={id}>
                        {person(data, id)}
                      </option>
                    ))}
                </select>
              </label>
            </ActionForm>
          </details>
        ))}
      </Panel>
      <Panel title="Assignments">
        <ActionForm
          busy={busy}
          label="Publish assignment"
          reset
          onAction={(form) => {
            const dueAt = new Date(field(form, "dueAt"));
            const rubric = field(form, "rubric")
              .split("\n")
              .map((line) => {
                const [label, max] = line.split("|");
                return { label: label.trim(), max: Number(max) };
              });
            return send({
              action: "createAssignment",
              moduleId: field(form, "moduleId"),
              cohortId: field(form, "cohortId") || undefined,
              title: field(form, "title"),
              instructions: field(form, "instructions"),
              dueAt: Number.isNaN(dueAt.valueOf()) ? "" : dueAt.toISOString(),
              rubric,
            });
          }}
        >
          <label>
            Assignment title
            <input name="title" required maxLength={160} />
          </label>
          <label>
            Assignment module
            <select name="moduleId" required>
              <ModuleOptions data={data} />
            </select>
          </label>
          <label>
            Assignment audience
            <select name="cohortId">
              <CohortOptions data={data} />
            </select>
          </label>
          <label>
            Due date and time
            <input type="datetime-local" name="dueAt" required />
          </label>
          <label>
            Instructions
            <textarea name="instructions" maxLength={24000} required />
          </label>
          <label>
            Rubric
            <textarea
              name="rubric"
              maxLength={2200}
              required
              placeholder={"One item per line, e.g.\nJustifies method | 10"}
            />
          </label>
        </ActionForm>
        <label>
          Grade an assignment
          <select
            className={styles.selector}
            value={assignmentId}
            onChange={(event) => setAssignmentId(event.target.value)}
          >
            <option value="">Choose an assignment</option>
            {data.assignments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item._count.submissions} submitted
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <p>Due {new Date(selected.dueAt).toLocaleString()}. Showing the latest 50 submissions.</p>
        )}
      </Panel>
      {selected && (
        <Panel title="Submissions and feedback">
          {!data.submissions.length && (
            <p>Submissions will appear here after learners send their work.</p>
          )}
          {data.submissions.map((submission) => {
            const items = selected.rubric as Rubric;
            const score = submission.scores
              ? rubricPoints(items, submission.scores as number[])
              : null;
            return (
              <details className={styles.entry} key={submission.studentId}>
                <summary>
                  {person(data, submission.studentId)} ·{" "}
                  {score ? `${score.points}/${score.total}` : "awaiting feedback"}
                </summary>
                <Markdown text={submission.body} />
                {submission.gradedAt ? (
                  <p className={styles.feedback}>{submission.feedback}</p>
                ) : (
                  <ActionForm
                    busy={busy}
                    label="Return grade and feedback"
                    onAction={(form) =>
                      send({
                        action: "grade",
                        assignmentId: selected.id,
                        studentId: submission.studentId,
                        expectedSubmittedAt: submission.submittedAt,
                        scores: items.map((_, i) => Number(field(form, `score-${i}`))),
                        feedback: field(form, "feedback"),
                      })
                    }
                  >
                    {items.map((item, i) => (
                      <label key={item.label}>
                        {item.label} / {item.max}
                        <input
                          name={`score-${i}`}
                          required
                          type="number"
                          min={0}
                          max={item.max}
                          step={1}
                        />
                      </label>
                    ))}
                    <label>
                      Learner feedback
                      <textarea name="feedback" required maxLength={2000} />
                    </label>
                  </ActionForm>
                )}
              </details>
            );
          })}
        </Panel>
      )}
      <Panel title="Announcements">
        <ActionForm
          busy={busy}
          reset
          label="Post announcement"
          onAction={(form) =>
            send({
              action: "announce",
              cohortId: field(form, "cohortId") || undefined,
              title: field(form, "title"),
              body: field(form, "body"),
            })
          }
        >
          <label>
            Announcement title
            <input name="title" required maxLength={160} />
          </label>
          <label>
            Announcement audience
            <select name="cohortId">
              <CohortOptions data={data} />
            </select>
          </label>
          <label>
            Announcement text
            <textarea name="body" required maxLength={24000} />
          </label>
        </ActionForm>
        {data.announcements.map((item) => (
          <details className={styles.entry} key={item.id}>
            <summary>
              {item.title} ·{" "}
              {item.cohortId
                ? data.cohorts.find((cohort) => cohort.id === item.cohortId)?.name
                : "All enrolled learners"}
            </summary>
            <Markdown text={item.body} />
          </details>
        ))}
      </Panel>
    </div>
  );
}
