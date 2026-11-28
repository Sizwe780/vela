import type { MathFeedback } from "./types";

export type Dimensions = [number, number, number, number, number, number, number];
type Unit = { factor: number; dimensions: Dimensions; offset?: number; normalized?: string };
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
  min: { factor: 60, dimensions: [0, 0, 1, 0, 0, 0, 0] },
  h: { factor: 3600, dimensions: [0, 0, 1, 0, 0, 0, 0] },
  atm: { factor: 101325, dimensions: [1, -1, -2, 0, 0, 0, 0] },
  bar: { factor: 1e5, dimensions: [1, -1, -2, 0, 0, 0, 0] },
  mmHg: { factor: 133.322387415, dimensions: [1, -1, -2, 0, 0, 0, 0] },
  torr: { factor: 101325 / 760, dimensions: [1, -1, -2, 0, 0, 0, 0] },
  eV: { factor: 1.602176634e-19, dimensions: [1, 2, -2, 0, 0, 0, 0] },
  rad: { factor: 1, dimensions: [0, 0, 0, 0, 0, 0, 0] },
  deg: { factor: Math.PI / 180, dimensions: [0, 0, 0, 0, 0, 0, 0] },
};
const prefixes: Record<string, number> = {
  da: 1e1,
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  μ: 1e-6,
  m: 1e-3,
  c: 1e-2,
  d: 1e-1,
  h: 1e2,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};
