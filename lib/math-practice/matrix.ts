import { UnsupportedMath } from "./parser";
import type { MathFeedback, RowOperation } from "./types";
type Fraction = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b ? gcd(b, a % b) : a < 0n ? -a : a);
function fraction(n: bigint, d = 1n): Fraction {
  if (!d) throw new UnsupportedMath("A denominator cannot be zero.");
  if (n.toString(2).length > 256 || d.toString(2).length > 256)
    throw new UnsupportedMath("Use smaller rational entries.");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const add = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
const text = (a: Fraction) => (a.d === 1n ? String(a.n) : `${a.n}/${a.d}`);
function readFraction(raw: string): Fraction {
  let value = raw.replace(/\s|\\(?:left|right|displaystyle)/g, "").replace(/\\dfrac/g, "\\frac");
  const match = /^(-?)\\frac\{(-?\d+)\}\{(-?\d+)\}$/.exec(value);
  if (match) value = `${match[1]}${match[2]}/${match[3]}`;
  if (!/^-?\d{1,7}(?:\/-?\d{1,7})?$/.test(value))
    throw new UnsupportedMath(
      "Matrix entries and multipliers must be integers or exact fractions, not decimals or symbols.",
    );
  const [n, d = "1"] = value.split("/");
  return fraction(BigInt(n), BigInt(d));
}
export function parseMatrix(latex: string): Fraction[][] {
  if (typeof latex !== "string" || latex.length > 2400)
    throw new UnsupportedMath("Use a matrix of up to 6 rows and 7 columns.");
  const value = latex.replace(/\\(?:left|right)[[\]()]/g, "").trim();
  const match =
    /\\begin\{(bmatrix|pmatrix|matrix|array)\}(?:\{[clr|]+\})?([\s\S]*?)\\end\{\1\}/.exec(value);
  if (!match || value.replace(match[0], "").trim())
    throw new UnsupportedMath("Use the matrix keyboard template, without an A= label.");
  const rows = match[2]
    .trim()
    .split(/\\\\/)
    .map((r) => r.split("&").map(readFraction));
  if (
    rows.length < 1 ||
    rows.length > 6 ||
    rows[0].length < 1 ||
    rows[0].length > 7 ||
    rows.some((r) => r.length !== rows[0].length)
  )
    throw new UnsupportedMath("Use a rectangular matrix of up to 6×7 entries.");
  return rows;
}
export function matrixLatex(rows: (number | string)[][]) {
  return `\\begin{bmatrix}${rows.map((r) => r.map((v) => (String(v).includes("/") ? `\\frac{${String(v).split("/")[0]}}{${String(v).split("/")[1]}}` : String(v))).join("&")).join("\\\\")}\\end{bmatrix}`;
}
export function reducedMatrix(latex: string) {
  const a = parseMatrix(latex).map((r) => [...r]);
  let pivotRow = 0;
  for (let column = 0; column < a[0].length && pivotRow < a.length; column++) {
    const found = a.findIndex((r, i) => i >= pivotRow && r[column].n !== 0n);
    if (found < 0) continue;
    [a[pivotRow], a[found]] = [a[found], a[pivotRow]];
    const p = a[pivotRow][column];
    a[pivotRow] = a[pivotRow].map((v) => mul(v, fraction(p.d, p.n)));
    for (let i = 0; i < a.length; i++)
      if (i !== pivotRow) {
        const factor = fraction(-a[i][column].n, a[i][column].d);
        a[i] = a[i].map((v, j) => add(v, mul(factor, a[pivotRow][j])));
      }
    pivotRow++;
  }
  return matrixLatex(a.map((r) => r.map(text)));
}
export function checkMatrixStep(
  reference: string,
  next: string,
  operation: RowOperation,
): MathFeedback {
  const a = parseMatrix(reference),
    b = parseMatrix(next),
    r = operation.target - 1,
    s = operation.source - 1;
  if (operation.kind === "equivalence") {
    const same =
      a.length === b.length &&
      a[0].length === b[0].length &&
      reducedMatrix(reference) === reducedMatrix(next);
    return {
      status: same ? "equivalent" : "not-equivalent",
      message: same
        ? "The exact reduced row forms agree. These matrices are row-equivalent; this checks the overall transformation, not a single declared operation. Free-variable columns need not have pivots."
        : "The exact reduced row forms differ. The row spaces are not equivalent, or the dimensions changed.",
      matrixEvidence: { rowEquivalent: same, declaredOperationMatches: same },
    };
  }
  if (![r, s].every((i) => Number.isInteger(i) && i >= 0 && i < a.length))
    throw new UnsupportedMath("Choose existing row numbers.");
  if (!["swap", "scale", "add"].includes(operation.kind))
    throw new UnsupportedMath("Choose a reversible elementary row operation.");
  const expected = a.map((row) => [...row]);
  if (operation.kind === "swap") [expected[r], expected[s]] = [expected[s], expected[r]];
  else {
    const factor = readFraction(operation.factor);
    if (operation.kind === "scale" && !factor.n)
      return {
        status: "not-equivalent",
        message:
          "Scaling by zero is not reversible and can lose solutions. Choose a nonzero multiplier.",
      };
    if (operation.kind === "add" && r === s)
      return {
        status: "unsupported",
        message:
          "For a row addition, choose two different rows. Use Scale row to multiply one row.",
      };
    expected[r] = a[r].map((v, j) =>
      operation.kind === "scale" ? mul(v, factor) : add(v, mul(factor, a[s][j])),
    );
  }
  if (a.length !== b.length || a[0].length !== b[0].length)
    return {
      status: "not-equivalent",
      message: "A row operation preserves the matrix dimensions, including its augmented column.",
    };
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a[i].length; j++)
      if (expected[i][j].n !== b[i][j].n || expected[i][j].d !== b[i][j].d)
        return {
          status: "not-equivalent",
          message:
            `Check row ${i + 1}, column ${j + 1}: this operation gives ${text(expected[i][j])}, while your entry is ${text(b[i][j])}. ` +
            (reducedMatrix(reference) === reducedMatrix(next)
              ? "Your matrices are row-equivalent, but the declared operation does not produce this matrix. Correct the declaration or choose an overall row-equivalence check."
              : "The matrix also fails an exact overall row-equivalence check. Check the arithmetic and declaration."),
          matrixEvidence: {
            rowEquivalent: reducedMatrix(reference) === reducedMatrix(next),
            declaredOperationMatches: false,
            inferredOperation: inferOperation(a, b),
          },
        };
  return {
    status: "equivalent",
    message:
      "Every entry matches the declared row operation exactly. The solution set is preserved.",
  };
}

