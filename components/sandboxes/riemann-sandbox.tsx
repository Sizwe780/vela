"use client";
import { useState } from "react";
import { Markdown } from "../markdown";
import {
  numberLabel,
  polynomial,
  polynomialLatex,
  polynomialRange,
  riemannSum,
  type Polynomial,
  type SumMethod,
} from "../../lib/sandboxes/math";
import { axes, clipPlot, useCanvasPlot, type Plot } from "./canvas";
import { usePlayback } from "./playback";
const models = [
  {
    name: "Linear accumulation",
    coefficients: [0, 3, 2] as Polynomial,
    bounds: [0, 4] as [number, number],
  },
  {
    name: "Quadratic accumulation",
    coefficients: [1, 0, 0] as Polynomial,
    bounds: [0, 2] as [number, number],
  },
  {
    name: "Signed cancellation",
    coefficients: [0, 1, -1] as Polynomial,
    bounds: [0, 2] as [number, number],
  },
];
export function RiemannSandbox({
  initialCoefficients = [0, 3, 2],
  initialBounds = [0, 4],
}: {
  initialCoefficients?: Polynomial;
  initialBounds?: [number, number];
}) {
  const [coefficients, setCoefficients] = useState<Polynomial>(initialCoefficients),
    [bounds, setBounds] = useState<[number, number]>(initialBounds),
    [n, setN] = useState(8),
    [method, setMethod] = useState<SumMethod>("right"),
    [revealed, setRevealed] = useState(false);
  const values = riemannSum(coefficients, bounds[0], bounds[1], n, method),
    [low, high] = polynomialRange(coefficients, ...bounds),
    padding = Math.max(1, (high - low) * 0.15),
    yr: [number, number] = [Math.min(0, low) - padding, Math.max(0, high) + padding];
  const playback = usePlayback((t) => setN(Math.max(1, Math.round(2 ** (t * 9)))), 6000);
  const canvas = useCanvasPlot(
    (plot: Plot) => {
      const { context: c, x, y, colors } = plot;
      axes(plot, bounds, yr);
      clipPlot(plot, () => {
        for (const rectangle of values.rectangles) {
          const left = x(rectangle.x0),
            right = x(rectangle.x1),
            top = Math.min(y(0), y(rectangle.height)),
            height = Math.abs(y(rectangle.height) - y(0));
          c.fillStyle = rectangle.height < 0 ? colors.secondary : colors.curve;
          c.globalAlpha = 0.28;
          c.fillRect(left, top, right - left, height);
          c.globalAlpha = 1;
          if (n <= 96) {
            c.strokeStyle = rectangle.height < 0 ? colors.secondary : colors.curve;
            c.lineWidth = 0.7;
            c.strokeRect(left, top, right - left, height);
          }
        }
        c.beginPath();
        for (let i = 0; i <= 240; i++) {
          const at = bounds[0] + ((bounds[1] - bounds[0]) * i) / 240;
          if (!i) c.moveTo(x(at), y(polynomial(coefficients, at)));
          else c.lineTo(x(at), y(polynomial(coefficients, at)));
        }
        c.strokeStyle = colors.curve;
        c.lineWidth = 3;
        c.stroke();
      });
    },
    bounds,
    yr,
  );
  return (
    <figure className="concept-sandbox" aria-label="Riemann sum sandbox">
      <figcaption>
        <span className="sandbox-eyebrow">Calculus · accumulation</span>
        <h3>Thin rectangles, a limiting area</h3>
        <p>
          Predict whether this estimate is too large or too small. Then refine the partition and
          compare sampling rules.
        </p>
      </figcaption>
      <div className="sandbox-presets">
        {models.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => {
              playback.stop();
              setCoefficients(m.coefficients);
              setBounds(m.bounds);
              setN(8);
              setRevealed(false);
            }}
          >
            {m.name}
          </button>
        ))}
      </div>
      <Markdown
        text={`$f(x)=${polynomialLatex(coefficients)},\\quad x\\in[${bounds[0]},${bounds[1]}]$`}
      />
      <canvas
        ref={canvas}
        className="sandbox-canvas"
        role="img"
        aria-label="Polynomial curve with signed Riemann rectangles"
      >
        The current finite sum is {numberLabel(values.sum)} over {n} rectangles. Controls and
        numerical bounds are below.
      </canvas>
      <label>
        Rectangles n · {n}
        <input
          aria-label="Number of rectangles"
          type="range"
          min="1"
          max="512"
          step="1"
          value={n}
          onChange={(e) => {
            playback.stop();
            setN(Number(e.target.value));
          }}
        />
      </label>
      <div className="sandbox-actions">
        <label>
          Sampling rule
          <select
            aria-label="Sampling rule"
            value={method}
            onChange={(e) => {
              playback.stop();
              setMethod(e.target.value as SumMethod);
            }}
          >
            <option value="left">Left endpoint</option>
            <option value="midpoint">Midpoint</option>
            <option value="right">Right endpoint</option>
          </select>
        </label>
        <button
          type="button"
          disabled={playback.reduced}
          onClick={() => {
            if (playback.playing) playback.stop();
            else {
              setN(1);
              playback.start();
            }
          }}
        >
          {playback.playing ? "Pause refinement" : "Animate refinement"}
        </button>
      </div>
      <div className="sandbox-readouts">
        <output aria-live={playback.playing ? "off" : "polite"}>
          Finite {method} sum:{" "}
          <strong data-testid="riemann-estimate">{numberLabel(values.sum)}</strong> · Δx ={" "}
          {numberLabel(values.width)}
        </output>
        <p>
          Lower / upper rectangle bounds: {numberLabel(values.lower)} ≤ integral ≤{" "}
          {numberLabel(values.upper)}.
        </p>
      </div>
      <button type="button" aria-expanded={revealed} onClick={() => setRevealed((v) => !v)}>
        {revealed ? "Hide exact integral" : "Reveal exact integral and error"}
      </button>
      {revealed && (
        <div className="sandbox-reference">
          <p>
            Signed integral:{" "}
            <strong data-testid="riemann-exact">{numberLabel(values.exact)}</strong> · absolute
            error: {numberLabel(Math.abs(values.sum - values.exact))}.
          </p>
          <p>
            Geometric area: {numberLabel(values.area)}. Signed accumulation can cancel across the
            axis; geometric area adds magnitudes.
          </p>
          <Markdown
            text={`$\\int_a^b f(x)\\,dx=\\left[${coefficients[0] ? `${coefficients[0]}x^3/3+` : ""}${coefficients[1] ? `${coefficients[1]}x^2/2+` : ""}${coefficients[2]}x\\right]_a^b$`}
          />
        </div>
      )}
      <details>
        <summary>Choose your interval</summary>
        <label>
          Left bound · {bounds[0]}
          <input
            aria-label="Left integration bound"
            type="range"
            min="-4"
            max={bounds[1] - 0.25}
            step="any"
            value={bounds[0]}
            onChange={(e) => {
              playback.stop();
              setBounds([Number(e.target.value), bounds[1]]);
              setRevealed(false);
            }}
          />
        </label>
        <label>
          Right bound · {bounds[1]}
          <input
            aria-label="Right integration bound"
            type="range"
            min={bounds[0] + 0.25}
            max="4"
            step="any"
            value={bounds[1]}
            onChange={(e) => {
              playback.stop();
              setBounds([bounds[0], Number(e.target.value)]);
              setRevealed(false);
            }}
          />
        </label>
      </details>
      <p className="sandbox-note">
        The bounds use each polynomial's actual minimum and maximum on every subinterval; left and
        right samples are not always lower and upper bounds. Every displayed n is finite. Refinement
        suggests convergence for these continuous polynomials; it is not a proof that a limit has
        been reached.{" "}
        {playback.reduced ? "Use the slider: animation is off for reduced motion." : ""}
      </p>
      <p className="sandbox-note">
        Changing the model or interval creates a separate exploration, without changing the lesson's
        givens or awarding mastery.
      </p>
    </figure>
  );
}
