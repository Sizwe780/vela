"use client";

import { useState } from "react";

export function BondingScale() {
  const [ionic, setIonic] = useState(true);
  return (
    <figure className="concept-sandbox" aria-label="Ionic lattice and molecular structure">
      <figcaption>
        <h3>What does the formula count?</h3>
        <p>
          Predict which structure continues past the edge of the picture. Then compare the models.
        </p>
      </figcaption>
      <div className="sandbox-presets">
        <button type="button" aria-pressed={ionic} onClick={() => setIonic(true)}>
          Sodium chloride crystal
        </button>
        <button type="button" aria-pressed={!ionic} onClick={() => setIonic(false)}>
          Hydrogen chloride gas
        </button>
      </div>
      <svg
        width="100%"
        viewBox="0 0 440 234"
        role="img"
        aria-label={
          ionic
            ? "Lattice slice with alternating sodium and chloride ions. Dashed edges indicate repetition in the crystal."
            : "Four separate hydrogen chloride molecules, each drawn as one hydrogen atom joined to one chlorine atom."
        }
      >
        {ionic ? (
          <>
            <rect
              x="91"
              y="11"
              width="258"
              height="210"
              rx="12"
              fill="none"
              stroke="currentColor"
              strokeDasharray="5 6"
            />
            {Array.from({ length: 20 }, (_, index) => {
              const row = Math.floor(index / 5);
              const column = index % 5;
              const sodium = (row + column) % 2 === 0;
              return (
                <g key={index} transform={`translate(${120 + 50 * column} ${40 + 50 * row})`}>
                  <circle
                    r={sodium ? 17 : 21}
                    fill={sodium ? "#def2e7" : "#f7e7d6"}
                    stroke={sodium ? "#27654e" : "#875434"}
                    strokeWidth="2"
                  />
                  <text textAnchor="middle" y="4" fill="#182d26" fontSize="13">
                    {sodium ? "Na⁺" : "Cl⁻"}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <g
              key={i}
              transform={`translate(${105 + (i % 2) * 190} ${63 + Math.floor(i / 2) * 100})`}
            >
              <path d="M0 0h45" stroke="currentColor" strokeWidth="3" />
              <circle r="16" fill="#def2e7" stroke="#27654e" strokeWidth="2" />
              <circle cx="46" r="24" fill="#f7e7d6" stroke="#875434" strokeWidth="2" />
              <text textAnchor="middle" y="4" fill="#182d26" fontSize="14">
                H
              </text>
              <text x="46" textAnchor="middle" y="4" fill="#182d26" fontSize="14">
                Cl
              </text>
            </g>
          ))
        )}
      </svg>
      <p aria-live="polite">
        {ionic
          ? "This slice repeats in three dimensions. NaCl gives the 1:1 ion ratio throughout the crystal."
          : "Each HCl molecule contains one hydrogen atom and one chlorine atom. The pairs represent separate molecules in the gas."}
      </p>
      <small>Original schematic. Particle sizes and spacing are illustrative.</small>
    </figure>
  );
}
