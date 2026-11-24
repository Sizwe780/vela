"use client";

import { useState } from "react";
import { equationBalance } from "../../lib/content/reaction-check";
import { Markdown } from "../markdown";

type ReactionKey = "water" | "iron";
type Practice = "equation-balancing" | "redox-practice";

const reactions: Record<
  ReactionKey,
  { label: string; formulas: [string, string, string]; coefficients: [number, number, number] }
> = {
  water: {
    label: "Hydrogen and oxygen form water",
    formulas: ["H2", "O2", "H2O"],
    coefficients: [2, 1, 2],
  },
  iron: {
    label: "Iron oxidation",
    formulas: ["Fe", "O2", "Fe2O3"],
    coefficients: [4, 3, 2],
  },
};

const redoxCases = {
  zinc: {
    equation: "Zn(s) + Fe^{2+}(aq) -> Zn^{2+}(aq) + Fe(s)",
    species: ["Zn", "Fe"],
    electrons: "2",
    feedback: "Zinc loses two electrons and iron(II) gains both.",
  },
  aluminium: {
    equation: "Al(s) + 3Ag^+(aq) -> Al^{3+}(aq) + 3Ag(s)",
    species: ["Al", "Ag"],
    electrons: "3",
    feedback: "Aluminium loses three electrons. Three silver ions each gain one.",
  },
} as const;

function coefficient(value: number) {
  return Number.isFinite(value) ? Math.min(8, Math.max(1, Math.trunc(value))) : 1;
}

export function ReactionClasses({
  initial = "equation-balancing",
  initialReaction = "water",
  initialCoefficients = [1, 1, 1],
}: {
  initial?: Practice;
  initialReaction?: ReactionKey;
  initialCoefficients?: [number, number, number];
}) {
  const [practice, setPractice] = useState<Practice>(initial);
  const [reaction, setReaction] = useState<ReactionKey>(initialReaction);
  const [a, setA] = useState(initialCoefficients[0]);
  const [b, setB] = useState(initialCoefficients[1]);
  const [c, setC] = useState(initialCoefficients[2]);
  const [redox, setRedox] = useState<keyof typeof redoxCases>("zinc");
  const [oxidized, setOxidized] = useState("");
  const [electrons, setElectrons] = useState("");
  const model = reactions[reaction];
  const redoxCase = redoxCases[redox];
  const simplest =
    a === model.coefficients[0] && b === model.coefficients[1] && c === model.coefficients[2];
  const redoxCorrect = oxidized === redoxCase.species[0] && electrons === redoxCase.electrons;
  const [first, second, product] = model.formulas;
  const equation = `${a}${first} + ${b}${second} -> ${c}${product}`;
  const { atoms, balanced } = equationBalance(equation);

  return (
    <figure className="session-visual science-sandbox chemistry-bench">
      <figcaption>Chemical reaction practice</figcaption>
      <div className="chemistry-bench-layout">
        <div className="reaction-equation" role="group" aria-label="Reaction practice model">
          {practice === "equation-balancing" ? (
            <>
              <select
                aria-label="Reaction"
                value={reaction}
                onChange={(event) => {
                  setReaction(event.currentTarget.value as ReactionKey);
                  setA(1);
                  setB(1);
                  setC(1);
                }}
              >
                {Object.entries(reactions).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Markdown text={`$\\ce{${equation}}$`} />
              <div className="coefficient-row">
                <label>
                  First coefficient
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={a}
                    onChange={(event) => setA(coefficient(event.currentTarget.valueAsNumber))}
                  />
                </label>
                <span>+</span>
                <label>
                  Second coefficient
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={b}
                    onChange={(event) => setB(coefficient(event.currentTarget.valueAsNumber))}
                  />
                </label>
                <span>→</span>
                <label>
                  Product coefficient
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={c}
                    onChange={(event) => setC(coefficient(event.currentTarget.valueAsNumber))}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label>
                Redox example
                <select
                  value={redox}
                  onChange={(event) => {
                    setRedox(event.currentTarget.value === "aluminium" ? "aluminium" : "zinc");
                    setOxidized("");
                    setElectrons("");
                  }}
                >
                  <option value="zinc">Zinc and iron(II)</option>
                  <option value="aluminium">Aluminium and silver(I)</option>
                </select>
              </label>
              <Markdown text={`$\\ce{${redoxCase.equation}}$`} />
              <label>
                Species oxidized
                <select
                  value={oxidized}
                  onChange={(event) => setOxidized(event.currentTarget.value)}
                >
                  <option value="">Choose</option>
                  {redoxCase.species.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Electrons transferred
                <select
                  value={electrons}
                  onChange={(event) => setElectrons(event.currentTarget.value)}
                >
                  <option value="">Choose</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div className="science-sandbox-controls">
          <label>
            Practice
            <select
              value={practice}
              onChange={(event) => setPractice(event.currentTarget.value as Practice)}
            >
              <option value="equation-balancing">Equation balancing</option>
              <option value="redox-practice">Redox electron transfer</option>
            </select>
          </label>
        </div>
      </div>
      {practice === "equation-balancing" ? (
        <>
          <table className="bench-atom-table">
            <caption>Atom count by side</caption>
            <thead>
              <tr>
                <th scope="col">Element</th>
                <th scope="col">Reactants</th>
                <th scope="col">Products</th>
                <th scope="col">Check</th>
              </tr>
            </thead>
            <tbody>
              {atoms.map((row) => (
                <tr key={row.element}>
                  <th scope="row">{row.element}</th>
                  <td>{row.left}</td>
                  <td>{row.right}</td>
                  <td>{row.left === row.right ? "Matches" : "Different"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p role="status">
            {balanced
              ? simplest
                ? "Balanced: the coefficients are in the smallest whole-number ratio."
                : "Balanced: all atom counts agree. Reduce the coefficients to the smallest whole-number ratio."
              : "Predict which coefficient changes the atom count. Coefficients change molecule counts; subscripts remain unchanged."}
          </p>
        </>
      ) : (
        <>
          <output aria-live="polite">
            {oxidized && electrons
              ? redoxCorrect
                ? `Correct. ${redoxCase.feedback}`
                : "Not yet. Assign an oxidation number first, then track the sign and number of electrons."
              : "Choose both responses."}
          </output>
          <p>
            Oxidation and reduction occur together. The oxidation number is an accounting value, not
            a measured charge on every individual atom in a covalent substance.
          </p>
        </>
      )}
      <small>
        This bounded practice uses checked Vela examples. It does not solve arbitrary formulas or
        award assessed mastery.
      </small>
    </figure>
  );
}
