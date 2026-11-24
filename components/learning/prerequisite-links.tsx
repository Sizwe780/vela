"use client";
import { useStudentResource } from "../../lib/student/client";
import type { LearningView } from "../../lib/learning/types";
export function PrerequisiteLinks({
  moduleId,
  sessionId,
}: {
  moduleId: string;
  sessionId: string;
}) {
  const { data, userId } = useStudentResource<LearningView>(
    `/api/learning?moduleId=${encodeURIComponent(moduleId)}`,
  );
  if (data && data.ownerId !== userId) return null;
  const ids = new Set(
    data?.concepts
      .filter((n) => n.mappings.some((m) => m.sessionId === sessionId))
      .flatMap((n) => n.prerequisites),
  );
  const prerequisites = data?.concepts.filter((n) => ids.has(n.id)) ?? [];
  if (!prerequisites.length) return null;
  return (
    <aside className="prerequisite-links" aria-label="Session prerequisites">
      <span>Builds on</span>
      {prerequisites.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("vela-open-master", { detail: { moduleId, conceptId: n.id } }),
            )
          }
        >
          {n.title} ·{" "}
          {n.probability === null
            ? "not checked"
            : `${Math.round(n.probability * 100)}% practice estimate`}
        </button>
      ))}
    </aside>
  );
}
