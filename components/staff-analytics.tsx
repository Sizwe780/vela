"use client";
import { useStudentResource } from "../lib/student/client";
import styles from "./student-pages.module.css";
type Report = {
  qualifications: {
    id: string;
    title: string;
    institution: string;
    code: string;
    modules: {
      id: string;
      code: string;
      title: string;
      enrolledStudents: number;
      completedEnrollments: number;
      units: number;
      sessions: number;
      completionPercent: number;
      meanMastery: number;
      assessedRecords: number;
      conversion: {
        status: string;
        converted: number;
        total: number;
        needsReview: number;
        updatedAt?: string;
      } | null;
    }[];
  }[];
};
export function StaffAnalytics() {
  const { data, error, loading, reload } = useStudentResource<Report>("/api/staff/analytics");
  return (
    <>
      <p>
        Cohort figures cover active and completed enrollments in your assigned qualifications.
        Missing mastery observations count as zero.
      </p>
      <button className={styles.button} onClick={reload} type="button">
        Refresh analytics
      </button>
      {error && <p role="alert">{error}</p>}
      {loading && !data && <p role="status">Loading analytics…</p>}
      {data?.qualifications.map((q) => (
        <section key={q.id}>
          <h2>
            {q.institution} · {q.code} · {q.title}
          </h2>
          <div className={styles.grid}>
            {q.modules.map((m) => (
              <article className={styles.card} key={m.id}>
                <h3>
                  {m.code} · {m.title}
                </h3>
                <p>
                  {m.enrolledStudents} enrolled · {m.completedEnrollments} completed enrollments
                </p>
                <p>
                  {m.completionPercent}% session completion · {Math.round(m.meanMastery * 100)}%
                  mean outcome mastery
                </p>
                <p>
                  Content: {m.units} units · {m.sessions} published sessions
                </p>
                {m.conversion ? (
                  <p>
                    Source conversion: {m.conversion.converted}/{m.conversion.total} pages ·{" "}
                    {m.conversion.needsReview} held · {m.conversion.status}
                    {m.conversion.updatedAt
                      ? ` · checkpoint ${new Date(m.conversion.updatedAt).toLocaleString()}`
                      : ""}
                  </p>
                ) : (
                  <p>Source conversion has not been registered.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className={styles.note}>
        Source status is the converter's last checkpoint, not a live process heartbeat. Cohort
        aggregates do not certify academic achievement.
      </p>
    </>
  );
}
