type CurveModel = {
  title: string;
  formula: string;
  intervals: readonly (readonly [number, number])[];
  bounds: readonly [number, number];
  yMax: number;
  at: (x: number) => number;
  slope?: (x: number) => number;
  reference?: (x: number) => number;
  readout: string;
};

export const calculusCurves = {
  asymptote: { title: "Approach an asymptote from both sides", formula: "y = 2 + 1/(x − 1)", intervals: [[-4, 0.85], [1.15, 5]], bounds: [-4, 5], yMax: 7, at: (x) => 2 + 1 / (x - 1), reference: () => 2, readout: "The curve approaches y = 2 far from the pole. x = 1 divides the domain." },
  hole: { title: "Compare the two sides of a missing value", formula: "(x² − 4)/(x − 2) = x + 2 for x ≠ 2", intervals: [[-2, 1.98], [2.02, 4]], bounds: [-2, 4], yMax: 7, at: (x) => x + 2, readout: "Both branches approach 4 at x = 2. The original expression has no value there." },
  existence: { title: "Find a crossing without solving the equation", formula: "y = x³ + x − 2", intervals: [[-1.5, 2]], bounds: [-1.5, 2], yMax: 10, at: (x) => x ** 3 + x - 2, slope: (x) => 3 * x * x + 1, readout: "Continuity turns opposite endpoint signs into existence. A positive derivative throughout establishes uniqueness." },
  product: { title: "Watch two varying factors shape the tangent", formula: "y = x(x² − 1)", intervals: [[-2, 2]], bounds: [-2, 2], yMax: 6, at: (x) => x * (x * x - 1), slope: (x) => (x * x - 1) + 2 * x * x, readout: "Both factors contribute to the derivative. At x = 1 the product vanishes while the slope is 2." },
  corner: { title: "Compare slopes on either side of a corner", formula: "y = |x|", intervals: [[-3, 0], [0, 3]], bounds: [-3, 3], yMax: 4, at: Math.abs, slope: (x) => x === 0 ? NaN : Math.sign(x), readout: "At zero the one-sided slopes disagree. The full curve remains continuous." },
  tangent: { title: "Compare a tangent prediction with the curve", formula: "y = x², tangent at (1, 1): y = 2x − 1", intervals: [[-1, 3]], bounds: [-1, 3], yMax: 9, at: (x) => x * x, reference: (x) => 2 * x - 1, readout: "The prediction error is (x − 1)². Doubling the distance from 1 multiplies the error by four." },
  implicit: { title: "Track a circle’s tangent to its vertical boundary", formula: "x² + y² = 9, upper branch", intervals: [[-3, 3]], bounds: [-3, 3], yMax: 4, at: (x) => Math.sqrt(9 - x * x), slope: (x) => -x / Math.sqrt(9 - x * x), readout: "The relation gives y′ = −x/y on the upper branch where y > 0. At the endpoints the circle has a vertical tangent." },
  related: { title: "Track the area produced by a growing radius", formula: "A = πr², for r ≥ 0", intervals: [[0, 3]], bounds: [0, 3], yMax: 30, at: (x) => Math.PI * x * x, slope: (x) => 2 * Math.PI * x, readout: "If the radius increases at one unit per second, the area rate equals the readout for the slope. Larger radii produce larger area changes per unit of radius." },
  chain: { title: "Track a sign change through a composite function", formula: "y = (x² − 1)²", intervals: [[-2, 2]], bounds: [-2, 2], yMax: 9, at: (x) => (x * x - 1) ** 2, slope: (x) => 4 * x * (x * x - 1), readout: "A zero derivative can come from either factor. Pass through zero and compare slope signs on both sides." },
  extrema: { title: "Compare endpoints and stationary points", formula: "y = x³ − 3x on [−2, 2]", intervals: [[-2, 2]], bounds: [-2, 2], yMax: 4, at: (x) => x ** 3 - 3 * x, slope: (x) => 3 * x * x - 3, readout: "The interior candidates x = ±1 have zero slope. Compare their values with both endpoints for global extrema." },
  concavity: { title: "Compare slope with change in slope", formula: "y = x³", intervals: [[-2, 2]], bounds: [-2, 2], yMax: 8, at: (x) => x ** 3, slope: (x) => 3 * x * x, readout: "The slope is nonnegative on both sides. The graph switches from concave down to concave up at zero." },
  mean: { title: "Find a tangent parallel to a secant", formula: "y = x² on [0, 3]", intervals: [[0, 3]], bounds: [0, 3], yMax: 10, at: (x) => x * x, slope: (x) => 2 * x, reference: (x) => 3 * x, readout: "The secant slope is 3. Matching it with 2x gives the interior point x = 1.5." },
  optimise: { title: "Track area under a fixed perimeter", formula: "A(w) = w(8 − w), for 0 ≤ w ≤ 8", intervals: [[0, 8]], bounds: [0, 8], yMax: 18, at: (x) => x * (8 - x), slope: (x) => 8 - 2 * x, readout: "The slope changes from positive to negative at w = 4. Compare the area there with both degenerate endpoints." },
  fundamental: { title: "Compare accumulation and its instantaneous rate", formula: "F(x) = ∫₀ˣ 2t dt = x²", intervals: [[0, 3]], bounds: [0, 3], yMax: 10, at: (x) => x * x, slope: (x) => 2 * x, reference: (x) => 2 * x, readout: "The tangent slope on the accumulated area F equals the height of the integrand 2x at the current upper bound." },
  substitution: { title: "Track new bounds under substitution", formula: "u = 1 + x² for 0 ≤ x ≤ 2", intervals: [[0, 2]], bounds: [0, 2], yMax: 6, at: (x) => 1 + x * x, slope: (x) => 2 * x, readout: "The x endpoints 0 and 2 correspond to u endpoints 1 and 5. The factor 2x dx is du." },
  accumulation: { title: "Watch signed accumulation reverse direction", formula: "F(x) = ∫₀ˣ cos(t) dt = sin(x)", intervals: [[0, 6.3]], bounds: [0, 6.3], yMax: 1.35, at: Math.sin, slope: Math.cos, reference: Math.cos, readout: "The accumulation rises when cos(x) is positive and falls when it is negative. Angle values are in radians." },
} satisfies Record<string, CurveModel>;

export type CalculusCurveId = keyof typeof calculusCurves;
export function calculusCurve(id: CalculusCurveId): CurveModel { return calculusCurves[id]; }
