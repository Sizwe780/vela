"use client";

import { useState, type ReactNode } from "react";
import { VisualCheck } from "../visual-check";
import {
  dilution,
  equilibriumModel,
  equilibriumQuotientAfter,
  gasVolume,
  reactionExtent,
} from "../../lib/sandboxes/chemistry-models";

type BatchVisual = "stoichiometry-lab" | "concentration-lab" | "equilibrium-lab" | "ideal-gas-lab";

const titles: Record<BatchVisual, string> = {
  "stoichiometry-lab": "Limiting reagent bench",
  "concentration-lab": "Dilution bench",
  "equilibrium-lab": "Reversible reaction bench",
  "ideal-gas-lab": "Ideal-gas piston",
};

export function ChemistryBatches({ initial }: { initial: BatchVisual }) {
  return (
    <figure className="session-visual science-sandbox chemistry-bench">
      <figcaption>{titles[initial]}</figcaption>
      {initial === "stoichiometry-lab" && <Stoichiometry />}
      {initial === "concentration-lab" && <Dilution />}
      {initial === "equilibrium-lab" && <Equilibrium />}
      {initial === "ideal-gas-lab" && <IdealGas />}
    </figure>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  change,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  change: (value: number) => void;
}) {
  return (
    <label className="bench-slider">
      <span>
        {label} <strong>{value}</strong>
      </span>
      <input
        type="range"
        {...{ min, max, step, value }}
        onChange={(event) => change(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

function Bench({
  diagram,
  children,
  result,
}: {
  diagram: ReactNode;
  children: ReactNode;
  result: string;
}) {
  return (
    <>
      <div className="chemistry-bench-layout">
        <div className="bench-diagram">{diagram}</div>
        <div className="science-sandbox-controls">{children}</div>
      </div>
      <p className="bench-result" role="status">
        {result}
      </p>
    </>
  );
}

function Bar({
  label,
  value,
  max,
  unit,
  secondary = false,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  secondary?: boolean;
}) {
  return (
    <div className="bench-measure">
      <span>
        {label}{" "}
        <strong>
          {value.toFixed(2)}
          {unit ? " " + unit : ""}
        </strong>
      </span>
      <span className="bench-track" aria-hidden="true">
        <span
          className={secondary ? "bench-fill secondary" : "bench-fill"}
          style={{ width: (100 * value) / max + "%" }}
        />
      </span>
    </div>
  );
}

function Stoichiometry() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [reacted, setReacted] = useState(false);
  const result = reactionExtent(a, b);
  const change = (setter: (value: number) => void) => (value: number) => {
    setter(value);
    setReacted(false);
  };
  return (
    <Bench
      result={
        !reacted
          ? "Compare the available moles per coefficient, then apply the reaction."
          : (result.limiting
              ? result.limiting + " is limiting. "
              : "Both reactants are exactly consumed. ") +
            "Reaction extent: " +
            result.extent.toFixed(2) +
            " mol."
      }
      diagram={
        <>
          <p className="bench-equation" aria-label="Two A plus three B produces one A two B three">
            2A + 3B → A₂B₃
          </p>
          <Bar
            label={reacted ? "A left" : "A available"}
            value={reacted ? result.remainingA : a}
            max={5}
            unit="mol"
          />
          <Bar
            label={reacted ? "B left" : "B available"}
            value={reacted ? result.remainingB : b}
            max={5}
            unit="mol"
            secondary
          />
          <Bar label="Product" value={reacted ? result.product : 0} max={5} unit="mol" />
        </>
      }
    >
      <p>
        Each reaction batch uses 2 mol of A and 3 mol of B. All bars use the same 0–5 mol scale.
      </p>
      <Slider
        label="Available A (mol)"
        value={a}
        min={0.5}
        max={5}
        step={0.5}
        change={change(setA)}
      />
      <Slider
        label="Available B (mol)"
        value={b}
        min={0.5}
        max={5}
        step={0.5}
        change={change(setB)}
      />
      <button type="button" onClick={() => setReacted((value) => !value)}>
        {reacted ? "Show amounts before reaction" : "Apply reaction"}
      </button>
    </Bench>
  );
}

function Vessel({ fill, gas, markers = 12 }: { fill: number; gas?: boolean; markers?: number }) {
  const height = 120 * fill;
  const surface = 155 - height;
  const dots = Array.from({ length: markers }, (_, i) => ({
    x: 26 + ((i * 37) % 89),
    y: surface + height * (0.13 + ((i * 17) % 74) / 100),
  }));
  return (
    <svg
      className="bench-vessel"
      viewBox="0 0 155 174"
      role="img"
      aria-label={
        gas
          ? "Piston height represents volume. The number of markers represents the relative amount of gas."
          : "Liquid height represents total volume, with twelve markers for a fixed amount of dissolved solute"
      }
    >
      <path d="M14 24V155H126V24" className="bench-vessel-outline" />
      <rect x="15" y={surface} width="110" height={height} className="bench-liquid" />
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r="2.5" className="bench-dot" />
      ))}
      {gas ? (
        <path d={"M15 " + surface + " H125 M70 " + surface + " V12"} className="bench-piston" />
      ) : null}
    </svg>
  );
}

