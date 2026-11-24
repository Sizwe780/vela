import type { SpecUnit } from "../../lib/specs";
export const solutions: SpecUnit = {
  code: "CHE1501-U6",
  title: "Solutions and concentrations",
  sessions: [
    {
      title: "Distinguish concentration quantities",
      visual: "concentration-lab",
      concepts: ["molarity", "molality", "mole fraction"],
      markdown: String.raw`## Learning goal
Select molarity, molality or mole fraction from the reported denominator.

## Prerequisites
Keep amount of solute, mass of solvent and total solution volume as separate quantities.

## Intuition first
Three containers can hold the same moles of solute while having different final volumes or solvent masses. The concentration label must identify the denominator used.

## Why this works
Molarity is $c=n_{\mathrm{solute}}/V_{\mathrm{solution}}$. Molality is $b=n_{\mathrm{solute}}/m_{\mathrm{solvent}}$. Mole fraction is $x_i=n_i/n_{\mathrm{total}}$. Molarity can change when temperature changes the solution volume. Molality depends on the mass of the solvent. Mole fraction is dimensionless, and all component mole fractions in one mixture add to one.

| Measure | Divide the solute amount by | Common reporting unit |
| --- | --- | --- |
| Molarity | Final solution volume | mol/L |
| Molality | Mass of the solvent alone | mol/kg |
| Mole fraction | Total amount of all components | Dimensionless |

## Visual exploration
The dilution bench shows molarity: its volume scale is the final solution volume. Predict how the display changes if the diluted volume doubles. This model does not supply the solvent mass needed to compute molality.

## Assessment
### Recognition
:::exercise Identify the denominator
Which quantity is moles per kilogram of solvent?
:::answer
Molality, $b=n_{\mathrm{solute}}/m_{\mathrm{solvent}}$.
:::end
### Error correction
:::exercise Compare similar values
A dilute aqueous solution has $1.00\,\mathrm{mol/L}$ and $1.00\,\mathrm{mol/kg}$. Are these quantities automatically equal?
:::answer
No. The near equality may occur for a dilute aqueous case, but the definitions remain different.
:::end
## Pause and Predict
:::exercise Choose the useful quantity
Temperature may change solution volume. Which concentration definition avoids that volume dependence?
:::answer
Molality, because it uses solvent mass.
:::end`,
    },
    {
      title: "Prepare and dilute a solution",
      visual: "concentration-lab",
      concepts: ["dilution", "solute amount", "solution volume"],
      markdown: String.raw`## Learning goal
Use conservation of solute amount to calculate a dilution.

## Prerequisites
Convert volumes to litres and keep final solution volume separate from solvent volume.

## Intuition first
Dilution does not remove solute. It adds solvent, so the solute amount remains fixed while concentration decreases.

## Why this works
Adding solvent adds volume but does not add solute. The amount of solute is $n=cV$, so the amount before dilution equals the amount after dilution. This gives $c_1V_1=c_2V_2$: rearrange to $c_2=c_1V_1/V_2$. It applies when the solute is conserved; it does not model a reaction, precipitation or loss during transfer.

![Compare the two volumes and shades of blue](/lesson-figures/dilution-photo.webp)

## Procedure
Measure the stock portion, transfer it quantitatively and add solvent until the final calibrated volume is reached. In the formula, use consistent volume units on both sides. Inspect whether your calculated concentration has fallen when the final volume increases.

![Find the calibration mark on the volumetric flask](/lesson-figures/volumetric-flask.webp)

### Original worked example
:::exercise Dilute a measured stock portion
A $32.0\,\mathrm{mL}$ portion of $0.750\,\mathrm{mol/L}$ stock is diluted to $200.0\,\mathrm{mL}$. Predict the final concentration.
:::answer
The stock portion contains $(0.750)(0.0320)=0.0240\,\mathrm{mol}$. Dividing by $0.2000\,\mathrm{L}$ gives $0.120\,\mathrm{mol/L}$. The solute amount stays constant while the denominator increases.
:::end

## Assessment
### Procedure
:::exercise Find the final concentration
Dilute $10.0\,\mathrm{mL}$ of $0.500\,\mathrm{mol/L}$ to $50.0\,\mathrm{mL}$.
:::answer
$c_2=(0.500)(10.0)/50.0=0.100\,\mathrm{mol/L}$.
:::end
### Transfer
:::exercise Find the required volume
What final volume contains $0.100\,\mathrm{mol}$ at $0.050\,\mathrm{mol/L}$?
:::answer
$V=n/c=0.100/0.050=2.0\,\mathrm L$.
:::end
## Pause and Predict
:::exercise Compare volume added
When diluting to $2.0\,\mathrm L$, is the solvent volume always exactly $2.0\,\mathrm L$ minus the initial volume?
:::answer
The final total volume is target $2.0\,\mathrm L$. Solvent volume should be added until the calibrated final volume, not necessarily assumed from volume subtraction.
:::end`,
    },
    {
      title: "Compare mass, mass fraction and ppm",
      visual: null,
      concepts: ["mass fraction", "ppm", "unit basis"],
      markdown: String.raw`## Learning goal
Convert concentration forms only after identifying the numerator, denominator and reporting basis.

## Prerequisites
Distinguish mass from amount and solution mass from solute mass.

## Intuition first
A number in parts per million is a scaled ratio. Ask what the reported part counts or measures. Two samples with the same mass fraction can have different mass concentrations if their densities differ.

## Why this works
Mass fraction is $w=m_{\mathrm{solute}}/m_{\mathrm{solution}}$. The mass fraction multiplied by $10^6$ gives ppm by mass, numerically equal to $\mathrm{mg/kg}$. A mass concentration in $\mathrm{mg/L}$ uses solution volume in the denominator. Convert by multiplying the mass-based value in $\mathrm{mg/kg}$ by solution density in $\mathrm{kg/L}$. The familiar aqueous approximation only works when the density is close to $1\,\mathrm{kg/L}$.

### Original worked example
:::exercise Change the reporting basis
A liquid sample contains $18\,\mathrm{mg}$ solute per kilogram of solution. Its density is $0.80\,\mathrm{kg/L}$. What mass concentration does this correspond to?
:::answer
$(18\,\mathrm{mg/kg})(0.80\,\mathrm{kg/L})=14.4\,\mathrm{mg/L}$ before rounding, or $14\,\mathrm{mg/L}$ to two significant figures. The kilogram cancels; the solute and solution themselves have not changed.
:::end

## Assessment
### Procedure
:::exercise Convert a solution portion
How much solute is in $250\,\mathrm{mL}$ of $0.080\,\mathrm{mol/L}$?
:::answer
$n=cV=(0.080)(0.250)=0.020\,\mathrm{mol}$.
:::end
### Error correction
:::exercise Diagnose missing basis
A nonaqueous sample reports $25$ ppm as $25\,\mathrm{mg/L}$ without density. Explain the missing step.
:::answer
Confirm the form of the ratio first. If the value represents a mass fraction, multiply the equivalent mg/kg by the solution density in kg/L. The numerical equality would imply a density of 1 kg/L.
:::end
## Pause and Predict
:::exercise Choose the denominator
For mole fraction, what total amount appears in the denominator?
:::answer
The amount of all components in the specified mixture.
:::end`,
    },
  ],
};
