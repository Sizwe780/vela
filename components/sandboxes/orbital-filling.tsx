"use client";

import { useState } from "react";
import { pOrbitalOccupancy } from "../../lib/sandboxes/chemistry-models";

export function OrbitalFilling() {
  const [electrons, setElectrons] = useState(3);
  const boxes = pOrbitalOccupancy(electrons);
  const unpaired = boxes.filter((count) => count === 1).length;
  return (
    <figure className="session-visual science-sandbox chemistry-bench">
      <figcaption>Fill three equal-energy p orbitals</figcaption>
      <p>Predict when the first pair forms. Use the slider to add electrons one at a time.</p>
      <label className="bench-slider">
        <span>
          p electrons <strong>{electrons}</strong>
        </span>
        <input
          type="range"
          min="0"
          max="6"
          value={electrons}
          onChange={(event) => setElectrons(event.currentTarget.valueAsNumber)}
        />
      </label>
      <div className="orbital-boxes" aria-label="Orbital occupation">
        {boxes.map((count, i) => (
          <div key={i}>
            <span
              className="orbital-box"
              role="img"
              aria-label={"Orbital " + (i + 1) + ": " + count + " electrons"}
            >
              <span aria-hidden="true">{count === 2 ? "↑↓" : count === 1 ? "↑" : "·"}</span>
            </span>
            <small>Orbital {i + 1}</small>
          </div>
        ))}
      </div>
      <p className="bench-result" role="status">
        {unpaired} unpaired {unpaired === 1 ? "electron" : "electrons"} in the subshell.
      </p>
      <p>
        The arrows represent spin. Any of the three equal-energy orbitals can host the first pair.
      </p>
    </figure>
  );
}
