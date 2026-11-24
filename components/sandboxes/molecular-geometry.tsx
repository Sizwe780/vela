"use client";

import { useId, useState } from "react";
import { molecules, projectBond } from "../../lib/sandboxes/molecules";

type MoleculeKey = keyof typeof molecules;

export function MolecularGeometry({
  initialMolecule = "water",
}: { initialMolecule?: MoleculeKey } = {}) {
  const marker = useId();
  const [selected, setSelected] = useState<MoleculeKey>(initialMolecule);
  const [rotation, setRotation] = useState(12);
  const [showPairs, setShowPairs] = useState(true);
  const [showDipoles, setShowDipoles] = useState(false);
  const [representation, setRepresentation] = useState<"ball" | "space">("ball");
  const showStructure = representation === "ball";
  const model = molecules[selected];
  const direction = model.dipoles === "inward" ? [0.77, 0.3] : [0.3, 0.77];

  const atoms = [
    ...model.bonds.map((bond) => ({ ...projectBond(bond, rotation), symbol: model.terminal })),
    { x: 120, y: 88, depth: 0, symbol: model.central },
  ].sort((left, right) => left.depth - right.depth);

  return (
    <figure className="session-visual science-sandbox">
      <figcaption>Molecular geometry lab</figcaption>
      <div className="science-sandbox-grid">
        <svg
          viewBox="0 0 240 170"
          role="img"
          aria-label={`${model.label}: ${model.geometry}, ${model.angle}`}
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 10 5 0 10z" fill="var(--graph-primary)" />
            </marker>
          </defs>
          {showStructure &&
            model.bonds.map((bond, i) => {
              const point = projectBond(bond, rotation);
              const at = (t: number) => ({
                x: 120 + t * (point.x - 120),
                y: 88 + t * (point.y - 88),
              });
              const from = at(direction[0]);
              const to = at(direction[1]);
              return (
                <g key={i}>
                  <line
                    x1="120"
                    x2={point.x}
                    y1="88"
                    y2={point.y}
                    stroke="var(--graph-axis)"
                    strokeWidth="3"
                  />
                  {showDipoles && model.dipoles !== "omitted" && (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="var(--graph-primary)"
                      strokeWidth="3"
                      markerEnd={`url(#${marker})`}
                    />
                  )}
                </g>
              );
            })}
          {showStructure &&
            showPairs &&
            model.lonePairs.map((pair, i) => {
              const point = projectBond(pair, rotation);
              return (
                <g key={i}>
                  <line
                    x1="120"
                    y1="88"
                    x2={point.x}
                    y2={point.y}
                    stroke="var(--graph-axis)"
                    strokeDasharray="3 3"
                  />
                  <circle cx={point.x - 4} cy={point.y} r="2.5" fill="var(--graph-primary)" />
                  <circle cx={point.x + 4} cy={point.y} r="2.5" fill="var(--graph-primary)" />
                </g>
              );
            })}
          {atoms.map(({ x, y, symbol }, i) => {
            const cx = showStructure ? x : 120 + (x - 120) * 0.62;
            const cy = showStructure ? y : 88 + (y - 88) * 0.62;
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={showStructure ? 11 : symbol === "H" ? 14 : 24}
                  fill="var(--surface-card)"
                  stroke="var(--graph-primary)"
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="currentColor">
                  {symbol}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="science-sandbox-controls">
          <div
            className="molecule-representation"
            role="group"
            aria-label="Molecular representation"
          >
            <button
              type="button"
              aria-pressed={representation === "ball"}
              onClick={() => setRepresentation("ball")}
            >
              Ball-and-stick
            </button>
            <button
              type="button"
              aria-pressed={representation === "space"}
              onClick={() => setRepresentation("space")}
            >
              Atom envelopes
            </button>
          </div>
          <label>
            Molecule
            <select
              value={selected}
              onChange={(event) => {
                const key = event.currentTarget.value;
                if (Object.hasOwn(molecules, key)) setSelected(key as MoleculeKey);
              }}
            >
              {Object.entries(molecules).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rotation ({rotation}°)
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(event) => setRotation(event.currentTarget.valueAsNumber)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              disabled={!showStructure}
              checked={showStructure && showPairs}
              onChange={(event) => setShowPairs(event.currentTarget.checked)}
            />{" "}
            Show central lone pairs
          </label>
          <label>
            <input
              type="checkbox"
              disabled={!showStructure}
              checked={showStructure && showDipoles}
              onChange={(event) => setShowDipoles(event.currentTarget.checked)}
            />{" "}
            Show bond dipoles
          </label>
        </div>
      </div>
      <output aria-live="polite">
        {model.geometry} · {model.angle} · {model.bonds.length} bonding domains and{" "}
        {model.lonePairs.length} central lone pairs. Electron-domain geometry:{" "}
        {model.electronGeometry}.{showStructure && showDipoles && ` ${model.interpretation}`}
      </output>
      <small>
        {showStructure
          ? "Lines show bonding domains, paired dots show central lone pairs, and arrows point toward the partially negative end. The projection can foreshorten an angle."
          : "Overlapping spheres show a schematic atom envelope. Sphere sizes and distances are illustrative."}
      </small>
    </figure>
  );
}
