"use client";
import { useState } from "react";
import type { WidgetFrame } from "../../../../lib/tutor/cards";
import { MatrixSandbox } from "../../../../components/sandboxes/matrix-sandbox";
import { RiemannSandbox } from "../../../../components/sandboxes/riemann-sandbox";
import { LimitSandbox } from "../../../../components/sandboxes/limit-sandbox";
function BasicChatWidget({
  type,
  data = {},
}: {
  type: "graph" | "secant" | "derivative" | "limit" | "vector";
  data?: { label?: string; coefficients?: [number, number, number] };
}) {
  const [x, setX] = useState(1),
    [h, setH] = useState(1.5);
  const [a, b, c] = data.coefficients ?? [1, 0, 0];
  const f = (v: number) => a * v * v + b * v + c;
  const values = Array.from({ length: 81 }, (_, i) => f(-3 + (i * 6) / 80));
  const low = Math.min(0, ...values) - 1,
    high = Math.max(0, ...values) + 1;
  const px = (n: number) => 35 + (n + 3) * 42,
    py = (n: number) => 230 - ((n - low) / (high - low)) * 210;
  const slope = type === "secant" || type === "limit" ? a * (2 * x + h) + b : 2 * a * x + b;
  const path = Array.from({ length: 81 }, (_, i) => {
    const n = -3 + (i * 6) / 80;
    return `${i ? "L" : "M"}${px(n)},${py(f(n))}`;
  }).join(" ");
  if (type === "vector")
    return (
      <div className="chat-widget">
        <svg viewBox="0 0 300 260" role="img" aria-label="Interactive vector">
          <path d="M10 130H290M150 10V250" stroke="#94a3b8" />
          <line
            x1="150"
            y1="130"
            x2={150 + x * 45}
            y2={130 - h * 80}
            stroke="#126b63"
            strokeWidth="4"
          />
          <circle cx={150 + x * 45} cy={130 - h * 80} r="5" fill="#126b63" />
        </svg>
        <label>
          Horizontal component {x.toFixed(2)}
          <input
            type="range"
            min="-2"
            max="2"
            step=".05"
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>
        <label>
          Vertical component {h.toFixed(2)}
          <input
            type="range"
            min="-1.4"
            max="1.4"
            step=".05"
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
          />
        </label>
        <p>Magnitude = {Math.hypot(x, h).toFixed(3)}</p>
      </div>
    );
  return (
    <div className="chat-widget">
      <svg viewBox="0 0 300 260" role="img" aria-label={`${type} exploration of quadratic graph`}>
        {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
          <g key={n}>
            <path d={`M${px(n)} 10V230`} stroke="#e2e8f0" />
            <text x={px(n)} y="248" fontSize="9" textAnchor="middle">
              {n}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = low + t * (high - low);
          return (
            <g key={t}>
              <path d={`M35 ${py(v)}H287`} stroke="#e2e8f0" />
              <text x="2" y={py(v) + 3} fontSize="9">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <path d={`M10 ${py(0)}H290M${px(0)} 10V230`} stroke="#777" />
        <path d={path} stroke="#126b63" fill="none" strokeWidth="2" />
        {type !== "graph" && (
          <line
            x1={px(-2)}
            x2={px(3)}
            y1={py(f(x) + slope * (-2 - x))}
            y2={py(f(x) + slope * (3 - x))}
            stroke="#c36c24"
          />
        )}
        <circle cx={px(x)} cy={py(f(x))} r="4" fill="#126b63" />
        {(type === "secant" || type === "limit") && (
          <circle cx={px(x + h)} cy={py(f(x + h))} r="4" fill="#c36c24" />
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
        y = {a}x² + ({b})x + ({c}) ·{" "}
        {type === "limit"
          ? "As h approaches zero, the secant slope approaches the derivative."
          : `Slope: ${slope.toFixed(3)}`}
      </p>
    </div>
  );
}
export function ChatWidget(frame: WidgetFrame) {
  if (frame.type === "matrix")
    return (
      <MatrixSandbox key={JSON.stringify(frame.data.matrix)} initialMatrix={frame.data.matrix} />
    );
  if (frame.type === "riemann")
    return (
      <RiemannSandbox
        key={JSON.stringify(frame.data)}
        initialCoefficients={frame.data.coefficients}
        initialBounds={frame.data.bounds}
      />
    );
  if (frame.type === "limitzoom")
    return (
      <LimitSandbox
        key={JSON.stringify(frame.data)}
        initialCoefficients={frame.data.coefficients}
        initialCenter={frame.data.center}
      />
    );
  return <BasicChatWidget type={frame.type} data={frame.data} />;
}
