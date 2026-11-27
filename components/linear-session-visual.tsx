"use client";
import { useState } from "react";
import { RowEchelonLab } from "./sandboxes/row-echelon-lab";
import { Markdown } from "./markdown";
import {
  transformVector,
  determinantModel,
  combineVectors,
  nonzeroComplexRoots,
} from "../lib/content/linear-models";
export function LinearSessionVisual({ kind }: { kind: string }) {
  const [a, setA] = useState(1),
    [b, setB] = useState(1),
    [angle, setAngle] = useState(30),
    [r, setR] = useState(2),
    [n, setN] = useState(3),
    [inverse, setInverse] = useState(false);
  if (kind === "row-operation") return <RowEchelonLab />;
  const px = (x: number) => 240 + x * 29,
    py = (y: number) => 190 - y * 29;
  const arrow = (x: number, y: number, color: string, key: string) => (
    <g key={key}>
      <line x1={px(0)} y1={py(0)} x2={px(x)} y2={py(y)} stroke={color} strokeWidth="3" />
      <circle cx={px(x)} cy={py(y)} r="4" fill={color} />
    </g>
  );
  const axes = (
    <>
      {[-5, -3, -1, 1, 3, 5].map((v) => (
        <g key={v}>
          <path d={`M${px(v)} 25V355M70 ${py(v)}H410`} stroke="var(--graph-grid)" />
          <text x={px(v)} y={py(0) + 15} textAnchor="middle" fontSize="10">
            {v}
          </text>
          <text x={px(0) + 5} y={py(v)} fontSize="10">
            {v}
          </text>
        </g>
      ))}
      <path d={`M65 ${py(0)}H415M${px(0)} 20V360`} stroke="var(--graph-axis)" />
    </>
  );
  const slider = (
    label: string,
    value: number,
    set: (x: number) => void,
    min = -2,
    max = 2,
    step = 0.1,
  ) => (
    <label>
      {label}: {value.toFixed(2)}
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  let title = "",
    picture: React.ReactNode,
    controls: React.ReactNode,
    readout = "";
  if (kind === "matrix-transform") {
    const [x, y] = transformVector(a, b, inverse);
    title = inverse ? "Undo a matrix action" : "A matrix acts on a vector";
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        {arrow(a, b, "var(--graph-secondary)", "in")}
        {arrow(x, y, "var(--graph-primary)", "out")}
      </svg>
    );
    controls = (
      <>
        {slider("Input x", a, setA)}
        {slider("Input y", b, setB)}
        <button onClick={() => setInverse((v) => !v)}>
          {inverse ? "Use A" : "Use inverse of A"}
        </button>
      </>
    );
    readout = `Grey is the input; green is (${x.toFixed(2)},${y.toFixed(2)}). A=[[1,2],[-1,1]], detA=3. The inverse is(1/3)[[1,-2],[1,1]]. Reversing a mapping changes the rule, not the stored input.`;
  } else if (kind === "determinant-area") {
    title = "Signed area and a changing column";
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        <polygon
          points={`${px(0)},${py(0)} ${px(2)},${py(1)} ${px(2 + a)},${py(3)} ${px(a)},${py(2)}`}
          fill="#17655333"
          stroke="var(--graph-primary)"
        />
        {arrow(2, 1, "var(--graph-primary)", "u")}
        {arrow(a, 2, "#b76829", "v")}
      </svg>
    );
    controls = slider("Second column horizontal entry s", a, setA, -2, 5, 0.1);
    readout = `Columns are(2,1) and(s,2). Signed determinant ${determinantModel(a).toFixed(2)}; area ${Math.abs(determinantModel(a)).toFixed(2)}. At a zero determinant the parallelogram collapses; a negative determinant reverses orientation.`;
  } else if (kind === "vector-combination") {
    const [x, y] = combineVectors(a, b);
    title = "Build a vector from two directions";
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        {arrow(2 * a, a, "#b76829", "u")}
        {arrow(-b, 2 * b, "var(--graph-secondary)", "v")}
        {arrow(x, y, "var(--graph-primary)", "sum")}
      </svg>
    );
    controls = (
      <>
        {slider("Coefficient a", a, setA)}
        {slider("Coefficient b", b, setB)}
      </>
    );
    readout = `a(2,1)+b(-1,2)=(${x.toFixed(2)},${y.toFixed(2)}). Change one coefficient at a time and describe its effect before changing both.`;
  } else if (kind === "vector-projection") {
    const x = 3 * Math.cos((angle * Math.PI) / 180),
      y = 3 * Math.sin((angle * Math.PI) / 180);
    title = "Projection separates parallel and perpendicular parts";
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        {arrow(x, y, "var(--graph-primary)", "u")}
        {arrow(4, 0, "var(--graph-secondary)", "v")}
        <line x1={px(x)} y1={py(y)} x2={px(x)} y2={py(0)} stroke="#b76829" strokeDasharray="5 4" />
        {arrow(x, 0, "#b76829", "p")}
      </svg>
    );
    controls = slider("Vector angle (degrees)", angle, setAngle, 0, 360, 1);
    readout = `u has length3 and v=(4,0). u·v=${(4 * x).toFixed(2)}. Projection onto v=(${x.toFixed(2)},0); the residual is perpendicular to v. A projection can point opposite to v.`;
  } else if (kind === "complex-plane") {
    const x = r * Math.cos((angle * Math.PI) / 180),
      y = r * Math.sin((angle * Math.PI) / 180);
    const roots = nonzeroComplexRoots(r, angle, n);
    title = "A complex number and its distinct roots";
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        {arrow(x, y, "var(--graph-primary)", "z")}
        {roots.map(([u, v], i) => (
          <circle key={i} cx={px(u)} cy={py(v)} r="5" fill="#b76829" />
        ))}
      </svg>
    );
    controls = (
      <>
        {slider("Modulus", r, setR, 0.5, 4, 0.1)}
        {slider("Angle representative (degrees)", angle, setAngle, -180, 180, 1)}
        {slider("Root degree n", n, setN, 2, 6, 1)}
      </>
    );
    readout = `Green point z≈${x.toFixed(2)}+(${y.toFixed(2)})i. Orange points are all${n}roots: modulus r^(1/n), angles(θ+2πk)/n for k=0,…,n−1. Formula angles are in radians; slider degrees are converted first. The positive modulus excludes the special zero case.`;
  } else {
    title = "How constraints meet";
    const y = Math.abs(a - 1) < 1e-8 ? null : (b - 5) / (a - 1),
      x = y === null ? null : 5 - y;
    picture = (
      <svg viewBox="0 0 480 380" role="img" aria-label={title}>
        {axes}
        <path
          d={`M${px(-5)} ${py(10)}L${px(5)} ${py(0)}`}
          stroke="var(--graph-primary)"
          strokeWidth="2"
        />
        {Math.abs(a) > 0.001 ? (
          <path
            d={`M${px(-5)} ${py((b + 5) / a)}L${px(5)} ${py((b - 5) / a)}`}
            stroke="#b76829"
            strokeWidth="2"
          />
        ) : (
          <line x1={px(b)} x2={px(b)} y1="20" y2="360" stroke="#b76829" />
        )}
        {x !== null && y !== null && Math.abs(x) <= 6 && Math.abs(y) <= 6 && (
          <circle cx={px(x)} cy={py(y)} r="5" fill="#24574e" />
        )}
      </svg>
    );
    controls = (
      <>
        {slider("Second equation y-coefficient a", a, setA, -1, 3, 0.25)}
        {slider("Second equation right side b", b, setB, -5, 5, 0.5)}
      </>
    );
    readout = `Equations: x+y=5 and x+ay=b. ${y === null ? (b === 5 ? "Same constraint: infinitely many common points." : "Parallel distinct constraints: no common point.") : `One intersection${Math.abs(x!) > 6 || Math.abs(y) > 6 ? ", outside this plotting window" : ""}. Substitute any candidate into both equations to verify it.`}`;
  }
  return (
    <figure className="session-visual linear-visual">
      <figcaption>{title}</figcaption>
      {picture}
      <div>{controls}</div>
      <p>{readout}</p>
    </figure>
  );
}
