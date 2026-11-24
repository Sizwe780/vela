import type { SpecUnit } from "../../lib/specs";

export const chemicalBonding = {
  code: "CHE1501-U3" as const,
  title: "Chemical bonding",
  sessions: [
    {
      title: "Distinguish ionic and covalent bonding",
      visual: "bonding-scale",
      concepts: ["ionic lattice", "covalent bonding", "electronegativity", "bond polarity"],
      markdown: String.raw`## Learning goal
Use valence electrons and attractions to distinguish ionic solids, covalent molecules and bond polarity.

## Prerequisites
Review charge neutrality, valence electrons and periodic trends.

## Intuition first
Imagine comparing a single pair of magnets with a wall built from rows of magnets. The pair has one obvious partner. In the wall, each piece interacts with several neighbours. Bonding descriptions also depend on the scale of the structure you are explaining.

## Why this works
In a simple ionic solid, positive and negative ions form a repeating three-dimensional pattern. The attraction acts throughout the lattice. The formula for magnesium chloride, $\ce{MgCl2}$, reports the ratio needed for charge balance. It does not imply the solid consists of isolated three-atom molecules.

In a covalent bond, electron density is shared between nuclei. If one bonded atom attracts that density more strongly, the bond is polar. In hydrogen chloride, $\ce{HCl}$, chlorine is $\delta^-$ and hydrogen is $\delta^+$. These are partial charges. Compare them with the integer charge on a chloride ion, $\ce{Cl^-}$. Electronegativity difference is useful for comparing polarity, but there is no universal cutoff that settles the structure of every substance.

| Representation | Count or track | What the model explains |
| --- | --- | --- |
| Formula unit | Repeating ratio of oppositely charged ions | Charge neutrality in the ionic lattice |
| Molecule | Atoms joined in a discrete group | Which atoms share bonding density |
| Polar bond | Direction of uneven shared density | Which end of the bond is partially negative |

## Visual exploration
Switch between the crystal and the gas models. Trace repeating neighbours in the crystal and count the atoms in one molecule. Both formulas contain a 1:1 ratio. What does that ratio describe in each structure?

![Flat faces of a halite crystal](/lesson-figures/halite.webp)

## Assessment
### Recognition
:::exercise Read a formula at the right scale
What does $\ce{CaBr2}$ count in the solid? How is that different from the formula $\ce{Br2}$ for a bromine molecule?
:::answer
The calcium bromide formula gives the lattice ratio of one calcium ion to two bromide ions. A bromine molecule has exactly two bromine atoms covalently bonded to each other.
:::end

## Pause and Predict
:::exercise Compare both ends of a bond
For $\ce{HBr}$, bromine attracts bonding density more strongly than hydrogen. Predict the sign of each partial charge and the net charge of the molecule.
:::answer
Hydrogen is partially positive and bromine is partially negative. The redistributed density does not change the total electron count, so the molecule is neutral.
:::end`,
    },
    {
      title: "Account for electrons with Lewis structures",
      visual: null,
      concepts: ["Lewis structures", "formal charge", "resonance", "octet exceptions"],
      markdown: String.raw`## Learning goal
Construct a Lewis structure from its electron budget, check the formal charges and recognise resonance without moving atoms.

## Prerequisites
Read valence electron counts for main-group elements and calculate with signed charges.

## Intuition first
A Lewis diagram is an inventory. A line spends two electrons on a bond. A lone pair also spends two electrons. Every electron in the starting budget must appear in the final diagram. An apparently tidy octet is no help if the drawing spends electrons it never had.

## Why this works
Add the valence electrons from all atoms. Add one electron for each negative charge or subtract one for each positive charge. Choose a plausible atom skeleton. Hydrogen belongs at an end. Draw single bonds first, fill terminal shells and place remaining electrons on the centre. If an appropriate central atom still lacks a full octet, move a neighbouring lone pair into a multiple bond and recheck the budget.

For an individual atom, formal charge is $q_{\mathrm{formal}}=V-L-B/2$, where $V$ is the neutral valence count, $L$ is the count of electrons in lone pairs, and $B$ is the count of electrons in bonds to that atom. The formal charges must add to the species charge. Formal charge is a bookkeeping value, while a partial charge describes the distribution of electron density. Compare valid structures using the electron count, reasonable valence, charge separation and where negative formal charge falls.

For $\ce{CO3^{2-}}$, three equivalent drawings place the double bond on different oxygen atoms while the skeleton stays the same. The real ion is described by a resonance hybrid, with equivalent carbon–oxygen bonds in a symmetrical environment. It does not flip between drawings. The octet guideline has exceptions. Hydrogen uses a duet, boron can be electron-deficient, and odd-electron species cannot give every atom a paired octet.

## Assessment
### Procedure
:::exercise Budget electrons for a nitrite ion
Count the valence electrons of $\ce{NO2^-}$. Use an oxygen–nitrogen–oxygen skeleton with one double bond and one single bond. Locate the lone pair on nitrogen and find the formal charge on each atom.
:::answer
There are $5+2(6)+1=18$ electrons. The two bonds use six. The double-bonded oxygen gets two lone pairs, the single-bonded oxygen gets three, and nitrogen gets the remaining lone pair. The formal charges are $6-4-2=0$ on the double-bonded oxygen, $6-6-1=-1$ on the single-bonded oxygen and $5-2-3=0$ on nitrogen.
:::end

## Pause and Predict
### Error correction
:::exercise Compare a second drawing
A student moves an oxygen nucleus to draw another contributor for nitrite. What should move instead, and what does the pair of equivalent contributors predict?
:::answer
Keep all nuclei fixed. Move the bonding and lone-pair electron placement so the double bond is on the other oxygen. The two nitrogen–oxygen bonds are equivalent in the undisturbed ion.
:::end`,
    },
    {
      title: "Predict molecular shape and dipole cancellation",
      visual: "molecular-geometry",
      concepts: ["VSEPR", "electron-domain geometry", "molecular geometry", "vector cancellation"],
      markdown: String.raw`## Learning goal
Translate a Lewis structure into three-dimensional geometry and decide whether equal polar bonds cancel.

## Prerequisites
Identify a central atom, bond pairs and lone pairs in a Lewis structure.

## Intuition first
Picture people pulling on a ring. Two equally strong pulls in opposite directions balance. Turn one handle so the ropes meet at an angle and the ring has a preferred direction. A molecule’s net dipole likewise depends on directions as well as individual bond strengths.

## Why this works
In VSEPR, count regions of electron density around the centre. A single, double or triple bond takes one direction and counts as one domain. Each lone pair counts as another domain. Use all domains for the electron-domain geometry, then name the molecular shape using bonded atoms. Lone pairs affect the angles even though they are absent from the molecular shape name.

| Molecule | Bonding domains | Lone pairs on centre | Electron geometry | Molecular shape |
| --- | --- | --- | --- | --- |
| $\ce{CO2}$ | 2 | 0 | Linear | Linear |
| $\ce{BF3}$ | 3 | 0 | Trigonal planar | Trigonal planar |
| $\ce{CH4}$ | 4 | 0 | Tetrahedral | Tetrahedral |
| $\ce{NH3}$ | 3 | 1 | Tetrahedral | Trigonal pyramidal |
| $\ce{H2O}$ | 2 | 2 | Tetrahedral | Bent |

The symmetry of $\ce{CO2}$ cancels the opposite bond dipoles. In $\ce{H2O}$, the components across the bisector cancel while components along it reinforce. Geometry and bond polarity both matter. The class model omits intermolecular interactions and does not calculate experimental dipole magnitudes.

## Visual exploration
Predict the shape before selecting the molecule. Rotate the model and toggle the central lone pairs. Then compare the polar bond directions for carbon dioxide and water. A screen projection can change how wide an angle looks; the stated bond angle belongs to the three-dimensional model.

## Assessment
### Transfer
:::exercise Infer a shape from two domains
In beryllium fluoride, the isolated gas-phase molecule has two identical Be–F bonds and no central lone pairs. Predict its shape and whether those bond dipoles cancel. Explain each inference.
:::answer
Two domains give a linear geometry, with a bond angle of $180^\circ$. The two equivalent bond dipoles point in opposite directions and cancel. This argument is for the stated isolated molecule, not the structure of solid beryllium fluoride.
:::end

## Pause and Predict
:::exercise Separate the shape from the electron geometry
Why does $\ce{NH3}$ have a tetrahedral electron-domain arrangement and a trigonal pyramidal molecular shape?
:::answer
Nitrogen has three bonding domains and one lone pair. All four domains determine the electron arrangement. Only the three hydrogen positions and the nitrogen centre appear in the molecular shape.
:::end`,
    },
    {
      title: "Connect orbital overlap to bond properties",
      visual: null,
      concepts: ["sigma bonds", "pi bonds", "hybridisation", "restricted rotation"],
      markdown: String.raw`## Learning goal
Count sigma and pi bonds and connect a local hybridisation model to geometry and restricted rotation.

## Prerequisites
Distinguish a single bond from a multiple bond and count electron domains around the centre.

## Intuition first
Imagine two brushes resting tip to tip, then imagine their bristles overlapping side by side. A turn around the tip-to-tip axis changes little in the first arrangement. It can pull the sideways overlap apart. The comparison illustrates why some bonds are easier to turn about than others.

## Why this works
A sigma bond has bonding density along the internuclear axis. A pi bond comes from side-by-side overlap, with density on both sides of a plane containing that axis. A double bond has one sigma and one pi bond. A triple bond has one sigma and two pi bonds. A pi bond restricts rotation because twisting the aligned orbitals weakens their overlap.

For simple main-group molecules, a local hybridisation model associates two electron domains with $\mathrm{sp}$, three with $\mathrm{sp^2}$ and four with $\mathrm{sp^3}$. Unhybridised p orbitals can participate in pi bonds. Hybridisation is an explanatory model, and a Lewis diagram plus a domain count cannot predict every measured property.

| Local arrangement | Domains | Approximate ideal domain angle |
| --- | --- | --- |
| Linear | 2 | $180^\circ$ |
| Trigonal planar | 3 | $120^\circ$ |
| Tetrahedral | 4 | $109.5^\circ$ |

## Assessment
### Procedure
:::exercise Compare two carbon centres
For propyne, $\ce{CH3-C#CH}$, count the sigma and pi bonds in the entire molecule. Assign the local hybridisation at the methyl carbon and the two triple-bonded carbons.
:::answer
There are four carbon–hydrogen sigma bonds and one sigma bond for each of the two carbon–carbon connections, giving six sigma bonds. The triple bond contributes two pi bonds. The methyl carbon has four domains and is $\mathrm{sp^3}$; each triple-bonded carbon has two domains and is $\mathrm{sp}$.
:::end

## Pause and Predict
:::exercise Diagnose a rotation claim
A classmate says the carbon–carbon double bond in an alkene is free to rotate because there is still a sigma bond. Which part of the bond is missing from that explanation?
:::answer
A double bond also contains a pi bond. Rotation that turns the parallel p orbitals out of alignment reduces pi overlap, so the bond resists that rotation.
:::end`,
    },
    {
      title: "Explain how molecules attract one another",
      visual: null,
      concepts: ["London dispersion", "dipole interactions", "hydrogen bonding", "boiling point"],
      markdown: String.raw`## Learning goal
Identify relevant intermolecular interactions and use them with an explicit comparison to explain boiling behaviour.

## Prerequisites
Distinguish a polar bond from a polar molecule and recognise lone pairs on nitrogen, oxygen and fluorine.

## Intuition first
Pulling two contact surfaces apart is different from tearing either surface in half. The same distinction matters during boiling. Neighbouring molecules move apart, while the covalent bonds within those molecules generally stay intact.

## Why this works
London dispersion is present for all atoms and molecules. A temporary uneven electron distribution induces a correlated distribution nearby. Greater polarizability and more contact between comparable molecules can increase these attractions. Permanent dipoles add orientation-dependent interactions in polar molecules.

In the common introductory cases of hydrogen bonding, a hydrogen attached to nitrogen, oxygen or fluorine interacts with an electron-rich site, often a lone pair on another such atom. A molecule may accept a hydrogen bond without donating one. For a boiling-point comparison, specify the pressure and look for differences in hydrogen bonding, polarity, size and shape. An interaction label alone does not settle every comparison.

## Assessment
### Transfer
:::exercise Compare structural isomers
Ethanol and dimethyl ether both have formula $\ce{C2H6O}$. Draw or describe the atom connections, decide which can hydrogen-bond to molecules of its own kind as a donor, and predict which boils at a higher temperature at the same pressure.
:::answer
Ethanol, $\ce{CH3CH2OH}$, has an O–H bond and oxygen lone pairs. It can both donate and accept hydrogen bonds in the pure liquid. Dimethyl ether, $\ce{CH3OCH3}$, has oxygen lone pairs and can accept a hydrogen bond from a suitable partner, but has no O–H donor in the pure liquid. Ethanol boils higher in this comparison.
:::end

## Pause and Predict
:::exercise Track what survives boiling
A learner claims water vapour consists of separate hydrogen and oxygen atoms. Identify which attractions have been substantially overcome and which bonds remain intact.
:::answer
Boiling separates water molecules as intermolecular attractions are overcome. The O–H covalent bonds remain intact, so the vapour consists chiefly of $\ce{H2O}$ molecules.
:::end`,
    },
  ],
} satisfies SpecUnit & { title: string };