function inferOperation(a: Fraction[][], b: Fraction[][]): RowOperation | undefined {
  const equal = (x: Fraction[], y: Fraction[]) =>
    x.every((v, j) => v.n === y[j].n && v.d === y[j].d);
  const changed = a.flatMap((row, i) => (equal(row, b[i]) ? [] : [i]));
  if (changed.length === 2) {
    const [r, s] = changed;
    if (equal(a[r], b[s]) && equal(a[s], b[r]))
      return { kind: "swap", source: s + 1, target: r + 1, factor: "1" };
  }
  if (changed.length !== 1) return;
  const r = changed[0];
  const j = a[r].findIndex((v) => v.n !== 0n);
  if (j >= 0) {
    const k = mul(b[r][j], fraction(a[r][j].d, a[r][j].n));
    if (
      k.n &&
      equal(
        a[r].map((v) => mul(v, k)),
        b[r],
      )
    )
      return { kind: "scale", source: r + 1, target: r + 1, factor: text(k) };
  }
  for (let source = 0; source < a.length; source++)
    if (source !== r) {
      const column = a[source].findIndex((v) => v.n !== 0n);
      if (column < 0) continue;
      const delta = add(b[r][column], fraction(-a[r][column].n, a[r][column].d)),
        k = mul(delta, fraction(a[source][column].d, a[source][column].n));
      if (
        equal(
          a[r].map((v, c) => add(v, mul(k, a[source][c]))),
          b[r],
        )
      )
        return { kind: "add", source: source + 1, target: r + 1, factor: text(k) };
    }
}
