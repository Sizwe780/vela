"use client";
import { useEffect } from "react";
import { useStudentResource } from "../../lib/student/client";
import { watchProgress } from "../../lib/progress-events";
import styles from "../student-pages.module.css";
export function ConceptProgress() {
  const { data, userId, reload } = useStudentResource<{ points: number; outcomes: number }>(
    "/api/tutor/teach",
  );
  useEffect(() => watchProgress(reload), [reload]);
  if (!userId || !data) return null;
  return (
    <section className={styles.card} aria-label="Conceptual practice progress">
      <h2>Explain it. Make it yours.</h2>
      <p>
        <strong>
          {data.points} {data.points === 1 ? "conceptual point" : "conceptual points"}
        </strong>{" "}
        across {data.outcomes} {data.outcomes === 1 ? "outcome" : "outcomes"}.
      </p>
      <small>
        AI-assisted teaching practice, capped at 10 points per outcome. Session completion and
        institutional marks are separate.
      </small>
    </section>
  );
}
