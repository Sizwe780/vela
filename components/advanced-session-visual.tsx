"use client";
import { useState } from "react";
export function AdvancedSessionVisual({ kind }: { kind: "composition" | "optimization" }) {
  const chain = kind === "composition";
  const [at, setAt] = useState(chain ? 0.5 : 12);
  const min = chain ? -1 : 0,
    max = chain ? 1 : 42,
    top = chain ? 7000 : 950;
  const f = (x: number) => (chain ? (2 * x ** 3 + 7) ** 4 : x * (84 - 2 * x));
  const slope = chain ? 24 * at ** 2 * (2 * at ** 3 + 7) ** 3 : 84 - 4 * at;
  const px = (x: number) => 45 + ((x - min) / (max - min)) * 390,
    py = (y: number) => 225 - (y / top) * 190;
  const path = Array.from({ length: 121 }, (_, i) => {
    const x = min + (i * (max - min)) / 120;
    return `${i ? "L" : "M"}${px(x)},${py(f(x))}`;
  }).join(" ");
  return (
    <figure className="session-visual">
      <figcaption>
        {chain
          ? "Compose two rates: H(x) = (2x³ + 7)⁴"
          : "Optimise a three-sided enclosure: A(w) = w(84 − 2w)"}
      </figcaption>
      <svg
        viewBox="0 0 480 260"
        role="img"
        aria-label={
          chain
            ? "Interactive composition curve and its tangent"
            : "Interactive area parabola for a three-sided enclosure"
        }
      >
        <path d="M45 25V225H445" fill="none" stroke="var(--graph-axis)" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <text x={px(min + t * (max - min))} y="247" textAnchor="middle" fontSize="10">
              {(min + t * (max - min)).toFixed(chain ? 1 : 0)}
            </text>
            <text x="4" y={py(t * top) + 3} fontSize="10">
              {(t * top).toFixed(0)}
            </text>
          </g>
        ))}
        <path d={path} stroke="var(--graph-primary)" strokeWidth="3" fill="none" />
        <line
          x1={px(at - (max - min) / 10)}
          x2={px(at + (max - min) / 10)}
          y1={py(f(at) - (slope * (max - min)) / 10)}
          y2={py(f(at) + (slope * (max - min)) / 10)}
          stroke="#b76829"
          strokeWidth="2"
        />
        <circle cx={px(at)} cy={py(f(at))} r="5" fill="var(--graph-primary)" />
      </svg>
      <label>
        {chain ? "Input x" : "Width w (metres)"} = {at.toFixed(2)}
        <input
          type="range"
          min={chain ? -1 : 1}
          max={chain ? 1 : 41}
          step={chain ? 0.01 : 0.5}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
        />
      </label>
      <output>
        {chain
          ? `Inner rate 6x² = ${(6 * at ** 2).toFixed(3)}; outer rate 4u³ = ${(4 * (2 * at ** 3 + 7) ** 3).toFixed(3)}; product H′ = ${slope.toFixed(3)}.`
          : `Other side ${(84 - 2 * at).toFixed(1)} m; area ${f(at).toFixed(1)} m²; A′ = ${slope.toFixed(1)} m. Explore widths to locate the maximum.`}
      </output>
      <p>
        {chain
          ? "The tangent changes according to both rate multipliers. This is a visual check, not a substitute for the chain-rule derivation."
          : "The model assumes one existing straight wall and84 metres of fencing for the other three sides. Endpoints are excluded because they collapse the enclosure."}
      </p>
    </figure>
  );
}
