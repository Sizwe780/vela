import type { SpecUnit } from "../../lib/specs";

export const foundations = {
  code: "CHE1501-U1" as const,
  title: "Chemical foundations",
  sessions: [
    {
      title: "Classify matter at two scales",
      visual: null,
      concepts: ["phases", "composition", "physical and chemical changes"],
      markdown: String.raw`## Learning goal
Classify a sample by composition and physical state, and explain what evidence would distinguish a mixture from a pure substance.

## Prerequisites
Recognize solid, liquid and gas as familiar states of matter.

## Intuition first
One beaker holds clear distilled water. A second holds clear water with dissolved salt. Both look uniform and both are liquids. Appearance tells you how evenly the contents are distributed, but by itself it cannot tell you how many substances are present.

## Why this works
State describes the physical form of the sample under stated conditions. Composition describes what is in it. An element has one type of atom. A compound has elements in a fixed chemical ratio. Mixtures can vary in composition. A homogeneous mixture is uniform throughout at the scale you are considering. A heterogeneous mixture has regions with different composition or distinct phases.

One substance can also occupy two phases. In a sealed vial containing pure liquid water and some ice, both phases consist of $\ce{H2O}$. Melting changes the arrangement and motion of the molecules. A chemical change forms different species by rearranging atoms.

## Visual exploration

| Sample | Physical regions visible | Composition |
| --- | --- | --- |
| Pure ice and liquid water | Two phases | One compound |
| Salt fully dissolved in water | One liquid phase | Uniform mixture |
| Water with undissolved sand | Solid and liquid regions | Nonuniform mixture |

## Assessment
### Recognition
:::exercise Identify the sample
The amount of dissolved salt differs between two clear samples of salt water. Which classification captures both their uniform appearance and their variable composition?
:::answer
Each is a homogeneous mixture. Uniformity describes each sample internally, and the amount of salt can vary between samples.
:::end

## Pause and Predict
:::exercise One phase disappears
All the pure ice in a sealed vial melts. What changes in your description of the sample?
:::answer
The sample goes from two phases to one liquid phase. Its chemical composition remains $\ce{H2O}$ throughout.
:::end`,
    },
    {
      title: "Measurements, density and precision",
      visual: "density-model",
      concepts: ["unit conversion", "density", "temperature", "significant figures", "measurement quality"],
      markdown: String.raw`## Learning goal
Convert units through cancellation, calculate density from measured quantities, and report the result at appropriate precision.

## Prerequisites
Divide decimal numbers and read positive and negative powers of ten.

## Intuition first
Two metal pieces can have different masses because one is larger. To compare the materials, ask how much mass each would have per unit volume. That comparison needs consistent units and a clear record of what was measured.

## Why this works
The relation $\rho=m/V$ divides mass by volume, so its dimension is mass divided by length cubed. A conversion factor is a ratio equal to one. Multiply by it in the direction that cancels the old unit. For example, $1\,\mathrm{mL}=1\,\mathrm{cm^3}$ exactly, so a density in grams per millilitre has the same numerical value in grams per cubic centimetre. The coherent SI unit for density is $\mathrm{kg\,m^{-3}}$. A density of $1\,\mathrm{g\,cm^{-3}}=10^3\,\mathrm{kg\,m^{-3}}$ because grams and cubic centimetres convert by different powers of ten. A conversion adds no measurement precision.

Scientific notation separates magnitude from the precision of the recorded digits. For example, $3.20\times10^2$ has three significant figures. For multiplication or division, use the fewest significant figures among the measured factors and round at the end. Precision concerns repeatability. Accuracy concerns closeness to a reference value. When converting Celsius to kelvin, add the exact offset 273.15 and keep the resolution of the original reading.

## Visual exploration
The diagram represents the sample volume as a filled section of a graduated cylinder. Hold the mass at 40 g and move the volume from 20 to 40 mL. Predict how the mass per cubic centimetre changes before moving the slider. Then try doubling both quantities to model two samples of the same material under the same conditions.

## Assessment
### Procedure
:::exercise Find the density
A solid has a mass of $47.6\,\mathrm{g}$ and a volume of $16.0\,\mathrm{mL}$. Calculate its density in $\mathrm{g\,cm^{-3}}$.
:::answer
The volume is $16.0\,\mathrm{cm^3}$ by exact conversion. The ratio is $47.6/16.0=2.975$. Both measurements have three significant figures, so the density is $2.98\,\mathrm{g\,cm^{-3}}$.
:::end

### Error correction
:::exercise Diagnose the thermometer reading
A student divides a measurement of $19.4\,{}^\circ\mathrm{C}$ by 273.15 to convert it to kelvin. Describe the correction and report the converted temperature.
:::answer
The two scales have equal interval sizes and different zero points, so apply an offset. The sum is 292.55, which rounds to $292.6\,\mathrm{K}$ at the original resolution of one decimal place.
:::end

## Pause and Predict
:::exercise Repeatable readings
Three measurements cluster around $9.6\,\mathrm{g}$, while a calibrated reference gives $10.2\,\mathrm{g}$. What does the cluster tell you, and what could explain its distance from the reference?
:::answer
The cluster suggests good repeatability. Its displacement from the reference suggests a possible systematic measurement error, such as an uncorrected zero offset.
:::end`,
    },
    {
      title: "Read atom, isotope and ion notation",
      visual: null,
      concepts: ["atomic number", "mass number", "ionic charge", "isotope abundance"],
      markdown: String.raw`## Learning goal
Use nuclide notation and charge to count subatomic particles, then relate isotope abundance to the average mass of a sample.

## Prerequisites
Interpret a signed integer and turn a percentage into a fraction.

## Intuition first
An atom can lose an electron and still be the same element. Imagine taking one item out of a bag whose label records the count of a different item. The bag's total changes, but the labelled count stays the same. For an atom, the proton count is the identity label.

## Why this works
The atomic number $Z$ counts protons and determines the element. The mass number $A$ counts protons plus neutrons. Isotopes share $Z$ and differ in neutron count. The signed charge number $q$ equals the proton count minus the electron count, so there are $Z-q$ electrons. A positive charge means fewer electrons. A negative charge means more.

Read a nuclide such as $\ce{^{37}_{17}Cl^-}$ from its notation. The lower left number identifies the element, the upper left number counts nucleons, and the upper right sign gives the ion charge. Mass number is an integer count. The unified atomic mass unit uses the upright symbol $\mathrm{u}$. It is one twelfth of the mass of an unbound carbon-12 atom in its ground state and at rest. The SI base unit of mass is the kilogram. When a weighted average is required, multiply each measured isotope mass by its fractional abundance and add the contributions. The average must lie between the smallest and largest isotope masses in the mixture.

## Assessment
### Transfer
:::exercise Identify a changing ion
A particle written $\ce{^{25}_{12}Mg^{2+}}$ gains one electron. State the proton, neutron and electron counts before and after this change, and give the resulting notation.
:::answer
It starts with 12 protons, 13 neutrons and 10 electrons. After the gain there are 11 electrons, with the nucleus unchanged. Its notation is $\ce{^{25}_{12}Mg^+}$.
:::end

### Procedure
:::exercise Average two masses
A hypothetical element has isotope masses of $61.0\,\mathrm{u}$ and $65.0\,\mathrm{u}$ in a mixture containing 25.0% of the lighter isotope. Find the average.
:::answer
The fractions are 0.250 and 0.750, so the average is $0.250(61.0)+0.750(65.0)=64.0\,\mathrm{u}$. It lies closer to the heavier mass because that isotope is more abundant.
:::end

## Pause and Predict
:::exercise Shift the abundance
Suppose the isotope masses stay constant and the share of the lighter isotope increases. Predict the direction of change in the average mass.
:::answer
The average decreases because more weight is assigned to the smaller mass and less to the larger mass.
:::end`,
    },
    {
      title: "Write and interpret ionic formulas",
      visual: null,
      concepts: ["charge neutrality", "formula units", "nomenclature", "polyatomic ions"],
      markdown: String.raw`## Learning goal
Write a neutral ionic formula, interpret its subscripts, and name common compounds from their constituent ions.

## Prerequisites
Identify positive and negative charge and find a small common multiple.

## Intuition first
An ionic formula is a compact inventory. For a neutral compound, the positive and negative charges must cancel across the inventory. A repeated ion keeps its internal composition even when the count of that ion changes.

## Why this works
Choose the smallest whole-number ratio of cations to anions that gives net charge zero. Write the cation first. When more than one of a polyatomic ion is needed, enclose the whole ion formula in parentheses before writing its subscript. The formula expresses an ion ratio in an ionic solid. A coefficient in an equation multiplies the entire formula unit, while a subscript belongs to the composition of the species.

Common ionic names place the cation name before the anion name. A monatomic anion takes a name such as chloride or oxide. Polyatomic ions retain names such as sulfate. Use a Roman numeral where the metal can have multiple relevant oxidation states. Molecular compounds follow a different naming convention, with prefixes to make ratios explicit, as in dinitrogen monoxide, $\ce{N2O}$.

## Assessment
### Procedure
:::exercise Build the neutral formula
Write and name the compound formed from $\ce{Al^{3+}}$ and $\ce{SO4^{2-}}$. State the number of oxygen atoms represented in one formula unit.
:::answer
Two aluminium ions contribute +6 and three sulfate ions contribute -6. The formula is $\ce{Al2(SO4)3}$, aluminium sulfate. Three sulfates represent twelve oxygen atoms.
:::end

### Error correction
:::exercise Find the charge in the name
A label describes $\ce{FeCl3}$ as iron(II) chloride. Explain the error and correct the name.
:::answer
Three chloride ions contribute -3, so the iron is in the +3 oxidation state for this formula. The name is iron(III) chloride.
:::end

## Pause and Predict
:::exercise Count complete formula units
In a particle inventory, what changes if $2\,\ce{Ca(NO3)2}$ is replaced by $3\,\ce{Ca(NO3)2}$? Compare the numbers of calcium and nitrate ions represented.
:::answer
The original inventory represents two calcium ions and four nitrate ions. The new inventory represents three calcium ions and six nitrate ions. The ratio remains one calcium ion to two nitrate ions.
:::end`,
    },
  ],
} satisfies SpecUnit & { title: string };
