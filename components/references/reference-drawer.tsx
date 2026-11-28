"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { SourceDrawer } from "../source-drawer";
import { Markdown } from "../markdown";
import { constants, prefixes, constantSource } from "../../lib/references/constants";
import { formulas, referenceTables } from "../../lib/references/formulas";
import { QuantityCheck } from "../practical/quantity-check";
import { ScientificCalculator } from "../practical/scientific-calculator";
const Periodic = dynamic(() => import("./periodic-reference"), {
  loading: () => <p role="status">Loading the periodic reference…</p>,
});
export default function ReferenceDrawer({
  initial,
  moduleCode,
  institution = "",
  chemistry,
  physics,
  math,
  onInsert,
  onClose,
}: {
  initial: string;
  moduleCode: string;
  institution?: string;
  chemistry: boolean;
  physics: boolean;
  math: boolean;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(initial),
    [search, setSearch] = useState(""),
    [extended, setExtended] = useState(false),
    [calculatorVisited, setCalculatorVisited] = useState(initial === "calculator");
  const tabs = [
    ...(chemistry ? [["periodic", "Periodic table"]] : []),
    ...(chemistry || physics ? [["constants", "Constants & units"]] : []),
    ...(chemistry || physics || math ? [["calculator", "Calculator"]] : []),
    ["formulas", "Formula sheet"],
    ["tables", "Reference tables"],
  ];
  const matches = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const insert = (text: string) => {
    onInsert(text);
    onClose();
  };
  return (
    <SourceDrawer label="Learning references" className="reference-drawer" onClose={onClose}>
      <section className="reference-workbench">
        <header>
          <div>
            <span className="eyebrow">QUICK REFERENCE</span>
            <h2>Keep your place. Look it up.</h2>
          </div>
          <button type="button" aria-label="Close references" onClick={onClose}>
            ×
          </button>
        </header>
        <nav className="filter-pills" aria-label="Reference tools">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                if (id === "calculator") setCalculatorVisited(true);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <p>
          Reference tools do not submit, reset or grade your answer. Insertions become part of your
          editable working.
        </p>
        {tab === "periodic" && <Periodic onInsert={insert} />}
        {calculatorVisited && (
          <div hidden={tab !== "calculator"}>
            <ScientificCalculator onInsert={insert} />
          </div>
        )}
        {tab !== "periodic" && tab !== "calculator" && (
          <label>
            Search references
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        )}
        {tab === "constants" && (
          <>
            <p>
              CODATA 2022 / SI definitions. Standard uncertainty is shown in the same unit. Standard
              gravity is a convention, not a measured local value.
            </p>
            <div className="reference-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Constant</th>
                    <th>Value and SI unit</th>
                    <th>Standard uncertainty / basis</th>
                    <th>Use</th>
                  </tr>
                </thead>
                <tbody>
                  {constants
                    .filter((c) => matches(c.name + " " + c.symbol))
                    .map((c) => (
                      <tr key={c.symbol}>
                        <th scope="row">
                          {c.name} ({c.symbol})
                        </th>
                        <td>
                          {c.value} {c.unit}
                        </td>
                        <td>
                          {c.uncertainty} · {c.basis}
                        </td>
                        <td>
                          <button type="button" onClick={() => insert(c.value + " " + c.unit)}>
                            Insert
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p>
              <a href={constantSource} target="_blank" rel="noreferrer">
                NIST / CODATA source
              </a>
            </p>
            <h3>SI prefixes</h3>
            <ul className="prefix-grid">
              {prefixes
                .filter((p) => matches(p.name + p.symbol))
                .map((p) => (
                  <li key={p.name}>
                    <strong>{p.symbol || "1"}</strong> {p.name} · 10<sup>{p.power}</sup>
                  </li>
                ))}
            </ul>
            <QuantityCheck onInsert={insert} />
          </>
        )}
        {tab === "formulas" && (
          <>
            <p>
              Reference scope: {moduleCode || "general"}. Use each formula only when its stated
              conditions hold.
            </p>
            {formulas.some(
              (f) => institution === "UNISA" && f.extension && f.modules.includes(moduleCode),
            ) && (
              <label className="reference-extension-toggle">
                <input
                  type="checkbox"
                  checked={extended}
                  onChange={(e) => setExtended(e.target.checked)}
                />
                Show clearly labelled extensions outside the current module scope
              </label>
            )}
            {formulas
              .filter(
                (f) =>
                  institution === "UNISA" &&
                  f.modules.includes(moduleCode) &&
                  (!f.extension || extended) &&
                  matches(f.topic + f.name + f.note),
              )
              .map((f) => (
                <article className="reference-formula" key={f.name}>
                  <small>{f.topic}</small>
                  <h3>{f.name}</h3>
                  <Markdown text={"$$\n" + f.latex + "\n$$"} />
                  <p>{f.note}</p>
                  <button type="button" onClick={() => insert("$" + f.latex + "$")}>
                    Insert formula into answer
                  </button>
                </article>
              ))}
            {!formulas.some((f) => institution === "UNISA" && f.modules.includes(moduleCode)) && (
              <p>
                A module-specific formula sheet is not published for this module yet. Universal
                reference tools remain available.
              </p>
            )}
            <p>
              Standard formulas summarized in Vela's reference format; no textbook exercise
              solutions are included.{" "}
              <a href="https://openstax.org/subjects/math" target="_blank" rel="noreferrer">
                OpenStax mathematics
              </a>{" "}
              ·{" "}
              <a href="https://openstax.org/subjects/science" target="_blank" rel="noreferrer">
                OpenStax science
              </a>
            </p>
          </>
        )}
        {tab === "tables" &&
          referenceTables
            .filter(
              (t) =>
                (t.scope === "chemistry" ? chemistry : t.scope === "physics" ? physics : math) &&
                matches(t.name + JSON.stringify(t.rows)),
            )
            .map((t) => (
              <section key={t.name}>
                <h3>{t.name}</h3>
                {t.name.includes("potentials") && (
                  <p>
                    Approximate standard reduction potentials at 25 °C, versus the standard hydrogen
                    electrode. Activities and pressure follow the reference's standard-state
                    conventions.
                  </p>
                )}
                <table>
                  <tbody>
                    {t.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <a href={t.source} target="_blank" rel="noreferrer">
                  Reference source
                </a>
              </section>
            ))}
      </section>
    </SourceDrawer>
  );
}
