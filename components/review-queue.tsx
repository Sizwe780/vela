"use client";
import { LessonReviewQueue } from "./lesson-review-queue";
import { DailyReview } from "./daily-review";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentResource } from "../lib/student/client";
import { watchProgress } from "../lib/progress-events";
import { RecallDrawer } from "../app/study/[unitId]/components/RecallDrawer";
import styles from "./student-pages.module.css";
export type ReviewSummary = {
  due: number;
  newOutcomes: number;
  queue: {
    id: string;
    code: string;
    title: string;
    moduleCode: string;
    due: number;
    newOutcomes: number;
    nextReviewAt: string | null;
  }[];
};
export function ReviewQueue({ preferredUnit }: { preferredUnit?: string }) {
  const { data, error, loading, reload } = useStudentResource<ReviewSummary>("/api/review");
  const [activeUnit, setActiveUnit] = useState<string>();
  const [module, setModule] = useState("");
  const [lessonDue, setLessonDue] = useState(0);
  useEffect(() => watchProgress(reload), [reload]);
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || (loading ? "Loading your review queue…" : "Sign in to review.")}
      </p>
    );
  const units = [...data.queue]
    .filter(
      (u) => (!preferredUnit || u.id === preferredUnit) && (!module || u.moduleCode === module),
    )
    .sort(
      (a, b) =>
        b.due - a.due ||
        b.newOutcomes - a.newOutcomes ||
        a.code.localeCompare(b.code, undefined, { numeric: true }),
    );
  const ready = units.filter((unit) => unit.due || unit.newOutcomes);
  const first = units.find((unit) => unit.id === activeUnit) ?? ready[0];
  const upcoming = ready.filter((unit) => unit.id !== first?.id);
  const scheduled = units.filter((unit) => !unit.due && !unit.newOutcomes && unit.id !== first?.id);
  return (
    <>
      <LessonReviewQueue moduleCode={module} unitId={preferredUnit} onDueChange={setLessonDue} />
      <div className="filter-pills" role="group" aria-label="Review module">
        <button type="button" aria-pressed={!module} onClick={() => setModule("")}>
          All modules
        </button>
        {[...new Set(data.queue.map((u) => u.moduleCode))].sort().map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={module === code}
            onClick={() => setModule(code)}
          >
            {code}
          </button>
        ))}
      </div>
      {preferredUnit && (
        <p>
          Showing the recommended unit. <Link href="/review">Show all enrolled units</Link>
        </p>
      )}
      {!units.length && (
        <p>
          Choose modules at{" "}
          <Link className={styles.link} href="/onboarding">
            enrollment
          </Link>{" "}
          to begin practising.
        </p>
      )}
      {!!units.length && (
        <div className="review-workspace">
          <section className="review-start">
            <span className="eyebrow">
              {first ? first.code : lessonDue ? "LESSON CHECKS" : "REVIEW COMPLETE"}
            </span>
            <h2>
              {first
                ? first.title
                : lessonDue
                  ? "Your saved lesson checks are ready."
                  : "You’re caught up for now."}
            </h2>
            <p>
              {first
                ? "Try to recall the idea from memory. Reveal the answer when you’re ready, then rate how it went."
                : lessonDue
                  ? "Work through your saved attempts above, then rate each recall to plan your next review."
                  : "Check the schedule below, or open a lesson for more practice."}
            </p>
            {first && <DailyReview units={units} />}
            {first && (
              <div className={styles.row}>
                <RecallDrawer
                  key={first.id}
                  studyUnitId={first.id}
                  chat=""
                  triggerLabel={`Review ${first.code}`}
                  inline
                  onOpenChange={(open) => setActiveUnit(open ? first.id : undefined)}
                />
                <Link className={styles.link} href={`/study/${first.id}`}>
                  Open lesson
                </Link>
              </div>
            )}
          </section>
          <aside className="review-summary" aria-label="Review summary">
            <h2>Today’s queue</h2>
            <dl>
              <div>
                <dt>Due for review</dt>
                <dd>{units.reduce((n, u) => n + u.due, 0) + lessonDue}</dd>
              </div>
              <div>
                <dt>New to practise</dt>
                <dd>{units.reduce((n, u) => n + u.newOutcomes, 0)}</dd>
              </div>
            </dl>
            <p>
              {lessonDue > 0 && (
                <>
                  Includes {lessonDue} saved lesson {lessonDue === 1 ? "check" : "checks"}.{" "}
                </>
              )}
              Recall ratings help schedule your reviews. Assessed mastery appears in Progress &amp;
              outcomes.
            </p>
          </aside>
          {upcoming.length > 0 && (
            <section className="review-unit-list">
              <h2>Up next</h2>
              <ul>
                {upcoming.slice(0, 3).map((unit) => (
                  <ReviewUnit key={unit.id} unit={unit} />
                ))}
              </ul>
              {upcoming.length > 3 && (
                <details>
                  <summary>
                    Show all {upcoming.length}{" "}
                    {upcoming.length === 1 ? "upcoming unit" : "upcoming units"}
                  </summary>
                  <ul>
                    {upcoming.slice(3).map((unit) => (
                      <ReviewUnit key={unit.id} unit={unit} />
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
          {!!scheduled.length && (
            <details className="review-unit-list">
              <summary>Later reviews and extra practice ({scheduled.length})</summary>
              <ul>
                {scheduled.map((unit) => (
                  <ReviewUnit key={unit.id} unit={unit} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </>
  );
}

function ReviewUnit({ unit }: { unit: ReviewSummary["queue"][number] }) {
  return (
    <li>
      <div>
        <small>{unit.code}</small>
        <h3>
          <Link href={`/study/${unit.id}`}>{unit.title}</Link>
        </h3>
        <p>
          {unit.due || unit.newOutcomes
            ? `${unit.due} due · ${unit.newOutcomes} new`
            : unit.nextReviewAt
              ? `Next review ${new Date(unit.nextReviewAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}`
              : "Available for extra practice"}
        </p>
      </div>
      <RecallDrawer studyUnitId={unit.id} chat="" triggerLabel={`Review ${unit.code}`} />
    </li>
  );
}
