"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useModuleCapabilities } from "./module-capabilities";
const BondingScale = dynamic(() => import("./sandboxes/bonding-scale").then((m) => m.BondingScale));
const Orbitals = dynamic(() => import("./sandboxes/orbital-filling").then((m) => m.OrbitalFilling));
const Precipitation = dynamic(() =>
  import("./sandboxes/ionic-precipitation").then((m) => m.IonicPrecipitation),
);
const Matrix = dynamic(() => import("./sandboxes/matrix-sandbox").then((m) => m.MatrixSandbox));
const Riemann = dynamic(() => import("./sandboxes/riemann-sandbox").then((m) => m.RiemannSandbox));
const Limit = dynamic(() => import("./sandboxes/limit-sandbox").then((m) => m.LimitSandbox));
const Density = dynamic(() => import("./sandboxes/density-sandbox").then((m) => m.DensitySandbox), {
  ssr: false,
});
const EnergyLevels = dynamic(
  () => import("./sandboxes/energy-level-sandbox").then((m) => m.EnergyLevelSandbox),
  { ssr: false },
);
const Molecule = dynamic(
  () => import("./sandboxes/molecular-geometry").then((m) => m.MolecularGeometry),
  { ssr: false },
);
const Reaction = dynamic(
  () => import("./sandboxes/reaction-classes").then((m) => m.ReactionClasses),
  { ssr: false },
);
const ChemistryBatch = dynamic(
  () => import("./sandboxes/chemistry-batches").then((m) => m.ChemistryBatches),
  { ssr: false },
);
export function SessionVisual({ kind }: { kind: string }) {
  const c = useModuleCapabilities();
  if (kind === "bonding-scale") return c.molecules ? <BondingScale /> : null;
  if (kind === "orbital-filling") return c.molecules ? <Orbitals /> : null;
  if (kind === "ionic-precipitation") return c.reactions ? <Precipitation /> : null;
  if (kind === "density-model") return <Density />;
  if (kind === "energy-level-model") return <EnergyLevels />;
  if (kind === "molecular-geometry") return c.molecules ? <Molecule /> : null;
  if (kind === "equation-balancing" || kind === "redox-practice")
    return c.reactions ? <Reaction initial={kind} /> : null;
  if (["stoichiometry-lab", "concentration-lab", "equilibrium-lab", "ideal-gas-lab"].includes(kind))
    return (kind === "concentration-lab" || kind === "ideal-gas-lab" ? c.units : c.reactions) ? (
      <ChemistryBatch
        initial={
          kind as "stoichiometry-lab" | "concentration-lab" | "equilibrium-lab" | "ideal-gas-lab"
        }
      />
    ) : null;
  if (
    [
      "linear-system",
      "matrix-transform",
      "row-operation",
      "determinant-area",
      "vector-combination",
      "vector-projection",
      "complex-plane",
    ].includes(kind) &&
    !c.matrix
  )
    return null;
  if (
    ["integral", "limit", "continuity", "tangent", "composition", "optimization"].includes(kind) &&
    !c.calculus
  )
    return null;
  if (kind === "matrix-transform") return <Matrix />;
  if (kind === "integral") return <Riemann />;
  if (kind === "limit") return <Limit />;
  return <LegacySessionVisual kind={kind} />;
}
import { LinearSessionVisual } from "./linear-session-visual";
import { AdvancedSessionVisual } from "./advanced-session-visual";
function LegacySessionVisual({ kind }: { kind: string }) {
  const [h, setH] = useState(0.8),
    [x, setX] = useState(12),
    [k, setK] = useState(16),
    [n, setN] = useState(8);
  if (
    [
      "linear-system",
      "matrix-transform",
      "row-operation",
      "determinant-area",
      "vector-combination",
      "vector-projection",
      "complex-plane",
    ].includes(kind)
  )
    return <LinearSessionVisual kind={kind} />;
  if (kind === "composition" || kind === "optimization")
    return <AdvancedSessionVisual kind={kind} />;
  if (!["limit", "continuity", "tangent", "integral"].includes(kind)) return null;
  const ranges =
    kind === "limit"
      ? [10, 16, 20, 32]
      : kind === "continuity"
        ? [2, 6, 0, 40]
        : kind === "tangent"
          ? [3, 5, 15, 60]
          : [0, 4, 0, 16];
  const px = (v: number) => 35 + ((v - ranges[0]) / (ranges[1] - ranges[0])) * 410,
    py = (v: number) => 235 - ((v - ranges[2]) / (ranges[3] - ranges[2])) * 200;
  const f = (t: number) =>
    kind === "limit"
      ? t + 13
      : kind === "continuity"
        ? t < 4
          ? 3 * t + 2
          : t * t - 2
        : kind === "tangent"
          ? 2 * t * t + 3
          : 3 * t + 2;
  const path = Array.from({ length: 101 }, (_, i) => {
    const t = ranges[0] + ((ranges[1] - ranges[0]) * i) / 100;
    return `${i ? "L" : "M"}${px(t)},${py(f(t))}`;
  }).join(" ");
  return (
    <figure className="session-visual">
      <figcaption>Explore the idea · original interactive model</figcaption>
      <svg viewBox="0 0 480 270" role="img" aria-label={`${kind} interactive coordinate graph`}>
        <path d="M35 25V235H450" stroke="var(--graph-axis)" fill="none" />
        {Array.from({ length: 5 }, (_, i) => {
          const t = ranges[0] + (i * (ranges[1] - ranges[0])) / 4;
          return (
            <text key={i} x={px(t)} y="255" textAnchor="middle" fontSize="11">
              {t}
            </text>
          );
        })}
        <text x="9" y="28" fontSize="11">
          y
        </text>
        <text x="456" y="239" fontSize="11">
          x
        </text>
        {kind === "integral" &&
          Array.from({ length: n }, (_, i) => (
            <rect
              key={i}
              x={px((i * 4) / n)}
              y={py(f(((i + 1) * 4) / n))}
              width={410 / n}
              height={py(0) - py(f(((i + 1) * 4) / n))}
              fill="#5d998244"
              stroke="#5d9982"
            />
          ))}
        <path d={path} stroke="var(--graph-primary)" strokeWidth="3" fill="none" />
        {kind === "limit" && (
          <>
            <circle
              cx={px(13)}
              cy={py(26)}
              r="6"
              fill="white"
              stroke="var(--graph-primary)"
              strokeWidth="2"
            />
            {x !== 13 && <circle cx={px(x)} cy={py(f(x))} r="5" fill="#b76829" />}
          </>
        )}
        {kind === "continuity" && (
          <>
            <circle cx={px(4)} cy={py(14)} r="6" fill="white" stroke="var(--graph-primary)" />
            <circle cx={px(4)} cy={py(k)} r="5" fill="#b76829" />
          </>
        )}
        {kind === "tangent" && (
          <>
            <line
              x1={px(3)}
              x2={px(5)}
              y1={py(35 + (16 + 2 * h) * (3 - 4))}
              y2={py(35 + (16 + 2 * h) * (5 - 4))}
              stroke="#b76829"
              strokeWidth="2"
            />
            <circle cx={px(4)} cy={py(35)} r="4" />
            <circle cx={px(4 + h)} cy={py(f(4 + h))} r="4" fill="#b76829" />
          </>
        )}
      </svg>
      {kind === "limit" ? (
        <>
          <label>
            Approach x = {x.toFixed(2)}
            <input
              type="range"
              min="12"
              max="14"
              step=".01"
              value={x}
              onChange={(e) => setX(+e.target.value)}
            />
          </label>
          <output>
            r(x) = {x === 13 ? "undefined at the hole" : (x + 13).toFixed(2)}; compare approaches
            from both sides.
          </output>
        </>
      ) : kind === "continuity" ? (
        <>
          <label>
            Assigned value k = {k}
            <input
              type="range"
              min="8"
              max="20"
              value={k}
              onChange={(e) => setK(+e.target.value)}
            />
          </label>
          <output>
            {k === 14
              ? "Continuous: the point meets the common approach."
              : "Compare the traces on each side with the assigned point."}
          </output>
        </>
      ) : kind === "tangent" ? (
        <>
          <label>
            Interval h = {h.toFixed(2)}
            <input
              type="range"
              min=".01"
              max="1"
              step=".01"
              value={h}
              onChange={(e) => setH(+e.target.value)}
            />
          </label>
          <output>
            Secant slope {(16 + 2 * h).toFixed(2)}; predict the limiting slope as h approaches zero.
          </output>
        </>
      ) : (
        <>
          <label>
            Number of rectangles: {n}
            <input
              type="range"
              min="2"
              max="40"
              value={n}
              onChange={(e) => setN(+e.target.value)}
            />
          </label>
          <output>
            Right sum {(32 + 24 / n).toFixed(3)}; increase n and predict the exact accumulation.
          </output>
        </>
      )}
    </figure>
  );
}
