"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useStudentResource } from "../lib/student/client";
import { watchProgress } from "../lib/progress-events";
import type { ReviewSummary } from "./review-queue";
import styles from "./student-pages.module.css";
type Positions = {
  positions: {
    sessionId: string;
    updatedAt: string;
    session: { title: string; studyUnit: { id: string; title: string; module: { code: string } } };
  }[];
};
export function StudentMomentum() {
  const position = useStudentResource<Positions>("/api/study-position");
  const reviews = useStudentResource<ReviewSummary>("/api/review");
  useEffect(
    () =>
      watchProgress(() => {
        position.reload();
        reviews.reload();
      }),
    [position.reload, reviews.reload],
  );
  if (!position.userId) return null;
  const latest = position.data?.positions[0];
  return (
    <section className={styles.grid} aria-label="Next steps">
      <article className={styles.card}>
        <h2>Continue learning</h2>
        {latest ? (
          <>
            <p>
              {latest.session.studyUnit.module.code} · {latest.session.title}
            </p>
            <Link
              className="primary-button"
              href={`/study/${latest.session.studyUnit.id}/sessions/${latest.sessionId}`}
            >
              Continue where you left off
            </Link>
          </>
        ) : (
          <p>Open an enrolled module to begin. Your latest session will appear here.</p>
        )}
      </article>
      <article className={styles.card}>
        <h2>Your next review</h2>
        <p>
          {reviews.data
            ? `${reviews.data.due} outcomes due · ${reviews.data.newOutcomes} not yet practised`
            : reviews.error || "Checking your review queue…"}
        </p>
        <Link className={styles.link} href="/review">
          Open review queue
        </Link>
        <p>
          <Link className={styles.link} href="/saved">
            Your saved passages
          </Link>{" "}
          ·{" "}
          <Link className={styles.link} href="/search">
            Search lessons
          </Link>
        </p>
      </article>
    </section>
  );
}
