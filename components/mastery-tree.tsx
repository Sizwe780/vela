"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useStudentResource } from "../lib/student/client";
import { watchProgress } from "../lib/progress-events";
import { ProgressTracker } from "../app/study/[unitId]/components/ProgressTracker";

type Outcome = {
  id: string;
  title: string;
  unitId: string;
  unit: string;
  moduleId: string;
  module: string;
  institution: string;
  score: number;
  attempts: number;
  due: string | null;
};

export function MasteryTree() {
  const { data, userId, loading, error, reload } = useStudentResource<{ outcomes: Outcome[] }>(
    "/api/mastery",
  );
  useEffect(() => watchProgress(reload), [reload]);
  if (!userId) return null;

  const outcomes = data?.outcomes ?? [];
  const groups = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    const group = groups.get(outcome.moduleId);
    if (group) group.push(outcome);
    else groups.set(outcome.moduleId, [outcome]);
  }
  const now = Date.now();
  const isDue = (outcome: Outcome) => !!outcome.due && Date.parse(outcome.due) <= now;
  const practised = outcomes.filter((outcome) => outcome.attempts > 0).length;
  const due = outcomes.filter(isDue).length;

  return (
    <section className="dashboard-mastery" aria-label="Course progress tree">
      <header className="dashboard-mastery-heading">
        <div>
          <h2>Your outcome mastery</h2>
          <p>Practice and recall across your enrolled modules.</p>
        </div>
        <Link href="/progress">View evidence →</Link>
      </header>
      {error && (
        <p role="status">
          {error}{" "}
          <button type="button" onClick={reload}>
            Retry mastery
          </button>
        </p>
      )}
      {!data && loading && <p role="status">Loading outcomes…</p>}
      {data && !outcomes.length && (
        <p>Outcomes will appear when your enrolled modules have learning units.</p>
      )}
      {outcomes.length > 0 && (
        <>
          <dl className="mastery-metrics">
            <div>
              <dt>Outcomes</dt>
              <dd>{outcomes.length}</dd>
            </div>
            <div>
              <dt>Practised</dt>
              <dd>{practised}</dd>
            </div>
            <div>
              <dt>Due for recall</dt>
              <dd>{due}</dd>
            </div>
          </dl>
          <div className="mastery-groups">
            {[...groups].map(([id, rows], index) => (
              <details key={id} open={index === 0}>
                <summary>
                  <span className="module-pill">{rows[0].module}</span>
                  <span>{rows[0].institution}</span>
                  <span className="mastery-group-count">
                    {rows.filter((row) => row.attempts > 0).length}/{rows.length} practised
                  </span>
                </summary>
                <ul>
                  {rows.map((row) => (
                    <li className="mastery-outcome" key={row.id}>
                      <div>
                        <Link href={`/study/${encodeURIComponent(row.unitId)}`}>{row.unit} →</Link>
                        <p>{row.title}</p>
                      </div>
                      <div className="mastery-measure">
                        {isDue(row) && (
                          <span className="mastery-status mastery-status-due">Due for recall</span>
                        )}
                        {row.attempts > 0 ? (
                          <>
                            <strong>{Math.round(row.score * 100)}%</strong>
                            <progress
                              max={1}
                              value={row.score}
                              aria-label={`${row.unit}: ${row.title}`}
                            />
                          </>
                        ) : (
                          <span className="mastery-status">Not yet practised</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <p className="mastery-note">
            Percentages combine practice scores and recall self-ratings.
          </p>
          {due > 0 && (
            <Link className="primary-button" href="/review">
              Open recall queue
            </Link>
          )}
        </>
      )}
      <details className="mastery-completion">
        <summary>Qualification and session completion</summary>
        <ProgressTracker />
      </details>
    </section>
  );
}
