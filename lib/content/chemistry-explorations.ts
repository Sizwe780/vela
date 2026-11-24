import { exploration as make } from "./exploration";

export const chemistryExplorations = {
  matter: make(
    "See composition at two scales",
    "Compare the visible sample with the particles that account for its composition. Which cases can look uniform?",
    ["Scale", "What you observe", "What it tells you"],
    [
      [
        "Pure water",
        "Sample|One liquid region|Uniform\nParticles|H₂O throughout|One compound",
        "Uniform appearance is compatible with a pure compound.",
      ],
      [
        "Salt solution",
        "Sample|One liquid region|Uniform\nParticles|Water and dissolved ions|Composition can vary",
        "A homogeneous mixture can have one visible phase and more than one substance.",
        1,
      ],
      [
        "Oil and water",
        "Sample|Two liquid regions|An interface is visible\nParticles|Different compositions in the two regions|Heterogeneous",
        "The boundary separates regions with different compositions.",
        0,
      ],
    ],
  ),
  isotope: make(
    "Track what changes in atom notation",
    "Start with chlorine-35. Predict which count changes when you add a neutron or an electron.",
    ["Quantity", "Count", "Where to read it"],
    [
      [
        "Chlorine-35 atom",
        "Protons|17|Atomic number\nNeutrons|18|35 − 17\nElectrons|17|Neutral atom",
        "The mass number counts protons and neutrons.",
      ],
      [
        "Chlorine-37 atom",
        "Protons|17|Atomic number\nNeutrons|20|37 − 17\nElectrons|17|Neutral atom",
        "Adding neutrons changes the isotope while keeping the element and charge fixed.",
        1,
      ],
      [
        "Chloride-37 ion",
        "Protons|17|Atomic number\nNeutrons|20|37 − 17\nElectrons|18|Charge −1",
        "Adding an electron changes the charge while keeping the isotope fixed.",
        2,
      ],
    ],
  ),
  neutrality: make(
    "Find a neutral ion ratio",
    "Try different amounts of aluminium and oxide ions. Track the total charges separately before adding them.",
    ["Ion", "Number", "Charge contribution"],
    [
      [
        "Try 1 to 1",
        "Al³⁺|1|+3\nO²⁻|1|−2\nTotal|2 ions|+1",
        "One of each leaves a net charge of +1.",
        2,
      ],
      [
        "Try 2 to 3",
        "Al³⁺|2|+6\nO²⁻|3|−6\nTotal|5 ions|0",
        "The smallest neutral whole-number ratio gives Al₂O₃.",
        2,
      ],
      [
        "Try 4 to 6",
        "Al³⁺|4|+12\nO²⁻|6|−12\nTotal|10 ions|0",
        "Doubling both counts preserves neutrality and represents the same empirical ratio.",
        2,
      ],
    ],
  ),
  orbitals: make(
    "Count orbitals before counting electrons",
    "Keep the principal shell at n = 3. Change the subshell and count the allowed orientations.",
    ["Property", "Allowed values or count"],
    [
      [
        "3s",
        "Angular momentum ℓ|0\nMagnetic numbers mℓ|0\nOrbitals|1\nElectron capacity|2",
        "Each allowed magnetic number identifies one orbital.",
      ],
      [
        "3p",
        "Angular momentum ℓ|1\nMagnetic numbers mℓ|−1, 0, +1\nOrbitals|3\nElectron capacity|6",
        "Each orbital accommodates two electrons with opposite spin projections.",
        1,
      ],
      [
        "3d",
        "Angular momentum ℓ|2\nMagnetic numbers mℓ|−2, −1, 0, +1, +2\nOrbitals|5\nElectron capacity|10",
        "The shell label stays at n = 3 while orbital count increases with ℓ.",
        2,
      ],
    ],
  ),
  // NIST ground-state ionization energies, converted from eV per atom and rounded to kJ/mol.
  // https://www.nist.gov/system/files/documents/2024/06/25/NIST_periodictable_June24_iupac.pdf
  periodic: {
    ...make(
      "Compare a trend and its exceptions",
      "Use each pair to identify what changed for the outer electron. Read the rounded first ionization energies on a common scale from 0 to 1500 kJ/mol.",
      ["Atom", "Outer configuration", "First ionization energy"],
      [
        [
          "Li → Na",
          "Li|2s¹|520\nNa|3s¹|496",
          "An outer electron in the next shell is farther out and more shielded. Less energy is required here.",
          1,
        ],
        [
          "Be → B",
          "Be|2s²|900\nB|2s² 2p¹|801",
          "The first electron removed from boron occupies a 2p orbital. A new subshell interrupts the general rise across the period.",
          1,
        ],
        [
          "N → O",
          "N|2s² 2p³|1402\nO|2s² 2p⁴|1314",
          "Oxygen has one paired 2p orbital. Electron repulsion within that pair helps explain why its first electron is easier to remove.",
          1,
        ],
      ],
    ),
    comparison: { column: 2, max: 1500, unit: "kJ/mol" },
  },
  lewis: make(
    "Spend the electron budget",
    "Follow 16 valence electrons through the carbon dioxide skeleton. Track bonding and lone-pair electrons as separate inventories.",
    ["Inventory", "Count", "Placement"],
    [
      [
        "Draw single bonds",
        "Bonding electrons|4|O–C–O\nLone-pair electrons|0|To be placed\nElectrons left|12|Available",
        "Two single bonds cost four electrons.",
      ],
      [
        "Fill terminal octets",
        "Bonding electrons|4|O–C–O\nLone-pair electrons|12|Three pairs on each oxygen\nElectrons left|0|Budget exhausted",
        "Each oxygen has an octet. The central carbon has only four electrons around it.",
        2,
      ],
      [
        "Move two pairs into bonds",
        "Bonding electrons|8|O=C=O\nLone-pair electrons|8|Two pairs on each oxygen\nElectrons left|0|Budget exhausted",
        "Moving one lone pair from each oxygen into its bond completes the carbon octet and leaves the total at 16.",
        0,
      ],
    ],
  ),
  attractions: make(
    "Compare attractions between molecules",
    "Select a pure liquid. Track which attractions exist between its molecules and which bonds would still exist in its vapour.",
    ["Interaction", "Present?", "Where it acts"],
    [
      [
        "Liquid methane",
        "Dispersion|Yes|Between CH₄ molecules\nPermanent dipole attraction|No|CH₄ has no net dipole\nHydrogen bonding|No|No suitable donor",
        "Dispersion acts even when a molecule has no permanent dipole.",
      ],
      [
        "Liquid chloromethane",
        "Dispersion|Yes|Between CH₃Cl molecules\nPermanent dipole attraction|Yes|Between polar molecules\nHydrogen bonding|No|No suitable donor",
        "Chloromethane has both dispersion and dipole attractions.",
        1,
      ],
      [
        "Liquid methanol",
        "Dispersion|Yes|Between CH₃OH molecules\nPermanent dipole attraction|Yes|Between polar molecules\nHydrogen bonding|Yes|O–H donor and O acceptor",
        "The attractions change on vaporisation. The covalent connectivity within each molecule remains.",
        2,
      ],
    ],
  ),
  reactions: make(
    "Match observations to reaction evidence",
    "Look at the evidence in each scene. Decide what particle-level claim the observation can support and what needs another check.",
    ["Clue", "Evidence", "Useful next check"],
    [
      [
        "Cloudiness",
        "Observation|Solid forms after mixing clear solutions|Filter and identify the solid\nPossible class|Precipitation|Check product solubility",
        "A new solid supports precipitation when the conditions and product agree.",
        0,
      ],
      [
        "Bubbles",
        "Observation|Gas evolves with no boiling|Test the gas identity\nPossible class|Gas-forming reaction|Check products and conditions",
        "Bubbles show a gas leaving the liquid. Their appearance alone does not identify the gas.",
        0,
      ],
      [
        "Metal coating",
        "Observation|A new metal coats a surface|Identify the coating\nPossible class|Redox displacement|Check oxidation state changes",
        "Tracking electron transfer and the identity of both metals distinguishes displacement from a physical coating.",
        1,
      ],
    ],
  ),
  evidence: make(
    "Separate a product prediction from evidence",
    "Follow a proposed solid from prediction to identification. At each stage ask what remains untested.",
    ["Claim", "Evidence now available"],
    [
      [
        "Predict a solid",
        "Starting solutions|Known dissolved species\nPossible product|Solubility comparison points to a solid\nObserved product|No sample collected yet",
        "A solubility rule predicts a likely product under suitable conditions.",
        1,
      ],
      [
        "Observe cloudiness",
        "Starting solutions|Same starting species\nPossible product|Still the predicted solid\nObserved product|Solid particles are visible",
        "The observation supports solid formation. It leaves the identity open.",
        2,
      ],
      [
        "Compare to a reference",
        "Starting solutions|Known dissolved species\nPossible product|Compare candidates\nObserved product|An independent test matches an identified sample",
        "Independent identification strengthens the proposed product assignment.",
        2,
      ],
    ],
  ),
  mole: make(
    "Change the amount and read both scales",
    "Double the amount of carbon dioxide while keeping its molar mass near 44.0 g/mol. Which readouts double?",
    ["Measurement", "Reading"],
    [
      [
        "0.25 mol",
        "Amount|0.25 mol\nMass|11 g\nMolecules|≈ 1.51 × 10²³",
        "Mass and particle count are proportional to amount for a fixed substance.",
      ],
      [
        "0.50 mol",
        "Amount|0.50 mol\nMass|22 g\nMolecules|≈ 3.01 × 10²³",
        "The number of molecules doubles before rounding, as does mass.",
        2,
      ],
      [
        "1.00 mol",
        "Amount|1.00 mol\nMass|44 g\nMolecules|≈ 6.02 × 10²³",
        "The molar mass controls the mass scale and the Avogadro constant controls the count scale.",
        1,
      ],
    ],
  ),
  empirical: make(
    "Keep the ratio while changing the molecule",
    "Compare two structures with the same simplest carbon-to-hydrogen ratio. Recover the molecular formula by comparing molar masses.",
    ["Quantity", "Value"],
    [
      [
        "Simplest ratio",
        "Carbon to hydrogen|1 : 2\nEmpirical formula|CH₂\nEmpirical formula mass|≈ 14 g/mol",
        "The empirical formula gives the simplest whole-number ratio.",
      ],
      [
        "Molar mass near 42 g/mol",
        "Carbon to hydrogen|3 : 6\nMultiplier|42 ÷ 14 = 3\nMolecular formula|C₃H₆",
        "Multiply every subscript together to maintain the original ratio.",
        2,
      ],
      [
        "Molar mass near 56 g/mol",
        "Carbon to hydrogen|4 : 8\nMultiplier|56 ÷ 14 = 4\nMolecular formula|C₄H₈",
        "The same simplest ratio is consistent with more than one molecular formula.",
        2,
      ],
    ],
  ),
  yield: make(
    "Compare measured mass with a fixed yield",
    "Suppose the balanced equation predicts 20.0 g of product. Change the measured mass and decide when to investigate the sample.",
    ["Quantity", "Value"],
    [
      [
        "Collect 15.0 g",
        "Theoretical yield|20.0 g\nMeasured mass|15.0 g\nPercentage yield|75.0%",
        "The sample could reflect incomplete reaction, product loss or another cause. Mass alone does not distinguish them.",
        2,
      ],
      [
        "Collect 20.0 g",
        "Theoretical yield|20.0 g\nMeasured mass|20.0 g\nPercentage yield|100%",
        "Equality is consistent with the predicted yield under the stated assumptions.",
        2,
      ],
      [
        "Collect 21.0 g",
        "Theoretical yield|20.0 g\nMeasured mass|21.0 g\nApparent percentage yield|105%",
        "Check for retained solvent, contamination or an incorrect prediction before interpreting the value.",
        2,
      ],
    ],
  ),
  ppm: make(
    "Keep the denominator visible",
    "Start with 3.0 mg of solute in 2.0 kg of solution. Compare dilution with taking an aliquot from a well-mixed sample.",
    ["Measurement", "Reading"],
    [
      [
        "Original solution",
        "Solute mass|3.0 mg\nSolution mass|2.0 kg\nMass-based concentration|1.5 ppm",
        "One milligram per kilogram is one part per million by mass.",
        2,
      ],
      [
        "Dilute to 4.0 kg",
        "Solute mass|3.0 mg\nSolution mass|4.0 kg\nMass-based concentration|0.75 ppm",
        "Adding solvent changes the denominator and keeps solute mass fixed.",
        1,
      ],
      [
        "Take half the original",
        "Solute mass|1.5 mg\nSolution mass|1.0 kg\nMass-based concentration|1.5 ppm",
        "Sampling a well-mixed solution changes both masses by the same factor.",
        2,
      ],
    ],
  ),
};
