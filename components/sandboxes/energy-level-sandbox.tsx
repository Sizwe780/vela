"use client";

import { useId, useState } from "react";

const levels = [0, 2, 5];
const diagramY = (energy: number) => 126 - 21 * energy;

export function EnergyLevelSandbox() {
  const arrowId = useId();
  const [initial, setInitial] = useState(0);
  const [final, setFinal] = useState(2);
  const change = final - initial;
  const photon = Math.round(1240 / Math.abs(change));
  const process = change > 0 ? "Absorption" : "Emission";

  return (
    <figure className="session-visual">
      <figcaption>Photon lab · Energy levels in a fictional atom</figcaption>
      <svg
        viewBox="0 0 280 145"
        role="img"
        aria-label={`Energy level diagram from ${initial} to ${final} ${final === 1 ? "electronvolt" : "electronvolts"}`}
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10z" fill="var(--graph-primary)" />
          </marker>
        </defs>
        {levels.map((energy) => (
          <g key={energy}>
            <path d={`M50 ${diagramY(energy)}h145`} stroke="var(--graph-axis)" />
            <text x="208" y={diagramY(energy) + 4} fontSize="12" fill="currentColor">
              {energy} eV
            </text>
          </g>
        ))}
        <circle cx="105" cy={diagramY(initial)} r="4" fill="var(--graph-primary)" />
        {change !== 0 && (
          <line
            x1="105"
            x2="105"
            y1={diagramY(initial)}
            y2={diagramY(final)}
            stroke="var(--graph-primary)"
            strokeWidth="3"
            markerEnd={`url(#${arrowId})`}
          />
        )}
      </svg>
      <label>
        Initial level
        <select value={initial} onChange={(event) => setInitial(Number(event.currentTarget.value))}>
          {levels.map((energy) => (
            <option key={energy} value={energy}>
              {energy} eV
            </option>
          ))}
        </select>
      </label>
      <label>
        Final level
        <select value={final} onChange={(event) => setFinal(Number(event.currentTarget.value))}>
          {levels.map((energy) => (
            <option key={energy} value={energy}>
              {energy} eV
            </option>
          ))}
        </select>
      </label>
      <output>
        {change === 0
          ? "Same level · No transition or photon"
          : `${process} · Atom ΔE = ${change > 0 ? "+" : ""}${change} eV · Photon ≈ ${photon} nm`}
      </output>
    </figure>
  );
}
