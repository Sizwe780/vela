import type { SpecUnit } from "../../lib/specs";

export const stoichiometry: SpecUnit = {
  code: "CHE1501-U5",
  title: "Stoichiometry",
  sessions: [
    {
      title: "Count particles through the mole",
      visual: null,
      concepts: ["mole", "Avogadro constant", "molar mass"],
      markdown: String.raw`## Learning goal
Convert an amount of substance among particles and mass while preserving units.

## Prerequisites
Scientific notation, dimensional cancellation and a molar mass are needed. One mole contains exactly $6.02214076\times10^{23}$ specified entities. Use the precision appropriate for the input data when reporting a calculated count.

## Intuition first
The mole is a counting unit. Two bags contain the same number of objects if both contain one dozen objects, even though their masses differ. In the same way, equal mole amounts contain equal entity counts.

## Why this works
Amount, particle count and mass use two linked ratios:
$N=nN_{\mathrm A}$ and $m=nM$. Choose the entity first: count molecules for water, atoms for an elemental atomic sample, and formula units for an ionic solid. The ratio from moles to entities is the same for each choice because it counts the selected entity.

### Original worked example
:::exercise Count molecules from mass
A sample contains $9.01\,\mathrm{g}$ of water with molar mass $18.02\,\mathrm{g\,mol^{-1}}$. What amount and molecular count does it contain?
:::answer
Divide the mass by molar mass to obtain $0.500\,\mathrm{mol}$. Now multiply by the Avogadro constant to get $3.01\times10^{23}$ molecules to three significant figures. The molar mass converts grams to moles; the Avogadro constant changes the counting unit.
:::end

## Visual exploration
![An analytical balance in a biochemical laboratory](/lesson-figures/analytical-balance.webp)
*Use the actual instrument's displayed uncertainty and calibration procedure. The photograph shows equipment only and is not a substitute for a laboratory reading.*

Predict whether doubling the amount doubles the particle count and whether it doubles the mass. Both use linear relationships when molar mass stays fixed.

## Assessment
### Recognition
:::exercise Identify the conversion
A sample contains $0.250\,\mathrm{mol}$ $\ce{CO2}$. Which factor gives molecules?
:::answer
Multiply by $N_{\mathrm A}$: $0.250(6.02214076\times10^{23})\approx1.51\times10^{23}$ molecules.
:::end

### Error correction
:::exercise Prevent the mass-count error
Equal masses of $\ce{H2}$ and $\ce{O2}$ contain equal molecule counts. Explain why this statement is wrong.
:::answer
Equal masses divide by different molar masses. The smaller-molar-mass substance supplies more moles and more molecules.
:::end

## Pause and Predict
:::exercise Transfer the ratio
Which has more particles: $1.00\,\mathrm g$ $\ce{H2}$ or $1.00\,\mathrm g$ $\ce{O2}$?
:::answer
$1.00\,\mathrm g$ $\ce{H2}$ contains more molecules because $2.02\,\mathrm{g\,mol^{-1}}$ is smaller than $32.00\,\mathrm{g\,mol^{-1}}$.
:::end`,
    },
    {
      title: "Derive empirical and molecular formulas",
      visual: null,
      concepts: ["empirical formula", "molecular formula", "molar mass"],
      markdown: String.raw`## Learning goal
Convert elemental mass or amount data to an empirical formula and use molecular molar mass to find the molecular formula.

## Prerequisites
Convert mass to amount, divide by the smallest amount and multiply decimal ratios to small whole numbers.

## Intuition first
A formula ratio describes relative counts, not absolute molecule size. $\ce{CH2O}$ has equal $\ce C$ and $\ce O$ atom counts and twice as many H atoms. It can describe the simplest ratio of a larger molecule.

## Why this works
Convert each element to moles. Divide by the smallest value. Fractions such as $1.5$ or $2.5$ are multiplied by a small integer to remove them. The molecular formula is an integer multiple of the empirical formula. The multiplier is $M_{\text{molecular}}/M_{\text{empirical}}$.

## Assessment
### Procedure
:::exercise Find an empirical formula
Amounts are $1.0\,\mathrm{mol}$ N and $2.5\,\mathrm{mol}$ O. Find the smallest whole-number ratio.
:::answer
Multiply by 2, giving $\ce{N2O5}$.
:::end

### Transfer
:::exercise Add molecular molar mass
The empirical formula is $\ce{CH2O}$ and the molecular molar mass is $180\,\mathrm{g\,mol^{-1}}$. Find the molecular formula.
:::answer
The empirical molar mass is about $30\,\mathrm{g\,mol^{-1}}$, so the multiplier is 6 and the molecular formula is $\ce{C6H12O6}$.
:::end

## Pause and Predict
:::exercise Identify missing information
What single additional datum distinguishes $\ce{CH2O}$ from $\ce{C6H12O6}$?
:::answer
The molecular molar mass or an equivalent measured molecular mass.
:::end`,
    },
    {
      title: "Map balanced equation ratios",
      visual: "stoichiometry-lab",
      concepts: ["reaction ratio", "extent", "coefficient ratio"],
      markdown: String.raw`## Learning goal
Use balanced coefficients to calculate an amount of product or another reactant.

## Prerequisites
A balanced equation is required. The coefficient ratio is an amount-to-amount ratio.

## Intuition first
If an assembly needs two bases and three handles, adding more bases alone does not add more assemblies. Chemical coefficients play the same role.

## Why this works
For $\ce{N2 + 3H2 -> 2NH3}$, $n_{\ce{NH3}}=(n_{\ce{N2}})(2/1)$. Convert to mass only after finding the amount of ammonia. Check which reactant is available in enough stoichiometric amount before reporting a maximum.

## Assessment
### Procedure
:::exercise Predict ammonia amount
Given $0.40\,\mathrm{mol}$ $\ce{N2}$ and $1.50\,\mathrm{mol}$ $\ce{H2}$, calculate maximum $\ce{NH3}$.
:::answer
Nitrogen predicts $0.80\,\mathrm{mol}$; hydrogen predicts $1.00\,\mathrm{mol}$. Nitrogen is limiting, so $0.80\,\mathrm{mol}$ is maximum.
:::end

### Error correction
:::exercise Check unit cancellation
A student multiplies ammonia amount directly by a molar mass before comparing reactants. What is missing?
:::answer
The coefficient comparison must happen in moles before converting the predicted product to mass.
:::end

## Pause and Predict
:::exercise Transfer the coefficient ratio
If $0.90\,\mathrm{mol}$ $\ce{N2}$ reacts completely, how much $\ce{NH3}$ forms?
:::answer
$0.90(2/1)=1.80\,\mathrm{mol}$.
:::end`,
    },
    {
      title: "Identify limiting and excess reagents",
      visual: "stoichiometry-lab",
      concepts: ["limiting reagent", "excess reagent", "reaction extent"],
      markdown: String.raw`## Learning goal
Identify the limiting reagent and the extent of reaction before predicting product or leftover reagent.

## Prerequisites
Convert available masses to amounts and compare each amount with its coefficient.

## Intuition first
The smallest stoichiometric batch size limits the whole process. A reagent in larger mass is not automatically in excess because its particles may be heavier or the coefficient may be larger.

## Why this works
In the ideal complete-conversion model for $\ce{2A + 3B -> A2B3}$, calculate $n_A/2$ and $n_B/3$. Each quotient gives the maximum extent that one reactant could support. The smaller quotient sets the actual maximum. Subtract the coefficient times that extent from each initial amount. Multiply the extent by the product coefficient to find the product amount.

## Visual exploration
Start with $2.0\,\mathrm{mol}$ of A and $3.0\,\mathrm{mol}$ of B. Before you apply the reaction, predict how much product forms and which bars reach zero. Then increase A to $4.0\,\mathrm{mol}$ at the same B amount. Explain why the product stays fixed and where the extra A appears.

## Assessment
### Transfer
:::exercise Choose the limiting reagent
Available amounts are $3.0\,\mathrm{mol}$ A and $3.0\,\mathrm{mol}$ B. Which limits $\ce{A2B3}$ formation?
:::answer
$3/2=1.5$ and $3/3=1.0$, so B limits and the extent is $1.0\,\mathrm{mol}$.
:::end

### Error correction
:::exercise Diagnose a mass-only comparison
Why cannot the larger available mass alone identify the limiting reagent?
:::answer
Coefficients and molar masses determine required particle amounts. Compare molar amounts in the equation.
:::end

## Pause and Predict
:::exercise Predict leftover A
In the previous example, how much A remains when B is fully consumed?
:::answer
$n_A=2(1.0)=2.0\,\mathrm{mol}$ is consumed, so $3.0-2.0=1.0\,\mathrm{mol}$ remains.
:::end`,
    },
    {
      title: "Calculate theoretical and percentage yield",
      visual: null,
      concepts: ["theoretical yield", "actual yield", "percentage yield"],
      markdown: String.raw`## Learning goal
Compare the maximum stoichiometric yield with isolated actual yield.

## Prerequisites
Complete limiting-reagent analysis and convert product amount to mass.

## Intuition first
The theoretical yield is an upper conversion target under complete conversion and perfect collection. Isolation is less ideal, so compare without assuming every measured mass is pure product.

## Why this works
Percentage yield is $100(\text{actual}/\text{theoretical})$. Compare masses for the same pure substance. Incomplete reaction, side reactions and losses during isolation can reduce the isolated mass. A value above $100\%$ is a signal to check purity, residual solvent or the calculation.

### Original worked example
:::exercise Compare predicted and isolated mass
A synthesis predicts $7.25\,\mathrm{g}$ of dry product from the limiting reagent. It yields $5.80\,\mathrm{g}$ of isolated dry product. Calculate the percentage yield.
:::answer
Divide $5.80$ by $7.25$ and multiply by $100$. The percentage yield is $80.0\%$. Both masses refer to the same product and use the same unit, so the grams cancel.
:::end

## Assessment
### Procedure
:::exercise Calculate percentage yield
Theoretical mass is $5.00\,\mathrm g$ and isolated mass is $4.20\,\mathrm g$.
:::answer
$100(4.20/5.00)=84.0\%$.
:::end

### Error correction
:::exercise Diagnose an impossible report
A dry product record is $112\%$ yield. What information should be checked?
:::answer
Check drying, weighing, purity, product identity and the theoretical-yield calculation. Stoichiometry does not create the missing mass.
:::end

## Pause and Predict
:::exercise Transfer the yield relationship
At $75\%$ yield, theoretical yield is $8.0\,\mathrm g$. What actual mass is expected?
:::answer
$0.75(8.0)=6.0\,\mathrm g$.
:::end`,
    },
  ],
};
