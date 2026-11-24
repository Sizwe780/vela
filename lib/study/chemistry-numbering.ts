export function canonicalChemistryUnitCode(unitCode: string) {
  if (unitCode === "CHE1501-U11") return "CHE1501-U8";
  return unitCode;
}
