import type { StudyUnitView } from "../tutor/types";
import type { RetrievedChunk } from "../tutor/retrieval";

const introduction = String.raw`## Change, measured precisely

A car's speedometer tells us how fast its position is changing **at this instant**. A derivative gives us the same idea for any function: an instantaneous rate of change.

If $y=f(x)$, the average rate of change over an interval of width $h$ is

$$\frac{f(x+h)-f(x)}{h}.$$

Geometrically, this is the slope of a **secant line** through two points on the curve. As the second point approaches the first, the secant approaches a tangent.

> **Keep this distinction in mind**
> Average rate describes an interval. Instantaneous rate describes one point.

## The derivative as a limit

We make that interval smaller and smaller:

$$f'(x)=\lim_{h\to 0}\frac{f(x+h)-f(x)}{h}.$$

The limit lets us approach $h=0$ without dividing by zero. When this limit exists, we say that $f$ is **differentiable** at $x$.`;

const example = String.raw`## A worked example: $f(x)=x^2$

Start with the difference quotient and simplify **before** taking the limit:

$$
\begin{aligned}
f'(x)&=\lim_{h\to 0}\frac{(x+h)^2-x^2}{h}\\
&=\lim_{h\to 0}\frac{2xh+h^2}{h}\\
&=\lim_{h\to 0}(2x+h)=2x.
\end{aligned}
$$

At $x=2$, the tangent has slope $f'(2)=4$. Notice that the **height** of the curve, $f(2)$, and its **slope**, $f'(2)$, describe different things—even when their numbers happen to coincide.

### Pause and predict

What is the tangent slope at $x=3$? How would you explain your answer to a learner who thinks the derivative is simply the height of the curve?`;

export const demoUnit: StudyUnitView = {
  capabilities: {
    math: true,
    calculus: true,
    matrix: false,
    units: false,
    physics: false,
    molecules: false,
    reactions: false,
    pck: true,
    debate: false,
  },
  id: "demo",
  code: "SU01",
  title: "Understanding the derivative",
  position: 1,
  moduleCode: "MAT1512",
  moduleTitle: "Calculus A",
  preview: true,
  outcomes: [
    {
      id: "demo-lo1",
      code: "LO1",
      description: "Distinguish average and instantaneous rates of change.",
    },
    {
      id: "demo-lo2",
      code: "LO2",
      description: "Find the derivative of a quadratic function from first principles.",
    },
  ],
  documents: [
    {
      id: "demo-document",
      title: "Rates of change & first principles",
      text: `${introduction}\n\n${example}`,
    },
  ],
  chunks: [
    {
      id: "demo-rates",
      title: "Rates of change and the derivative",
      body: introduction,
      criterionCode: "DEMO-AC-1",
      criterionDescription:
        "Illustrative criterion: explain the derivative as an instantaneous rate of change. Not an official SAQA criterion.",
      criterionSourceUrl: null,
    },
    {
      id: "demo-example",
      title: "Differentiating a quadratic from first principles",
      body: example,
      criterionCode: "DEMO-AC-2",
      criterionDescription:
        "Illustrative criterion: derive the derivative of a quadratic using the limit definition. Not an official SAQA criterion.",
      criterionSourceUrl: null,
    },
  ],
};

export const demoRetrieved: RetrievedChunk[] = demoUnit.chunks.map((chunk, index) => ({
  chunkId: chunk.id,
  title: chunk.title,
  body: chunk.body,
  similarity: 1,
  criterionId: `demo-ac${index + 1}`,
  criterionCode: chunk.criterionCode!,
  criterionDescription: chunk.criterionDescription!,
  criterionSourceUrl: "",
  saqaId: "103108",
}));

export function demoAnswer(mode: "academic" | "pck") {
  if (mode === "pck")
    return String.raw`### Make the idea visible

**Suggested teaching approach:** ask learners to compare a car's average speed over a journey with the reading on its speedometer. Connect this to a secant line and then a tangent. [C1](/study/demo#chunk-demo-rates)

**A misconception to uncover:** “The derivative is the height of the graph.” Plot $f(x)=x^2$ at $x=3$: the height is $9$, while the tangent slope is $6$. These are different quantities. [C2](/study/demo#chunk-demo-example)

**Try it in class:** move the point on the interactive graph. Ask learners to predict whether the slope will increase, decrease or stay the same before revealing $f'(x)=2x$.

**Quick formative check:** “At $x=0$, the curve has height zero. Why is its tangent horizontal?” Ask for an explanation, not just a number.

Which school grade are you planning for? No authoritative CAPS extract is included in this preview, so this is a teaching suggestion rather than a verified CAPS requirement.

*Preview response · sample content and illustrative criteria.*`;
  return String.raw`### A derivative is a local rate of change

Think of two points on a curve. Their secant slope measures **average** change. Bring the points closer together and, when the limit exists, you get the **instantaneous** rate—the tangent slope. [C1](/study/demo#chunk-demo-rates)

For $f(x)=x^2$, start from first principles:

$$
f'(x)=\lim_{h\to0}\frac{(x+h)^2-x^2}{h}
=\lim_{h\to0}(2x+h)=2x.
$$

We cancel $h$ while $h\ne0$, then take the limit. We never substitute into an expression that divides by zero. [C2](/study/demo#chunk-demo-example)

At $x=3$, the tangent slope is $2(3)=6$.

**Your turn:** if the point moves to $x=1$, what happens to the slope? Use the interactive graph to check your prediction.

*Preview response · sample content and illustrative criteria.*`;
}
