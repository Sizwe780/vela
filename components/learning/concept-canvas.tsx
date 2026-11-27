"use client";
import { useId, useState, useRef } from "react";
import type { LearningConcept } from "../../lib/learning/types";
export function ConceptCanvas({
  nodes,
  onSelect,
  selected,
}: {
  nodes: LearningConcept[];
  onSelect: (id: string) => void;
  selected?: string;
}) {
  const [zoom, setZoom] = useState(100),
    marker = useId().replace(/:/g, "");
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const levels = new Map<string, number>();
  function level(id: string): number {
    if (levels.has(id)) return levels.get(id)!;
    const node = nodes.find((n) => n.id === id);
    const value = node?.prerequisites.length ? 1 + Math.max(...node.prerequisites.map(level)) : 0;
    levels.set(id, value);
    return value;
  }
  const groups = new Map<number, number>();
  const rank = (id: string) =>
    Math.min(...nodes.flatMap((n, i) => (n.prerequisites.includes(id) ? [i] : [])));
  const ordered = [...nodes].sort(
    (a, b) =>
      level(a.id) - level(b.id) || rank(a.id) - rank(b.id) || nodes.indexOf(a) - nodes.indexOf(b),
  );
  const positions = ordered.map((n) => {
    const l = level(n.id),
      row = groups.get(l) ?? 0;
    groups.set(l, row + 1);
    return { ...n, x: 30 + l * 260, y: 30 + row * 135 };
  });
  const width = Math.max(500, ...positions.map((p) => p.x + 240)),
    height = Math.max(180, ...positions.map((p) => p.y + 125));
  if (!nodes.length)
    return (
      <p>
        Concept mapping is not yet published for this selection. Your regular lessons and outcome
        progress remain available.
      </p>
    );
  return (
    <section className="concept-constellation" aria-label="Concept prerequisite map">
      <label>
        Map zoom{" "}
        <input
          type="range"
          aria-label="Map zoom"
          min={15}
          max={150}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <output>{zoom}%</output>
      </label>
      <button
        type="button"
        onClick={() => {
          const w = viewport.current?.clientWidth ?? width;
          setZoom(Math.max(15, Math.min(100, Math.floor((w / width) * 100))));
          viewport.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
        }}
      >
        Fit to view
      </button>
      <p className="learning-caption">
        Arrows show curated prerequisites. Select a concept for a short refresher and independent
        check. Pan horizontally on a small screen.
      </p>
      <div
        className="concept-map-scroll"
        ref={viewport}
        tabIndex={0}
        aria-label="Scrollable concept map"
        onPointerDown={(e) => {
          if (
            e.pointerType !== "mouse" ||
            (e.target instanceof Element && e.target.closest("[role=button]"))
          )
            return;
          drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            e.currentTarget.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: (width * zoom) / 100, minWidth: 320 }}
          aria-label="Interactive concept graph"
          role="group"
        >
          <defs>
            <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>
          {positions.flatMap((n) =>
            n.prerequisites.map((id) => {
              const p = positions.find((p) => p.id === id);
              return p ? (
                <path
                  className="concept-edge"
                  key={id + n.id}
                  d={`M${p.x + 220},${p.y + 38} C${p.x + 245},${p.y + 38} ${n.x - 25},${n.y + 38} ${n.x},${n.y + 38}`}
                  fill="none"
                  markerEnd={`url(#${marker})`}
                />
              ) : null;
            }),
          )}
          {positions.map((n) => (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={`${n.title}: ${n.probability === null ? "ready to practise" : Math.round(n.probability * 100) + " percent provisional practice estimate"}`}
              aria-pressed={n.id === selected}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(n.id);
                }
              }}
              className={`concept-node ${n.probability === null ? "unobserved" : n.probability >= 0.85 && n.observations >= 3 ? "consistent" : "developing"}`}
            >
              <rect x={n.x} y={n.y} width={220} height={110} rx={14} />
              <title>{n.title}</title>
              <text x={n.x + 14} y={n.y + 24}>
                {wrapTitle(n.title).map((line, i) => (
                  <tspan key={i} x={n.x + 14} dy={i ? 16 : 0}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text className="concept-node-detail" x={n.x + 14} y={n.y + 92}>
                {n.probability === null
                  ? "Ready to practise"
                  : `${Math.round(n.probability * 100)}% estimate · ${n.observations} ${n.observations === 1 ? "check" : "checks"}`}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="learning-caption">
        Gray: no direct evidence. Warm: developing practice evidence. Green: more consistent
        practice estimates with at least three observations. These colors do not certify mastery or
        diagnose a root cause.
      </p>
    </section>
  );
}

function wrapTitle(title: string) {
  const lines: string[] = [""];
  for (const word of title.split(" ")) {
    const last = lines.length - 1;
    if ((lines[last] + " " + word).trim().length > 27 && lines[last]) lines.push(word);
    else lines[last] = (lines[last] + " " + word).trim();
  }
  return lines;
}
