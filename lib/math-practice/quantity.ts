import type { MathFeedback } from "./types";

type Dimensions = [number, number, number, number, number, number, number];
type Unit = { factor: number; dimensions: Dimensions };
// SI order: mass, length, time, current, temperature, amount, luminous intensity.
const units: Record<string, Unit> = {
  "1": { factor: 1, dimensions: [0, 0, 0, 0, 0, 0, 0] },
  g: { factor: 1e-3, dimensions: [1, 0, 0, 0, 0, 0, 0] },
  m: { factor: 1, dimensions: [0, 1, 0, 0, 0, 0, 0] },
  s: { factor: 1, dimensions: [0, 0, 1, 0, 0, 0, 0] },
  A: { factor: 1, dimensions: [0, 0, 0, 1, 0, 0, 0] },
  K: { factor: 1, dimensions: [0, 0, 0, 0, 1, 0, 0] },
  mol: { factor: 1, dimensions: [0, 0, 0, 0, 0, 1, 0] },
  cd: { factor: 1, dimensions: [0, 0, 0, 0, 0, 0, 1] },
  N: { factor: 1, dimensions: [1, 1, -2, 0, 0, 0, 0] },
  J: { factor: 1, dimensions: [1, 2, -2, 0, 0, 0, 0] },
  Pa: { factor: 1, dimensions: [1, -1, -2, 0, 0, 0, 0] },
  W: { factor: 1, dimensions: [1, 2, -3, 0, 0, 0, 0] },
  Hz: { factor: 1, dimensions: [0, 0, -1, 0, 0, 0, 0] },
  C: { factor: 1, dimensions: [0, 0, 1, 1, 0, 0, 0] },
  V: { factor: 1, dimensions: [1, 2, -3, -1, 0, 0, 0] },
  L: { factor: 1e-3, dimensions: [0, 3, 0, 0, 0, 0, 0] },
};
const prefixes: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  μ: 1e-6,
  m: 1e-3,
  c: 1e-2,
  d: 1e-1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
};

function lookup(symbol: string): Unit {
  if (Object.hasOwn(units, symbol)) return units[symbol];
  const prefix = symbol[0];
  const base = symbol.slice(1);
  if (base !== "1" && Object.hasOwn(units, base) && Object.hasOwn(prefixes, prefix)) {
    return { ...units[base], factor: units[base].factor * prefixes[prefix] };
  }
  throw new Error(`Unsupported unit symbol: ${symbol}.`);
}

function parseUnit(raw: string): Unit {
  const input = raw
    .trim()
    .replace(
      /[⁻⁰¹²³⁴⁵⁶⁷⁸]+/g,
      (exponent) =>
        "^" +
        [...exponent]
          .map(
            (c) =>
              ({
                "⁻": "-",
                "⁰": "0",
                "¹": "1",
                "²": "2",
                "³": "3",
                "⁴": "4",
                "⁵": "5",
                "⁶": "6",
                "⁷": "7",
                "⁸": "8",
              })[c],
          )
          .join(""),
    )
    .replace(/\\(?:mathrm|text)\{([A-Za-zμ]+)\}/g, "$1")
    .replace(/\\cdot|\\times|[·⋅×]/g, "*")
    .replace(/\^\{(-?\d+)\}/g, "^$1")
    .replace(/\s*([*/^])\s*/g, "$1")
    .replace(/\s+/g, "*");
  if (!input || input.length > 80)
    throw new Error("Enter a unit for each value. Use 1 for dimensionless quantities.");
  const tokens = input.split(/([*/])/);
  const dimensions: Dimensions = [0, 0, 0, 0, 0, 0, 0];
  let factor = 1;
  for (let i = 0; i < tokens.length; i += 2) {
    const match = /^(1|[A-Za-zμ]+)(?:\^(-?[0-8]))?$/.exec(tokens[i]);
    if (!match)
      throw new Error("Use unit symbols with products, quotients and integer powers from −8 to 8.");
    const unit = lookup(match[1]);
    const exponent = Number(match[2] ?? 1) * (tokens[i - 1] === "/" ? -1 : 1);
    factor *= unit.factor ** exponent;
    for (let j = 0; j < dimensions.length; j++) dimensions[j] += unit.dimensions[j] * exponent;
  }
  if (!Number.isFinite(factor) || factor === 0)
    throw new Error("The unit scale is outside the supported range.");
  return { factor, dimensions };
}

export type Quantity = { value: string; unit: string };

function siValue(quantity: Quantity, unit: Unit) {
  const text = quantity.value.trim().replace(/^−/, "-");
  const value = Number(text) * unit.factor;
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ||
    !Number.isFinite(value) ||
    (value === 0 && /[1-9]/.test(text.split(/e/i)[0]))
  ) {
    throw new Error("Enter a finite decimal or scientific-notation magnitude, such as 2.5e3.");
  }
  return value;
}

export function checkQuantity(reference: Quantity, next: Quantity): MathFeedback {
  try {
    const before = parseUnit(reference.unit);
    const after = parseUnit(next.unit);
    const expected = siValue(reference, before);
    const actual = siValue(next, after);
    if (before.dimensions.some((power, index) => power !== after.dimensions[index])) {
      return {
        status: "not-equivalent",
        message: "The units have different SI dimensions. Check the unit symbols and exponents.",
      };
    }
    if (Math.abs(expected - actual) > 1e-12 * Math.max(Math.abs(expected), Math.abs(actual))) {
      return {
        status: "not-equivalent",
        message:
          "The dimensions match, but the converted magnitudes differ. Check the prefix or conversion factor.",
      };
    }
    return { status: "equivalent", message: "The SI dimensions and converted magnitudes match." };
  } catch (error) {
    return {
      status: "unsupported",
      message: error instanceof Error ? error.message : "This quantity could not be checked.",
    };
  }
}

/** Shared, bounded SI conversion for rounding-tolerant practice checks. */
export function quantitySI(quantity: Quantity) {
  const unit = parseUnit(quantity.unit);
  return { value: siValue(quantity, unit), dimensions: unit.dimensions };
}
