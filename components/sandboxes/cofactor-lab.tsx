"use client";
import { useState } from "react";
import { Markdown } from "../markdown";
const matrix = [
  [2, 1, 0],
  [3, -1, 4],
  [1, 2, 5],
];
export function CofactorLab() {
  const [row, setRow] = useState(0),
    [cell, setCell] = useState<[number, number] | null>(null),
    [signs, setSigns] = useState(false);
  const minor = cell
    ? matrix.filter((_, r) => r !== cell[0]).map((line) => line.filter((_, c) => c !== cell[1]))
    : null;
  const value = minor ? minor[0][0] * minor[1][1] - minor[0][1] * minor[1][0] : 0;
  return (
    <section className="concept-sandbox cofactor-lab" aria-label="Interactive cofactor expansion">
      <h3>One entry opens a smaller determinant</h3>
      <p>Select an expansion row, then an entry. The remaining four entries form its minor.</p>
      <div className="filter-pills" role="group" aria-label="Expansion row">
        {matrix.map((_, r) => (
          <button key={r} type="button" aria-pressed={row === r} onClick={() => setRow(r)}>
            Row {r + 1}
          </button>
        ))}
      </div>
      <label>
        <input type="checkbox" checked={signs} onChange={(e) => setSigns(e.target.checked)} /> Show
        cofactor sign pattern
      </label>
      <div className="cofactor-grid" role="group" aria-label="Matrix entries">
        {matrix.flatMap((line, r) =>
          line.map((entry, c) => (
            <button
              type="button"
              key={`${r}:${c}`}
              data-row={row === r || undefined}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${entry}`}
              aria-pressed={cell?.[0] === r && cell?.[1] === c}
              onClick={() => setCell([r, c])}
            >
              <span>{entry}</span>
              {signs && <small>{(r + c) % 2 ? "−" : "+"}</small>}
            </button>
          )),
        )}
      </div>
      {cell && minor && (
        <div aria-live="polite">
          <Markdown
            text={`Delete row ${cell[0] + 1} and column ${cell[1] + 1}:\n\n$$M_{${cell[0] + 1}${cell[1] + 1}}=\\begin{vmatrix}${minor[0].join("&")}\\\\${minor[1].join("&")}\\end{vmatrix}=${value}$$\n\nThe cofactor includes the checkerboard sign: $C_{${cell[0] + 1}${cell[1] + 1}}=${(cell[0] + cell[1]) % 2 ? -value : value}$. Multiply it by the selected entry only when forming the expansion term.`}
          />
        </div>
      )}
    </section>
  );
}
