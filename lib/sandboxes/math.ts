export type Matrix2 = [number, number, number, number];
export type Vector2 = [number, number];
export const identity: Matrix2 = [1, 0, 0, 1];
export function determinant([a, b, c, d]: Matrix2) {
  return a * d - b * c;
}
export function applyMatrix([a, b, c, d]: Matrix2, [x, y]: Vector2): Vector2 {
  return [a * x + b * y, c * x + d * y];
}
export function interpolateMatrix(matrix: Matrix2, t: number): Matrix2 {
  return matrix.map((v, i) => identity[i] + t * (v - identity[i])) as Matrix2;
}
export function inverseMatrix([a, b, c, d]: Matrix2): Matrix2 | null {
  const det = a * d - b * c;
  return Math.abs(det) < 1e-10 ? null : [d / det, -b / det, -c / det, a / det];
}
export function matrixPreview(matrix: Matrix2, t: number) {
  const [a, b, c, d] = matrix;
  const rotation =
    Math.abs(a * a + c * c - 1) < 1e-12 &&
    Math.abs(b * b + d * d - 1) < 1e-12 &&
    Math.abs(a * b + c * d) < 1e-12 &&
    determinant(matrix) > 0;
  if (!rotation) return { matrix: interpolateMatrix(matrix, t), path: "linear" as const };
  if (t === 0 || t === 1) return { matrix: t === 0 ? identity : matrix, path: "rotation" as const };
  const angle = Math.atan2(c, a) * t;
  return {
    matrix: [Math.cos(angle), -Math.sin(angle), Math.sin(angle), Math.cos(angle)] as Matrix2,
    path: "rotation" as const,
  };
}
export type EigenModel =
  | { kind: "all"; value: number }
  | { kind: "complex" }
  | { kind: "unstable" }
  | { kind: "real"; pairs: { value: number; vector: Vector2 }[] };
export function realEigensystem([a, b, c, d]: Matrix2): EigenModel {
  if (b === 0 && c === 0 && a === d) return { kind: "all", value: a };
  const discriminant = (a - d) ** 2 + 4 * b * c,
    scale = Math.max(1, a * a + b * b + c * c + d * d);
  if (discriminant !== 0 && Math.abs(discriminant) < 1e-12 * scale) return { kind: "unstable" };
  if (discriminant < 0) return { kind: "complex" };
  const values =
    discriminant === 0
      ? [(a + d) / 2]
      : [(a + d + Math.sqrt(discriminant)) / 2, (a + d - Math.sqrt(discriminant)) / 2];
  return {
    kind: "real",
    pairs: values.map((value) => {
      const first: Vector2 = [a - value, b],
        second: Vector2 = [c, d - value];
      const row = Math.hypot(...first) >= Math.hypot(...second) ? first : second;
      let vector: Vector2 = [-row[1], row[0]];
      const length = Math.hypot(...vector);
      vector = [vector[0] / length, vector[1] / length];
      if (vector[0] < -1e-12 || (Math.abs(vector[0]) < 1e-12 && vector[1] < 0))
        vector = [-vector[0], -vector[1]];
      return { value, vector };
    }),
  };
}
export type Polynomial = [number, number, number];
export function polynomial([q, l, c]: Polynomial, x: number) {
  return (q * x + l) * x + c;
}
export function integral([q, l, c]: Polynomial, a: number, b: number) {
  return (q * (b * b * b - a * a * a)) / 3 + (l * (b * b - a * a)) / 2 + c * (b - a);
}
export function polynomialRange(coefficients: Polynomial, a: number, b: number) {
  const values = [polynomial(coefficients, a), polynomial(coefficients, b)];
  const vertex = coefficients[0] ? -coefficients[1] / (2 * coefficients[0]) : NaN;
  if (vertex > a && vertex < b) values.push(polynomial(coefficients, vertex));
  return [Math.min(...values), Math.max(...values)] as [number, number];
}
export function geometricArea(coefficients: Polynomial, a: number, b: number) {
  const [q, l, c] = coefficients;
  const roots: number[] = [];
  if (q === 0) {
    if (l !== 0) roots.push(-c / l);
  } else {
    const d = l * l - 4 * q * c;
    if (d >= 0) roots.push((-l + Math.sqrt(d)) / (2 * q), (-l - Math.sqrt(d)) / (2 * q));
  }
  const points = [a, ...roots.filter((x) => x > a && x < b).sort((x, y) => x - y), b];
  return points
    .slice(1)
    .reduce((sum, x, i) => sum + Math.abs(integral(coefficients, points[i], x)), 0);
}
export type SumMethod = "left" | "midpoint" | "right";
export function riemannSum(
  coefficients: Polynomial,
  a: number,
  b: number,
  n: number,
  method: SumMethod,
) {
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 512 ||
    !(b > a) ||
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    !coefficients.every(Number.isFinite)
  )
    throw Error("Use 1–512 partitions and increasing finite bounds.");
  const width = (b - a) / n,
    offset = method === "left" ? 0 : method === "right" ? 1 : 0.5;
  let sum = 0,
    correction = 0,
    lower = 0,
    upper = 0;
  const rectangles = Array.from({ length: n }, (_, i) => {
    const x0 = a + i * width,
      x1 = a + (i + 1) * width,
      sample = x0 + offset * width,
      height = polynomial(coefficients, sample);
    const term = height * width - correction,
      next = sum + term;
    correction = next - sum - term;
    sum = next;
    const range = polynomialRange(coefficients, x0, x1);
    lower += range[0] * width;
    upper += range[1] * width;
    return { x0, x1, sample, height };
  });
  return {
    sum,
    lower,
    upper,
    width,
    rectangles,
    exact: integral(coefficients, a, b),
    area: geometricArea(coefficients, a, b),
  };
}
export function numberLabel(value: number) {
  return value === 0 ? "0" : Number(value.toPrecision(9)).toString();
}
export function latexNumber(value: number) {
  const s = String(value);
  if (!/[eE]/.test(s)) return s;
  const [m, e] = s.split(/[eE]/);
  return `${m}\\times10^{${Number(e)}}`;
}
export function polynomialLatex([q, l, c]: Polynomial) {
  let result = "";
  for (const [v, power] of [
    [q, "x^2"],
    [l, "x"],
    [c, ""],
  ] as [number, string][]) {
    if (!v) continue;
    result +=
      (v < 0 ? "-" : result ? "+" : "") +
      (Math.abs(v) === 1 && power ? "" : latexNumber(Math.abs(v))) +
      power;
  }
  return result || "0";
}
