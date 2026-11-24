"use client";

import { useState } from "react";
import { VisualCheck } from "../visual-check";

type Point = readonly [number, number, number];
const normal: Point = [1, 0, 2];
const foot: Point = [2, 0, 1];
const patch: Point[] = [
  [-1, -2, 2.5],
  [4, -2, 0],
  [4, 2, 0],
  [-1, 2, 2.5],
];

export function SpatialPlane({ mode }: { mode: "normal" | "intersection" | "distance" }) {
  const [azimuth, setAzimuth] = useState(35);
  const [amount, setAmount] = useState(1);
  const angle = (azimuth * Math.PI) / 180;
  const project = ([x, y, z]: Point) => {
    const horizontal = x * Math.cos(angle) - y * Math.sin(angle);
    const depth = x * Math.sin(angle) + y * Math.cos(angle);
    return [175 + horizontal * 26, 162 + depth * 10 - z * 27] as const;
  };
  const sample: Point = [foot[0] + amount, 0, foot[2] + 2 * amount];
  const normalTip: Point = [foot[0] + normal[0], 0, foot[2] + normal[2]];
  const [px, py] = project(sample);
  const [hx, hy] = project(foot);
  const [nx, ny] = project(normalTip);
  return (
    <figure className="concept-sandbox" aria-label="Rotate a plane and its normal">
      <figcaption>
        <h3>Rotate a plane and its normal</h3>
        <p>
          The shaded patch represents the plane x + 2z = 4. Rotate the view and follow the line
          through H in the normal direction (1, 0, 2).
        </p>
      </figcaption>
      <svg
        viewBox="0 0 350 245"
        width="100%"
        role="img"
        aria-label="Projected three-dimensional plane, perpendicular line and labelled intersection"
      >
        {(
          [
            [4, 0, 0],
            [0, 4, 0],
            [0, 0, 4],
          ] as Point[]
        ).map((endpoint, index) => {
          const [x, y] = project(endpoint);
          return (
            <g key={index}>
              <line
                x1="175"
                y1="162"
                x2={x}
                y2={y}
                stroke="var(--graph-axis)"
                strokeDasharray="4 3"
              />
              <text x={x + 5} y={y} fill="currentColor">
                {"xyz"[index]}
              </text>
            </g>
          );
        })}
        <polygon
          points={patch.map((point) => project(point).join(",")).join(" ")}
          fill="var(--brand-soft)"
          stroke="var(--graph-primary)"
          strokeWidth="2"
        />
        <line
          x1={hx}
          y1={hy}
          x2={nx}
          y2={ny}
          stroke="var(--graph-secondary)"
          strokeWidth="3"
          strokeDasharray="4 3"
        />
        <line x1={hx} y1={hy} x2={px} y2={py} stroke="var(--graph-primary)" strokeWidth="3" />
        {amount !== 0 && (
          <>
            <circle cx={px} cy={py} r="5" fill="var(--graph-primary)" />
            <text x={px + 8} y={py - 4} fill="currentColor">
              Q
            </text>
          </>
        )}
        <circle cx={hx} cy={hy} r="5" fill="currentColor" />
        <text x={hx + 9} y={hy + 17} fill="currentColor">
          {amount === 0 ? "H = Q" : "H"}
        </text>
      </svg>
      <label>
        Rotate the view
        <input
          aria-label="Rotate the view"
          type="range"
          min="0"
          max="180"
          value={azimuth}
          onChange={(event) => setAzimuth(event.currentTarget.valueAsNumber)}
        />
      </label>
      <label>
        Normal parameter t
        <input
          aria-label="Normal parameter t"
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={amount}
          onChange={(event) => setAmount(event.currentTarget.valueAsNumber)}
        />
      </label>
      <p role="status">
        Q = ({sample.map((value) => value.toFixed(1)).join(", ")}).{" "}
        {mode === "distance"
          ? `Perpendicular distance = ${Math.abs(amount * Math.sqrt(5)).toFixed(2)}.`
          : `Substituting Q gives x + 2z = ${(4 + 5 * amount).toFixed(1)}.`}
      </p>
      <VisualCheck
        check={{
          question: "When is Q on the plane?",
          options: ["t = 0", "Every t"],
          answer: 0,
          feedback: "Only t = 0 gives x + 2z = 4. That is the intersection H = (2, 0, 1).",
        }}
      />
    </figure>
  );
}
