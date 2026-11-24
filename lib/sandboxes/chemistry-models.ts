export const idealGasConstant = 0.082057; // L atm mol⁻¹ K⁻¹

export function reactionExtent(availableA: number, availableB: number) {
  const capacityA = availableA / 2;
  const capacityB = availableB / 3;
  const extent = Math.min(capacityA, capacityB);
  return {
    extent,
    limiting:
      capacityA === capacityB ? null : capacityA < capacityB ? ("A" as const) : ("B" as const),
    remainingA: Math.max(0, availableA - 2 * extent),
    remainingB: Math.max(0, availableB - 3 * extent),
    product: extent,
  };
}

export function dilution(volume: number) {
  const amount = 0.1;
  return { amount, concentration: amount / volume };
}

// Fixed temperature and volume. Use a reversible first-order A ⇌ B example
// with k_forward / k_reverse = 2 and total concentration scaled to one.
export function equilibriumModel(qOverK: number, equilibriumConstant = 2) {
  const q = equilibriumConstant * qOverK;
  const fractionA = 1 / (1 + q);
  const fractionB = q / (1 + q);
  return {
    fractionA,
    fractionB,
    forward: equilibriumConstant * fractionA,
    reverse: fractionB,
    direction:
      qOverK === 1
        ? ("balanced" as const)
        : qOverK < 1
          ? ("forward" as const)
          : ("reverse" as const),
  };
}

export function gasVolume(pressure: number, temperature: number, moles = 1) {
  return (moles * idealGasConstant * temperature) / pressure;
}

// Time is expressed in relaxation time constants for the reversible first-order model.
export function equilibriumQuotientAfter(startingQ: number, k: number, elapsed: number) {
  const equilibriumB = k / (1 + k);
  const initialB = startingQ / (1 + startingQ);
  const fractionB = equilibriumB + (initialB - equilibriumB) * Math.exp(-elapsed);
  return fractionB / (1 - fractionB);
}

export function pOrbitalOccupancy(electrons: number) {
  if (!Number.isInteger(electrons) || electrons < 0 || electrons > 6)
    throw new RangeError("An isolated p subshell has space for zero to six electrons.");
  return Array.from({ length: 3 }, (_, i) => (electrons > i + 3 ? 2 : electrons > i ? 1 : 0));
}
