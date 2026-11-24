"use client";
import { useState } from "react";
export function MathWidget({ type }: { type: "graph" | "secant" | "derivative" | "limit" }) {
  const [x, setX] = useState(1),
    [h, setH] = useState(0.8);
  const px = (n: number) => 130 + n * 48,
    py = (n: number) => 230 - n * 20;
  const slope = type === "secant" || type === "limit" ? 2 * x + h : 2 * x;
  const path = Array.from({ length: 81 }, (_, i) => {
    const n = -2.5 + i / 16;
    return `${i ? "L" : "M"}${px(n)},${py(n * n)}`;
  }).join(" ");
  return (
    <div>
      <svg
        viewBox="0 0 300 260"
        role="img"
        aria-label={`${type} exploration of y equals x squared`}
      >
        <path d="M10 230H290M130 10V250" stroke="#777" />
        <path d={path} stroke="#126b63" fill="none" strokeWidth="2" />
        {type !== "graph" && (
          <line
            x1={px(-2)}
            x2={px(3)}
            y1={py(x * x + slope * (-2 - x))}
            y2={py(x * x + slope * (3 - x))}
            stroke="#c36c24"
          />
        )}
        <circle cx={px(x)} cy={py(x * x)} r="4" fill="#126b63" />
        {(type === "secant" || type === "limit") && (
          <circle cx={px(x + h)} cy={py((x + h) ** 2)} r="4" fill="#c36c24" />
        )}
      </svg>
      <label>
        Point x = {x}
        <input
          type="range"
          min="-1"
          max="2"
          step=".05"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
        />
      </label>
      {(type === "secant" || type === "limit") && (
        <label>
          Step h = {h}
          <input
            type="range"
            min=".01"
            max="1"
            step=".01"
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
          />
        </label>
      )}
      <p>
        y = x² ·{" "}
        {type === "limit"
          ? "As h approaches zero, the secant slope approaches 2x."
          : `Slope: ${slope.toFixed(3)}`}
      </p>
    </div>
  );
}
