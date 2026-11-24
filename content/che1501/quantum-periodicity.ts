import type { SpecUnit } from "../../lib/specs";

export const quantumPeriodicity = {
  code: "CHE1501-U2" as const,
  title: "Quantum mechanics and periodicity",
  sessions: [
    {
      title: "Connect spectral lines to energy changes",
      visual: "energy-level-model",
      concepts: ["photon energy", "absorption", "emission", "quantized energy levels"],
      markdown: String.raw`## Learning goal
Use a model of discrete energy levels to predict absorption and emission wavelengths and explain why the spectrum has lines.

## Prerequisites
Use scientific notation and convert between metres and nanometres. Distinguish a signed change from its magnitude.

## Intuition first
Think of an electron in a simple atom as having a menu of allowed energies. If it goes from one menu entry to another, the difference is fixed. Light can carry that difference as one photon. The menu analogy describes the allowed energies only. It says nothing about the electron's path through space.

## Why this works
For the isolated atom model, write the change as $\Delta E_\mathrm{atom}=E_\mathrm{final}-E_\mathrm{initial}$. In absorption the atom gains energy and the incoming photon supplies it. In emission the atom loses energy and the outgoing photon carries it. In both cases the photon energy is positive: $E_\gamma=|\Delta E_\mathrm{atom}|=h\nu=hc/\lambda$. Here $h$ is the Planck constant, $\nu$ is frequency, and $\lambda$ is the wavelength in vacuum. An increase in the energy gap raises the frequency and shortens the wavelength. Two different transitions can produce the same wavelength if their gaps are equal. The joule is the coherent SI unit of energy. For atomic transitions it is often convenient to use the electronvolt, with $1\,\mathrm{eV}=1.602\,176\,634\times10^{-19}\,\mathrm{J}$ exactly.

## Visual exploration
![Yellow emission from a sodium flame](/lesson-figures/flame.webp)

![Visible emission lines of hydrogen: violet at 410 nm, blue-violet at 434 nm, blue-green at 486 nm, red at 656 nm](/lesson-figures/hydrogen-spectrum.svg)
*Hydrogen emission spectrum. The four Balmer series lines fall in the visible range because their lower level is n=2. Source: adapted from Merikanto / Adrignola, CC0, Wikimedia Commons.*

The three levels in the model belong to a fictional atom. Select two levels, then reverse them. Compare the sign of the atom's energy change and the direction of the arrow with the photon energy and wavelength. Next, compare gaps of 2 and 3 electronvolts. The display uses $hc\approx1240\,\mathrm{eV}\,\mathrm{nm}$ and ignores line broadening and selection rules.

## Assessment
### Recognition
:::exercise Identify which system gains energy
An atom takes in a photon and reaches a higher energy level. Identify the process and state whether the atom's energy change is positive or negative.
:::answer
This is absorption. The atom's final energy exceeds its initial energy, so its energy change is positive.
:::end

### Procedure
:::exercise Read a line from its energy gap
A fictional atom moves from an excitation energy of $4.4\,\mathrm{eV}$ to $1.3\,\mathrm{eV}$. Find the signed change, identify the process, and estimate the photon wavelength using $hc\approx1240\,\mathrm{eV}\,\mathrm{nm}$.
:::answer
The atom's energy changes by $1.3-4.4=-3.1\,\mathrm{eV}$. It emits a photon carrying $3.1\,\mathrm{eV}$, whose wavelength is approximately $1240/3.1=400\,\mathrm{nm}$.
:::end

## Pause and Predict
:::exercise Reverse the process
If the same atom starts at $1.3\,\mathrm{eV}$ and reaches $4.4\,\mathrm{eV}$ by a one-photon transition, which of the signed energy change, photon wavelength and process changes?
:::answer
The signed change becomes positive and the process becomes absorption. The wavelength stays the same because the magnitude of the gap is unchanged.
:::end`,
    },
    {
      title: "Decode shells, subshells, orbitals and spin",
      visual: null,
      concepts: ["quantum numbers", "orbital probability", "Pauli exclusion"],
      markdown: String.raw`## Learning goal
Test whether a set of orbital and spin quantum numbers is allowed, and use the allowed values to count a subshell's capacity.

## Prerequisites
List consecutive integers within an interval and read labels such as $3p$.

## Intuition first
An orbital is a quantum state with a spatial probability distribution. It is useful to think of its label like an address in a filing system. The address helps distinguish states even though it gives no map of a tiny particle travelling along a fixed route.

## Why this works
The principal quantum number $n$ is a positive integer. For a given $n$, the orbital angular momentum quantum number $\ell$ takes integer values from zero to $n-1$. The letters s, p, d and f correspond to $\ell=0,1,2,3$. For a chosen $\ell$, the magnetic quantum number $m_\ell$ takes integer values from $-\ell$ to $+\ell$. There are therefore $2\ell+1$ orbitals in that subshell.

Spin projection $m_s$ takes the values $+\frac12$ and $-\frac12$. Two electrons in one orbital already share $n$, $\ell$ and $m_\ell$, so they must differ in spin projection to satisfy the Pauli exclusion principle. The maximum count in the subshell is $2(2\ell+1)$ electrons.

## Visual exploration

| Subshell | Allowed values of the magnetic quantum number | Number of orbitals | Electron capacity |
| --- | --- | --- | --- |
| $3s$ | $0$ | 1 | 2 |
| $3p$ | $-1,0,+1$ | 3 | 6 |
| $3d$ | $-2,-1,0,+1,+2$ | 5 | 10 |

Read down the table while holding $n=3$ fixed. Identify which part of the orbital address changes the capacity.

## Assessment
### Error correction
:::exercise Check an orbital address
A student proposes $(n,\ell,m_\ell,m_s)=(3,1,2,-\frac12)$. Which part of the address is invalid? Give a correction that keeps the electron in the proposed subshell.
:::answer
The electron is assigned to $3p$, since $n=3$ and $\ell=1$. The value $m_\ell=2$ is outside the allowed range from $-1$ to $+1$. For example, replacing it with $+1$ gives an allowed set without changing the subshell.
:::end

## Pause and Predict
:::exercise Find the capacity
Suppose $n=5$ and $\ell=3$. How many different orbital addresses are possible in that subshell before accounting for spin? How many electrons can occupy it?
:::answer
There are seven values of $m_\ell$ from $-3$ to $+3$, so there are seven orbitals. Each can accommodate two opposite spins, for a capacity of fourteen electrons.
:::end`,
    },
    {
      title: "Build electron configurations and predict magnetism",
      visual: "orbital-filling",
      concepts: ["ground-state configurations", "Hund's rule", "valence electrons", "paramagnetism", "isoelectronic species"],
      markdown: String.raw`## Learning goal
Write ground-state configurations for representative atoms and ions, sketch the orbital occupancy, and infer whether the species has unpaired electrons.

## Prerequisites
Use atomic number to count electrons and distinguish an orbital from a subshell.

## Intuition first
A configuration such as $3p^4$ tells you the total in one group of orbitals. It leaves some details implicit. Sketch the group as three boxes and the occupancy becomes visible, including which electrons lack a partner.

## Why this works
For these representative main-group examples, fill the lower-energy available subshells first. Inside orbitals of the same energy, Hund's rule puts one electron into each with parallel spins before pairing. Pauli exclusion requires opposite spins in any occupied pair. An isolated species with one or more unpaired electrons is paramagnetic; a closed-shell species is diamagnetic.

To form a cation from an atom, remove electrons from the outer occupied shell first. For transition metals, this distinction matters: $4s$ electrons are removed before $3d$ electrons in the first-row cations considered here. The usual filling order is a starting pattern with exceptions. For example, neutral chromium is $[\mathrm{Ar}]\,3d^5\,4s^1$, not the naïve $3d^4\,4s^2$ prediction. Compare electron totals before declaring two species isoelectronic; different nuclei can have the same configuration.

## Visual exploration

| Subshell occupancy | Three p orbitals | Unpaired count |
| --- | --- | --- |
| Two electrons | [↑] [↑] [ ] | 2 |
| Four electrons | [↑↓] [↑] [↑] | 2 |
| Six electrons | [↑↓] [↑↓] [↑↓] | 0 |

Start the orbital model at three electrons. Predict how the fourth changes the number of unpaired electrons, then move the slider and count boxes with one arrow. The position of the first paired box is arbitrary for an isolated set of equal-energy p orbitals. An unpaired electron is one without a partner in its own orbital.

## Assessment
### Procedure
:::exercise Compare phosphorus and its anion
Phosphorus has atomic number 15. Give the valence configurations and unpaired-electron counts of the isolated neutral atom and the idealized $\ce{P^{3-}}$ ion.
:::answer
The neutral configuration ends in $3s^2\,3p^3$; the s electrons pair and the three p orbitals each have a single electron. Adding three electrons gives $3s^2\,3p^6$, with zero unpaired electrons. The idealized ion is isoelectronic with argon.
:::end

## Pause and Predict
:::exercise Remove from the right shell
Neutral cobalt has configuration $[\mathrm{Ar}]\,3d^7\,4s^2$. Which subshell loses electrons in forming $\ce{Co^{2+}}$?
:::answer
Both electrons come from $4s$, so the cation has the configuration $[\mathrm{Ar}]\,3d^7$.
:::end`,
    },
    {
      title: "Explain periodic trends and their exceptions",
      visual: null,
      concepts: ["periodic classification", "effective nuclear charge", "shielding", "ionic radii", "ionization energy"],
      markdown: String.raw`## Learning goal
Use shell occupancy, nuclear charge and shielding to explain trends and make a defensible comparison of related species.

## Prerequisites
Read a period and group from the periodic table. Count electrons in an atom or ion.

## Intuition first
A valence electron feels attraction from the nucleus and repulsion from other electrons. Adding protons changes the attraction; adding or removing occupied shells changes the electron's typical distance from the nucleus. A useful comparison separates those effects.

## Why this works
Effective nuclear charge summarises the net attraction experienced by an electron when shielding is taken into account. Across a main-group period, the proton count increases while valence electrons continue to occupy the same principal shell; incomplete mutual shielding generally leads to smaller atomic radii. Down a main group, a higher occupied shell usually increases the radius. These are trends under comparable definitions of radius. Within an isoelectronic sequence, compare proton counts directly: stronger attraction at higher nuclear charge usually draws the same number of electrons closer.

First ionization energy is the energy required to remove an electron from an isolated gaseous neutral atom in its ground state. It generally increases across a period and decreases down a group. Subshell energy and electron pairing explain important departures. For instance, removing the first $3p$ electron of aluminium requires less energy than removing a $3s$ electron of magnesium. The $3p$ electron is more easily removed despite aluminium having one more proton.

## Visual exploration

| Comparison | Controlled variable | What to investigate |
| --- | --- | --- |
| Across one period | Same valence principal shell for the main-group atoms | Net attraction and subshell occupancy |
| Down one group | Similar valence pattern | Higher principal shell and shielding |
| Isoelectronic series | Same electron count and configuration | Which nucleus carries more protons |

Choose the row that matches the question before trying to apply a trend.

## Assessment
### Transfer
:::exercise Order a shared electron configuration
Rank the idealized ionic radii of $\ce{Na+}$, $\ce{O^{2-}}$ and $\ce{F-}$ from largest to smallest under comparable conditions. State the variable you held fixed.
:::answer
All three have ten electrons. The proton counts are 11, 8 and 9, respectively. Holding the configuration fixed, the size decreases as proton count increases: $\ce{O^{2-}}$, then $\ce{F-}$, then $\ce{Na+}$.
:::end

## Pause and Predict
:::exercise Diagnose a blanket rule
A classmate claims that every step to the right along a period must increase first ionization energy. Compare nitrogen, with $2p^3$, and oxygen, with $2p^4$, using orbital occupancy to test the claim.
:::answer
Nitrogen has one electron in each p orbital. Oxygen has a paired p orbital, and the additional repulsion within that pair helps make the first electron easier to remove. Oxygen's first ionization energy is lower than nitrogen's.
:::end`,
    },
  ],
} satisfies SpecUnit & { title: string };