// Explicit aliases only: SI case carries meaning (mPa and MPa are different).
const aliases: Record<string, string> = {
  l: "L",
  ml: "mL",
  ul: "uL",
  μl: "μL",
  cc: "cm^3",
  hr: "h",
  hrs: "h",
  hour: "h",
  hours: "h",
  minute: "min",
  minutes: "min",
  sec: "s",
  second: "s",
  seconds: "s",
  liter: "L",
  litre: "L",
  liters: "L",
  litres: "L",
  milliliter: "mL",
  millilitre: "mL",
  milliliters: "mL",
  millilitres: "mL",
  j: "J",
  ev: "eV",
  kpa: "kPa",
  pa: "Pa",
  mmhg: "mmHg",
  Torr: "torr",
  kelvin: "K",
  Kelvin: "K",
};
const prefixable = new Set([
  "g",
  "m",
  "s",
  "A",
  "K",
  "mol",
  "cd",
  "N",
  "J",
  "Pa",
  "W",
  "Hz",
  "C",
  "V",
  "L",
  "eV",
  "bar",
]);
function lookup(symbol: string): Unit {
  if (Object.hasOwn(units, symbol)) return units[symbol];
  for (const prefix of Object.keys(prefixes)) {
    const base = symbol.slice(prefix.length) === "l" ? "L" : symbol.slice(prefix.length);
    if (symbol.startsWith(prefix) && prefixable.has(base))
      return { ...units[base], factor: units[base].factor * prefixes[prefix] };
  }
  throw Error(
    `Unsupported unit symbol: ${symbol}. Try L/l, mL/ml, cm³, m³, min, h, °C, K, atm, kPa, mmHg, torr, eV or J.`,
  );
}
function normalizeUnit(raw: string) {
  return raw
    .trim()
    .replaceAll("µ", "μ")
    .replace(/\\(?:mathrm|text)\{([A-Za-zμ°]+)\}/g, "$1")
    .replace(
      /[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
      (value) =>
        "^" + [...value].map((c) => (c === "⁻" ? "-" : String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)))).join(""),
    )
    .replace(/\\cdot|\\times|[·⋅×]/g, "*")
    .replace(/\^\{(-?\d+)\}/g, "^$1")
    .replace(/\s*([*/^()])\s*/g, "$1")
    .replace(/\s+/g, "*")
    .replace(/[A-Za-zμ]+/g, (symbol) =>
      Object.hasOwn(aliases, symbol) ? aliases[symbol] : symbol,
    );
}
export function parseUnit(raw: string): Unit & { normalized: string } {
  if (!raw.trim() || raw.length > 80)
    throw Error("Enter a unit for each value. Use 1 for dimensionless quantities.");
  if (/^(?:°\s*C|℃|degC|celsius)$/i.test(raw.trim()))
    return { factor: 1, offset: 273.15, dimensions: [0, 0, 0, 0, 1, 0, 0], normalized: "°C" };
  const input = normalizeUnit(raw);
  if (/^(?:°C|℃|degC|celsius)$/i.test(input))
    return { factor: 1, offset: 273.15, dimensions: [0, 0, 0, 0, 1, 0, 0], normalized: "°C" };
  if (input.includes("°") || /celsius|degC/i.test(input))
    throw Error(
      "Celsius has an offset. Use K in compound units; use °C or K alone for absolute-temperature conversion.",
    );
  const tokens = input.match(/[A-Za-zμ]+|[+-]?\d+|[*/^()]/g) ?? [];
  if (tokens.join("") !== input)
    throw Error(
      "Use unit symbols with products, quotients, parentheses and integer powers from −8 to 8.",
    );
  let position = 0,
    depth = 0;
  function primary(): Unit {
    if (++depth > 12) throw Error("The unit expression is too deeply nested.");
    let result: Unit;
    const symbol = tokens[position++];
    if (symbol === "(") {
      result = product();
      if (tokens[position++] !== ")") throw Error("Close the unit parentheses.");
    } else if (symbol && /^(?:1|[A-Za-zμ]+)$/.test(symbol)) result = lookup(symbol);
    else throw Error("Enter a unit symbol on each side of a product or quotient.");
    if (tokens[position] === "^") {
      position++;
      const text = tokens[position++],
        power = Number(text);
      if (!text || !/^[+-]?\d+$/.test(text) || Math.abs(power) > 8)
        throw Error("Unit powers must be integers from −8 to 8.");
      result = {
        factor: result.factor ** power,
        dimensions: result.dimensions.map((n) => n * power) as Dimensions,
      };
    }
    depth--;
    return result;
  }
  function product(): Unit {
    let value = primary();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const sign = tokens[position++] === "/" ? -1 : 1,
        next = primary();
      value = {
        factor: value.factor * next.factor ** sign,
        dimensions: value.dimensions.map((n, i) => n + sign * next.dimensions[i]) as Dimensions,
      };
    }
    return value;
  }
  const result = product();
  if (position !== tokens.length)
    throw Error("Separate unit factors with a space, * or / and check the parentheses.");
  if (!Number.isFinite(result.factor) || result.factor === 0)
    throw Error("The unit scale is outside the supported range.");
  return { ...result, normalized: input };
}
export type Quantity = { value: string; unit: string };
function magnitude(text: string) {
  const value = text.trim().replace(/^−/, "-");
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ||
    !Number.isFinite(Number(value))
  )
    throw Error("Enter a finite decimal or scientific-notation magnitude, such as 2.5e3.");
  const parsed = Number(value);
  if (parsed === 0 && /[1-9]/.test(value.split(/e/i)[0]))
    throw Error("The magnitude is outside the supported numeric range.");
  return parsed;
}
function siValue(quantity: Quantity, unit: Unit) {
  const original = magnitude(quantity.value),
    scaled = original * unit.factor;
  const value = scaled + (unit.offset ?? 0);
  if (!Number.isFinite(value) || (scaled === 0 && original !== 0))
    throw Error("The magnitude is outside the supported numeric range.");
  return value;
}
export function formatMagnitude(value: number) {
  return String(Number(value.toPrecision(14)));
}
export function dimensionLabel(dimensions: Dimensions) {
  const labels = ["M", "L", "T", "I", "Θ", "N", "J"];
  const sup = (n: number) =>
    String(n).replace(/[-0-9]/g, (c) => (c === "-" ? "⁻" : "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(c)]));
  return (
    dimensions
      .map((n, i) => (n ? labels[i] + (n === 1 ? "" : sup(n)) : ""))
      .filter(Boolean)
      .join(" ") || "1 (dimensionless)"
  );
}
class DimensionMismatch extends Error {}
export function convertQuantity(reference: Quantity, targetUnit: string) {
  let before = parseUnit(reference.unit),
    after = parseUnit(targetUnit);
  const temperature = (u: Unit) => u.dimensions.every((n, i) => n === (i === 4 ? 1 : 0));
  // Bare C remains coulomb except when the other unit explicitly supplies temperature context.
  if (reference.unit.trim() === "C" && temperature(after)) before = parseUnit("°C");
  if (targetUnit.trim() === "C" && temperature(before)) after = parseUnit("°C");
  if (before.dimensions.some((n, i) => n !== after.dimensions[i]))
    throw new DimensionMismatch(
      `The units have different SI dimensions: ${dimensionLabel(before.dimensions)} → ${dimensionLabel(after.dimensions)}.`,
    );
  const sourceValue = magnitude(reference.value),
    sourceSI = siValue(reference, before);
  const factor = before.factor / after.factor,
    offset = ((before.offset ?? 0) - (after.offset ?? 0)) / after.factor;
  const value = (sourceSI - (after.offset ?? 0)) / after.factor;
  if (!Number.isFinite(value) || (value === 0 && sourceSI !== (after.offset ?? 0)))
    throw Error("The converted magnitude is outside the supported numeric range.");
  return {
    value,
    factor,
    offset,
    dimensions: before.dimensions,
    dimension: dimensionLabel(before.dimensions),
    sourceSI,
    sourceValue,
    sourceUnit: before.normalized,
    targetUnit: after.normalized,
  };
}
export function checkQuantity(reference: Quantity, next: Quantity): MathFeedback {
  try {
    const conversion = convertQuantity(reference, next.unit),
      actual = magnitude(next.value),
      expected = conversion.value;
    if (Math.abs(expected - actual) > 1e-12 * Math.max(Math.abs(expected), Math.abs(actual)))
      return {
        status: "not-equivalent",
        message: `The dimensions match, but the converted magnitudes differ. Expected ${formatMagnitude(expected)} ${conversion.targetUnit}; received ${formatMagnitude(actual)} ${conversion.targetUnit}. SI dimension: ${conversion.dimension}.`,
      };
    return {
      status: "equivalent",
      message: `The SI dimensions and converted magnitudes match: ${formatMagnitude(conversion.sourceValue)} ${conversion.sourceUnit} = ${formatMagnitude(expected)} ${conversion.targetUnit}. SI dimension: ${conversion.dimension}.`,
    };
  } catch (error) {
    return {
      status: error instanceof DimensionMismatch ? "not-equivalent" : "unsupported",
      message: error instanceof Error ? error.message : "This quantity could not be checked.",
    };
  }
}
/** Shared bounded SI conversion; no user-supplied dimension or conversion factor is trusted. */
export function quantitySI(quantity: Quantity) {
  const unit = parseUnit(quantity.unit);
  return { value: siValue(quantity, unit), dimensions: unit.dimensions };
}
