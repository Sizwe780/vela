"use client";

import { useState } from "react";
import { Markdown } from "../markdown";

export function IonicPrecipitation() {
  const [mixed, setMixed] = useState(false);
  return (
    <figure className="session-visual science-sandbox chemistry-bench">
      <figcaption>Track ions through precipitation</figcaption>
      <p>
        Predict which ions remain in solution when silver nitrate and sodium chloride solutions are
        mixed.
      </p>
      <div className="ionic-trays">
        {mixed ? (
          <>
            <section className="bench-diagram">
              <h4>In solution</h4>
              <p>3 Na⁺ and 3 NO₃⁻</p>
            </section>
            <section className="bench-diagram">
              <h4>Solid precipitate</h4>
              <p>3 AgCl formula units</p>
            </section>
          </>
        ) : (
          <>
            <section className="bench-diagram">
              <h4>Silver nitrate solution</h4>
              <p>3 Ag⁺ and 3 NO₃⁻</p>
            </section>
            <section className="bench-diagram">
              <h4>Sodium chloride solution</h4>
              <p>3 Na⁺ and 3 Cl⁻</p>
            </section>
          </>
        )}
      </div>
      <button type="button" onClick={() => setMixed((value) => !value)}>
        {mixed ? "Separate the model solutions" : "Mix the solutions"}
      </button>
      <div role="status">
        {mixed && (
          <>
            <Markdown text={"$\\ce{Ag+(aq) + Cl-(aq) -> AgCl(s)}$"} />
            <p>Sodium and nitrate remain aqueous. Silver and chloride combine in a 1:1 ratio.</p>
          </>
        )}
      </div>
      <p>
        The counts are illustrative. This model assumes enough dissolved silver and chloride for a
        visible precipitate and shows the precipitate in the complete-reaction approximation.
      </p>
    </figure>
  );
}
