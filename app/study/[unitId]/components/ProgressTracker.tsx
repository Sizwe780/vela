"use client";
import { useEffect, useState } from "react";
import { watchProgress } from "../../../../lib/progress-events";
import { authClient } from "../../../../lib/auth/client";
type Unit = { id: string; code: string; total: number; completed: number; mastery: number };
type Module = {
  id: string;
  code: string;
  total: number;
  completed: number;
  complete: boolean;
  units: Unit[];
};
type Course = {
  id: string;
  title: string;
  total: number;
  completed: number;
  completedModules: number;
  modules: Module[];
};
export function ProgressTracker({ unitId }: { unitId?: string }) {
  const { data: session } = authClient.useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    setCourses([]);
    if (!session?.user) return;
    let active = true;
    let sequence = 0;
    const load = () => {
      const current = ++sequence;
      void fetch("/api/progress", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (active && current === sequence) setCourses(d?.courses ?? []);
        })
        .catch(() => {});
    };
    load();
    const stop = watchProgress(load);
    return () => {
      active = false;
      stop();
    };
  }, [unitId, session?.user?.id]);
  if (!session?.user || !courses.length) return null;
  if (unitId) {
    const unit = courses
      .flatMap((c) => c.modules.flatMap((m) => m.units))
      .find((u) => u.id === unitId);
    if (!unit || !unit.total) return null;
    const percent = Math.round((100 * unit.completed) / unit.total);
    return (
      <span
        className="unit-progress-ring"
        title={`Session completion ${unit.completed}/${unit.total}; assessed mastery ${Math.round(unit.mastery * 100)}%`}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#147d73"
            strokeWidth="3"
            pathLength="100"
            strokeDasharray={`${percent} 100`}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span>
          {percent}%
          <small>
            {" "}
            · {unit.completed}/{unit.total} sessions · mastery {Math.round(unit.mastery * 100)}%
          </small>
        </span>
      </span>
    );
  }
  return (
    <section className="course-progress" aria-label="Course completion">
      {courses.map((c) => (
        <article key={c.id}>
          <h2>{c.title}</h2>
          <p>
            {c.completedModules}/{c.modules.length} enrolled modules complete (
            {Math.round((100 * c.completedModules) / (c.modules.length || 1))}%) · {c.completed}/
            {c.total} available sessions
          </p>
          <progress
            aria-label="Course module completion"
            max={c.modules.length || 1}
            value={c.completedModules}
          />
          <p>
            Counts cover your enrolled modules. Modules without sessions remain incomplete.
            Completion and assessed mastery are tracked separately.
          </p>
          {c.modules.map((m) => (
            <details key={m.id}>
              <summary>
                {m.code} · {m.completed}/{m.total} sessions (
                {Math.round((100 * m.completed) / (m.total || 1))}%) {m.complete ? "Complete" : ""}
              </summary>
              {m.units.length ? (
                m.units.map((u) => (
                  <p key={u.id}>
                    <a href={`/study/${u.id}`}>{u.code}</a> · {u.completed}/{u.total} sessions ·
                    mastery {Math.round(u.mastery * 100)}%
                  </p>
                ))
              ) : (
                <p>Learning units not yet published.</p>
              )}
            </details>
          ))}
        </article>
      ))}
    </section>
  );
}
