"use client";
import { useState } from "react";
import { Markdown } from "../markdown";
import {
  numberLabel,
  polynomial,
  polynomialLatex,
  type Polynomial,
} from "../../lib/sandboxes/math";
import { axes, clipPlot, useCanvasPlot, type Plot } from "./canvas";
export function LimitSandbox({
  initialCoefficients = [0, 1, 13],
  initialCenter = 13,
}: {
  initialCoefficients?: Polynomial;
  initialCenter?: number;
}) {
  const [coefficients, setCoefficients] = useState<Polynomial>(initialCoefficients),
    [center, setCenter] = useState(initialCenter),
    [approach, setApproach] = useState(0),
    [zoom, setZoom] = useState(0),
    [jump, setJump] = useState(false),
    [assigned, setAssigned] = useState(false),
    [pointValue, setPointValue] = useState(polynomial(initialCoefficients, initialCenter) - 2);
  const h = 10 ** -approach,
    radius = 3 * 10 ** -zoom,
    limit = polynomial(coefficients, center),
    rightLimit = limit + (jump ? 1 : 0),
    leftValue = polynomial(coefficients, center - h),
    rightValue = polynomial(coefficients, center + h) + (jump ? 1 : 0),
    xr: [number, number] = [center - radius, center + radius],
    verticalRadius = Math.max(
      radius,
      Math.abs(2 * coefficients[0] * center + coefficients[1]) * radius +
        Math.abs(coefficients[0]) * radius * radius,
    ),
    yr: [number, number] = [limit - verticalRadius * 1.2, rightLimit + verticalRadius * 1.2];
  const pointVisible = pointValue >= yr[0] && pointValue <= yr[1];
  const canvas = useCanvasPlot(
    (plot: Plot) => {
      const { context: c, x, y, colors } = plot;
      axes(plot, xr, yr);
      clipPlot(plot, () => {
        for (const side of [-1, 1]) {
          c.beginPath();
          for (let i = 0; i <= 160; i++) {
            const at = center + side * radius * (1 - i / 160);
            const value = polynomial(coefficients, at) + (side > 0 && jump ? 1 : 0);
            if (!i) c.moveTo(x(at), y(value));
            else c.lineTo(x(at), y(value));
          }
          c.strokeStyle = colors.curve;
          c.lineWidth = 3;
          c.stroke();
        }
        const dot = (at: number, value: number, color: string, hollow = false) => {
          c.beginPath();
          c.arc(x(at), y(value), hollow ? 6 : 4.5, 0, Math.PI * 2);
          c.fillStyle = hollow ? colors.surface : color;
          c.fill();
          c.strokeStyle = color;
          c.lineWidth = 2;
          c.stroke();
        };
        if (!(assigned && pointValue === limit)) dot(center, limit, colors.curve, true);
        if (jump && !(assigned && pointValue === rightLimit))
          dot(center, rightLimit, colors.curve, true);
        if (h <= radius) {
          dot(center - h, leftValue, colors.secondary);
          dot(center + h, rightValue, colors.secondary);
        }
        if (assigned && pointVisible) dot(center, pointValue, colors.text);
      });
    },
    xr,
    yr,
  );
  function model(kind: "lesson" | "quadratic" | "jump") {
    setCoefficients(kind === "lesson" ? initialCoefficients : [1, 0, 0]);
    setCenter(kind === "lesson" ? initialCenter : 1);
    setJump(kind === "jump");
    setAssigned(false);
    setApproach(0);
    setZoom(0);
    setPointValue(kind === "lesson" ? polynomial(initialCoefficients, initialCenter) - 2 : -1);
  }
  return (
    <figure className="concept-sandbox" aria-label="Limit zoom sandbox">
      <figcaption>
        <span className="sandbox-eyebrow">Calculus · approach and zoom</span>
        <h3>A nearby trend is not a point value</h3>
        <p>
          Move toward the missing input from both sides. Zooming changes the window, not the
          function.
        </p>
      </figcaption>
      <div className="sandbox-presets">
        <button type="button" onClick={() => model("lesson")}>
          Opening model
        </button>
        <button type="button" onClick={() => model("quadratic")}>
          Quadratic hole
        </button>
        <button type="button" onClick={() => model("jump")}>
          Jump comparison
        </button>
      </div>
      <Markdown
        text={`$f(x)=${polynomialLatex(coefficients)}${jump ? "+\\mathbf{1}_{x>1}" : ""},\\quad x\\ne ${center}$`}
      />
      <canvas
        ref={canvas}
        className="sandbox-canvas"
        role="img"
        aria-label="Two-sided approach to a missing point with adjustable zoom"
      >
        Left and right trends are {numberLabel(limit)} and {numberLabel(rightLimit)}. The assigned
        point is independent.
      </canvas>
      <label>
        Approach precision · h = {numberLabel(h)}
        <input
          aria-label="Approach precision"
          type="range"
          min="0"
          max="6"
          step=".1"
          value={approach}
          onChange={(e) => setApproach(Number(e.target.value))}
        />
      </label>
      <label>
        Zoom · radius = {numberLabel(radius)}
        <input
          aria-label="Limit zoom"
          type="range"
          min="0"
          max="5"
          step=".1"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>
      <div className="sandbox-readouts">
        <output>
          From the left: x = {numberLabel(center - h)}, f(x) ≈ {numberLabel(leftValue)}.<br />
          From the right: x = {numberLabel(center + h)}, f(x) ≈ {numberLabel(rightValue)}.
        </output>
        <p>
          {jump
            ? "The one-sided trends differ, so this model has no two-sided limit."
            : `Both sides approach ${numberLabel(limit)}, whether or not a point value is assigned.`}
        </p>
        {h > radius && (
          <p>
            The sample points are outside this zoom window. Zoom out or increase approach precision.
          </p>
        )}
      </div>
      <label className="sandbox-checkbox">
        <input type="checkbox" checked={assigned} onChange={(e) => setAssigned(e.target.checked)} />
        Define a new value at the missing point
      </label>
      {assigned && (
        <label>
          Assigned point value · {numberLabel(pointValue)}
          <input
            aria-label="Assigned point value"
            type="range"
            min={Math.min(-10, limit - 10)}
            max={Math.max(40, limit + 10)}
            step="1"
            value={pointValue}
            onChange={(e) => setPointValue(Number(e.target.value))}
          />
        </label>
      )}
      <p data-testid="limit-point-readout">
        f({numberLabel(center)}) is {assigned ? numberLabel(pointValue) : "undefined"}.{" "}
        {assigned && !pointVisible ? "The assigned point is outside the current zoom window." : ""}
      </p>
      <p className="sandbox-note">
        An assigned value creates an extension of the opening function at {initialCenter}; it does
        not change its original excluded domain. Other presets are separate illustrative models. No
        finite sample proves a limit or awards mastery.
      </p>
    </figure>
  );
}