function Dilution() {
  const [volume, setVolume] = useState(1);
  const { concentration, amount } = dilution(volume);
  return (
    <Bench
      diagram={<Vessel fill={volume / 2} />}
      result={
        amount.toFixed(3) +
        " mol in " +
        volume.toFixed(2) +
        " L gives " +
        concentration.toFixed(3) +
        " mol/L."
      }
    >
      <p>
        The dots represent the same amount of solute at every setting. Raising the liquid level
        spreads them through more solution.
      </p>
      <Slider
        label="Final solution volume (L)"
        value={volume}
        min={0.25}
        max={2}
        step={0.25}
        change={setVolume}
      />
    </Bench>
  );
}

function Equilibrium() {
  const [q, setQ] = useState(2);
  const [k, setK] = useState(2);
  const { fractionA, fractionB, forward, reverse, direction } = equilibriumModel(q / k, k);
  const y = (quotient: number) => 120 - quotient * 15;
  const trajectory = Array.from({ length: 61 }, (_, index) => {
    const elapsed = (index * 4) / 60;
    return `${index ? "L" : "M"}${34 + (elapsed * 232) / 4},${y(equilibriumQuotientAfter(q, k, elapsed))}`;
  }).join(" ");
  return (
    <Bench
      diagram={
        <>
          <p className="bench-equation">A ⇌ B</p>
          <Bar label="Starting quotient Q" value={q} max={6} />
          <Bar label="Equilibrium constant K" value={k} max={6} secondary />
          <svg
            viewBox="0 0 290 151"
            width="100%"
            role="img"
            aria-label="Reaction quotient approaches the dashed equilibrium constant over relative time"
          >
            <path d="M34 23V120H269" fill="none" stroke="var(--graph-axis)" />
            <path d={`M34 ${y(k)}H264`} stroke="var(--graph-secondary)" strokeDasharray="5 4" />
            <path d={trajectory} fill="none" stroke="var(--graph-primary)" strokeWidth="3" />
            <text x="13" y="22" fill="currentColor">
              Q
            </text>
            <text x="269" y={y(k) + 4} fill="currentColor" fontSize="12">
              K
            </text>
            <text x="266" y="140" fill="currentColor" textAnchor="end" fontSize="12">
              Relative time
            </text>
          </svg>
          <Bar label="Composition A" value={100 * fractionA} max={100} unit="%" />
          <Bar label="Composition B" value={100 * fractionB} max={100} unit="%" secondary />
          <Bar label="Forward rate" value={forward} max={2} />
          <Bar label="Reverse rate" value={reverse} max={2} secondary />
        </>
      }
      result={
        direction === "balanced"
          ? "At Q/K = 1 both rates are equal and nonzero. The amounts of A and B differ."
          : "Net " +
            direction +
            " change is predicted. The equilibrium fraction of B is " +
            ((100 * k) / (1 + k)).toFixed(1) +
            "%."
      }
    >
      <p>
        This hypothetical forward reaction releases heat. Changing the starting concentration ratio
        B/A changes Q. Changing temperature changes K. The temperature settings are illustrative.
      </p>
      <Slider label="Starting quotient Q" value={q} min={0.2} max={6} step={0.1} change={setQ} />
      <label>
        Temperature comparison
        <select value={k} onChange={(event) => setK(Number(event.currentTarget.value))}>
          <option value={2}>Reference · K = 2</option>
          <option value={1}>Warmer · K = 1</option>
          <option value={0.5}>Warmest · K = 0.5</option>
        </select>
      </label>
      <VisualCheck
        check={{
          question:
            "At fixed temperature, adding B raises Q above K. Which direction is favoured immediately?",
          options: ["Toward A", "Toward B"],
          answer: 0,
          feedback: "The net reverse change consumes B and lowers Q toward K.",
        }}
      />
    </Bench>
  );
}

function IdealGas() {
  const [pressure, setPressure] = useState(1);
  const [temperature, setTemperature] = useState(300);
  const [amount, setAmount] = useState(1);
  const volume = gasVolume(pressure, temperature, amount);
  return (
    <Bench
      diagram={
        <Vessel fill={volume / gasVolume(0.5, 600, 1.5)} markers={Math.round(12 * amount)} gas />
      }
      result={"V = " + volume.toFixed(2) + " L for " + amount + " mol of ideal gas."}
    >
      <p>
        Start with one control at a time. Try doubling pressure at fixed temperature and amount,
        increasing temperature at fixed pressure, and adding gas at fixed pressure and temperature.
      </p>
      <Slider
        label="Pressure (atm)"
        value={pressure}
        min={0.5}
        max={3}
        step={0.1}
        change={setPressure}
      />
      <Slider
        label="Temperature (K)"
        value={temperature}
        min={200}
        max={600}
        step={10}
        change={setTemperature}
      />
      <Slider
        label="Amount (mol)"
        value={amount}
        min={0.5}
        max={1.5}
        step={0.25}
        change={setAmount}
      />
      <VisualCheck
        check={{
          question: "At fixed temperature and amount, what does doubling pressure do to volume?",
          options: ["Halves it", "Doubles it"],
          answer: 0,
          feedback: "PV is fixed at that temperature and amount. Doubling P requires halving V.",
        }}
      />
    </Bench>
  );
}
