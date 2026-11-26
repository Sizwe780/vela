import { useId } from "react";
import styles from "./teaching-framework.module.css";

export function FrameworkDiagram({
  framework,
  selected,
  count,
}: {
  framework: string;
  selected: number;
  count: number;
}) {
  const arrowId = useId();
  if (framework === "tpack") {
    const parts = [
      [145, 105, "Content"],
      [255, 105, "Pedagogy"],
      [200, 181, "Technology"],
    ] as const;
    return (
      <svg
        className={styles.diagram}
        viewBox="0 0 400 265"
        role="img"
        aria-label="Three overlapping circles for content, pedagogy and technology with a shared centre"
      >
        {parts.map(([x, y, label], index) => (
          <circle
            key={label}
            cx={x}
            cy={y}
            r="78"
            className={styles.node}
            data-active={selected === index}
          />
        ))}
        <text x="113" y="93">
          Content
        </text>
        <text x="286" y="93">
          Pedagogy
        </text>
        <text x="200" y="217">
          Technology
        </text>
        <circle cx="200" cy="129" r="21" className={styles.node} data-active={selected === 3} />
        <text x="200" y="134">
          All 3
        </text>
      </svg>
    );
  }
  if (framework === "teaching_philosophy" || framework === "instruction_choices") {
    return (
      <svg
        className={styles.diagram}
        viewBox="0 0 400 120"
        role="img"
        aria-label="Spectrum of teaching choices from explicit guidance to learner exploration"
      >
        <path className={styles.edges} d="M55 50H345" />
        {[55, 200, 345].map((x, i) => (
          <circle
            cx={x}
            cy="50"
            r="15"
            key={x}
            className={styles.node}
            data-active={selected === (framework === "teaching_philosophy" ? [1, 2, 0][i] : i)}
          />
        ))}
        <text x="75" y="92">
          Explicit guidance
        </text>
        <text x="200" y="92">
          Combined
        </text>
        <text x="320" y="92">
          Exploration
        </text>
      </svg>
    );
  }
  const cycle = framework === "reflection_cycle" || framework === "learning_community";
  const positions = Array.from({ length: count }, (_, i) => {
    const theta = (2 * Math.PI * i) / count - Math.PI / 2;
    return [200 + 98 * Math.cos(theta), 129 + 98 * Math.sin(theta)] as const;
  });
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 400 258"
      role="img"
      aria-label={
        cycle
          ? `${count} ${count === 1 ? "stage" : "stages"} connected in a clockwise cycle`
          : "Seven professional roles connected around shared learner needs"
      }
    >
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8Z" fill="currentColor" />
        </marker>
      </defs>
      {positions.map(([x, y], i) => {
        const [nx, ny] = positions[(i + 1) % count];
        return (
          <path
            key={i}
            className={styles.edges}
            data-active={selected === i}
            d={`M${x + (nx - x) * 0.22} ${y + (ny - y) * 0.22}L${nx - (nx - x) * 0.25} ${ny - (ny - y) * 0.25}`}
            markerEnd={cycle ? `url(#${arrowId})` : undefined}
          />
        );
      })}
      {!cycle &&
        positions.map(([x, y], i) => (
          <path key={i} className={styles.edges} d={`M200 129L${x} ${y}`} />
        ))}
      <circle cx="200" cy="129" r="42" className={styles.node} />
      <text x="200" y="134">
        {cycle ? "Reflect" : "Learners"}
      </text>
      {positions.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="19" className={styles.node} data-active={i === selected} />
          <text x={x} y={y + 5}>
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
