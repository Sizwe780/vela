"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth/client";
import { useStudentResource } from "../../lib/student/client";
import { watchProgress } from "../../lib/progress-events";
import type { LearningView } from "../../lib/learning/types";
import { ConceptCanvas } from "./concept-canvas";
import { ConceptDetail } from "./concept-detail";
import { LearningPreferences } from "./learning-preferences";
export function AcademicBriefing({ fallback }: { fallback: ReactNode }) {
  const { data, error, reload, userId } = useStudentResource<LearningView>("/api/learning"),
    { data: session } = authClient.useSession();
  useEffect(() => watchProgress(reload), [reload]);
  if (data && data.ownerId !== userId)
    return <p role="status">Your account changed. Reload your learning workspace.</p>;
  if (!data)
    return (
      <>
        {fallback}
        {error && <p role="status">Personalized briefing is unavailable: {error}</p>}
      </>
    );
  const first = data.recommendations[0],
    name = session?.user?.name?.trim().split(/\s+/)[0] ?? "Learner",
    slot = data.periods[0],
    bridge = data.concepts.find((n) => new Set(n.mappings.map((m) => m.moduleId)).size > 1);
  return (
    <section className="academic-briefing">
      <span className="eyebrow">ACADEMIC MASTER · YOUR LEARNING BRIEFING</span>
      <h1>Welcome back, {name}.</h1>
      <p>
        {data.progress.completedSessions}/{data.progress.publishedSessions}{" "}
        {data.progress.publishedSessions === 1 ? "reading milestone" : "reading milestones"} ·{" "}
        {data.modules.length} {data.modules.length === 1 ? "enrolled module" : "enrolled modules"}{" "}
        with published units. Reading completion is separate from assessed practice.
      </p>
      {first ? (
        <p>
          <strong>A useful next step: {first.title}.</strong> {first.reason}
        </p>
      ) : (
        <p>
          Select your modules to build a learning path. Concept-specific maps will appear as their
          mappings are published.
        </p>
      )}
      {slot ? (
        <p>
          Your next entered availability: {new Date(slot.startAt).toLocaleString()}. Suggested study
          block: {slot.minutes} {slot.minutes === 1 ? "minute" : "minutes"}.
        </p>
      ) : (
        <p>Add your available study periods for private scheduling suggestions.</p>
      )}
      {bridge && (
        <p className="concept-horizon">
          Cross-module horizon: {bridge.title} connects{" "}
          {Array.from(new Set(bridge.mappings.map((m) => m.moduleCode))).join(" and ")}.{" "}
          {bridge.observations
            ? "Your direct checks contribute to one shared concept estimate."
            : "Try a direct check before treating it as a strength."}
        </p>
      )}
      <div className="learning-actions">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("vela-open-master", { detail: { conceptId: first?.conceptId } }),
            )
          }
        >
          Open my learning briefing
        </button>
        <Link href="/learning-map">Explore concept connections</Link>
      </div>
    </section>
  );
}
export function LearningPanel({
  moduleId,
  initialConcept,
}: {
  moduleId?: string;
  initialConcept?: string;
}) {
  const resource = useStudentResource<LearningView>(
      `/api/learning${moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : ""}`,
    ),
    [selected, setSelected] = useState(initialConcept ?? "");
  useEffect(() => setSelected(initialConcept ?? ""), [initialConcept, moduleId]);
  useEffect(() => watchProgress(resource.reload), [resource.reload]);
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) resource.reload();
    }, 30000);
    return () => clearInterval(t);
  }, [resource.reload]);
  if (!resource.data)
    return (
      <p role="status">
        {resource.error ||
          (resource.loading
            ? "Loading your learning context…"
            : "Sign in to view your learning context.")}
      </p>
    );
  if (resource.data.ownerId !== resource.userId)
    return <p role="status">Your account changed. Reload your learning workspace.</p>;
  const view = resource.data,
    node = view.concepts.find((n) => n.id === selected) ?? view.concepts[0];
  return (
    <div className="learning-panel">
      <p>
        {view.progress.completedSessions}/{view.progress.publishedSessions}{" "}
        {view.progress.publishedSessions === 1 ? "reading milestone" : "reading milestones"}.
        Concept estimates use separate, directly assessed practice.
      </p>
      <nav className="vela-switcher" aria-label="Concept map scope">
        <Link href="/learning-map" aria-current={moduleId ? undefined : "page"}>
          All enrolled modules
        </Link>
        {view.modules.map((m) => (
          <Link
            key={m.id}
            href={`/learning-map?moduleId=${encodeURIComponent(m.id)}`}
            aria-current={m.id === moduleId ? "page" : undefined}
          >
            {m.code}
          </Link>
        ))}
      </nav>
      <div className="concept-workspace">
        <ConceptCanvas nodes={view.concepts} selected={node?.id} onSelect={setSelected} />
        {node && (
          <ConceptDetail
            key={view.ownerId + (moduleId ?? "all") + node.id}
            node={node}
            view={view}
            onSaved={resource.reload}
          />
        )}
      </div>
      <p className="learning-caption">{view.model}. Estimates are based on direct checks.</p>
      <div className="learning-recommendations">
        {view.recommendations.map((r) => (
          <button type="button" key={r.conceptId} onClick={() => setSelected(r.conceptId)}>
            <strong>{r.title}</strong>
            <span>{r.reason}</span>
          </button>
        ))}
      </div>
      <section className="learning-periods">
        <h2>Suggested study periods</h2>
        {view.periods.length ? (
          <ul>
            {view.periods.map((s) => (
              <li key={s.startAt}>
                <time dateTime={s.startAt}>{new Date(s.startAt).toLocaleString()}</time> ·{" "}
                {s.minutes} {s.minutes === 1 ? "minute" : "minutes"} within your{" "}
                {s.availableMinutes}-minute availability
              </li>
            ))}
          </ul>
        ) : (
          <p>No future availability entered. Add periods below when you are ready.</p>
        )}
      </section>
      <LearningPreferences key={view.ownerId} view={view} onSaved={resource.reload} />
      {resource.error && <p role="status">{resource.error}</p>}
    </div>
  );
}
