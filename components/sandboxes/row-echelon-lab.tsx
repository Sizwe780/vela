"use client";
import { useState } from "react";
import { replaceSecondRow } from "../../lib/content/linear-models";
export function RowEchelonLab() {
  const [k, setK] = useState(0),
    [guides, setGuides] = useState(true);
  const rows = replaceSecondRow(k),
    echelon = rows[1][0] === 0;
  return (
    <figure className="concept-sandbox row-echelon-lab">
      <figcaption>
        <h3>An equivalent augmented matrix</h3>
        <p>
          The vertical bar separates the coefficients from the constants. Try making the entry below
          the first pivot zero.
        </p>
      </figcaption>
      <svg
        viewBox="0 0 480 245"
        role="img"
        aria-label={`Augmented matrix: row one ${rows[0].join(", ")}; row two ${rows[1].join(", ")}. A vertical line separates the last column.`}
      >
        <path
          d="M45 45H30V210H45M435 45H450V210H435"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M310 48V208" stroke="currentColor" strokeWidth="3" />
        {guides && (
          <>
            <rect
              x="70"
              y="140"
              width="90"
              height="58"
              rx="8"
              fill={echelon ? "var(--brand-soft)" : "var(--surface-soft)"}
            />
            <circle
              cx="115"
              cy="95"
              r="32"
              fill="none"
              stroke="var(--brand-strong)"
              strokeWidth="2"
            />
            {echelon && (
              <>
                <circle
                  cx="235"
                  cy="170"
                  r="32"
                  fill="none"
                  stroke="var(--brand-strong)"
                  strokeWidth="2"
                />
                <path
                  d="M65 130H175V205H290"
                  fill="none"
                  stroke="var(--brand-strong)"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
              </>
            )}
          </>
        )}
        {rows.flatMap((row, r) =>
          row.map((value, c) => (
            <text
              key={`${r}:${c}`}
              x={[115, 235, 375][c]}
              y={[95, 170][r]}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="currentColor"
              fontSize="30"
            >
              {String(value).replace("-", "−")}
            </text>
          )),
        )}
        <text x="115" y="30" textAnchor="middle" fill="currentColor" fontSize="13">
          x
        </text>
        <text x="235" y="30" textAnchor="middle" fill="currentColor" fontSize="13">
          y
        </text>
        <text x="375" y="30" textAnchor="middle" fill="currentColor" fontSize="13">
          constant
        </text>
      </svg>
      <label>
        Row multiplier k: <output>{k}</output>
        <div className="lab-slider-controls">
          <button
            type="button"
            aria-label="Decrease row multiplier"
            disabled={k <= -5}
            onClick={() => setK((n) => n - 1)}
          >
            −
          </button>
          <input
            aria-label="Row multiplier k"
            type="range"
            min={-5}
            max={3}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
          />
          <button
            type="button"
            aria-label="Increase row multiplier"
            disabled={k >= 3}
            onClick={() => setK((n) => n + 1)}
          >
            +
          </button>
        </div>
      </label>
      <label>
        <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />{" "}
        Show pivot guides
      </label>
      <p>
        Apply R₂ ← R₂ + kR₁ to the original rows. Its first entry becomes 3 + k. Which value makes
        it zero?
      </p>
      <p role="status">
        {echelon
          ? "Echelon form reached: the second pivot is in column 2, below and to the right of the first. This is not yet reduced echelon form."
          : "Both rows still start in column 1. Eliminate the shaded entry so the next pivot moves to the right."}
      </p>
      <small>
        Row replacement preserves the simultaneous solution set and the coefficient determinant, −5.
        These controls are an exploration, not a graded attempt.
      </small>
    </figure>
  );
}
