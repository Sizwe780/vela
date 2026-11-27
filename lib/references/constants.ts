export const constantSource = "https://physics.nist.gov/cuu/Constants/";
export const constants = [
  {
    symbol: "c",
    name: "Speed of light in vacuum",
    value: "299792458",
    unit: "m/s",
    uncertainty: "0",
    basis: "Exact SI definition",
  },
  {
    symbol: "h",
    name: "Planck constant",
    value: "6.62607015e-34",
    unit: "J s",
    uncertainty: "0",
    basis: "Exact SI definition",
  },
  {
    symbol: "e",
    name: "Elementary charge",
    value: "1.602176634e-19",
    unit: "C",
    uncertainty: "0",
    basis: "Exact SI definition",
  },
  {
    symbol: "N_A",
    name: "Avogadro constant",
    value: "6.02214076e23",
    unit: "1/mol",
    uncertainty: "0",
    basis: "Exact SI definition",
  },
  {
    symbol: "k_B",
    name: "Boltzmann constant",
    value: "1.380649e-23",
    unit: "J/K",
    uncertainty: "0",
    basis: "Exact SI definition",
  },
  {
    symbol: "R",
    name: "Molar gas constant",
    value: "8.31446261815324",
    unit: "J/(mol K)",
    uncertainty: "0",
    basis: "Exact product N_A k_B",
  },
  {
    symbol: "F",
    name: "Faraday constant",
    value: "96485.3321233100184",
    unit: "C/mol",
    uncertainty: "0",
    basis: "Exact product N_A e",
  },
  {
    symbol: "G",
    name: "Newtonian constant of gravitation",
    value: "6.67430e-11",
    unit: "m^3/(kg s^2)",
    uncertainty: "1.5e-15",
    basis: "CODATA 2022; standard uncertainty",
  },
  {
    symbol: "g_n",
    name: "Standard acceleration of gravity",
    value: "9.80665",
    unit: "m/s^2",
    uncertainty: "0",
    basis: "Conventional exact standard, not local measured gravity",
  },
] as const;
export const prefixes = [
  { symbol: "p", name: "pico", power: -12 },
  { symbol: "n", name: "nano", power: -9 },
  { symbol: "µ", name: "micro", power: -6 },
  { symbol: "m", name: "milli", power: -3 },
  { symbol: "c", name: "centi", power: -2 },
  { symbol: "d", name: "deci", power: -1 },
  { symbol: "", name: "base unit", power: 0 },
  { symbol: "da", name: "deca", power: 1 },
  { symbol: "h", name: "hecto", power: 2 },
  { symbol: "k", name: "kilo", power: 3 },
  { symbol: "M", name: "mega", power: 6 },
  { symbol: "G", name: "giga", power: 9 },
  { symbol: "T", name: "tera", power: 12 },
];
export const conversions = {
  energy: { label: "Energy", units: { eV: 1.602176634e-19, J: 1, kJ: 1000 } },
  pressure: { label: "Pressure", units: { Pa: 1, kPa: 1000, atm: 101325, mmHg: 133.322387415 } },
  volume: { label: "Volume", units: { "m³": 1, L: 1e-3, mL: 1e-6, "cm³": 1e-6 } },
  angle: { label: "Angle", units: { rad: 1, deg: Math.PI / 180 } },
} as const;
export function convertReference(
  value: number,
  from: string,
  to: string,
  kind: keyof typeof conversions,
) {
  const u = conversions[kind].units as Record<string, number>;
  if (!Number.isFinite(value) || !Object.hasOwn(u, from) || !Object.hasOwn(u, to))
    throw Error("Choose compatible supported units and a finite value.");
  return (value * u[from]) / u[to];
}
