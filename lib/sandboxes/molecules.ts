type Vector = readonly [number, number, number];
type Molecule = {
  label: string;
  central: string;
  terminal: string;
  geometry: string;
  electronGeometry: string;
  angle: string;
  bonds: Vector[];
  lonePairs: Vector[];
  dipoles: "inward" | "outward" | "omitted";
  interpretation: string;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;
function ring(count: number, height = 0): Vector[] {
  const radius = Math.sqrt(1 - height ** 2);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count;
    return [radius * Math.cos(angle), radius * Math.sin(angle), height];
  });
}
const ammoniaHeight = -Math.sqrt((Math.cos(radians(107)) + 0.5) / 1.5);
const waterHalfAngle = radians(104.5 / 2);

// Idealized or rounded gas-phase shapes. Vectors encode directions, not bond lengths.
export const molecules = {
  carbonDioxide: {
    label: "Carbon dioxide",
    central: "C",
    terminal: "O",
    geometry: "Linear",
    electronGeometry: "Linear",
    angle: "180° · ideal",
    bonds: [
      [1, 0, 0],
      [-1, 0, 0],
    ],
    lonePairs: [],
    dipoles: "outward",
    interpretation: "Equal bond dipoles point towards the two oxygens and cancel.",
  },
  boronTrifluoride: {
    label: "Boron trifluoride",
    central: "B",
    terminal: "F",
    geometry: "Trigonal planar",
    electronGeometry: "Trigonal planar",
    angle: "120° · ideal",
    bonds: ring(3),
    lonePairs: [],
    dipoles: "outward",
    interpretation: "Three equivalent B–F dipoles cancel in the planar triangle.",
  },
  methane: {
    label: "Methane",
    central: "C",
    terminal: "H",
    geometry: "Tetrahedral",
    electronGeometry: "Tetrahedral",
    angle: "109.5° · ideal, rounded",
    bonds: [[0, 0, 1], ...ring(3, -1 / 3)],
    lonePairs: [],
    dipoles: "omitted",
    interpretation:
      "Tetrahedral symmetry gives no net dipole. The diagram omits the weak C–H dipoles.",
  },
  ammonia: {
    label: "Ammonia",
    central: "N",
    terminal: "H",
    geometry: "Trigonal pyramidal",
    electronGeometry: "Tetrahedral",
    angle: "107° · approximate",
    bonds: ring(3, ammoniaHeight),
    lonePairs: [[0, 0, 1]],
    dipoles: "inward",
    interpretation:
      "The N–H dipoles have a net component towards the nitrogen end of the molecule.",
  },
  water: {
    label: "Water",
    central: "O",
    terminal: "H",
    geometry: "Bent",
    electronGeometry: "Tetrahedral",
    angle: "104.5° · approximate",
    bonds: [
      [Math.sin(waterHalfAngle), 0, -Math.cos(waterHalfAngle)],
      [-Math.sin(waterHalfAngle), 0, -Math.cos(waterHalfAngle)],
    ],
    lonePairs: [
      [0, Math.sqrt(2 / 3), Math.sqrt(1 / 3)],
      [0, -Math.sqrt(2 / 3), Math.sqrt(1 / 3)],
    ],
    dipoles: "inward",
    interpretation:
      "The O–H dipoles have a net component along the bisector towards the oxygen end.",
  },
} satisfies Record<string, Molecule>;

export function projectBond([x, y, z]: Vector, rotation: number) {
  const yaw = radians(rotation);
  const tilt = radians(28);
  const horizontal = x * Math.cos(yaw) - y * Math.sin(yaw);
  const side = x * Math.sin(yaw) + y * Math.cos(yaw);
  return {
    x: 120 + 72 * horizontal,
    y: 88 - 72 * (z * Math.cos(tilt) - side * Math.sin(tilt)),
    depth: side * Math.cos(tilt) + z * Math.sin(tilt),
  };
}
