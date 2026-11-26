"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  axialExtension,
  bridgeSignal,
  circularTrial,
  dcCellTrial,
  gliderCollision,
  gratingOrderAngle,
  electronRingDiameter,
  electronOrbit,
  inclineTrial,
  instrumentReading,
  linearFit,
  pendulumTrial,
  parallelWireForce,
  photoelectricTrial,
  projectileTrial,
  rotationalInertia,
  straightLineMotion,
  venturiTrial,
  type Measurement,
  type PhysicsWorkshopId,
} from "../../lib/sandboxes/physics";
import styles from "./physics-workshop.module.css";

function Workshop({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.workshop} aria-label={title}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  change,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  change: (value: number) => void;
}) {
  return (
    <label className={styles.slider}>
      <span>
        {label}{" "}
        <strong>
          {value} {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => change(e.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

function InstrumentBench() {
  const [instrument, setInstrument] = useState("vernier");
  const [tick, setTick] = useState(7);
  const [zero, setZero] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const micrometer = instrument === "micrometer";
  const resolution = micrometer ? 0.01 : instrument === "vernier20" ? 0.02 : 0.05;
  const main = micrometer ? 6.5 : instrument === "microscope" ? 12 : 8;
  const { indicated, corrected } = instrumentReading(main, tick, resolution, zero);
  const marks = Array.from({ length: micrometer || resolution === 0.02 ? 50 : 20 }, (_, i) => i);
  const pitch = (micrometer ? 240 : 270) / marks.length;
  const start = (micrometer ? 45 : 60) + (micrometer ? 0 : (tick * pitch) / marks.length);
  return (
    <Workshop title="Instrument reading bench">
      <label>
        Scale{" "}
        <select
          value={instrument}
          onChange={(e) => {
            setInstrument(e.target.value);
            setTick(7);
            setRevealed(false);
          }}
        >
          <option value="vernier">Vernier caliper · 0.05 mm</option>
          <option value="vernier20">Vernier caliper · 0.02 mm</option>
          <option value="micrometer">Micrometer · 0.01 mm</option>
          <option value="microscope">Travelling microscope · 0.05 mm model</option>
        </select>
      </label>
      <p>
        Simulated scale detail. Read the main scale first, then find the index or coincidence on the
        fine scale. The microscope view represents one travel axis.
      </p>
      <svg
        viewBox="0 0 380 115"
        role="img"
        aria-label={micrometer ? "Barrel and thimble index" : "Main and vernier graduation detail"}
      >
        <path d="M18 53H357 M18 61H357" stroke="currentColor" />
        <text x="18" y="20" fill="currentColor">
          {micrometer ? "Barrel" : "Main scale"} · {main} mm at reference
        </text>
        <text x="18" y="104" fill="currentColor">
          {micrometer ? "Thimble" : "Vernier scale"}
        </text>
        {marks.map((index) => {
          const upper = micrometer ? start + tick * pitch : 60 + index * pitch;
          const lower =
            start + index * pitch * (micrometer ? 1 : (marks.length - 1) / marks.length);
          return (
            <g key={index} stroke="currentColor">
              {(!micrometer || index === tick) && <path d={`M${upper} 53v-15`} />}
              <path d={`M${lower} 61v${index % 5 === 0 ? 18 : 9}`} />
              {index % 5 === 0 && (
                <text x={lower} y="89" stroke="none" fill="currentColor" fontSize="8">
                  {index}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Slider
        label="Move fine scale"
        unit=""
        min={0}
        max={marks.length - 1}
        step={1}
        value={tick}
        change={(value) => {
          setTick(value);
          setRevealed(false);
        }}
      />
      <Slider
        label="Closed zero reading"
        unit="mm"
        min={-0.1}
        max={0.1}
        step={0.05}
        value={zero}
        change={setZero}
      />
      <button type="button" onClick={() => setRevealed(!revealed)}>
        {revealed ? "Hide reading" : "Reveal reading"}
      </button>
      {revealed && (
        <p>
          Indicated {indicated.toFixed(2)} mm. Subtract the signed zero reading to get{" "}
          {corrected.toFixed(2)} mm.
        </p>
      )}
    </Workshop>
  );
}

function PendulumBench() {
  const [length, setLength] = useState(0.8);
  const [angle, setAngle] = useState(6);
  const [trials, setTrials] = useState<Measurement[]>([]);
  const trial = pendulumTrial(length);
  const fit = linearFit(trials);
  const drawingLength = 35 + (90 * length) / 1.5;
  const angleRadians = (angle * Math.PI) / 180;
  const x = 190 + drawingLength * Math.sin(angleRadians);
  const y = 20 + drawingLength * Math.cos(angleRadians);
  return (
    <Workshop title="Pendulum bench">
      <p>
        Virtual preparation. The model assumes a point bob, light string, negligible drag and a
        small release angle.
      </p>
      <svg
        viewBox="0 0 380 160"
        role="img"
        aria-label="Pendulum released to the right of the vertical equilibrium line"
      >
        <path d="M165 19h50 M190 20v126" stroke="currentColor" strokeDasharray="4 3" />
        <line x1="190" y1="20" x2={x} y2={y} stroke="currentColor" strokeWidth="2" />
        <circle cx={x} cy={y} r="10" fill="currentColor" />
      </svg>
      <Slider
        label="Pivot to bob centre"
        unit="m"
        min={0.2}
        max={1.5}
        step={0.05}
        value={length}
        change={setLength}
      />
      <Slider
        label="Release angle"
        unit="°"
        min={1}
        max={9}
        step={1}
        value={angle}
        change={setAngle}
      />
      <button
        type="button"
        disabled={trials.length >= 20 || trials.some((point) => point.x === length)}
        onClick={() => {
          const time = Math.round(trial.timeForTwenty * 100) / 100;
          setTrials([...trials, { x: length, y: (time / 20) ** 2, dx: 0, dy: 0 }]);
        }}
      >
        Record simulated time for 20 swings
      </button>
      {trials.length > 0 && (
        <>
          <p>Latest recording: {(20 * Math.sqrt(trials.at(-1)!.y)).toFixed(2)} s.</p>
          <Scatter points={trials} xLabel="Length (m)" yLabel="Period squared (s²)" trend />
          {fit && fit.slope > 0 ? (
            <p>From the fitted slope, g = {((4 * Math.PI ** 2) / fit.slope).toFixed(2)} m/s².</p>
          ) : (
            <p>Record three distinct lengths to estimate g.</p>
          )}
          <button type="button" onClick={() => setTrials([])}>
            Clear readings
          </button>
        </>
      )}
    </Workshop>
  );
}

function CentripetalBench() {
  const [mass, setMass] = useState(0.2);
  const [radius, setRadius] = useState(0.3);
  const [speed, setSpeed] = useState(3);
  const reading = circularTrial(mass, radius, speed);
  const distance = 35 + (90 * radius) / 0.8;
  return (
    <Workshop title="Centripetal rig">
      <p>Top view. The mass moves tangentially. The inward resultant keeps its path circular.</p>
      <svg
        viewBox="0 0 380 155"
        role="img"
        aria-label="Overhead rotating arm with inward force and perpendicular tangential velocity"
      >
        <path
          d={`M${160 + distance} 77a${distance} ${distance} 0 0 0 -${distance} -${distance}`}
          fill="none"
          stroke="currentColor"
          strokeDasharray="4 3"
        />
        <path
          d={`M160 77h${distance} m0 0v-36 m-4 5 4-5 4 5 M${160 + distance - 12} 85h-35 m5-4-5 4 5 4`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="160" cy="77" r="6" fill="currentColor" />
        <circle cx={160 + distance} cy="77" r="8" fill="currentColor" />
        <text x={170 + distance} y="42" fill="currentColor">
          v
        </text>
        <text x={122 + distance} y="106" fill="currentColor">
          F inward
        </text>
      </svg>
      <Slider
        label="Mass"
        unit="kg"
        min={0.05}
        max={0.5}
        step={0.05}
        value={mass}
        change={setMass}
      />
      <Slider
        label="Radius"
        unit="m"
        min={0.1}
        max={0.8}
        step={0.05}
        value={radius}
        change={setRadius}
      />
      <Slider
        label="Angular speed"
        unit="rad/s"
        min={1}
        max={10}
        step={1}
        value={speed}
        change={setSpeed}
      />
      <p>
        Simulated inward force <strong>{reading.force.toFixed(2)} N</strong>. Tangential speed{" "}
        {reading.speed.toFixed(2)} m/s.
      </p>
    </Workshop>
  );
}

function AirTrackBench() {
  const [massA, setMassA] = useState(0.2);
  const [massB, setMassB] = useState(0.3);
  const [speed, setSpeed] = useState(0.7);
  const [elastic, setElastic] = useState(true);
  const [observed, setObserved] = useState(false);
  const result = gliderCollision(massA, massB, speed, elastic);
  const gate = (velocity: number) =>
    velocity === 0 ? "No passage" : ((1000 * 0.025) / Math.abs(velocity)).toFixed(0) + " ms";
  return (
    <Workshop title="Air track collision bench">
      <p>
        The track is level with negligible friction. Glider B starts at rest. Each time is for a 25
        mm flag passing an ideal gate.
      </p>
      <svg
        viewBox="0 0 380 130"
        role="img"
        aria-label="Two gliders on a level track with photogates outside the collision zone"
      >
        <path
          d="M20 90h340 M68 91V44h25v46 M285 91V44h25v46 M40 104l12-14m276 0 12 14"
          stroke="currentColor"
          fill="none"
        />
        <g stroke="currentColor" fill="none">
          <rect x="115" y="66" width="56" height="23" rx="4" />
          <rect x="207" y="66" width="56" height="23" rx="4" />
          <path d="M120 66V52h12v14 M250 66V52h12v14 M168 54h30m-5-4 5 4-5 4" />
        </g>
        <g fill="currentColor">
          <text x="138" y="82">
            A
          </text>
          <text x="230" y="82">
            B
          </text>
          <text x="55" y="35">
            Gate 1
          </text>
          <text x="274" y="35">
            Gate 2
          </text>
        </g>
      </svg>
      <Slider
        label="Glider A mass"
        unit="kg"
        min={0.1}
        max={0.5}
        step={0.05}
        value={massA}
        change={(value) => {
          setMassA(value);
          setObserved(false);
        }}
      />
      <Slider
        label="Glider B mass"
        unit="kg"
        min={0.1}
        max={0.5}
        step={0.05}
        value={massB}
        change={(value) => {
          setMassB(value);
          setObserved(false);
        }}
      />
      <Slider
        label="Incoming speed"
        unit="m/s"
        min={0.2}
        max={1.5}
        step={0.1}
        value={speed}
        change={(value) => {
          setSpeed(value);
          setObserved(false);
        }}
      />
      <label>
        Bumper{" "}
        <select
          value={elastic ? "spring" : "coupling"}
          onChange={(e) => {
            setElastic(e.target.value === "spring");
            setObserved(false);
          }}
        >
          <option value="spring">Ideal spring</option>
          <option value="coupling">Sticking coupler</option>
        </select>
      </label>
      <button type="button" onClick={() => setObserved(true)}>
        Record simulated collision
      </button>
      {observed && (
        <>
          <p>
            Incoming A passage {gate(speed)}. Outgoing flag durations below apply if each glider
            reaches a gate.
          </p>
          <p>
            A: {result.velocityA.toFixed(3)} m/s, {gate(result.velocityA)}. B:{" "}
            {result.velocityB.toFixed(3)} m/s, {gate(result.velocityB)}. Rightward is positive.
          </p>
          <p>
            Total momentum {result.momentum.toFixed(3)} kg·m/s before and after. Kinetic energy{" "}
            {result.beforeEnergy.toFixed(4)} J before, {result.afterEnergy.toFixed(4)} J after.
          </p>
        </>
      )}
    </Workshop>
  );
}

function CircuitBench() {
  const [load, setLoad] = useState(10);
  const [ammeter, setAmmeter] = useState("series");
  const [voltmeter, setVoltmeter] = useState("parallel");
  const [trials, setTrials] = useState<Measurement[]>([]);
  const correct = ammeter === "series" && voltmeter === "parallel";
  const trial = dcCellTrial(6, 2, load);
  const fit = linearFit(trials);
  return (
    <Workshop title="DC cell and resistance bench">
      <p>
        Virtual circuit. The cell has a fixed emf and internal resistance. Sweep the load and
        measure the terminal voltage and loop current.
      </p>
      <svg
        viewBox="0 0 380 150"
        role="img"
        aria-label="Reference circuit with a series ammeter and a voltmeter in parallel with the load"
      >
        <path
          d="M120 114H54V44H98m32 0H215m64 0h42v70H140m-20-14v28m20-24v20 M212 44V88h24m30 0h16V44"
          stroke="currentColor"
          fill="none"
        />
        <circle cx="114" cy="44" r="16" fill="none" stroke="currentColor" />
        <rect x="215" y="35" width="64" height="18" rx="3" fill="none" stroke="currentColor" />
        <circle cx="251" cy="88" r="15" fill="none" stroke="currentColor" />
        <g fill="currentColor" textAnchor="middle">
          <text x="114" y="50">
            A
          </text>
          <text x="251" y="94">
            V
          </text>
          <text x="247" y="27">
            Load
          </text>
          <text x="130" y="146">
            Cell
          </text>
        </g>
      </svg>
      <label>
        Ammeter placement{" "}
        <select value={ammeter} onChange={(e) => setAmmeter(e.target.value)}>
          <option value="series">Series in the main loop</option>
          <option value="parallel">Parallel across the load</option>
        </select>
      </label>
      <label>
        Voltmeter placement{" "}
        <select value={voltmeter} onChange={(e) => setVoltmeter(e.target.value)}>
          <option value="parallel">Parallel across the load</option>
          <option value="series">Series in the main loop</option>
        </select>
      </label>
      {ammeter === "parallel" && (
        <p role="status">
          Move the low-resistance ammeter into the loop. Across the load it would create a
          low-resistance bypass.
        </p>
      )}
      {voltmeter === "series" && (
        <p role="status">
          Connect the high-resistance voltmeter across the load. In the loop it would strongly
          reduce the measured current.
        </p>
      )}
      <Slider
        label="Load resistance"
        unit="Ω"
        min={2}
        max={30}
        step={1}
        value={load}
        change={setLoad}
      />
      <button
        type="button"
        disabled={!correct || trials.some((point) => point.x === trial.current)}
        onClick={() =>
          setTrials([...trials, { x: trial.current, y: trial.terminalVoltage, dx: 0, dy: 0 }])
        }
      >
        Record simulated readings
      </button>
      {trials.length > 0 && (
        <>
          <p>
            Latest recording {trials.at(-1)!.x.toFixed(3)} A at {trials.at(-1)!.y.toFixed(3)} V.
          </p>
          <Scatter points={trials} xLabel="Current (A)" yLabel="Terminal voltage (V)" trend />
          {fit && (
            <p>
              Fitted emf {fit.intercept.toFixed(2)} V. Internal resistance {(-fit.slope).toFixed(2)}{" "}
              Ω.
            </p>
          )}
          <button type="button" onClick={() => setTrials([])}>
            Clear readings
          </button>
        </>
      )}
    </Workshop>
  );
}

function Scatter({
  points,
  xLabel,
  yLabel,
  cursor,
  trend = false,
}: {
  points: Measurement[];
  xLabel: string;
  yLabel: string;
  cursor?: number;
  trend?: boolean;
}) {
  const fit = trend ? linearFit(points) : null;
  const xMin = Math.min(...points.map((p) => p.x - p.dx));
  const xMax = Math.max(...points.map((p) => p.x + p.dx));
  const fittedEnds = fit
    ? [fit.intercept + fit.slope * xMin, fit.intercept + fit.slope * xMax]
    : [];
  const yMin = Math.min(...points.map((p) => p.y - p.dy), ...fittedEnds);
  const yMax = Math.max(...points.map((p) => p.y + p.dy), ...fittedEnds);
  const horizontal = (x: number) => 58 + 286 * (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin));
  const vertical = (y: number) => 137 - 103 * (yMax === yMin ? 0.5 : (y - yMin) / (yMax - yMin));
  return (
    <svg viewBox="0 0 375 175" role="img" aria-label={`${yLabel} versus ${xLabel}`}>
      <path d="M58 31v106h288" fill="none" stroke="currentColor" />
      <g fill="currentColor" fontSize="10">
        <text x="14" y="20">
          {yLabel}
        </text>
        <text x="195" y="170" textAnchor="middle">
          {xLabel}
        </text>
        <text x="50" y="39" textAnchor="end">
          {yMax.toPrecision(3)}
        </text>
        <text x="50" y="137" textAnchor="end">
          {yMin.toPrecision(3)}
        </text>
        <text x="58" y="151">
          {xMin.toPrecision(3)}
        </text>
        <text x="344" y="151" textAnchor="end">
          {xMax.toPrecision(3)}
        </text>
      </g>
      {fittedEnds.length > 0 && (
        <path
          d={`M58 ${vertical(fittedEnds[0])}L344 ${vertical(fittedEnds[1])}`}
          stroke="currentColor"
          strokeDasharray="5 3"
        />
      )}
      {cursor !== undefined && (
        <polyline
          points={points.map((p) => `${horizontal(p.x)},${vertical(p.y)}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
      {points.map(({ x, y, dx, dy }, i) => {
        const px = horizontal(x);
        const py = vertical(y);
        if (cursor !== undefined && Math.abs(x - cursor) > 0.001) return null;
        return (
          <g key={i} stroke="currentColor">
            <path
              d={`M${horizontal(x - dx)} ${py}H${horizontal(x + dx)} M${px} ${vertical(y - dy)}V${vertical(y + dy)}`}
            />
            <circle cx={px} cy={py} r="3" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

function MotionGrapher() {
  const [velocity, setVelocity] = useState(4);
  const [acceleration, setAcceleration] = useState(-2);
  const [time, setTime] = useState(0);
  const sample = straightLineMotion(velocity, acceleration, time);
  const timeline = Array.from({ length: 61 }, (_, i) => i / 10);
  return (
    <Workshop title="Position, velocity and acceleration">
      <p>
        The origin is the starting point and positive points right. The same time cursor moves
        across all three plots.
      </p>
      <Slider
        label="Initial velocity"
        unit="m/s"
        min={-8}
        max={8}
        step={1}
        value={velocity}
        change={setVelocity}
      />
      <Slider
        label="Acceleration"
        unit="m/s²"
        min={-4}
        max={4}
        step={0.5}
        value={acceleration}
        change={setAcceleration}
      />
      <Slider
        label="Time cursor"
        unit="s"
        min={0}
        max={6}
        step={0.1}
        value={time}
        change={setTime}
      />
      {(["position", "velocity", "acceleration"] as const).map((quantity, i) => (
        <Scatter
          key={quantity}
          xLabel="Time (s)"
          yLabel={["Position (m)", "Velocity (m/s)", "Acceleration (m/s²)"][i]}
          cursor={time}
          points={timeline.map((x) => ({
            x,
            y: straightLineMotion(velocity, acceleration, x)[quantity],
            dx: 0,
            dy: 0,
          }))}
        />
      ))}
      <p>
        Position {sample.position.toFixed(2)} m. Velocity {sample.velocity.toFixed(2)} m/s.
        Acceleration {sample.acceleration.toFixed(2)} m/s².
      </p>
    </Workshop>
  );
}

function RegressionStudio() {
  const [data, setData] = useState(
    "0.30, 1.25, 0.01, 0.03\n0.50, 1.99, 0.01, 0.03\n0.72, 2.94, 0.01, 0.04\n0.95, 3.80, 0.01, 0.04",
  );
  const rows = data
    .trim()
    .split("\n")
    .filter((row) => row.trim());
  const values = rows.map((row) => row.split(",").map((field) => field.trim()));
  const valid =
    values.length > 0 &&
    values.length <= 50 &&
    values.every(
      (row) =>
        row.length === 4 &&
        row.every(
          (field) =>
            field !== "" && Number.isFinite(Number(field)) && Math.abs(Number(field)) <= 1e12,
        ) &&
        Number(row[2]) >= 0 &&
        Number(row[3]) >= 0,
    );
  const points = valid
    ? values.map((row) => {
        const [x, y, dx, dy] = row.map(Number);
        return { x, y, dx, dy };
      })
    : [];
  const fit = linearFit(points);
  return (
    <Workshop title="Linear regression and graphing studio">
      <label>
        Measurements, one row per reading (x, y, Δx, Δy)
        <textarea
          rows={5}
          maxLength={7000}
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </label>
      <p>
        Start with simulated data or enter your own. Keep units consistent in each column. The bars
        show both uncertainties. This unweighted fit minimizes vertical residuals and estimates the
        standard error of the slope from their spread.
      </p>
      {!valid && (
        <p role="status">
          Enter up to 50 rows, each with four finite numbers and nonnegative uncertainties.
        </p>
      )}
      {points.length > 0 && (
        <Scatter points={points} xLabel="x (your units)" yLabel="y (your units)" trend />
      )}
      {valid && !fit && (
        <p>Use at least three readings with different x positions to fit a line.</p>
      )}
      {fit && (
        <p>
          Slope {fit.slope.toPrecision(4)} ± {fit.slopeError.toPrecision(3)} (standard error).
          Intercept {fit.intercept.toPrecision(4)}. R²{" "}
          {fit.rSquared?.toFixed(4) ?? "undefined for constant y"}.
        </p>
      )}
    </Workshop>
  );
}

const reportSections = [
  ["Aim", "State the quantity or relationship you set out to determine."],
  ["Theory", "Define each symbol, the governing equation and the assumptions."],
  [
    "Apparatus and method",
    "Describe your setup and how readings were taken. Record instrument resolution and reference points.",
  ],
  [
    "Results",
    "Label table columns with units and report uncertainties. Identify any simulated data.",
  ],
  ["Calculations", "Show the symbolic method, substitution and propagated uncertainty."],
  ["Discussion", "Explain likely systematic and random errors using evidence from the results."],
  ["Conclusion", "Answer the aim with a value, units, uncertainty and relevant limitations."],
];

function ReportStudio() {
  const [sections, setSections] = useState<Record<string, string>>({});
  function exportReport() {
    const report = reportSections
      .map(([heading]) => `## ${heading}\n\n${sections[heading] ?? ""}`)
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lab-report.md";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Workshop title="Scientific report studio">
      <p>
        Draft each part and download a copy before leaving this session. Drafts stay on this page
        until downloaded.
      </p>
      {reportSections.map(([heading, prompt]) => (
        <label key={heading}>
          {heading}
          <small>{prompt}</small>
          <textarea
            rows={2}
            value={sections[heading] ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setSections((previous) => ({ ...previous, [heading]: value }));
            }}
          />
        </label>
      ))}
      <button
        type="button"
        disabled={!Object.values(sections).some((section) => section.trim())}
        onClick={exportReport}
      >
        Download report draft
      </button>
    </Workshop>
  );
}

export function PhysicsWorkshop({ model }: { model: PhysicsWorkshopId }) {
  switch (model) {
    case "instrument-bench":
      return <InstrumentBench />;
    case "regression-studio":
      return <RegressionStudio />;
    case "pendulum-bench":
      return <PendulumBench />;
    case "centripetal-bench":
      return <CentripetalBench />;
    case "air-track-bench":
      return <AirTrackBench />;
    case "circuit-bench":
      return <CircuitBench />;
    case "motion-grapher":
      return <MotionGrapher />;
    case "report-studio":
      return <ReportStudio />;
    case "projectile-bench":
      return <ProjectileBench />;
    case "incline-bench":
      return <InclineBench />;
    case "grating-bench":
      return <GratingBench />;
    case "electron-rings":
      return <ElectronRings />;
    case "photoelectric-bench":
      return <PhotoelectricBench />;
    case "charge-mass-bench":
      return <ChargeMassBench />;
    case "inertia-bench":
      return <InertiaBench />;
    case "bridge-bench":
      return <BridgeBench />;
    case "current-balance":
      return <CurrentBalance />;
    case "venturi-bench":
      return <VenturiBench />;
    case "elasticity-bench":
      return <ElasticityBench />;
  }
}

function ProjectileBench() {
  const [speed, setSpeed] = useState(12);
  const [angle, setAngle] = useState(40);
  const [height, setHeight] = useState(1);
  const [percent, setPercent] = useState(50);
  const model = projectileTrial(speed, angle, height);
  const cursor = (model.flightTime * percent) / 100;
  const samples = Array.from({ length: 101 }, (_, index) => {
    const time = (model.flightTime * index) / 100;
    return { x: model.vx * time, y: Math.max(0, model.heightAt(time)), dx: 0, dy: 0 };
  });
  return (
    <Workshop title="Projectile launch bench">
      <p>
        Model a point object launched above a level landing surface with negligible drag and uniform
        gravity. Each graph rescales to the current trajectory.
      </p>
      <Slider
        label="Launch speed"
        unit="m/s"
        min={4}
        max={24}
        step={1}
        value={speed}
        change={setSpeed}
      />
      <Slider
        label="Launch angle"
        unit="°"
        min={10}
        max={75}
        step={1}
        value={angle}
        change={setAngle}
      />
      <Slider
        label="Launch height"
        unit="m"
        min={0}
        max={8}
        step={0.5}
        value={height}
        change={setHeight}
      />
      <Slider
        label="Flight cursor"
        unit="%"
        min={0}
        max={100}
        step={1}
        value={percent}
        change={setPercent}
      />
      <Scatter
        points={samples}
        xLabel="Horizontal position (m)"
        yLabel="Height (m)"
        cursor={model.vx * cursor}
      />
      <p>
        At {cursor.toFixed(2)} s the height is {Math.max(0, model.heightAt(cursor)).toFixed(2)} m.
        Range {model.range.toFixed(2)} m. Peak height {model.peak.toFixed(2)} m.
      </p>
    </Workshop>
  );
}

function InclineBench() {
  const [angle, setAngle] = useState(20);
  const [coefficient, setCoefficient] = useState(0.4);
  const trial = inclineTrial(2, angle, coefficient, coefficient * 0.8);
  return (
    <Workshop title="Incline and friction bench">
      <p>
        Release a 2 kg block from rest. Friction points uphill in this model. The kinetic
        coefficient is 80% of the selected static coefficient.
      </p>
      <svg
        viewBox="0 0 360 200"
        role="img"
        aria-label="Free-body diagram with weight downward, normal perpendicular to the slope and friction uphill"
      >
        <g transform={`translate(180 116) rotate(${-angle})`} stroke="currentColor" fill="none">
          <path d="M-92 20H92" />
          <rect x="-18" y="-18" width="36" height="36" rx="3" />
          <path d="M0 -19v-65m-5 6 5-6 5 6 M18 0h53m-6-5 6 5-6 5" />
          <text x="8" y="-74" stroke="none" fill="currentColor">
            N
          </text>
          <text x="45" y="-8" stroke="none" fill="currentColor">
            Friction
          </text>
        </g>
        <path d="M180 117v61m-5-6 5 6 5-6" stroke="currentColor" fill="none" />
        <text x="190" y="177" fill="currentColor">
          Weight
        </text>
      </svg>
      <Slider
        label="Slope angle"
        unit="°"
        min={5}
        max={50}
        step={1}
        value={angle}
        change={setAngle}
      />
      <Slider
        label="Static friction coefficient"
        unit=""
        min={0.1}
        max={0.8}
        step={0.05}
        value={coefficient}
        change={setCoefficient}
      />
      <p>
        Normal force {trial.normal.toFixed(2)} N. Uphill friction {trial.friction.toFixed(2)} N. The
        block {trial.slides ? "slides" : "stays at rest"}. Downslope acceleration{" "}
        {trial.acceleration.toFixed(2)} m/s².
      </p>
    </Workshop>
  );
}

function GratingBench() {
  const [density, setDensity] = useState(600);
  const [wavelength, setWavelength] = useState(589);
  const [order, setOrder] = useState(1);
  const angle = gratingOrderAngle(density, wavelength, order);
  const radians = ((angle ?? 0) * Math.PI) / 180;
  return (
    <Workshop title="Diffraction grating bench">
      <p>
        Simulated normally incident light and ideal grating. The two spots are the symmetric
        positive and negative orders.
      </p>
      <svg
        viewBox="0 0 360 155"
        role="img"
        aria-label="Grating at the centre with a straight reference ray and two symmetric diffraction orders"
      >
        <path d="M20 77h320 M125 54v46" stroke="currentColor" fill="none" />
        {angle !== null &&
          [-1, 1].map((side) => (
            <line
              key={side}
              x1="125"
              y1="77"
              x2={125 + 67 * Math.cos(radians)}
              y2={77 + side * 67 * Math.sin(radians)}
              stroke="currentColor"
              strokeWidth="3"
            />
          ))}
        <text x="25" y="64" fill="currentColor">
          Incident beam
        </text>
        <text x="204" y="102" fill="currentColor">
          Zero-order axis
        </text>
      </svg>
      <label>
        Grooves per mm{" "}
        <select value={density} onChange={(event) => setDensity(Number(event.target.value))}>
          <option value="300">300</option>
          <option value="600">600</option>
        </select>
      </label>
      <Slider
        label="Wavelength"
        unit="nm"
        min={400}
        max={700}
        step={1}
        value={wavelength}
        change={setWavelength}
      />
      <Slider
        label="Order magnitude"
        unit=""
        min={1}
        max={5}
        step={1}
        value={order}
        change={setOrder}
      />
      <p>
        {angle === null
          ? "This order has no propagating ray. The required sine exceeds one."
          : `Simulated readings: ${angle.toFixed(2)}° to either side. The rays are separated by ${(2 * angle).toFixed(2)}°.`}
      </p>
    </Workshop>
  );
}

function ElectronRings() {
  const [voltage, setVoltage] = useState(3000);
  const outer = electronRingDiameter(voltage, 0.135, 0.123e-9);
  const inner = electronRingDiameter(voltage, 0.135, 0.213e-9);
  return (
    <Workshop title="Electron diffraction screen">
      <p>
        Simulated graphite screen, 0.135 m from the target. The model uses nonrelativistic electrons
        and the small-angle approximation.
      </p>
      <Slider
        label="Accelerating voltage"
        unit="V"
        min={2000}
        max={5000}
        step={100}
        value={voltage}
        change={setVoltage}
      />
      <svg
        viewBox="0 0 360 180"
        role="img"
        aria-label="A central spot and two concentric diffraction rings"
      >
        <circle cx="180" cy="90" r="79" stroke="currentColor" fill="none" />
        {[inner, outer].map((diameter) => (
          <circle
            key={diameter}
            cx="180"
            cy="90"
            r={diameter * 1120}
            stroke="currentColor"
            fill="none"
          />
        ))}
        <circle cx="180" cy="90" r="2" fill="currentColor" />
      </svg>
      <p>
        Inner diameter {(inner * 1000).toFixed(2)} mm. Outer diameter {(outer * 1000).toFixed(2)}{" "}
        mm. Inverse square root of voltage {(1 / Math.sqrt(voltage)).toFixed(5)} V⁻¹ᐟ².
      </p>
    </Workshop>
  );
}

function PhotoelectricBench() {
  const [wavelength, setWavelength] = useState(436);
  const [work, setWork] = useState(2.3);
  const result = photoelectricTrial(wavelength, work);
  const threshold = (photoelectricTrial(365, work).energyEv * 365) / work;
  const points = Array.from({ length: 61 }, (_, i) => i / 60).map((fraction) => {
    const reading = photoelectricTrial(threshold + fraction * (365 - threshold), work);
    return { x: reading.frequency / 1e14, y: reading.stoppingVoltage ?? 0, dx: 0, dy: 0 };
  });
  return (
    <Workshop title="Photoelectric threshold bench">
      <p>
        Choose a monochromatic wavelength and a virtual cathode. The graph shows the ideal
        straight-line region where emission is possible.
      </p>
      <label>
        Wavelength{" "}
        <select value={wavelength} onChange={(event) => setWavelength(Number(event.target.value))}>
          {[365, 405, 436, 546, 577].map((value) => (
            <option key={value} value={value}>
              {value} nm
            </option>
          ))}
        </select>
      </label>
      <Slider
        label="Work function"
        unit="eV"
        min={1.5}
        max={3}
        step={0.1}
        value={work}
        change={setWork}
      />
      <Scatter points={points} xLabel="Frequency (10¹⁴ Hz)" yLabel="Stopping potential (V)" trend />
      <p>
        Threshold wavelength {threshold.toFixed(0)} nm.{" "}
        {result.stoppingVoltage === null
          ? "No photoelectrons in this one-photon model."
          : `Ideal stopping potential ${result.stoppingVoltage.toFixed(3)} V.`}
      </p>
    </Workshop>
  );
}

function ChargeMassBench() {
  const [voltage, setVoltage] = useState(160);
  const [field, setField] = useState(0.9);
  const radius = electronOrbit(voltage, field);
  const scale = 550;
  return (
    <Workshop title="Electron charge-to-mass bench">
      <p>
        Simulated sideways view of an electron trajectory in a uniform field perpendicular to the
        velocity. Line length is illustrative.
      </p>
      <Slider
        label="Accelerating voltage"
        unit="V"
        min={80}
        max={260}
        step={10}
        value={voltage}
        change={setVoltage}
      />
      <Slider
        label="Magnetic field"
        unit="mT"
        min={0.65}
        max={1.5}
        step={0.05}
        value={field}
        change={setField}
      />
      <svg
        viewBox="0 0 360 160"
        role="img"
        aria-label="Circular beam with a radial measurement from the orbit centre"
      >
        <circle
          cx="180"
          cy="80"
          r={radius * scale}
          stroke="currentColor"
          fill="none"
          strokeWidth="3"
        />
        <path d={`M180 80h${radius * scale}`} stroke="currentColor" strokeDasharray="3 3" />
        <text x="184" y="74" fill="currentColor">
          r
        </text>
      </svg>
      <p>
        Simulated beam radius {(radius * 100).toFixed(2)} cm. Use field in tesla and radius in
        metres in the charge-to-mass calculation.
      </p>
    </Workshop>
  );
}

function InertiaBench() {
  const [type, setType] = useState<"ring" | "disk" | "sphere">("disk");
  const [radius, setRadius] = useState(0.5);
  const [mass, setMass] = useState(2);
  const inertia = rotationalInertia(type, mass, radius);
  const size = 42 + radius * 45;
  return (
    <Workshop title="Moment of inertia bench">
      <p>
        Compare objects of equal mass and outer radius about the displayed symmetry axis. The ring
        is thin and the disk and sphere are uniform.
      </p>
      <label>
        Shape{" "}
        <select
          value={type}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "ring" || value === "disk" || value === "sphere") setType(value);
          }}
        >
          <option value="ring">Thin ring</option>
          <option value="disk">Solid disk</option>
          <option value="sphere">Solid sphere</option>
        </select>
      </label>
      <Slider label="Mass" unit="kg" min={0.5} max={10} step={0.5} value={mass} change={setMass} />
      <Slider
        label="Outer radius"
        unit="m"
        min={0.1}
        max={1}
        step={0.1}
        value={radius}
        change={setRadius}
      />
      <svg
        viewBox="0 0 360 210"
        role="img"
        aria-label={`Schematic of a ${type} with a marked symmetry axis`}
      >
        <ellipse
          cx="170"
          cy="106"
          rx={size}
          ry={type === "sphere" ? size : size / 3}
          stroke="currentColor"
          fill="none"
          strokeWidth={type === "ring" ? 4 : 2}
        />
        {type !== "disk" && type !== "ring" && (
          <ellipse
            cx="170"
            cy="106"
            rx={size}
            ry={size / 3}
            stroke="currentColor"
            fill="none"
            strokeDasharray="3 3"
          />
        )}
        <path d="M170 11v189" stroke="currentColor" strokeDasharray="5 3" />
        <text x="177" y="27" fill="currentColor">
          Axis
        </text>
      </svg>
      <p>
        Moment of inertia {inertia.toFixed(3)} kg·m². At 1 N·m net torque, angular acceleration{" "}
        {(1 / inertia).toFixed(2)} rad/s².
      </p>
    </Workshop>
  );
}

function BridgeBench() {
  const [mode, setMode] = useState("bridge");
  const [contact, setContact] = useState(40);
  const [standard, setStandard] = useState(10);
  const signal = mode === "bridge" ? bridgeSignal(contact, 12, standard) : contact - 65;
  const angle = Math.max(-60, Math.min(60, signal * 3));
  return (
    <Workshop title="Slide-wire null detector">
      <p>
        This ideal model uses a uniform 100 cm wire. Move the contact until the signed indicator
        reads zero to the shown precision. The needle is qualitative.
      </p>
      <label>
        Method{" "}
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="bridge">Meter bridge</option>
          <option value="potential">Potentiometer · 0.020 V/cm</option>
        </select>
      </label>
      {mode === "bridge" && (
        <Slider
          label="Standard resistance"
          unit="Ω"
          min={4}
          max={24}
          step={1}
          value={standard}
          change={setStandard}
        />
      )}
      <Slider
        label="Contact from left end"
        unit="cm"
        min={1}
        max={99}
        step={0.1}
        value={contact}
        change={setContact}
      />
      <svg
        viewBox="0 0 360 130"
        role="img"
        aria-label="Galvanometer needle above a slide-wire and movable contact"
      >
        <path
          d="M145 60a35 35 0 0 1 70 0 M180 23v9 M35 100h290 M35 94v12 M325 94v12"
          fill="none"
          stroke="currentColor"
        />
        <line
          x1="180"
          x2="180"
          y1="60"
          y2="28"
          stroke="currentColor"
          strokeWidth="2"
          transform={`rotate(${angle} 180 60)`}
        />
        <path d={`M${35 + 2.9 * contact} 100v-18`} stroke="currentColor" strokeWidth="4" />
        <text x="28" y="123" fill="currentColor">
          0
        </text>
        <text x="296" y="123" fill="currentColor">
          100 cm
        </text>
      </svg>
      <p>
        Simulated indicator {signal.toFixed(1)} scale units.{" "}
        {Math.abs(signal) < 0.05 &&
          (mode === "bridge"
            ? `Balanced estimate ${((standard * contact) / (100 - contact)).toFixed(2)} Ω.`
            : `Balanced voltage ${(0.02 * contact).toFixed(2)} V.`)}
      </p>
    </Workshop>
  );
}

function CurrentBalance() {
  const [current, setCurrent] = useState(4);
  const [separation, setSeparation] = useState(3);
  const length = 0.25;
  const trial = parallelWireForce(current, separation / 1000, length);
  return (
    <Workshop title="Parallel-wire current balance">
      <p>
        Simulated wires carry equal currents in the same direction. The ideal calculation uses a
        0.25 m active length within the long, parallel part of the wires.
      </p>
      <Slider
        label="Current in each wire"
        unit="A"
        min={0}
        max={10}
        step={0.5}
        value={current}
        change={setCurrent}
      />
      <Slider
        label="Wire separation"
        unit="mm"
        min={2}
        max={10}
        step={0.5}
        value={separation}
        change={setSeparation}
      />
      <Scatter
        cursor={current ** 2}
        points={Array.from({ length: 21 }, (_, i) => ({
          x: (i / 2) ** 2,
          y: 1000 * parallelWireForce(i / 2, separation / 1000, length),
          dx: 0,
          dy: 0,
        }))}
        xLabel="Squared current (A²)"
        yLabel="Attractive force (mN)"
      />
      <p>Simulated force {(1000 * trial).toFixed(3)} mN.</p>
    </Workshop>
  );
}

function VenturiBench() {
  const [throat, setThroat] = useState(3);
  const [velocity, setVelocity] = useState(1.5);
  const result = venturiTrial(5, throat, velocity);
  return (
    <Workshop title="Venturi flow bench">
      <p>
        Water flows steadily through a horizontal ideal tube. The width shown is schematic. The
        calculation uses circular cross-sections.
      </p>
      <Slider
        label="Throat radius"
        unit="cm"
        min={2}
        max={5}
        step={0.5}
        value={throat}
        change={setThroat}
      />
      <Slider
        label="Inlet speed"
        unit="m/s"
        min={0.5}
        max={3}
        step={0.25}
        value={velocity}
        change={setVelocity}
      />
      <svg
        viewBox="0 0 360 140"
        role="img"
        aria-label="Wide inlet, narrower throat, and three streamline arrows"
      >
        <path
          d={`M22 39H100L150 ${70 - 6 * throat}H220L270 39h68 M22 101H100L150 ${70 + 6 * throat}H220L270 101h68 M48 70h52m-7-5 7 5-7 5 M154 70h61m-7-5 7 5-7 5 M267 70h54m-7-5 7 5-7 5`}
          fill="none"
          stroke="currentColor"
        />
        <text x="40" y="126" fill="currentColor">
          Inlet
        </text>
        <text x="156" y="126" fill="currentColor">
          Throat
        </text>
      </svg>
      <p>
        Throat speed {result.throatSpeed.toFixed(2)} m/s. Inlet pressure exceeds throat pressure by{" "}
        {(result.drop / 1000).toFixed(2)} kPa in this ideal model.
      </p>
    </Workshop>
  );
}

function ElasticityBench() {
  const [force, setForce] = useState(60);
  const [area, setArea] = useState(2);
  const extension = axialExtension(force, 1, area * 1e-6, 70e9);
  return (
    <Workshop title="Axial elasticity bench">
      <p>
        Compare a uniform 1 m specimen at a Young’s modulus of 70 GPa. The line is the
        constant-modulus model for small elastic strain.
      </p>
      <Slider
        label="Axial force"
        unit="N"
        min={0}
        max={100}
        step={5}
        value={force}
        change={setForce}
      />
      <Slider
        label="Cross-sectional area"
        unit="mm²"
        min={1}
        max={5}
        step={0.5}
        value={area}
        change={setArea}
      />
      <Scatter
        cursor={force}
        points={Array.from({ length: 21 }, (_, i) => ({
          x: 5 * i,
          y: 1000 * axialExtension(5 * i, 1, area * 1e-6, 70e9),
          dx: 0,
          dy: 0,
        }))}
        xLabel="Force (N)"
        yLabel="Extension (mm)"
      />
      <p>
        Extension {(1000 * extension).toFixed(3)} mm. Axial stress {(force / area).toFixed(1)} MPa.
      </p>
    </Workshop>
  );
}
