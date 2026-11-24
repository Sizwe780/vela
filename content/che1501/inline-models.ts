import type { LessonWidget } from "../../lib/content/widget-registry";
import type { chemistryExplorations } from "../../lib/content/chemistry-explorations";

const compare = (model: keyof typeof chemistryExplorations): LessonWidget => ({
  type: "chemistry_exploration",
  config: { model },
});

export const chemistryInlineModels: Readonly<Record<string, LessonWidget>> = {
  "Classify matter at two scales": compare("matter"),
  "Read atom, isotope and ion notation": compare("isotope"),
  "Write and interpret ionic formulas": compare("neutrality"),
  "Decode shells, subshells, orbitals and spin": compare("orbitals"),
  "Explain periodic trends and their exceptions": compare("periodic"),
  "Account for electrons with Lewis structures": compare("lewis"),
  "Connect orbital overlap to bond properties": { type: "orbital_overlap", config: {} },
  "Explain how molecules attract one another": compare("attractions"),
  "Classify reactions from observable patterns": compare("reactions"),
  "Connect product predictions to reaction evidence": compare("evidence"),
  "Count particles through the mole": compare("mole"),
  "Derive empirical and molecular formulas": compare("empirical"),
  "Calculate theoretical and percentage yield": compare("yield"),
  "Compare mass, mass fraction and ppm": compare("ppm"),
};
