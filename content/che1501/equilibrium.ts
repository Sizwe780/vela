import type { SpecUnit } from "../../lib/specs";

export const chemicalEquilibrium: SpecUnit = {
  code: "CHE1501-U7",
  title: "Chemical equilibrium",
  sessions: [
    {
      title: "Recognize dynamic equilibrium",
      visual: "equilibrium-lab",
      concepts: ["forward rate", "reverse rate", "closed system"],
      markdown: String.raw`## Learning goal
Distinguish composition from reaction rate and explain why both directions continue at dynamic equilibrium in a closed system.

## Prerequisites
Distinguish an amount of substance from a rate of change. Read a graph that has separate lines for two quantities.

## Intuition first
Imagine scanning a library return shelf. Books can arrive and leave at the same rate, so a steady number on the shelf does not tell you how many were moved.

## Why this works
At equilibrium, forward and reverse reaction rates are equal. A reaction event still occurs in either direction, but the two contributions to composition cancel. Equilibrium composition does not generally contain equal amounts of the reactants and products. In a closed, uniform system, a constant measured concentration supports this interpretation when a reversible reaction is known to be taking place. A concentration that appears constant within instrument precision is weaker evidence.

## Visual exploration
At $Q/K=1$ in the two-species bench, compare the composition bars separately from the rate bars. Lower the ratio and identify which rate becomes greater. Each setting represents a different starting mixture at the same temperature.

### Original worked example
:::exercise Compare rates with unequal composition
A closed $A\rightleftharpoons B$ model has $0.22\,\mathrm{mol}$ of A and $0.44\,\mathrm{mol}$ of B. Each direction converts $0.015\,\mathrm{mol}$ per second. Is there a net change in either amount?
:::answer
There is no net change. In one second, each direction converts the same amount, so the amount of A lost forward is replaced by the reverse reaction. The same accounting applies to B. The amounts can be unequal while the rates agree.
:::end

## Assessment
### Recognition
:::exercise Interpret a flat graph
Measured concentrations remain constant for ten minutes. Does the graph by itself prove that every reaction stops?
:::answer
No. Concentrations can stay constant at dynamic equilibrium while reaction events continue in both directions. Instrument resolution can also conceal slow change.
:::end
### Error correction
:::exercise Separate concentration and rate
A student says equilibrium always means equal reactant and product concentrations. What should they compare?
:::answer
Compare the forward and reverse rates. Equal rates define dynamic equilibrium; the equilibrium composition depends on the equilibrium constant and the overall material balance.
:::end

## Pause and Predict
:::exercise Predict the direction of change
For the closed $A\rightleftharpoons B$ example, the forward rate now exceeds the reverse rate. Which species initially gains amount?
:::answer
B initially gains amount because it is formed by the faster direction. The forward rate and reverse rate can change as the amounts change.
:::end`,
    },
    {
      title: "Write equilibrium expressions",
      visual: "equilibrium-lab",
      concepts: ["K", "Q", "pure phases", "direction"],
      markdown: String.raw`## Learning goal
Write consistent expressions for the reaction quotient and equilibrium constant, and use their comparison to predict initial net change.

## Prerequisites
Read coefficients in a balanced equation and distinguish the pressure of a gas in a mixture from the total pressure.

## Intuition first
At one temperature, $K$ is the target ratio for the balanced reaction as written. $Q$ tells you the current ratio. Use the same kinds of quantities in both and check whether forming more product would raise or lower the ratio.

## Why this works
Build $Q$ from product activities divided by reactant activities, each raised to its coefficient. At equilibrium $Q=K$. For $\ce{N2O4(g) <=> 2NO2(g)}$ in the ideal-gas model,
$$
Q_p=\frac{(P_{\ce{NO2}}/P^\circ)^2}{P_{\ce{N2O4}}/P^\circ}.
$$
The pressures are partial pressures and each is divided by the same standard pressure $P^\circ$. In a concentration convention for dilute solutions, use concentrations relative to the standard concentration. Pure solids and pure liquids have activity one when those phases are present in the usual heterogeneous model. Comparing $Q$ and $K$ requires the same reaction, temperature and convention.

## Procedure
1. Balance the reaction and note each phase.
2. Write the product-over-reactant activity expression using coefficients as powers.
3. Insert current values to find $Q$. Compare it with $K$: below means net forward, above means net reverse, equality means no net change in the stated model.

### Original worked example
:::exercise Compare a quotient with K
For the nitrogen oxide reaction above, $P_{\ce{NO2}}=0.30\,\mathrm{bar}$, $P_{\ce{N2O4}}=0.60\,\mathrm{bar}$, and $P^\circ=1\,\mathrm{bar}$. At this temperature $K=0.40$. Which direction is predicted?
:::answer
The dimensionless quotient is $Q_p=(0.30)^2/0.60=0.15$. Since $0.15<0.40$, net reaction is forward. It produces nitrogen dioxide and consumes dinitrogen tetroxide.
:::end

## Assessment
### Procedure
:::exercise Write a heterogeneous expression
For $\ce{CaCO3(s) <=> CaO(s) + CO2(g)}$ with both pure solids present, write the ideal-gas expression for $Q$.
:::answer
$Q=P_{\ce{CO2}}/P^\circ$. The solids each contribute an activity of one. At equilibrium the same expression, evaluated at the equilibrium pressure, gives $K$.
:::end
### Transfer
:::exercise Predict from Q and K
At the same temperature a sample has $Q/K=0.25$ for the reaction as written. Predict the direction and say whether that ratio tells you how fast the change occurs.
:::answer
The net initial reaction is forward because $Q<K$. The ratio provides a direction under the model; the speed depends on the kinetics.
:::end

## Pause and Predict
:::exercise Reverse the equation
What happens to the numerical equilibrium constant if you reverse every arrow in the written reaction?
:::answer
The numerator and denominator switch, so the new constant is $1/K$ at the same temperature. The physical equilibrium mixture has not changed.
:::end`,
    },
  ],
};
