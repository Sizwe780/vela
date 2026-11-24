const reading = (slug: string) => `https://openstax.org/books/chemistry-2e/pages/${slug}`;
const chapter = (number: string) => reading(`${number}-introduction`);

export const chemistrySource = {
  book: "Chemistry 2e",
  publisher: "OpenStax",
  referenceOnly: true,
  edition: 2,
  sourceScope: "Historical sequence within confirmed Vela exam scope; verify current assigned readings and assessment details",
  excludedUnits: [
    "CHE1501-U9 acid-base equilibria",
    "CHE1501-U10 thermochemistry",
  ],
  units: {
    "CHE1501-U1": { topic: "Chemical foundations", scope: "working", readings: [chapter("1"), chapter("2")] },
    "CHE1501-U2": { topic: "Quantum mechanics and periodicity", scope: "working", readings: [chapter("6"), chapter("2")] },
    "CHE1501-U3": {
      topic: "Chemical bonding",
      scope: "working",
      readings: [
        chapter("7"),
        reading("7-3-lewis-symbols-and-structures"),
        reading("7-6-molecular-structure-and-polarity"),
        reading("8-2-hybrid-atomic-orbitals"),
        reading("10-1-intermolecular-forces"),
      ],
    },
    "CHE1501-U4": {
      topic: "Reaction classes",
      scope: "working",
      readings: [
        reading("4-2-classifying-chemical-reactions"),
        reading("17-1-review-of-redox-chemistry"),
      ],
    },
    "CHE1501-U5": { topic: "Stoichiometry", scope: "working", readings: [chapter("3"), chapter("4")] },
    "CHE1501-U6": { topic: "Solutions and concentrations", scope: "working", readings: [chapter("3")] },
    "CHE1501-U7": { topic: "Chemical equilibrium", scope: "working", readings: [chapter("13")] },
    "CHE1501-U8": { topic: "Gases", scope: "working", readings: [chapter("9")] },
  },
} as const;
