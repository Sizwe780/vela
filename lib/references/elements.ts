import weightSnapshot from "../../content/references/ciaaw-weights.json";
import detailed from "../../content/references/pubchem-element-properties.json";
import snapshot from "../../content/references/pubchem-elements.json";
import { countFormula } from "../content/reaction-check";
const columns = snapshot.Table.Columns.Column;
const weights = weightSnapshot.elements as Record<
  string,
  { symbol: string; abridged: string | null; uncertainty: string | null; standard: string | null }
>;
export function categoryKey(category: string) {
  return category.toLowerCase().replace(/\s+/g, "-");
}
export type ElementRecord = ReturnType<typeof element>;
function element(row: { Cell: string[] }) {
  const d = Object.fromEntries(columns.map((k, i) => [k, row.Cell[i] ?? ""]));
  const z = Number(d.AtomicNumber);
  let period = z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7;
  const f = (z >= 57 && z <= 71) || (z >= 89 && z <= 103);
  const group = f
    ? null
    : period === 1
      ? z === 1
        ? 1
        : 18
      : period === 2
        ? z <= 4
          ? z - 2
          : z + 8
        : period === 3
          ? z <= 12
            ? z - 10
            : z
          : period === 4
            ? z - 18
            : period === 5
              ? z - 36
              : period === 6
                ? z <= 56
                  ? z - 54
                  : z - 68
                : z <= 88
                  ? z - 86
                  : z - 100;
  const block = f
    ? "f"
    : z === 2 || (group !== null && group <= 2)
      ? "s"
      : group !== null && group >= 13
        ? "p"
        : "d";
  const weight = weights[String(z)];
  return {
    z,
    symbol: d.Symbol,
    name: d.Name,
    weight: weight?.abridged ?? "—",
    weightUncertainty: weight?.uncertainty ?? null,
    standardWeight: weight?.standard ?? null,
    configuration: d.ElectronConfiguration,
    electronegativity: d.Electronegativity,
    radius: d.AtomicRadius,
    ionization: d.IonizationEnergy,
    affinity: d.ElectronAffinity,
    oxidation: d.OxidationStates,
    state: d.StandardState,
    melting: d.MeltingPoint,
    boiling: d.BoilingPoint,
    density: d.Density,
    category: group === 12 ? "Group 12 metal" : d.GroupBlock,
    sourceCategory: d.GroupBlock,
    period,
    group,
    block,
    row: f ? (z <= 71 ? 9 : 10) : period,
    column: f ? (z <= 71 ? z - 54 : z - 86) : group!,
  };
}
export const elements = snapshot.Table.Row.map(element);
export const elementsBySymbol = new Map(elements.map((e) => [e.symbol, e]));
export function fullConfiguration(e: ElementRecord, depth = 0): string {
  if (depth > 8) return e.configuration;
  return e.configuration.replace(/\[([A-Z][a-z]?)\]/, (_, symbol) => {
    const core = elementsBySymbol.get(symbol);
    return core ? fullConfiguration(core, depth + 1) + " " : "[" + symbol + "]";
  });
}
export function outerShellElectrons(e: ElementRecord) {
  if (e.block === "d" || e.block === "f")
    return "Variable; oxidation states and bonding context matter";
  const full = fullConfiguration(e);
  const orbitals = [...full.matchAll(/(\d)([spdf])(\d+)/g)];
  const outer = Math.max(...orbitals.map((m) => Number(m[1])));
  return String(
    orbitals.filter((m) => Number(m[1]) === outer).reduce((n, m) => n + Number(m[3]), 0),
  );
}
export function molarMass(input: string) {
  const source = input
    .trim()
    .replace(/([₀-₉])/g, (c) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(c)))
    .replace(/\((?:s|l|g|aq)\)$/, "");
  if (!source || source.length > 180) throw Error("Enter a formula of at most 180 characters.");
  const counts = new Map<string, number>();
  for (const [i, part] of source.split(/[·.]/).entries()) {
    const m = /^(\d+)(.*)$/.exec(part);
    if (i === 0 && m) throw Error("Use a formula, without a reaction coefficient.");
    const factor = m ? Number(m[1]) : 1;
    if (!Number.isSafeInteger(factor) || factor < 1 || factor > 999)
      throw Error("Hydrate coefficients must be 1–999.");
    for (const [symbol, n] of countFormula(m ? m[2] : part)) {
      if (!elementsBySymbol.has(symbol)) throw Error("Unknown element: " + symbol);
      const total = (counts.get(symbol) ?? 0) + n * factor;
      if (!Number.isSafeInteger(total) || total > 1e9) throw Error("Formula count is too large.");
      counts.set(symbol, total);
    }
  }
  const masses = [...counts].map(([symbol, count]) => {
    const e = elementsBySymbol.get(symbol)!;
    if (!e.standardWeight)
      throw Error(symbol + " has no standard atomic weight; an isotope-specific mass is needed.");
    const weight = Number(e.weight);
    if (!Number.isFinite(weight) || weight <= 0)
      throw Error("A usable atomic weight is unavailable for " + symbol);
    return { symbol, count, weight, mass: weight * count };
  });
  const total = masses.reduce((n, e) => n + e.mass, 0);
  return { total, composition: masses.map((e) => ({ ...e, percent: (100 * e.mass) / total })) };
}
export const elementSource = {
  url: "https://pubchem.ncbi.nlm.nih.gov/periodic-table/",
  download: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON",
  retrieved: "2026-11-27",
  sha256: "6abc1932a117fccc4c61bf9cdbcf96a0355beac82cddba82bd436e6ce4aee72a",
};

export function elementDetails(z: number) {
  return (
    detailed as Record<
      string,
      {
        sourceUrl: string;
        retrieved: string;
        sha256: string;
        covalentRadius: string | null;
        isotopes: string[];
      }
    >
  )[String(z)];
}

export const atomicWeightSource = {
  edition: weightSnapshot.edition,
  retrieved: weightSnapshot.retrieved,
  url: weightSnapshot.sources.abridged.url,
  fullUrl: weightSnapshot.sources.standard.url,
  sha256: weightSnapshot.sources.abridged.sha256,
};
