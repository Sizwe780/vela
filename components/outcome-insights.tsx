"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentResource } from "../lib/student/client";
import { watchProgress } from "../lib/progress-events";
import type { OutcomeEvidence, studyRecommendations } from "../lib/insights/evidence";
type Insights = {
  outcomes: OutcomeEvidence[];
  recommendations: ReturnType<typeof studyRecommendations>;
  completedSessions: number;
  totalSessions: number;
  windowLimited: boolean;
};
export function OutcomeInsights({ compact = false }: { compact?: boolean }) {
  const resource = useStudentResource<Insights>("/api/insights", 20000),
    [module, setModule] = useState("");
  const [sessionSlow, setSessionSlow] = useState(false);
  useEffect(() => {
    if (resource.userId) {
      setSessionSlow(false);
      return;
    }
    const timer = setTimeout(() => setSessionSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [resource.userId]);
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(resource.reload, 250);
    };
    const stop = watchProgress(refresh);
    const timer = setInterval(() => {
      if (!document.hidden) resource.reload();
    }, 60000);
    return () => {
      stop();
      clearTimeout(refreshTimer);
      clearInterval(timer);
    };
  }, [resource.reload]);
  if (!resource.userId)
    return (
      <section className="learning-insights" aria-label="Learning evidence session">
        <p role="status">
          {sessionSlow ? "Your session could not be confirmed yet." : "Confirming your session…"}
        </p>
        {sessionSlow && (
          <button type="button" onClick={() => window.location.reload()}>
            Reload session
          </button>
        )}
      </section>
    );
  const data = resource.data;
  const quizzed = data?.outcomes.filter((outcome) => outcome.quiz).length ?? 0;
  const checked = data?.outcomes.filter((outcome) => outcome.concept).length ?? 0;
  return (
    <section
      className={compact ? "learning-insights learning-insights-compact" : "learning-insights"}
      aria-label="Outcome evidence and study recommendations"
    >
      <h2>{compact ? "A useful next step" : "Your learning evidence"}</h2>
      {resource.error && (
        <p role="status">
          {resource.error} <button onClick={resource.reload}>Retry progress</button>
        </p>
      )}
      {!data ? (
        resource.loading ? (
          <p role="status">Loading your learning evidence…</p>
        ) : null
      ) : (
        <>
          {compact ? (
            <p>
              {data.completedSessions}/{data.totalSessions}{" "}
              {data.totalSessions === 1 ? "reading milestone" : "reading milestones"} · {quizzed}/
              {data.outcomes.length} {data.outcomes.length === 1 ? "outcome" : "outcomes"} with
              recent quiz evidence.
            </p>
          ) : (
            <div className="outcome-summary">
              <EvidenceMeter
                label="Reading milestones"
                value={data.completedSessions}
                total={data.totalSessions}
              />
              <EvidenceMeter
                label="Outcomes with quiz evidence"
                value={quizzed}
                total={data.outcomes.length}
              />
              <EvidenceMeter
                label="Outcomes with Teach-the-Tutor reviews"
                value={checked}
                total={data.outcomes.length}
              />
            </div>
          )}
          {!compact && (
            <>
              <details className="outcome-method evidence-guide">
                <summary>Which actions update these counters?</summary>
                <ul>
                  <li>
                    <strong>Reading:</strong> press Mark milestone complete in a lesson.
                  </li>
                  <li>
                    <strong>Quiz evidence:</strong> submit a unit quiz with automatically graded
                    questions. Ungraded items do not add outcome evidence.
                  </li>
                  <li>
                    <strong>Teach-the-Tutor reviews:</strong> open a lesson, then Companion → Tools
                    → Teach the Tutor. Submit an explanation and receive a validated review for the
                    mapped outcome shown in the tool. These are AI-assisted estimates over the last
                    90 days.
                  </li>
                </ul>
                <p>
                  Show answer, Check my attempt, Normal/Deep chat, hints, debate and recall ratings
                  do not increment the Teach-the-Tutor counter. Direct checks in Concept map update
                  separate concept estimates.
                </p>
              </details>
              {resource.loading && (
                <p role="status">Refreshing evidence; your last loaded results remain visible.</p>
              )}
              <h2 className="outcome-subheading">Recommended next steps</h2>
            </>
          )}
          <ul className="recommendation-list">
            {data.recommendations.slice(0, 3).map((r) => (
              <li key={r.outcomeId}>
                <span className="eyebrow">
                  {r.moduleCode} · {r.kind}
                </span>
                <h3>
                  <Link href={r.href}>{r.unitTitle}</Link>
                </h3>
                <p>{r.reason}</p>
              </li>
            ))}
          </ul>
          {!data.recommendations.length && (
            <p>There are no recommendations yet. Enroll in a published module to begin.</p>
          )}
          {compact ? (
            <Link href="/progress">Explore outcome evidence →</Link>
          ) : (
            <>
              <details className="outcome-method">
                <summary>How to read your results</summary>
                <p>
                  Recent history covers up to 1,000 quiz and 1,000 conceptual attempts over 90 days.
                  {data.windowLimited && " The result limit has been reached."} Practice scores can
                  vary with question difficulty. Recall and practice aggregates combine different
                  evidence types.
                </p>
              </details>
              <h2 className="outcome-subheading">Learning outcomes</h2>
              <label>
                Module
                <select
                  aria-label="Progress module"
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                >
                  <option value="">All enrolled modules</option>
                  {[...new Map(data.outcomes.map((o) => [o.moduleId, o.moduleCode])).entries()].map(
                    ([id, code]) => (
                      <option key={id} value={id}>
                        {code}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="mastery-breakdown" aria-label="Quiz practice distribution">
                <span
                  style={{
                    width: `${(100 * data.outcomes.filter((o) => o.quiz && o.quiz.score >= 0.8).length) / Math.max(1, data.outcomes.length)}%`,
                  }}
                />
                <span
                  style={{
                    width: `${(100 * data.outcomes.filter((o) => (o.quiz || o.concept) && !(o.quiz && o.quiz.score >= 0.8)).length) / Math.max(1, data.outcomes.length)}%`,
                  }}
                />
              </div>
              <p>
                Strong quiz evidence:{" "}
                {data.outcomes.filter((o) => o.quiz && o.quiz.score >= 0.8).length} · Practising:{" "}
                {
                  data.outcomes.filter(
                    (o) => (o.quiz || o.concept) && !(o.quiz && o.quiz.score >= 0.8),
                  ).length
                }{" "}
                · No assessed evidence: {data.outcomes.filter((o) => !o.quiz && !o.concept).length}
              </p>
              {(() => {
                const weakest = [...data.outcomes]
                  .filter((o) => o.quiz)
                  .sort((a, b) => a.quiz!.score - b.quiz!.score)[0];
                return weakest ? (
                  <Link className="primary-button" href={weakest.studyLink}>
                    Practise your weakest recorded outcome →
                  </Link>
                ) : null;
              })()}
              {[...new Map(data.outcomes.map((o) => [o.moduleId, o.moduleCode])).entries()]
                .filter(([id]) => !module || module === id)
                .map(([id, code]) => {
                  const items = data.outcomes.filter((o) => o.moduleId === id);
                  const observed = items.filter((o) => o.quiz || o.concept).length;
                  return (
                    <details key={id} className="outcome-module" open={observed > 0}>
                      <summary>
                        <strong>{code}</strong>
                        <span>
                          {observed}/{items.length} outcomes with assessed practice
                        </span>
                        <progress
                          max={Math.max(1, items.length)}
                          value={observed}
                          aria-label={`${code} outcomes with evidence`}
                        />
                      </summary>
                      <div className="outcome-grid">
                        {items.map((o) => (
                          <article key={o.id}>
                            <small>
                              {o.moduleCode} · {o.unitTitle}
                            </small>
                            <h3>
                              <Link href={o.studyLink}>{o.title}</Link>
                            </h3>
                            <details className="outcome-evidence">
                              <summary>
                                {o.quiz
                                  ? `Latest quiz · ${Math.round(o.quiz.score * 100)}%`
                                  : "View evidence"}
                              </summary>
                              <dl>
                                <dt>Latest quiz practice</dt>
                                <dd>
                                  {o.quiz
                                    ? `${Math.round(o.quiz.score * 100)}% · ${o.quizAttempts} recent ${o.quizAttempts === 1 ? "attempt" : "attempts"}`
                                    : "No recent quiz evidence"}
                                </dd>
                                <dt>AI-assisted conceptual practice</dt>
                                <dd>
                                  {o.concept
                                    ? `${Math.round(o.concept.score * 100)}% estimate · ${o.conceptAttempts} recent ${o.conceptAttempts === 1 ? "attempt" : "attempts"}`
                                    : "No verified conceptual review recorded"}
                                </dd>
                                <dt>Recall / practice aggregate</dt>
                                <dd>
                                  {o.mixedScore === null
                                    ? "Not started"
                                    : `${Math.round(o.mixedScore * 100)}% · ${o.attempts} ${o.attempts === 1 ? "recorded activity" : "recorded activities"} (mixed sources)`}
                                </dd>
                                <dt>Review schedule</dt>
                                <dd>
                                  {o.due ? new Date(o.due).toLocaleDateString() : "Not scheduled"}
                                </dd>
                              </dl>
                              {o.quizHistory.length > 0 && (
                                <div aria-label="Recent quiz practice history">
                                  <ol className="evidence-history">
                                    {o.quizHistory.map((e) => (
                                      <li key={e.id}>
                                        <time dateTime={e.at}>
                                          {new Date(e.at).toLocaleDateString()}
                                        </time>
                                        <meter min={0} max={1} value={e.score} />
                                        <span>{Math.round(e.score * 100)}%</span>
                                      </li>
                                    ))}
                                  </ol>
                                  <p>
                                    {o.quizChange === null
                                      ? "Two quiz attempts are needed for a comparison."
                                      : `${o.quizChange > 0 ? "+" : ""}${o.quizChange} ${o.quizChange === 1 ? "percentage point" : "percentage points"} from your previous quiz practice.`}
                                  </p>
                                </div>
                              )}
                            </details>
                          </article>
                        ))}
                      </div>
                    </details>
                  );
                })}
            </>
          )}
        </>
      )}
    </section>
  );
}

function EvidenceMeter({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {value}
        <small> / {total}</small>
      </strong>
      <progress aria-label={label} max={Math.max(1, total)} value={value} />
    </div>
  );
}
