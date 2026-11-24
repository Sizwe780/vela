"use client";

import { useState } from "react";
import { VisualCheck } from "../visual-check";

export function OrbitalOverlap() {
  const [pi, setPi] = useState(false);
  const label = pi
    ? "Side-by-side overlap with a node on the bond axis"
    : "End-on overlap along the bond axis";
  return (
    <figure className="concept-sandbox" aria-label="Explore orbital overlap">
      <figcaption>
        <h3>Find the overlap relative to the bond axis</h3>
        <p>
          Follow the dashed line joining the nuclei. Predict where overlap will appear when the
          orbitals turn sideways.
        </p>
      </figcaption>
      <div className="sandbox-presets sandbox-tabs" role="group" aria-label="Overlap geometry">
        <button type="button" aria-pressed={!pi} onClick={() => setPi(false)}>
          End-on · σ
        </button>
        <button type="button" aria-pressed={pi} onClick={() => setPi(true)}>
          Side-by-side · π
        </button>
      </div>
      <svg viewBox="0 0 380 196" width="100%" role="img" aria-label={label}>
        <path d="M30 92H350" stroke="var(--graph-axis)" strokeDasharray="5 5" />
        {pi ? (
          <>
            {[54, 130].map((y) => (
              <g
                key={y}
                fill="var(--graph-primary)"
                fillOpacity="0.23"
                stroke="var(--graph-primary)"
              >
                <ellipse cx="150" cy={y} rx="58" ry="26" />
                <ellipse cx="230" cy={y} rx="58" ry="26" />
              </g>
            ))}
          </>
        ) : (
          <g fill="var(--graph-primary)" fillOpacity="0.23" stroke="var(--graph-primary)">
            {[112, 174, 206, 268].map((x) => (
              <ellipse key={x} cx={x} cy="92" rx="34" ry="25" />
            ))}
          </g>
        )}
        <circle cx="150" cy="92" r="4" fill="currentColor" />
        <circle cx="230" cy="92" r="4" fill="currentColor" />
        <text x="190" y="178" textAnchor="middle" fontSize="14" fill="currentColor">
          Dashed line: internuclear axis
        </text>
      </svg>
      <p role="status">
        {pi
          ? "Look for the darker overlap regions on either side of the axis. The axis lies in a nodal plane for this π bond."
          : "The inner lobes overlap along the axis to form this σ bond."}
      </p>
      <small>
        Original geometry schematic. The drawing omits orbital phases and does not plot probability
        density.
      </small>
      <VisualCheck
        check={{
          question: "In the π case, where are the two overlap regions?",
          options: ["Along the dashed axis", "On opposite sides of the axis"],
          answer: 1,
          feedback:
            "Side-by-side overlap lies on either side of the bond axis, which is in the nodal plane.",
        }}
      />
    </figure>
  );
}
