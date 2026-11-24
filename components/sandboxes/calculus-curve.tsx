"use client";

import { useEffect, useId, useState } from "react";
import { calculusCurve, type CalculusCurveId } from "../../lib/content/calculus-models";
import { VisualCheck } from "../visual-check";

export function CalculusCurve({ model }: { model: CalculusCurveId }) {
  const {
    title,
    formula,
    intervals,
    bounds: [min, max],
    yMax,
    at,
    slope,
    reference,
    readout,
  } = calculusCurve(model);
  const [position, setPosition] = useState(Math.round((min + max) * 50) / 100);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const clip = useId();
  const sx = (x: number) => 28 + ((x - min) * 340) / (max - min);
  const sy = (y: number) => 125 - (y * 94) / yMax;
  const defined =
    intervals.some(([left, right]) => position >= left && position <= right) ||
    !((model === "hole" && position === 2) || (model === "asymptote" && position === 1));
  const y = defined ? at(position) : NaN;
  const gradient = defined ? slope?.(position) : undefined;
  const path = (fn: (x: number) => number, left: number, right: number) =>
    Array.from({ length: 81 }, (_, i) => {
      const x = left + ((right - left) * i) / 80;
      return `${i === 0 ? "M" : "L"}${sx(x)},${sy(fn(x))}`;
    }).join(" ");
  return (
    <figure className="concept-sandbox" aria-label={title}>
      <figcaption>
        <h3>{title}</h3>
        <p>{formula}</p>
      </figcaption>
      <svg viewBox="0 0 396 252" width="100%" role="img" aria-label={title + " coordinate graph"}>
        <defs>
          <clipPath id={clip}>
            <rect x="28" y="24" width="340" height="202" />
          </clipPath>
        </defs>
        <path
          d={`M28 125H368${min <= 0 && max >= 0 ? `M${sx(0)} 24V226` : ""}`}
          stroke="var(--graph-axis)"
        />
        <text x="28" y="246" fill="currentColor">
          {min}
        </text>
        <text x="368" y="246" textAnchor="end" fill="currentColor">
          {max}
        </text>
        <g clipPath={`url(#${clip})`} fill="none">
          {reference && (
            <path
              d={path(reference, min, max)}
              stroke="var(--graph-secondary)"
              strokeDasharray="5 4"
              strokeWidth="2"
            />
          )}
          {model === "asymptote" && (
            <path d={`M${sx(1)} 24V226`} stroke="var(--graph-secondary)" strokeDasharray="5 4" />
          )}
          {intervals.map(([left, right]) => (
            <path
              d={path(at, left, right)}
              key={left}
              stroke="var(--graph-primary)"
              strokeWidth="3"
            />
          ))}
          {gradient !== undefined && Number.isFinite(gradient) && (
            <path
              d={path(
                (x) => y + gradient * (x - position),
                position - (max - min) / 9,
                position + (max - min) / 9,
              )}
              stroke="currentColor"
              strokeWidth="2"
            />
          )}
          {model === "hole" && (
            <circle
              cx={sx(2)}
              cy={sy(4)}
              r="5"
              fill="var(--surface-card)"
              stroke="var(--graph-primary)"
              strokeWidth="2"
            />
          )}
          {Number.isFinite(y) && (
            <circle cx={sx(position)} cy={sy(y)} r="5" fill="var(--graph-primary)" />
          )}
        </g>
      </svg>
      {reference && <small>Dashed curve: reference from the model description.</small>}
      <label>
        Input {position.toFixed(2)}
        <input
          aria-label="Graph input"
          type="range"
          min={min}
          max={max}
          step="0.01"
          value={position}
          disabled={!ready}
          onInput={(event) => setPosition(event.currentTarget.valueAsNumber)}
        />
      </label>
      <output aria-live="polite">
        {Number.isFinite(y) ? `Value ${y.toFixed(3)}` : "Undefined at this input"}
        {gradient === undefined
          ? ""
          : ` · Slope ${Number.isFinite(gradient) ? gradient.toFixed(3) : "undefined"}`}
      </output>
      <p>{readout}</p>
      {model === "corner" && (
        <VisualCheck
          check={{
            question: "At x = 0, how do the approaching slopes compare?",
            options: ["Both equal zero", "They have opposite signs"],
            answer: 1,
            feedback:
              "The left slope is −1 and the right slope is +1, so there is no derivative at the corner.",
          }}
        />
      )}
    </figure>
  );
}
