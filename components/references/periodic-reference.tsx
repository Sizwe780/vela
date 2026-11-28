"use client";
import { useId, useMemo, useState } from "react";
import {
  elements,
  elementsBySymbol,
  fullConfiguration,
  outerShellElectrons,
  molarMass,
  elementSource,
  elementDetails,
  atomicWeightSource,
  categoryKey,
} from "../../lib/references/elements";
import { formatElectronConfiguration, formatIsotopeNotation } from "../../lib/references/notation";
const knownIsotopes: Record<string, string> = {
  H: "¹H, ²H (stable); ³H (radioactive)",
  He: "³He, ⁴He",
  C: "¹²C, ¹³C (stable); ¹⁴C (radioactive)",
  N: "¹⁴N, ¹⁵N",
  O: "¹⁶O, ¹⁷O, ¹⁸O",
  Cl: "³⁵Cl, ³⁷Cl",
  Cu: "⁶³Cu, ⁶⁵Cu",
  U: "²³⁵U, ²³⁸U (radioactive)",
};
export default function PeriodicReference({ onInsert }: { onInsert: (text: string) => void }) {
  const tableHint = useId();
  const [selected, setSelected] = useState("H"),
    [search, setSearch] = useState(""),
    [block, setBlock] = useState(""),
    [state, setState] = useState(""),
    [period, setPeriod] = useState(""),
    [group, setGroup] = useState(""),
    [trend, setTrend] = useState(""),
    [formula, setFormula] = useState("H2O");
  const e = elementsBySymbol.get(selected)!;
  const range = elements
      .map((e) => Number(e[trend as "radius"]))
      .filter((v) => Number.isFinite(v) && v > 0),
    max = Math.max(...range, 1);
  const matches = (x: typeof e) =>
    (!search ||
      [x.symbol, x.name, String(x.z)].some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      )) &&
    (!block || x.block === block) &&
    (!state || x.state.toLowerCase().includes(state)) &&
    (!period || x.period === Number(period)) &&
    (!group || x.group === Number(group));
  const calculation = useMemo(() => {
    try {
      return { result: molarMass(formula), error: "" };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Check the formula." };
    }
  }, [formula]);
  const property = (label: string, value: string, unit = "") => (
    <div>
      <dt>{label}</dt>
      <dd>{value ? value + (unit ? " " + unit : "") : "Not provided in this snapshot"}</dd>
    </div>
  );
  return (
    <div className="periodic-reference">
      <div className="reference-filters">
        <label>
          Find an element
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, symbol or atomic number"
          />
        </label>
        <label>
          Block
          <select value={block} onChange={(e) => setBlock(e.target.value)}>
            <option value="">All blocks</option>
            {["s", "p", "d", "f"].map((b) => (
              <option key={b} value={b}>
                {b === "f" ? "f-series" : b}
              </option>
            ))}
          </select>
        </label>
        <label>
          State
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option>
            {["solid", "liquid", "gas"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">All periods</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Group
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All groups</option>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Trend overlay
          <select value={trend} onChange={(e) => setTrend(e.target.value)}>
            <option value="">Category colours</option>
            <option value="radius">Atomic radius</option>
            <option value="electronegativity">Electronegativity</option>
            <option value="ionization">First ionization energy</option>
          </select>
        </label>
      </div>
      <p id={tableHint} className="learning-caption">
        Scroll down for lower rows; pan sideways for more columns.
      </p>
      <div
        className="periodic-grid-scroll"
        tabIndex={0}
        aria-label="Scrollable periodic table"
        aria-describedby={tableHint}
      >
        <div className="periodic-grid" role="group" aria-label="118-element periodic table">
          {elements.map((x) => {
            const highlighted = matches(x);
            const v = Number(x[trend as "radius"]),
              alpha = Number.isFinite(v) && v > 0 ? 0.15 + (0.8 * v) / max : null;
            return (
              <button
                type="button"
                key={x.z}
                data-category={categoryKey(x.category)}
                data-block={x.block}
                data-group={x.group ?? undefined}
                data-highlighted={highlighted ? "true" : "false"}
                aria-pressed={selected === x.symbol}
                aria-label={`${x.z} ${x.name}, ${x.symbol}`}
                style={{
                  gridColumn: x.column,
                  gridRow: x.row,
                  opacity: highlighted ? 1 : 0.18,
                  ...(trend && alpha
                    ? {
                        background: `rgb(40 88 73 / ${alpha})`,
                        color: alpha > 0.55 ? "var(--on-brand)" : "var(--text-primary)",
                      }
                    : {}),
                }}
                onClick={() => setSelected(x.symbol)}
              >
                <small>{x.z}</small>
                <strong>{x.symbol}</strong>
                <span>{x.weight}</span>
              </button>
            );
          })}
          <span className="f-block-label" style={{ gridRow: 6, gridColumn: 3 }}>
            57–71
          </span>
          <span className="f-block-label" style={{ gridRow: 7, gridColumn: 3 }}>
            89–103
          </span>
        </div>
      </div>
      <p className="learning-caption">
        Filters highlight matches; all 118 elements remain selectable. Category, block and group
        describe different features. A dash means no standard atomic weight is assigned.
      </p>
      <details className="reference-category-key">
        <summary>Category colour key</summary>
        <p>
          Hydrogen is a nonmetal in Group 1; helium is a noble gas in Group 18 but belongs to the
          s-block. Group 12 metals are shown separately: a d-block position alone does not make an
          element a transition element. The f-series filter covers the detached lanthanide and
          actinide rows; this display does not assign their Group 3 positions.{" "}
          <a href="https://goldbook.iupac.org/terms/view/T06456" target="_blank" rel="noreferrer">
            IUPAC transition-element definition
          </a>
        </p>
        <ul>
          {[...new Set(elements.map((x) => x.category))].map((c) => (
            <li key={c}>
              <span data-category={categoryKey(c)} />
              {c}
            </li>
          ))}
        </ul>
      </details>
      <section className="element-inspector" aria-label="Selected element">
        <h3>
          {e.name} · {e.symbol}
        </h3>
        <p>
          Atomic number {e.z} · {e.category} · Period {e.period} ·{" "}
          {e.group ? "Group " + e.group : "Group not assigned in this layout"} ·{" "}
          {e.block === "f" ? "f-series display" : e.block + "-block"}
        </p>
        <dl className="element-properties">
          {property(
            "Standard atomic weight (abridged)",
            e.standardWeight
              ? `${e.weight} ± ${e.weightUncertainty}`
              : "Not assigned; specify an isotope for mass calculations",
          )}
          {e.standardWeight &&
            property("Standard atomic weight (full value or interval)", e.standardWeight)}
          {property(
            "Electron configuration (shorthand)",
            formatElectronConfiguration(e.configuration),
          )}
          {property(
            "Electron configuration (expanded)",
            formatElectronConfiguration(fullConfiguration(e)),
          )}
          {property("Valence-electron guidance", outerShellElectrons(e))}
          {property("Common oxidation states", e.oxidation)}
          {property("Pauling electronegativity", e.electronegativity)}
          {property("Atomic radius (van der Waals)", e.radius, "pm")}
          {property("Covalent radius", elementDetails(e.z)?.covalentRadius ?? "")}
          {property("First ionization energy", e.ionization, "eV")}
          {property("Electron affinity", e.affinity, "eV")}
          {property("Density (source-reported conditions)", e.density, "g/cm³")}
          {property("Melting point", e.melting, "K")}
          {property("Boiling point", e.boiling, "K")}
          {property(
            "Reported isotopes",
            formatIsotopeNotation(
              elementDetails(e.z)?.isotopes.join(", ") || knownIsotopes[e.symbol] || "",
            ),
          )}
        </dl>
        <p>
          Atomic weights are relative values, not isotope mass numbers. Parentheses mark uncertainty
          in the last digits; intervals describe natural isotopic variation in normal materials.
          Valence in d/f elements depends on bonding context. The isotope list is not an abundance
          table.
        </p>
        <div className="exercise-actions">
          <button type="button" onClick={() => setFormula((f) => f + e.symbol)}>
            Add {e.symbol} to formula
          </button>
          <button type="button" onClick={() => onInsert(e.symbol)}>
            Insert symbol into answer
          </button>
          <button
            type="button"
            disabled={!e.standardWeight}
            onClick={() => onInsert(e.weight + " g/mol")}
          >
            Insert atomic molar mass
          </button>
        </div>
      </section>
      <section className="molar-mass-calculator">
        <h3>Molar mass and composition</h3>
        <p>
          Calculated from the displayed CIAAW abridged weights. Stated weight uncertainties still
          apply; arithmetic does not add measurement precision.
        </p>
        <label>
          Chemical formula
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            maxLength={180}
            placeholder="Ca(NO3)2 or CuSO4·5H2O"
          />
        </label>
        <button type="button" onClick={() => setFormula("")}>
          Clear formula
        </button>
        {calculation.error ? (
          <p role="status">{calculation.error}</p>
        ) : (
          calculation.result && (
            <>
              <p>
                <strong>{Number(calculation.result.total.toPrecision(8))} g/mol</strong>
              </p>
              <table>
                <caption>Mass percent composition</caption>
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Atoms</th>
                    <th>Mass percent</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.result.composition.map((c) => (
                    <tr key={c.symbol}>
                      <td>{c.symbol}</td>
                      <td>{c.count}</td>
                      <td>{c.percent.toFixed(3)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() =>
                  onInsert(Number(calculation.result!.total.toPrecision(8)) + " g/mol")
                }
              >
                Insert molar mass into answer
              </button>
            </>
          )
        )}
      </section>
      <details>
        <summary>Data sources and limits</summary>
        <p>
          <a href={atomicWeightSource.url} target="_blank" rel="noreferrer">
            {atomicWeightSource.edition} abridged standard atomic weights
          </a>{" "}
          are used in the grid, inserted masses and calculator. The inspector also shows
          <a href={atomicWeightSource.fullUrl} target="_blank" rel="noreferrer">
            {" "}
            full standard values and intervals
          </a>
          . No numeric standard weight is supplied for unassigned elements.
        </p>
        <p>
          <a href={elementSource.url} target="_blank" rel="noreferrer">
            PubChem periodic-table snapshot
          </a>
          , retrieved {elementSource.retrieved}, supplies configurations, other properties and
          category families (Group 12 is separated in this teaching view). Physical-property
          conditions and experimental status vary by source; inspect the original element record
          before high-precision work.
        </p>
        <a
          href={`https://pubchem.ncbi.nlm.nih.gov/element/${e.z}`}
          target="_blank"
          rel="noreferrer"
        >
          Original element record
        </a>{" "}
        ·{" "}
        <a
          href="https://physics.nist.gov/PhysRefData/Compositions/"
          target="_blank"
          rel="noreferrer"
        >
          NIST isotope compositions
        </a>
      </details>
    </div>
  );
}
