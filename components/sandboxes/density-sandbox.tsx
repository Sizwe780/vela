"use client";

import { useState } from "react";

export function DensitySandbox({
  initialMass = 40,
  initialVolume = 20,
}: { initialMass?: number; initialVolume?: number } = {}) {
  const [mass, setMass] = useState(initialMass);
  const [volume, setVolume] = useState(initialVolume);
  const fillHeight = (volume / 80) * 96;

  return (
    <figure className="session-visual science-sandbox chemistry-bench">
      <figcaption>Density lab · Mass per unit volume</figcaption>
      <div className="chemistry-bench-layout">
        <svg
          className="bench-vessel"
          viewBox="68 0 135 126"
          role="img"
          aria-label={`Cylinder filled to ${volume} millilitres`}
        >
          <rect
            x="82"
            y="12"
            width="62"
            height="96"
            rx="4"
            fill="none"
            stroke="var(--graph-axis)"
          />
          <rect
            x="83"
            y={108 - fillHeight}
            width="60"
            height={fillHeight}
            fill="var(--graph-primary)"
            opacity="0.48"
          />
          {[0, 20, 40, 60, 80].map((mark) => (
            <g key={mark}>
              <path d={`M144 ${108 - mark * 1.2}h9`} stroke="var(--graph-axis)" />
              <text x="160" y={112 - mark * 1.2} fontSize="12" fill="currentColor">
                {mark} mL
              </text>
            </g>
          ))}
        </svg>
        <div className="science-sandbox-controls">
          <label>
            Mass ({mass} g)
            <input
              type="range"
              min="5"
              max="160"
              step="5"
              value={mass}
              onChange={(event) => setMass(event.currentTarget.valueAsNumber)}
              aria-valuetext={`${mass} grams`}
            />
          </label>
          <label>
            Volume ({volume} mL)
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={volume}
              onChange={(event) => setVolume(event.currentTarget.valueAsNumber)}
              aria-valuetext={`${volume} millilitres`}
            />
          </label>
        </div>
      </div>
      <p>
        Read the total volume at the liquid level. One millilitre occupies exactly one cubic
        centimetre.
      </p>
      <output className="bench-result" aria-live="polite">
        {mass} g ÷ {volume} cm³ ≈ {(mass / volume).toFixed(2)} g/cm³
      </output>
    </figure>
  );
}
