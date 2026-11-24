"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useStudentResource } from "../lib/student/client";
import styles from "./student-pages.module.css";
type Summary = {
  today: string;
  weekStart: string;
  weekSeconds: number;
  todaySeconds: number;
  goalMinutes: number;
  goalPercent: number;
  streakDays: number;
  days: { day: string; seconds: number }[];
  modules: { id: string; code: string; title: string; seconds: number }[];
};
function minutes(seconds: number) {
  return seconds > 0 && seconds < 60 ? "less than 1 min" : `${Math.floor(seconds / 60)} min`;
}
export function ActivityOverview({ compact = false }: { compact?: boolean }) {
  const { data, error, loading, userId, reload } = useStudentResource<Summary>("/api/activity");
  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener("vela-activity", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("vela-activity", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  if (!userId) return null;
  if (!data)
    return (
      <section className={styles.card} aria-label="Study activity">
        <h2>Your study rhythm</h2>
        <p role={error ? "alert" : "status"}>
          {error || (loading ? "Loading your activity…" : "No activity yet.")}
        </p>
        {error && (
          <button className={styles.button} onClick={reload}>
            Retry activity
          </button>
        )}
      </section>
    );
  return (
    <section className={`${styles.card} activity-overview`} aria-label="Your study activity">
      <div className={styles.row}>
        <h2>This week’s study goal</h2>
        <Link href={compact ? "/activity" : "/profile"}>
          {compact ? "View activity →" : "Adjust weekly goal →"}
        </Link>
      </div>
      <p className="activity-total">
        <strong>{minutes(data.weekSeconds)}</strong>
        <span> of your {data.goalMinutes} minute goal</span>
      </p>
      <progress aria-label="Weekly study goal" max={100} value={data.goalPercent} />
      <p className={styles.note}>
        Monday–Sunday · South African time · {data.goalPercent}% of goal
      </p>
      <div
        className="activity-week"
        role="img"
        aria-label={`This week's focused study time: ${data.days.map((d) => `${d.day}: ${minutes(d.seconds)}`).join(", ")}`}
      >
        {data.days.map((d) => (
          <div key={d.day} className={d.day === data.today ? "activity-today" : ""}>
            <span>{minutes(d.seconds)}</span>
            <div className="activity-bar">
              <i
                style={{
                  height: `${Math.max(d.seconds ? 4 : 0, (d.seconds / Math.max(60, ...data.days.map((v) => v.seconds))) * 100)}%`,
                }}
              />
            </div>
            <span>
              {new Date(d.day + "T00:00:00Z").toLocaleDateString("en-ZA", {
                weekday: "short",
                timeZone: "UTC",
              })}
            </span>
          </div>
        ))}
      </div>
      {!compact && (
        <>
          <div className={styles.grid}>
            <article>
              <h3>Today</h3>
              <p>{minutes(data.todaySeconds)} recorded</p>
            </article>
            <article>
              <h3>Current streak</h3>
              <p>
                {data.streakDays} {data.streakDays === 1 ? "day" : "days"}
              </p>
              <small>At least one recorded minute per day, across the last 90 days.</small>
            </article>
          </div>
          <table className="activity-table">
            <caption>Recorded study time by module this week</caption>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/modules/${m.id}`}>
                      {m.code} · {m.title}
                    </Link>
                  </td>
                  <td>{minutes(m.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.modules.length && (
            <p>Start the study timer in a real learning session to build your activity history.</p>
          )}
        </>
      )}
      {!compact && (
        <p className={styles.note}>
          Time is recorded only when you start the study timer. It pauses when the page is hidden or
          idle. Activity estimates are separate from assessed mastery and institutional attendance.
        </p>
      )}
    </section>
  );
}
