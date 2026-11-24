import type { SpecUnit } from "../../lib/specs";

// Unbalanced skeletons and explicitly identified student errors in Unit 4.
export const reactionSkeletons = [
  "Ca^{2+}(aq) + Cl^-(aq) -> CaCl2(s)",
  "H2 + O2 -> H2O",
  "Fe + O2 -> Fe2O3",
  "N2 + H2 -> NH3",
  "Mg + O2 -> MgO",
  "Al + O2 -> Al2O3",
  "Zn -> Zn^{2+} + e^-",
] as const;

export const reactionClasses = {
  code: "CHE1501-U4" as const,
  title: "Reaction classes",
  sessions: [
    {
      title: "Classify reactions from observable patterns",
      visual: null,
      concepts: ["precipitation", "acid-base", "gas-forming", "oxidation-reduction"],
      markdown: String.raw`## Learning goal
Classify a chemical reaction by the species that change and explain why a named class describes the process.

## Prerequisites
Use formula units, distinguish ions from neutral atoms and follow atom and charge conservation.

## Intuition first
A recipe can change in different ways. One change rearranges where ingredients are placed, one adds heat, and another replaces an ingredient. Chemists use reaction classes to describe recurring changes. The classes overlap, so classify from the equation and context rather than from a memorised label alone.

## Why this works
A precipitation reaction produces an insoluble ionic solid from ions in solution. For example, mixing aqueous silver nitrate and sodium chloride can produce solid silver chloride:

$$
\ce{AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)}
$$

A Brønsted acid donates a proton and a base accepts it. In aqueous neutralisation with a strong acid and a hydroxide, the net change is $\ce{H^+(aq) + OH^-(aq) -> H2O(l)}$, where $\ce{H^+(aq)}$ is shorthand for a hydrated proton. With a carbonate, proton transfer can produce carbon dioxide. The overall change is $\ce{CO3^{2-}(aq) + 2H^+(aq) -> CO2(g) + H2O(l)}$. One reaction can therefore be both acid-base and gas-forming.

Oxidation-reduction, or redox, changes oxidation numbers by transfer of electrons. Oxidation is an increase in oxidation number; reduction is a decrease. The terms describe bookkeeping and may be observed in a displacement reaction, combustion or corrosion.

| Pattern | Evidence to examine | Example label |
| --- | --- | --- |
| Dissolved ions combine into a new solid | A solid phase forms when the ion concentrations are high enough | Precipitation |
| Proton transfer or neutralisation | Acid and base produce a less acidic/less basic mixture | Acid-base |
| A gaseous product exits | Effervescence or measured gas evolution | Gas-forming |
| Oxidation numbers change | One species loses and another gains electrons | Redox |

![White silver chloride precipitate](/lesson-figures/precipitate.webp)

![Bright flame above burning magnesium ribbon](/lesson-figures/magnesium-burning.webp)
*Magnesium changes from oxidation number 0 to +2. Never view burning magnesium directly.*

## Assessment
### Recognition
:::exercise Separate the pattern from the drawing
An aqueous mixture forms a solid that can be collected by filtration. Two soluble ionic species remain in solution. Which reaction class is supported directly?
:::answer
The formation of an insoluble ionic solid supports a precipitation classification. The equation should also show spectator ions and the net ionic equation.
:::end

## Pause and Predict
:::exercise Use two labels where needed
A metal carbonate reacts with an acid and produces a salt, water and carbon dioxide. Is this only acid-base, only gas-forming, or both a gas-forming and acid-base description?
:::answer
It can be described by both patterns: proton transfer between acid and carbonate components is acid-base behaviour, and carbon dioxide is a gas-forming product. The most useful answer states the complete ionic change rather than one label.
:::end`,
    },
    {
      title: "Write molecular, complete ionic and net ionic equations",
      visual: "ionic-precipitation",
      concepts: ["strong electrolytes", "spectator ions", "net ionic equation", "charge balance"],
      markdown: String.raw`## Learning goal
Separate dissolved ions from precipitates and use the net ionic equation to show the particles that actually change.

## Prerequisites
Recognise aqueous soluble ionic compounds and identify a solid precipitate.

## Intuition first
Writing all ions in a beaker does not mean every ion reacts. Some ions are present before and after the reaction. Remove the unchanged ions and the remaining equation describes the chemical change.

## Why this works
A molecular equation gives intact formulas and states. A complete ionic equation separates aqueous strong electrolytes into ions. Keep solids, pure liquids, gases and weak electrolytes in their molecular or formula-unit forms. Cancel only identical species in the same state and quantity on both sides.

To predict precipitation in this lesson, swap counter-ions, use charge balance to write candidate formulas, then consult solubility guidance for water near room temperature. Sodium and potassium salts and nitrates are generally soluble. Most chlorides and iodides are soluble, with familiar exceptions such as silver chloride and lead(II) iodide. Barium sulfate is sparingly soluble. These qualitative rules assume typical classroom concentrations. Very dilute solutions can remain below the precipitation threshold.

For a precipitation of lead iodide,

$$
\ce{Pb(NO3)2(aq) + 2KI(aq) -> PbI2(s) + 2KNO3(aq)}
$$

the complete ionic equation is

$$
\ce{Pb^{2+}(aq) + 2NO3^-(aq) + 2K^+(aq) + 2I^-(aq) -> PbI2(s) + 2K^+(aq) + 2NO3^-(aq)}
$$

The lead(II) iodide remains intact as a solid. Cancelling potassium and nitrate gives

$$
\ce{Pb^{2+}(aq) + 2I^-(aq) -> PbI2(s)}
$$

Check both mass and charge: one lead ion and two iodide ions give one formula unit of lead iodide and a total reactant charge of zero. A net ionic equation must not invent ions for a molecular solid.

## Assessment
### Procedure
:::exercise Remove the spectator ions
Start from $\ce{Na2SO4(aq) + BaCl2(aq) -> BaSO4(s) + 2NaCl(aq)}$. Write the complete ionic and net ionic equations.
:::answer
The complete ionic equation has $\ce{2Na^+(aq) + SO4^{2-}(aq) + Ba^{2+}(aq) + 2Cl^-(aq) -> BaSO4(s) + 2Na^+(aq) + 2Cl^-(aq)}$. The net ionic equation is $\ce{Ba^{2+}(aq) + SO4^{2-}(aq) -> BaSO4(s)}$.
:::end

## Pause and Predict
:::exercise Check charge before formatting
A student writes $\ce{Ca^{2+}(aq) + Cl^-(aq) -> CaCl2(s)}$ after mixing dilute calcium nitrate and sodium chloride. Diagnose both the conservation error and the predicted product state.
:::answer
One chloride leaves a net charge of +1 and cannot account for two chlorines. Two chlorides would give the correct formula ratio, but calcium chloride stays dissolved at the stated concentrations. The four dissolved ions remain aqueous. There is no net ionic reaction under these conditions.
:::end`,
    },
    {
      title: "Balance equations by conservation",
      visual: "equation-balancing",
      concepts: ["coefficients", "atom counts", "smallest whole-number ratio", "conservation"],
      markdown: String.raw`## Learning goal
Choose integer coefficients that preserve atom counts and explain why subscripts cannot be changed.

## Prerequisites
Count atoms in a formula and distinguish a coefficient from a subscript.

## Intuition first
One water molecule contains two H atoms and one O atom. Two water molecules contain four H atoms and two O atoms in total. Write that as $\ce{2H2O}$, keeping the molecular formula unchanged. Coefficients count molecules or formula units. Subscripts specify what each contains.

## Why this works
Start with a formula whose coefficient is easiest to determine. Count atoms in every species and adjust coefficients until the left and right totals agree. In a fraction, multiply every coefficient by the smallest factor that makes them integers. Finally divide common factors.

For

$$
\ce{H2 + O2 -> H2O}
$$

one $\ce{O2}$ provides two O atoms, so put coefficient 2 before $\ce{H2O}$. That gives four H atoms, so put coefficient 2 before $\ce{H2}$. The balanced equation is

$$
\ce{2H2 + O2 -> 2H2O}
$$

For a more complex oxide,

$$
\ce{Fe + O2 -> Fe2O3}
$$

four iron atoms and six oxygen atoms give $\ce{4Fe + 3O2 -> 2Fe2O3}$. Changing $\ce{O2}$ to $\ce{O}$ changes the chemical species and is not part of balancing.

## Visual exploration
Use the coefficient lab to build the equations. Start with $1:1:1$ for water and compare the oxygen totals. Predict a change, then make it and check both elements. Compare $2:1:2$ with $4:2:4$. Both conserve atoms, and the first is the smallest whole-number ratio. The live numbers and written totals give the same information.

## Assessment
### Procedure
:::exercise Predict and check coefficients
Balance $\ce{N2 + H2 -> NH3}$ in the smallest whole-number ratio.
:::answer
Two nitrogen atoms require two ammonia molecules. These contain six H atoms, which need three hydrogen molecules. The balanced equation is $\ce{N2 + 3H2 -> 2NH3}$.
:::end

### Error correction
:::exercise Fix a subscript mistake
A student changes $\ce{MgO}$ to $\ce{MgO2}$ while balancing $\ce{Mg + O2 -> MgO}$. Explain the error and balance the given reaction.
:::answer
The new formula has a different oxygen-to-magnesium ratio. Keep $\ce{MgO}$ and balance the stated reaction as $\ce{2Mg + O2 -> 2MgO}$.
:::end

## Pause and Predict
:::exercise Choose the smallest ratio
Before using a calculator, predict the smallest integer coefficients for $\ce{Al + O2 -> Al2O3}$.
:::answer
The coefficients are $4,3,2$. The balanced equation $\ce{4Al + 3O2 -> 2Al2O3}$ has four aluminium atoms and six oxygen atoms on each side.
:::end`,
    },
    {
      title: "Assign oxidation numbers",
      visual: "redox-practice",
      concepts: ["oxidation number", "oxidation", "reduction", "electron transfer"],
      markdown: String.raw`## Learning goal
Assign oxidation numbers with standard rules and identify oxidation and reduction in a simple displacement reaction.

## Prerequisites
Interpret ion charge and track electron count in a balanced redox change.

## Intuition first
An oxidation number is a charge-assignment tool for electron accounting. In an elemental form, the assigned number is zero because no unequal sharing or electron transfer has been stated. In $\ce{Fe^{2+}}$, the ion charge is +2.

## Why this works
Useful rules include:

- an element alone has oxidation number 0;
- a monatomic ion has oxidation number equal to its charge;
- oxygen is usually $-2$ in compounds, except for peroxide and other named exceptions;
- hydrogen is usually $+1$ with nonmetals and $-1$ in metal hydrides;
- the sum of oxidation numbers equals the species charge.

In

$$
\ce{Zn(s) + Fe^{2+}(aq) -> Zn^{2+}(aq) + Fe(s)}
$$

zinc increases from 0 to +2 and loses two electrons. Iron decreases from +2 to 0 and gains two electrons. Zinc is the reducing agent because it supplies electrons. The iron(II) ion is the oxidising agent because it accepts them. Check both roles by identifying the species on the reactant side.

Oxidation number is not always a literal charge. For covalent substances, assign electrons according to the formal convention. Use oxidation-number changes to identify redox participants; do not infer a mechanism from the oxidation-number labels alone.

## Visual exploration
Use the electron-transfer lab to identify the oxidised reactant and count electrons **per equation as written**. A correct response should name both the oxidation and the reduction even when the lab asks for one of them.

## Assessment
### Transfer
:::exercise Identify both agents in a new reaction
Use $\ce{2Fe^{3+}(aq) + Sn^{2+}(aq) -> 2Fe^{2+}(aq) + Sn^{4+}(aq)}$. Identify the two agents and explain why the iron coefficient is two.
:::answer
Tin(II) loses two electrons and is the reducing agent. Each iron(III) ion gains one electron, so two iron(III) ions are needed. Iron(III) is the oxidising agent. Both sides have total charge +8.
:::end

## Pause and Predict
:::exercise Check the electron count
If the tin reactant were counted twice in the same reaction, how many iron(III) ions would be needed?
:::answer
Two tin(II) ions release four electrons in total. Four iron(III) ions are needed to accept them.
:::end`,
    },
    {
      title: "Balance a simple redox change",
      visual: "redox-practice",
      concepts: ["half-reactions", "electron cancellation", "charge balance", "acidic solution"],
      markdown: String.raw`## Learning goal
Separate a simple redox equation into oxidation and reduction half-reactions, balance electron transfer and recombine the species.

## Prerequisites
Track oxidation-number changes and apply conservation of atoms and charge.

## Intuition first
A redox reaction is an exchange. If one zinc atom releases two electrons, the reduction half-reaction must consume exactly two electrons. Multiplying a half-reaction changes its coefficients but not the electron accounting.

## Why this works
Write each half-reaction with only the oxidized or reduced species. Balance atoms other than hydrogen and oxygen first. In acidic aqueous solution, balance oxygen by adding $\ce{H2O}$ and hydrogen by adding $\ce{H^+}$; then balance charge with electrons. Multiply each half-reaction until electron loss equals electron gain.

For zinc and iron(II):

$$
\ce{Zn -> Zn^{2+} + 2e^-}
$$

$$
\ce{Fe^{2+} + 2e^- -> Fe}
$$

Adding cancels two electrons:

$$
\ce{Zn + Fe^{2+} -> Zn^{2+} + Fe}
$$

The atom count is one Zn and one Fe on each side. The charge is +2 on each side. That example needs no water or protons. For a peroxide reduction in acidic solution, put two waters on the right, add two protons on the left to balance H, then add two electrons on the left so the charge is zero:

$$
\ce{H2O2(aq) + 2H^+(aq) + 2e^- -> 2H2O(l)}
$$

If iodide is oxidised to iodine, its half-reaction is $\ce{2I^-(aq) -> I2(s) + 2e^-}$. Add them and cancel the electrons to obtain $\ce{H2O2(aq) + 2H^+(aq) + 2I^-(aq) -> I2(s) + 2H2O(l)}$ for the stated products. Either side has four H, two O and two I atoms and zero charge.

In a **basic** solution, balance provisionally as if acidic. Add a hydroxide to both sides for each proton in the result, combine the protons and hydroxide to form water, and cancel matching waters. If permanganate is specified to form manganese dioxide, the reduction half-reaction becomes

$$
\ce{MnO4^-(aq) + 2H2O(l) + 3e^- -> MnO2(s) + 4OH^-(aq)}
$$

The left-side charge is $-1-3=-4$ and the right-side charge is $-4$. The medium can affect the products; the balancing method assumes their identities are given.

## Visual exploration
Compare the two electrons in the zinc/iron model with the three electrons per permanganate ion. The electron count determines how many copies of each half-reaction you need.

## Assessment
### Procedure
:::exercise Balance with water and hydroxide
In basic solution, permanganate goes to manganese dioxide and sulfite goes to sulfate. Combine the permanganate reduction shown above with $\ce{SO3^{2-}(aq) + 2OH^-(aq) -> SO4^{2-}(aq) + H2O(l) + 2e^-}$. Check the total charge.
:::answer
Use the reduction twice and the oxidation three times so six electrons cancel. Four waters on the left and three on the right leave one on the left. Six hydroxides on the left and eight on the right leave two on the right. The result is $\ce{2MnO4^-(aq) + 3SO3^{2-}(aq) + H2O(l) -> 2MnO2(s) + 3SO4^{2-}(aq) + 2OH^-(aq)}$. Either side has total charge $-8$.
:::end

## Pause and Predict
:::exercise Detect a charge imbalance
A student writes $\ce{Zn -> Zn^{2+} + e^-}$ and combines it unchanged with $\ce{Fe^{2+} + 2e^- -> Fe}$. What check identifies the mistake?
:::answer
The first half-reaction leaves charge $+1$ on the right but zero on the left, and it releases only one electron. Write two electrons on the zinc product side: $\ce{Zn -> Zn^{2+} + 2e^-}$.
:::end`,
    },
    {
      title: "Connect product predictions to reaction evidence",
      visual: null,
      concepts: ["complete combustion", "exothermic", "endothermic", "system and surroundings"],
      markdown: String.raw`## Learning goal
Predict products for complete hydrocarbon combustion and classify a reaction by the direction of energy transfer.

## Prerequisites
Write a molecular formula, balance carbon and hydrogen atoms, and distinguish a reaction class from an observation.

## Intuition first
A container can feel warmer because energy moved into it. To interpret the observation, decide whether the reacting materials or the container are your system. The two can gain and lose energy in opposite directions.

## Why this works
When a hydrocarbon burns completely with sufficient oxygen, its carbon forms carbon dioxide and its hydrogen forms water. Balance C and H first, then balance $\ce{O2}$. Limited oxygen can lead to carbon monoxide or solid carbon, so use the complete-combustion products only under the stated condition.

When the thermal surroundings gain energy from the reacting system as heat, the reaction is exothermic. At constant pressure, its enthalpy change $\Delta H$ is negative. An endothermic reaction absorbs heat and has $\Delta H>0$ at constant pressure. A balanced equation records atoms and charge. Use separate evidence about energy transfer to classify the heat change. Mixing, heat loss and phase changes can affect an observed temperature, so name the system and the measurement conditions.

| Question | Evidence needed |
| --- | --- |
| What products are expected? | Reactant identities and reaction conditions |
| Does the equation conserve matter? | Element totals and net charge on both sides |
| What is the sign of the heat change? | Direction of heat transfer at constant pressure |

## Visual exploration
Read the initial and final levels before looking at the peak. Treat this energy profile as an illustration with no numerical scale.

:::widget{type="reaction_energy"}
:::

## Assessment
### Transfer
:::exercise Predict products and interpret a temperature rise
Propane, $\ce{C3H8(g)}$, burns completely with excess oxygen. Assume water leaves as vapour. Write the balanced equation and explain the sign of $\Delta H$ if the reacting system transfers heat to its surroundings at constant pressure.
:::answer
Three carbon atoms require three carbon dioxide molecules and eight hydrogen atoms require four water molecules. The products contain ten oxygen atoms, so the reaction is $\ce{C3H8(g) + 5O2(g) -> 3CO2(g) + 4H2O(g)}$. The system releases heat at constant pressure and its $\Delta H$ is negative.
:::end

## Pause and Predict
:::exercise Change the oxygen assumption
Why would the same equation be insufficient for burning with limited oxygen?
:::answer
Some carbon could leave as carbon monoxide or remain as solid carbon. The products and coefficients depend on the conditions.
:::end`,
    },
  ],
} satisfies SpecUnit & { title: string };
