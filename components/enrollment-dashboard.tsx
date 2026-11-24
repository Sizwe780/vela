"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentResource, studentRequest } from "../lib/student/client";
import { watchProgress, notifyProgress } from "../lib/progress-events";
import { psmStudyPeriod } from "../lib/curriculum/psm-enrollment";
import styles from "./enrollment.module.css";
type Enrollment = {
  id: string;
  moduleId: string;
  studyPlanYear: number | null;
  studyPlanSemester: number | null;
  status: "active" | "completed" | "withdrawn";
  qualificationModule: {
    qualification: { code: string; title: string; institution: string };
    module: {
      id: string;
      code: string;
      title: string;
      studyUnits: { id: string; title: string }[];
    };
  };
};
type ModuleProgress = {
  id: string;
  total: number;
  completed: number;
  units: { id: string; mastery: number }[];
};
export function EnrollmentDashboard() {
  const enrollment = useStudentResource<{ enrollments: Enrollment[] }>("/api/enrollments");
  const statsResource = useStudentResource<{ courses: { modules: ModuleProgress[] }[] }>(
    "/api/progress",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState("");
  const rows = enrollment.data?.enrollments ?? [];
  const progress = statsResource.data?.courses.flatMap((course) => course.modules) ?? [];

  useEffect(
    () =>
      watchProgress(() => {
        enrollment.reload();
        statsResource.reload();
      }),
    [enrollment.reload, statsResource.reload],
  );

  async function withdraw(row: Enrollment) {
    setPending(row.id);
    setMutationError("");
    try {
      await studentRequest("/api/enrollments", "POST", {
        action: "withdraw",
        enrollmentId: row.id,
      });
      notifyProgress();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Withdrawal failed.");
    } finally {
      setPending(null);
    }
  }

  if (!enrollment.userId) return null;
  const loading = !enrollment.data && enrollment.loading;
  const error = enrollment.error || mutationError;
  const active = rows.filter((e) => e.status !== "withdrawn");
  return (
    <section className={styles.dashboard} aria-label="My enrolled modules">
      <div className={styles.heading}>
        <h2>My learning</h2>
        <Link className="primary-button" href="/onboarding">
          Choose modules
        </Link>
      </div>
      {loading && <p role="status">Loading enrolled modules…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !active.length && (
        <p>No enrolled modules yet. Choose your qualification and modules to begin.</p>
      )}
      <div className={styles.courseGrid}>
        {active.map((e) => {
          const m = e.qualificationModule.module;
          const stats = progress.find((p) => p.id === m.id);
          const percentage = stats?.total ? Math.round((100 * stats.completed) / stats.total) : 0;
          const mastery = stats?.units.length
            ? Math.round(
                (100 * stats.units.reduce((s, u) => s + u.mastery, 0)) / stats.units.length,
              )
            : 0;
          return (
            <article className={styles.card} key={e.id}>
              <small>
                {e.qualificationModule.qualification.institution} ·{" "}
                {e.qualificationModule.qualification.code} · {e.status}
                {e.studyPlanYear && ` · ${e.studyPlanYear}`}
                {e.studyPlanSemester &&
                  psmStudyPeriod(m.code) === "semester" &&
                  ` · Semester ${e.studyPlanSemester}`}
              </small>
              <h3>
                {m.code} · {m.title}
              </h3>
              {!m.studyUnits.length ? (
                <p>Content in preparation</p>
              ) : stats ? (
                <>
                  <progress
                    max={100}
                    value={percentage}
                    aria-label={`${m.code} session completion`}
                  />
                  <p>
                    {stats.completed}/{stats.total} sessions · {percentage}% complete · {mastery}%
                    average unit mastery
                  </p>
                </>
              ) : (
                <p>
                  {statsResource.error
                    ? "Progress is temporarily unavailable."
                    : "Loading session progress…"}
                </p>
              )}
              <div className={styles.actions}>
                <Link className="primary-button" href={`/modules/${m.id}`}>
                  Open {m.code}
                </Link>
                {m.studyUnits[0] && (
                  <Link href={`/study/${m.studyUnits[0].id}`}>Start studying</Link>
                )}
                <button
                  type="button"
                  disabled={pending === e.id}
                  aria-label={`Withdraw from ${m.code}`}
                  onClick={() => void withdraw(e)}
                >
                  Withdraw
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {rows.some((e) => e.status === "withdrawn") && (
        <details>
          <summary>Withdrawn modules · progress retained</summary>
          {rows
            .filter((e) => e.status === "withdrawn")
            .map((e) => (
              <p key={e.id}>
                {e.qualificationModule.module.code} ·{" "}
                <Link href={`/onboarding?moduleId=${e.moduleId}`}>Re-enroll</Link>
              </p>
            ))}
        </details>
      )}
    </section>
  );
}
