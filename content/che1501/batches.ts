import { foundations } from "./foundations";
import { quantumPeriodicity } from "./quantum-periodicity";
import { chemistrySource } from "./source-map";
import { chemicalBonding } from "./chemical-bonding";
import { reactionClasses, reactionSkeletons } from "./reaction-classes";
import { stoichiometry } from "./stoichiometry";
import { solutions } from "./solutions";
import { chemicalEquilibrium } from "./equilibrium";
import { gases } from "./gases";
import { addInlineExplorations } from "../inline-explorations";
import { chemistryInlineModels } from "./inline-models";

// Positions follow the historical guide. Each batch can be audited and staged independently.
export const chemistryBatches = [
  {
    unit: foundations,
    position: 1,
    outcome:
      "Classify matter, calculate density with appropriate precision, interpret isotope and ion notation, and write and name ionic compounds.",
    references: chemistrySource.units[foundations.code].readings,
  },
  {
    unit: quantumPeriodicity,
    position: 2,
    outcome:
      "Interpret atomic spectra and quantum numbers, write electron configurations, and justify periodic trends and exceptions.",
    references: chemistrySource.units[quantumPeriodicity.code].readings,
  },
  {
    unit: chemicalBonding,
    position: 3,
    outcome: "Use electron budgets, geometry and orbital overlap to explain bonding, predict molecular polarity and compare intermolecular attractions.",
    references: chemistrySource.units[chemicalBonding.code].readings,
  },
  {
    unit: reactionClasses,
    position: 4,
    outcome:
      "Predict and classify common reactions, write and balance molecular and net ionic equations, identify redox agents, balance in acidic and basic media, and distinguish exothermic from endothermic changes.",
    references: chemistrySource.units[reactionClasses.code].readings,
    reactionSkeletons,
  },
  {
    unit: stoichiometry,
    position: 5,
    outcome: "Convert amount, particle count and mass; derive formulas; use equation ratios, limiting reagents and yield.",
    references: (chemistrySource.units as Record<string, { readings: readonly string[] }>)[stoichiometry.code].readings,
  },
  {
    unit: solutions,
    position: 6,
    outcome: "Distinguish molarity, molality and mole fraction; calculate dilution and concentration conversions.",
    references: (chemistrySource.units as Record<string, { readings: readonly string[] }>)[solutions.code].readings,
  },
  {
    unit: chemicalEquilibrium,
    position: 7,
    outcome: "Describe dynamic equilibrium, write K and Q expressions, and predict direction from Q/K.",
    references: (chemistrySource.units as Record<string, { readings: readonly string[] }>)[chemicalEquilibrium.code].readings,
  },
  {
    unit: gases,
    position: 8,
    outcome: "Use absolute temperature and compatible units in ideal-gas relationships and check model conditions.",
    references: (chemistrySource.units as Record<string, { readings: readonly string[] }>)[gases.code].readings,
  },
].map((batch) => ({ ...batch, unit: addInlineExplorations(batch.unit, chemistryInlineModels) }));
