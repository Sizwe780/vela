import type { SpecUnit } from "../../lib/specs";

export const gases: SpecUnit = {
  code: "CHE1501-U8",
  title: "Gases",
  sessions: [
    {
      title: "Use absolute temperature and pressure",
      visual: "ideal-gas-lab",
      concepts: ["absolute temperature", "Boyle law", "pressure units"],
      markdown: String.raw`## Learning goal
Explain why gas-law ratios require absolute temperatures and absolute pressures, and predict how one variable changes while others stay fixed.

## Prerequisites
Convert Celsius to kelvin and distinguish measured gauge pressure from absolute pressure. Identify which variables stay fixed in an experiment.

## Intuition first
Imagine sealing a bicycle pump and pushing the handle slowly. The same amount of gas occupies less space. If the pump has time to return to room temperature, what changes is the final pressure.

## Why this works
With fixed amount and temperature, the ideal-gas equation gives $PV=nRT=\text{constant}$. Thus $P_1V_1=P_2V_2$. A calculation based on gauge pressure is offset by atmospheric pressure: $P_{\mathrm{abs}}=P_{\mathrm{gauge}}+P_{\mathrm{atm}}$. Convert Celsius to kelvin by adding 273.15 to the numerical Celsius temperature. Equal intervals on the two scales have the same size, but their zeros differ.

## Visual exploration
Set the piston to $300\,\mathrm{K}$, then move pressure from $1.0\,\mathrm{atm}$ to $2.0\,\mathrm{atm}$. Predict the volume first. Compare two settled states with the same amount and temperature.

## Procedure
Mark what is fixed, convert each temperature and pressure to an absolute value, then write the ratio. Compare the direction of change before settling on a number.

### Original worked example
:::exercise Compress an air sample
A sealed sample at constant temperature moves from $3.60\,\mathrm{L}$ and $124\,\mathrm{kPa}$ absolute to $1.80\,\mathrm{L}$. Find its final absolute pressure.
:::answer
The volume halves, so the pressure must double. $P_2=P_1V_1/V_2=(124)(3.60)/(1.80)=248\,\mathrm{kPa}$. The volume units cancel.
:::end

## Assessment
### Recognition
:::exercise Correct a temperature input
A calculation uses $25.0\,^\circ\mathrm{C}$ directly in $PV=nRT$. What should be used?
:::answer
Use $298.2\,\mathrm{K}$ to one decimal place, using the unrounded value $298.15\,\mathrm{K}$ in the calculation.
:::end
### Error correction
:::exercise Read a gauge correctly
A gauge reads $42\,\mathrm{kPa}$ above the surrounding pressure of $98\,\mathrm{kPa}$. What pressure belongs in a gas-law ratio?
:::answer
The absolute pressure is $42+98=140\,\mathrm{kPa}$. A gauge reading of zero would still correspond to the local atmospheric pressure.
:::end

## Pause and Predict
:::exercise Test the fixed conditions
Would halving the volume necessarily double the pressure if a sealed gas warms during compression?
:::answer
No. The Boyle relation assumes fixed temperature. Under the ideal model, a warmer final state at that smaller volume would have more than twice the initial pressure.
:::end`,
    },
    {
      title: "Use and limit the ideal-gas equation",
      visual: "ideal-gas-lab",
      concepts: ["PV=nRT", "partial pressure", "model limits"],
      markdown: String.raw`## Learning goal
Calculate the volume or pressure of an ideal gas, explain partial pressure, and identify when a real gas may depart from the model.

## Prerequisites
Use absolute temperature and pressure and recognise when a pressure unit matches the chosen gas constant.

## Intuition first
Two gases in a container share the available space. In an ideal mixture, each kind of molecule contributes to the total pressure as it would if it alone occupied the whole container at that temperature.

## Why this works
For an ideal gas, $PV=nRT$. Either work in litres and atmospheres with $R=0.082057\,\mathrm{L\,atm\,mol^{-1}\,K^{-1}}$, or use $\mathrm{kPa}$ and $\mathrm{L}$ with $R=8.314\,\mathrm{L\,kPa\,mol^{-1}\,K^{-1}}$. In an ideal mixture, $P_i=n_iRT/V$. Dividing by $P_{\mathrm{total}}=n_{\mathrm{total}}RT/V$ gives $P_i=x_iP_{\mathrm{total}}$. Each component uses the same container volume.

## Visual exploration
Hold the pressure slider still and increase temperature in the piston. Predict the volume ratio from the two temperatures in kelvin. The diagram represents volume, and the markers identify a fixed amount of gas.

### Original worked example
:::exercise Find a component pressure
A mixture contains $0.36\,\mathrm{mol}$ of helium and $0.24\,\mathrm{mol}$ of neon. The total absolute pressure is $150\,\mathrm{kPa}$. Calculate each partial pressure under the ideal-mixture model.
:::answer
The total amount is $0.60\,\mathrm{mol}$. Helium accounts for $0.36/0.60=0.60$ of the total, giving $90\,\mathrm{kPa}$. Neon accounts for $0.40$, giving $60\,\mathrm{kPa}$. The contributions sum to the original pressure.
:::end

## Assessment
### Procedure
:::exercise Calculate a gas volume
Find $V$ for $1.75\,\mathrm{mol}$ at $285\,\mathrm{K}$ and $1.30\,\mathrm{atm}$.
:::answer
Use the litre-atmosphere gas constant. $V=nRT/P=(1.75)(0.082057)(285)/(1.30)=31.5\,\mathrm{L}$ to three significant figures.
:::end
### Transfer
:::exercise Choose when to use a nonideal model
A gas is compressed at low temperature until the onset of condensation. Explain which assumptions become unreliable.
:::answer
Particles occupy appreciable space at high density. Attractive interactions also matter near condensation. Use real-gas measurements or a model valid for the conditions.
:::end

## Pause and Predict
:::exercise Predict partial-pressure changes
At fixed volume and temperature, extra neon is added to a helium-neon mixture. What happens to the helium partial pressure?
:::answer
It stays the same in the ideal-mixture model because the helium amount, temperature, and container volume stay the same. The neon partial pressure and total pressure rise.
:::end`,
    },
  ],
};
