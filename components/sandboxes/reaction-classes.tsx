"use client";

import { useState } from "react";
import { equationBalance } from "../../lib/content/reaction-check";
import { Markdown } from "../markdown";

import {
  reactionLibrary,
  practiceEquation,
  type ReactionKey,
} from "../../lib/content/reaction-library";
type Practice = "equation-balancing" | "redox-practice";

const reactions = reactionLibrary;

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
  return Number.isFinite(value) ? Math.min(12, Math.max(1, Math.trunc(value))) : 1;
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
  const [coefficients, setCoefficients] = useState<number[]>(() =>
    [
      ...reactionLibrary[initialReaction].reactants,
      ...reactionLibrary[initialReaction].products,
    ].map((_, index) => initialCoefficients[index] ?? 1),
  );
  const [redox, setRedox] = useState<keyof typeof redoxCases>("zinc");
  const [oxidized, setOxidized] = useState("");
  const [electrons, setElectrons] = useState("");
  const model = reactions[reaction];
  const redoxCase = redoxCases[redox];
  const simplest = coefficients.every((value, index) => value === model.coefficients[index]);
  const redoxCorrect = oxidized === redoxCase.species[0] && electrons === redoxCase.electrons;
  const equation = practiceEquation(model, coefficients);
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
                  const next = reactions[event.currentTarget.value as ReactionKey];
                  setCoefficients([...next.reactants, ...next.products].map(() => 1));
                }}
              >
                {Object.entries(reactions).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Markdown text={`$\\ce{${equation}}$`} />
              <p className="reaction-category">{model.category}</p>
              <div className="coefficient-row">
                {[...model.reactants, ...model.products].map((formula, index) => (
                  <label key={`${index}:${formula}`}>
                    Coefficient for {formula}
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="12"
                      value={coefficients[index]}
                      onChange={(event) => {
                        const value = coefficient(event.currentTarget.valueAsNumber);
                        setCoefficients((prior) => prior.map((n, i) => (i === index ? value : n)));
                      }}
                    />
                  </label>
                ))}
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
