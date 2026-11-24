export const physicsWorkshopIds = [
  "instrument-bench",
  "regression-studio",
  "pendulum-bench",
  "centripetal-bench",
  "air-track-bench",
  "circuit-bench",
  "motion-grapher",
  "report-studio",
  "projectile-bench",
  "incline-bench",
  "grating-bench",
  "electron-rings",
  "photoelectric-bench",
  "charge-mass-bench",
  "inertia-bench",
  "bridge-bench",
  "current-balance",
  "venturi-bench",
  "elasticity-bench",
] as const;

export type PhysicsWorkshopId = (typeof physicsWorkshopIds)[number];
export type Measurement = { x: number; y: number; dx: number; dy: number };

export function linearFit(points: readonly Measurement[]) {
  const n = points.length;
  if (n < 3) return null;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const xx = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const yy = points.reduce((sum, p) => sum + (p.y - meanY) ** 2, 0);
  const xy = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  if (xx === 0) return null;
  const slope = xy / xx;
  const intercept = meanY - slope * meanX;
  const squaredResiduals = points.reduce(
    (sum, p) => sum + (p.y - (meanY + slope * (p.x - meanX))) ** 2,
    0,
  );
  const result = {
    slope,
    intercept,
    slopeError: Math.sqrt(squaredResiduals / (n - 2) / xx),
    rSquared: yy > 0 ? Math.max(0, Math.min(1, 1 - squaredResiduals / yy)) : null,
  };
  return Object.values(result).every((value) => value === null || Number.isFinite(value))
    ? result
    : null;
}

export const standardGravity = 9.80665;
const planck = 6.62607015e-34;
const speedOfLight = 299792458;
const electronMass = 9.1093837139e-31;
const elementaryCharge = 1.602176634e-19;

export function pendulumTrial(length: number, gravity = standardGravity) {
  const period = 2 * Math.PI * Math.sqrt(length / gravity);
  return { period, squaredPeriod: period ** 2, timeForTwenty: period * 20 };
}

export function circularTrial(mass: number, radius: number, angularSpeed: number) {
  const acceleration = angularSpeed ** 2 * radius;
  return { speed: angularSpeed * radius, acceleration, force: mass * acceleration };
}

export function gliderCollision(massA: number, massB: number, speedA: number, elastic: boolean) {
  const momentum = massA * speedA;
  const centreSpeed = momentum / (massA + massB);
  const velocityA = elastic ? ((massA - massB) * speedA) / (massA + massB) : centreSpeed;
  const velocityB = elastic ? 2 * centreSpeed : centreSpeed;
  const beforeEnergy = (massA * speedA ** 2) / 2;
  const afterEnergy = (massA * velocityA ** 2 + massB * velocityB ** 2) / 2;
  return { velocityA, velocityB, momentum, beforeEnergy, afterEnergy };
}

export function dcCellTrial(emf: number, internalResistance: number, load: number) {
  const current = emf / (load + internalResistance);
  return { current, terminalVoltage: current * load, internalDrop: current * internalResistance };
}

export function straightLineMotion(initialVelocity: number, acceleration: number, time: number) {
  return {
    position: initialVelocity * time + 0.5 * acceleration * time ** 2,
    velocity: initialVelocity + acceleration * time,
    acceleration,
  };
}

export function instrumentReading(
  body: number,
  divisions: number,
  resolution: number,
  zero: number,
) {
  const indicated = body + divisions * resolution;
  return { indicated, corrected: indicated - zero };
}

export function projectileTrial(
  speed: number,
  angle: number,
  height: number,
  gravity = standardGravity,
) {
  const radians = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(radians);
  const vy = speed * Math.sin(radians);
  const flightTime = (vy + Math.sqrt(vy ** 2 + 2 * gravity * height)) / gravity;
  return {
    vx,
    vy,
    flightTime,
    range: vx * flightTime,
    peak: height + vy ** 2 / (2 * gravity),
    heightAt: (t: number) => height + vy * t - 0.5 * gravity * t ** 2,
  };
}

export function inclineTrial(
  mass: number,
  angle: number,
  staticCoefficient: number,
  kineticCoefficient: number,
) {
  const radians = (angle * Math.PI) / 180;
  const weight = mass * standardGravity;
  const normal = weight * Math.cos(radians);
  const downslope = weight * Math.sin(radians);
  const staticLimit = staticCoefficient * normal;
  const slides = downslope > staticLimit;
  const friction = slides ? kineticCoefficient * normal : downslope;
  return {
    weight,
    normal,
    downslope,
    staticLimit,
    slides,
    friction,
    acceleration: (downslope - friction) / mass,
  };
}

export function gratingOrderAngle(linesPerMillimetre: number, wavelengthNm: number, order: number) {
  const sine = order * wavelengthNm * linesPerMillimetre * 1e-6;
  return Math.abs(sine) <= 1 ? (Math.asin(sine) * 180) / Math.PI : null;
}

export function electronRingDiameter(
  voltage: number,
  screenDistance: number,
  latticeSpacing: number,
) {
  const wavelength = planck / Math.sqrt(2 * electronMass * elementaryCharge * voltage);
  return (2 * screenDistance * wavelength) / latticeSpacing;
}

export function photoelectricTrial(wavelengthNm: number, workFunctionEv: number) {
  const frequency = speedOfLight / (wavelengthNm * 1e-9);
  const energyEv = (planck * frequency) / elementaryCharge;
  return {
    frequency,
    energyEv,
    stoppingVoltage: energyEv >= workFunctionEv ? energyEv - workFunctionEv : null,
  };
}

export function electronOrbit(voltage: number, fieldMillitesla: number) {
  const field = fieldMillitesla * 1e-3;
  return Math.sqrt((2 * electronMass * voltage) / elementaryCharge) / field;
}

export function rotationalInertia(type: "ring" | "disk" | "sphere", mass: number, radius: number) {
  return { ring: 1, disk: 0.5, sphere: 0.4 }[type] * mass * radius ** 2;
}

export function bridgeSignal(contact: number, unknown: number, standard: number) {
  return contact - (100 * unknown) / (unknown + standard);
}

export function parallelWireForce(current: number, separation: number, activeLength: number) {
  // Nominal permeability for this ideal two-long-wire model.
  return (2e-7 * current ** 2 * activeLength) / separation;
}

export function venturiTrial(inletRadius: number, throatRadius: number, inletSpeed: number) {
  const throatSpeed = inletSpeed * (inletRadius / throatRadius) ** 2;
  return { throatSpeed, drop: 0.5 * 1000 * (throatSpeed ** 2 - inletSpeed ** 2) };
}

export function axialExtension(force: number, length: number, area: number, youngsModulus: number) {
  return (force * length) / (area * youngsModulus);
}
