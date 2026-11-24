"use client";

import { useState } from "react";

export function TangentExplorer() {
  const [x, setX] = useState(2);
  const px = (value: number) => 42 + value * 49;
  const py = (value: number) => 190 - value * 6;
  const curve = Array.from(
    { length: 51 },
    (_, index) => `${index ? "L" : "M"}${px(index / 10)},${py((index / 10) ** 2)}`,
  ).join(" ");
  const tangent = (at: number) => 2 * x * (at - x) + x * x;
  return (
    <section className="tangent-card" aria-label="Interactive tangent explorer">
      <div className="eyebrow">MAKE IT CLICK</div>
      <h3>A point moves. Its slope changes.</h3>
      <div className="graph-layout">
        <svg
          viewBox="0 0 320 216"
          role="img"
          aria-label={`Graph of y equals x squared. At x equals ${x}, the tangent slope is ${2 * x}.`}
        >
          {[0, 5, 10, 15, 20, 25].map((value) => (
            <g key={value}>
              <path d={`M42 ${py(value)}H292`} stroke="#deded5" strokeDasharray="3 5" />
              <text x="32" y={py(value) + 4} textAnchor="end" fill="#888b80" fontSize="10">
                {value}
              </text>
            </g>
          ))}
          <path d="M42 20V190H300" fill="none" stroke="#a3a69a" />
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <text
              key={value}
              x={px(value)}
              y="207"
              textAnchor="middle"
              fill="#888b80"
              fontSize="10"
            >
              {value}
            </text>
          ))}
          <path d={curve} fill="none" stroke="#536353" strokeWidth="2.5" />
          <path
            d={`M${px(Math.max(0, x - 1.2))} ${py(tangent(Math.max(0, x - 1.2)))}L${px(Math.min(5, x + 1.2))} ${py(tangent(Math.min(5, x + 1.2)))}`}
            stroke="#a14537"
            strokeWidth="2"
          />
          <circle cx={px(x)} cy={py(x * x)} r="5" fill="#a14537" stroke="#fff" strokeWidth="2" />
          <text x="228" y="34" fill="#536353" fontSize="12" fontStyle="italic">
            f(x) = x²
          </text>
        </svg>
        <div className="graph-readout">
          <span>TANGENT SLOPE</span>
          <strong>{(2 * x).toFixed(1)}</strong>
          <small>f′(x) = 2x</small>
        </div>
      </div>
      <label className="slider-label" htmlFor="tangent-x">
        <span>Move along the curve</span>
        <strong>x = {x.toFixed(1)}</strong>
      </label>
      <input
        id="tangent-x"
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={x}
        onChange={(event) => setX(Number(event.target.value))}
      />
    </section>
  );
}
