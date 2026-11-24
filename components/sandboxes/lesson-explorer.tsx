"use client";

import { useState } from "react";
import type { Exploration, ExplorationStage } from "../../lib/content/exploration";
import styles from "./lesson-explorer.module.css";

export function LessonExplorer({ model }: { model: Exploration }) {
  const [selected, setSelected] = useState(0);
  const stage = model.stages[selected];
  const extent = Math.max(
    1,
    ...model.stages.flatMap(
      ({ plot }) => plot?.points.flatMap(([, x, y]) => [Math.abs(x), Math.abs(y)]) ?? [],
    ),
  );
  return (
    <figure className="concept-sandbox" aria-label={model.title}>
      <figcaption>
        <h3>{model.title}</h3>
        <p>{model.prompt}</p>
      </figcaption>
      <div className="sandbox-presets sandbox-tabs" role="group" aria-label="Explore a case">
        {model.stages.map(({ label }, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {label}
          </button>
        ))}
      </div>
      {stage.plot && <CoordinateSketch plot={stage.plot} label={stage.label} extent={extent} />}
      <div className={styles.viewport}>
        <table className={styles.grid} aria-label={stage.label}>
          <thead>
            <tr>
              {model.columns.map((item) => (
                <th scope="col" key={item}>
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stage.rows.map(([name, ...values], index) => (
              <tr key={name} data-focus={stage.focus === index ? "true" : undefined}>
                <th scope="row">{name}</th>
                {values.map((value, column) => {
                  const scale = model.comparison?.column === column + 1 ? model.comparison : null;
                  return (
                    <td key={column}>
                      {value}
                      {scale && ` ${scale.unit}`}
                      {scale && (
                        <meter
                          className={styles.meter}
                          min={0}
                          max={scale.max}
                          value={Number(value)}
                          aria-hidden="true"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p role="status">{stage.interpretation}</p>
    </figure>
  );
}

function CoordinateSketch({
  plot,
  label,
  extent,
}: {
  plot: NonNullable<ExplorationStage["plot"]>;
  label: string;
  extent: number;
}) {
  const scale = 80 / extent;
  const xAt = (x: number) => 140 + x * scale;
  const yAt = (y: number) => 110 - y * scale;
  return (
    <svg
      viewBox="0 0 280 220"
      width="100%"
      height="220"
      role="img"
      aria-label={label + " coordinate sketch"}
    >
      <path d="M26 110H254M140 16V204" fill="none" stroke="var(--graph-axis)" />
      <text x="257" y="117" fill="currentColor">
        x
      </text>
      <text x="148" y="20" fill="currentColor">
        y
      </text>
      {plot.segments.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={xAt(plot.points[from][1])}
          y1={yAt(plot.points[from][2])}
          x2={xAt(plot.points[to][1])}
          y2={yAt(plot.points[to][2])}
          stroke="var(--graph-primary)"
          strokeWidth="3"
        />
      ))}
      {plot.points.map(([name, x, y]) => (
        <g key={name}>
          <circle cx={xAt(x)} cy={yAt(y)} r="4" fill="var(--graph-primary)" />
          <text x={xAt(x) + 7} y={yAt(y) - 7} fill="currentColor" fontSize="13">
            {name}
          </text>
        </g>
      ))}
    </svg>
  );
}
