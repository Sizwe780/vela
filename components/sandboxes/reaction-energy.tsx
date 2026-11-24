"use client";

import { useState } from "react";
import { VisualCheck } from "../visual-check";

export function ReactionEnergy() {
  const [releases, setReleases] = useState(true);
  const [catalyst, setCatalyst] = useState(false);
  const product = releases ? 172 : 118;
  const barrier = catalyst ? 78 : 41;
  return (
    <figure className="concept-sandbox" aria-label="Read a reaction energy profile">
      <figcaption>
        <h3>Read a reaction energy profile</h3>
        <p>
          Compare the two endpoints for the energy change. Compare the initial level with the peak
          for the forward barrier. The heights are illustrative.
        </p>
      </figcaption>
      <div className="sandbox-tabs" role="group" aria-label="Reaction energy cases">
        <button type="button" aria-pressed={releases} onClick={() => setReleases(true)}>
          Releases heat
        </button>
        <button type="button" aria-pressed={!releases} onClick={() => setReleases(false)}>
          Absorbs heat
        </button>
        <button
          type="button"
          aria-pressed={catalyst}
          onClick={() => setCatalyst((current) => !current)}
        >
          Alternate catalyst pathway
        </button>
      </div>
      <svg
        viewBox="0 0 380 226"
        width="100%"
        role="img"
        aria-label="Energy versus reaction progress, with reactant and product levels and a peak"
      >
        <path d="M38 24V196H354" fill="none" stroke="var(--graph-axis)" />
        <text x="40" y="20" fill="currentColor" fontSize="13">
          Energy
        </text>
        <text x="351" y="216" fill="currentColor" textAnchor="end" fontSize="13">
          Reaction progress
        </text>
        <path
          d={`M60 145H92C133 145 139 ${barrier} 185 ${barrier}S244 ${product} 281 ${product}H333`}
          fill="none"
          stroke="var(--graph-primary)"
          strokeWidth="3"
        />
        <path
          d={`M185 ${barrier}V145M305 145V${product}`}
          stroke="var(--graph-secondary)"
          strokeDasharray="4 3"
        />
        <text x="70" y="166" fill="currentColor" fontSize="13">
          Reactants
        </text>
        <text x="292" y={product - 9} fill="currentColor" fontSize="13">
          Products
        </text>
        <text x="194" y={(145 + barrier) / 2} fill="currentColor" fontSize="14">
          Eₐ
        </text>
        <text x="312" y={(145 + product) / 2} fill="currentColor" fontSize="14">
          ΔH
        </text>
      </svg>
      <p role="status">
        {releases
          ? "The products are lower in energy. ΔH is negative."
          : "The products are higher in energy. ΔH is positive."}{" "}
        {catalyst
          ? "The alternate pathway has a lower barrier; both endpoints are unchanged."
          : "Compare the peak with the reactant energy."}
      </p>
      <VisualCheck
        check={{
          question: "If both endpoints stay fixed, what can change when the pathway is catalysed?",
          options: ["The barrier", "The difference between the endpoints"],
          answer: 0,
          feedback:
            "The pathway changes the barrier. ΔH still depends on the same reactants and products.",
        }}
      />
    </figure>
  );
}
