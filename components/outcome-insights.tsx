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
  const resource = useStudentResource<Insights>("/api/insights"),
    [module, setModule] = useState("");
  useEffect(() => {
    const stop = watchProgress(resource.reload);
    const timer = setInterval(() => {
      if (!document.hidden) resource.reload();
    }, 60000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [resource.reload]);
  if (!resource.userId) return null;
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
        <p>Loading your learning evidence…</p>
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
                label="Outcomes with conceptual checks"
                value={checked}
                total={data.outcomes.length}
              />
            </div>
          )}
          {!compact && <h2 className="outcome-subheading">Recommended next steps</h2>}
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
              <div className="outcome-grid">
                {data.outcomes
                  .filter((o) => !module || o.moduleId === module)
                  .map((o) => (
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
                          <dd>{o.due ? new Date(o.due).toLocaleDateString() : "Not scheduled"}</dd>
                        </dl>
                        {o.quizHistory.length > 0 && (
                          <div aria-label="Recent quiz practice history">
                            <ol className="evidence-history">
                              {o.quizHistory.map((e) => (
                                <li key={e.id}>
                                  <time dateTime={e.at}>{new Date(e.at).toLocaleDateString()}</time>
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
