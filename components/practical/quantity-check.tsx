"use client";
import { useId, useState } from "react";
import {
  checkQuantity,
  convertQuantity,
  formatMagnitude,
  type Quantity,
} from "../../lib/math-practice/quantity";
import type { MathFeedback } from "../../lib/math-practice/types";
export function QuantityCheck({ onInsert }: { onInsert?: (value: string) => void } = {}) {
  const id = useId();
  const [original, setOriginal] = useState<Quantity>({ value: "", unit: "" });
  const [converted, setConverted] = useState<Quantity>({ value: "", unit: "" });
  const [result, setResult] = useState<MathFeedback>();
  const [conversion, setConversion] = useState<ReturnType<typeof convertQuantity>>();
  const clear = () => {
    setResult(undefined);
    setConversion(undefined);
  };
  function run(compare: boolean) {
    try {
      const next = convertQuantity(original, converted.unit);
      setConversion(next);
      setResult(
        compare
          ? checkQuantity(original, converted)
          : {
              status: "equivalent",
              message: `${formatMagnitude(next.sourceValue)} ${next.sourceUnit} = ${formatMagnitude(next.value)} ${next.targetUnit}`,
            },
      );
    } catch (error) {
      setConversion(undefined);
      setResult({
        ...(compare
          ? checkQuantity(original, converted)
          : {
              status: "unsupported" as const,
              message: error instanceof Error ? error.message : "Check the quantities.",
            }),
      });
    }
  }
  function preset(value: string, unit: string, target: string) {
    setOriginal({ value, unit });
    setConverted({ value: "", unit: target });
    clear();
  }
  return (
    <section className="science-tool-card unit-converter" aria-labelledby={id}>
      <header className="science-tool-header">
        <div>
          <span className="eyebrow">QUANTITIES & DIMENSIONS</span>
          <h2 id={id}>Unit converter</h2>
        </div>
      </header>
      <p>
        Convert directly, or enter your proposed result to check both SI dimensions and magnitude.
      </p>
      <div className="science-presets" role="group" aria-label="Conversion presets">
        <button type="button" onClick={() => preset("2.5", "L", "mL")}>
          2.5 L → mL
        </button>
        <button type="button" onClick={() => preset("9.81", "m/s²", "cm/s²")}>
          9.81 m/s² → cm/s²
        </button>
        <button type="button" onClick={() => preset("25", "°C", "K")}>
          °C ↔ K
        </button>
        <button type="button" onClick={() => preset("1", "atm", "kPa")}>
          atm → kPa
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(false);
        }}
      >
        <div className="science-field-grid">
          <label>
            Original value
            <input
              value={original.value}
              onChange={(e) => {
                setOriginal({ ...original, value: e.target.value });
                clear();
              }}
              inputMode="decimal"
              maxLength={40}
              placeholder="2.5"
              required
            />
          </label>
          <label>
            Original unit
            <input
              value={original.unit}
              onChange={(e) => {
                setOriginal({ ...original, unit: e.target.value });
                clear();
              }}
              maxLength={80}
              placeholder="L or l"
              required
            />
          </label>
          <label>
            Target unit
            <input
              value={converted.unit}
              onChange={(e) => {
                setConverted({ ...converted, unit: e.target.value });
                clear();
              }}
              maxLength={80}
              placeholder="mL or ml"
              required
            />
          </label>
          <label>
            Your converted value{" "}
            <span className="learning-caption">Optional for quick conversion</span>
            <input
              value={converted.value}
              onChange={(e) => {
                setConverted({ ...converted, value: e.target.value });
                setResult(undefined);
              }}
              inputMode="decimal"
              maxLength={40}
              placeholder="2500"
            />
          </label>
        </div>
        <div className="science-actions">
          <button type="submit">Convert to target unit</button>
          <button type="button" onClick={() => run(true)}>
            Check dimensions and magnitude
          </button>
        </div>
      </form>
      {result && (
        <div className="science-result" data-verdict={result.status} role="status">
          <p>{result.message}</p>
          {conversion && (
            <dl className="science-conversion-details">
              <div>
                <dt>SI dimension</dt>
                <dd>{conversion.dimension}</dd>
              </div>
              <div>
                <dt>Expected value</dt>
                <dd>
                  {formatMagnitude(conversion.value)} {conversion.targetUnit}
                </dd>
              </div>
              <div>
                <dt>Conversion rule</dt>
                <dd>
                  Multiply by {formatMagnitude(conversion.factor)}
                  {conversion.offset !== 0
                    ? ` ${conversion.offset > 0 ? "+" : "−"} ${formatMagnitude(Math.abs(conversion.offset))}`
                    : ""}
                </dd>
              </div>
            </dl>
          )}
          {conversion && onInsert && (
            <button
              type="button"
              onClick={() =>
                onInsert(`${formatMagnitude(conversion.value)} ${conversion.targetUnit}`)
              }
            >
              Insert converted value
            </button>
          )}
        </div>
      )}
      <p className="learning-caption">
        L/l, mL/ml, cm³/cc, min and hr are accepted. SI prefix case still matters. Bare C means
        coulomb, except in a conversion to or from K/°C, where it means Celsius. Celsius conversions
        include the 273.15 offset; mmHg and torr are distinct pressure units.
      </p>
    </section>
  );
}
