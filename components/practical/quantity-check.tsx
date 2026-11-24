"use client";

import { useState } from "react";
import { checkQuantity } from "../../lib/math-practice/quantity";
import type { MathFeedback } from "../../lib/math-practice/types";

export function QuantityCheck() {
  const [result, setResult] = useState<MathFeedback>();
  return (
    <details className="math-lab">
      <summary>Check a unit conversion</summary>
      <p>Compare two quantities by SI dimensions and converted magnitude.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setResult(
            checkQuantity(
              { value: String(data.get("originalValue")), unit: String(data.get("originalUnit")) },
              {
                value: String(data.get("convertedValue")),
                unit: String(data.get("convertedUnit")),
              },
            ),
          );
        }}
        onChange={() => setResult(undefined)}
      >
        <fieldset>
          <legend>Original quantity</legend>
          <label>
            Magnitude <input name="originalValue" required maxLength={40} placeholder="2.5" />
          </label>
          <label>
            Unit <input name="originalUnit" required maxLength={80} placeholder="kJ" />
          </label>
        </fieldset>
        <fieldset>
          <legend>Converted quantity</legend>
          <label>
            Magnitude <input name="convertedValue" required maxLength={40} placeholder="2500" />
          </label>
          <label>
            Unit <input name="convertedUnit" required maxLength={80} placeholder="J" />
          </label>
        </fieldset>
        <button type="submit">Check dimensions and magnitude</button>
      </form>
      <output aria-live="polite">{result?.message}</output>
    </details>
  );
}
