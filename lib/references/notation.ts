/** Presentation only: preserve raw notation for electron-count and source-data checks. */
function superscript(value: string) {
  return value.replace(/[0-9]/g, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);
}
export function formatElectronConfiguration(value: string) {
  return value.replace(
    /(\d[spdf])(\d+)/g,
    (_all, orbital: string, count: string) => orbital + superscript(count),
  );
}
export function formatIsotopeNotation(value: string) {
  return value.replace(
    /\b(\d+)([A-Z][a-z]?)\b/g,
    (_all, mass: string, symbol: string) => superscript(mass) + symbol,
  );
}
