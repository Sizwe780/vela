export type Formula = {
  topic: string;
  name: string;
  latex: string;
  note: string;
  modules: string[];
  extension?: boolean;
};
const matrix = ["MAT1503"],
  calculus = ["MAT1512"],
  mechanics = ["PHY1505", "PHY1503"],
  electric = ["PHY1506", "PHY1503"],
  chemistry = ["CHE1501", "CHE1503"];
export const formulas: Formula[] = [
  {
    topic: "Linear systems",
    name: "Augmented system",
    latex: String.raw`A\mathbf{x}=\mathbf{b}`,
    note: "Keep the variable order consistent; check by substitution.",
    modules: matrix,
  },
  {
    topic: "Matrices",
    name: "Two-by-two determinant",
    latex: String.raw`\det\begin{pmatrix}a&b\\c&d\end{pmatrix}=ad-bc`,
    note: "A nonzero determinant is required for an inverse.",
    modules: matrix,
  },
  {
    topic: "Matrices",
    name: "Two-by-two inverse",
    latex: String.raw`A^{-1}=\frac{1}{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}`,
    note: "Only when ad−bc ≠ 0.",
    modules: matrix,
  },
  {
    topic: "Vectors",
    name: "Dot and cross products",
    latex: String.raw`\mathbf{a}\cdot\mathbf{b}=\sum_i a_i b_i,\qquad\mathbf{a}\times\mathbf{b}=\begin{pmatrix}a_2b_3-a_3b_2\\a_3b_1-a_1b_3\\a_1b_2-a_2b_1\end{pmatrix}`,
    note: "The cross product here is for three-dimensional vectors.",
    modules: matrix,
  },
  {
    topic: "Limits",
    name: "Derivative from first principles",
    latex: String.raw`f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}{h}`,
    note: "The limit must exist; h ≠ 0 before taking the limit.",
    modules: calculus,
  },
  {
    topic: "Derivatives",
    name: "Power, product and chain rules",
    latex: String.raw`\frac{d}{dx}x^n=nx^{n-1},\quad(uv)'=u'v+uv',\quad(f\circ g)'=f'(g(x))g'(x)`,
    note: "Use each function's real domain and differentiability conditions.",
    modules: calculus,
  },
  {
    topic: "Derivatives",
    name: "Trigonometric and exponential rules",
    latex: String.raw`(\sin x)'=\cos x,\quad(\cos x)'=-\sin x,\quad(e^x)'=e^x,\quad(\ln x)'=1/x`,
    note: "Trig derivative formulas assume radians; ln x requires x > 0.",
    modules: calculus,
  },
  {
    topic: "Integration",
    name: "Power integral and substitution",
    latex: String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C\ (n\ne-1),\qquad \int f(g(x))g'(x)\,dx=F(g(x))+C`,
    note: "F′=f. For n=−1, use ln|x| on intervals excluding zero.",
    modules: calculus,
  },
  {
    topic: "Integration",
    name: "Fundamental theorem",
    latex: String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`,
    note: "For continuous f on [a,b] and F′=f; the integral is signed accumulation.",
    modules: calculus,
  },
  {
    topic: "Identities",
    name: "Trigonometric and hyperbolic identities",
    latex: String.raw`\sin^2x+\cos^2x=1,\qquad\cosh^2x-\sinh^2x=1`,
    note: "These are different identities; note the minus sign for hyperbolic functions.",
    modules: [...calculus, ...matrix],
  },
  {
    topic: "Kinematics",
    name: "Constant acceleration",
    latex: String.raw`v=v_0+at,\quad x=x_0+v_0t+\tfrac12at^2,\quad v^2=v_0^2+2a(x-x_0)`,
    note: "Only for constant acceleration along the chosen axis.",
    modules: mechanics,
  },
  {
    topic: "Dynamics",
    name: "Force, work and momentum",
    latex: String.raw`\sum\mathbf{F}=m\mathbf{a},\quad W=\int\mathbf{F}\cdot d\mathbf{r},\quad\mathbf{p}=m\mathbf{v}`,
    note: "Momentum is conserved for an isolated system, not for every individual object.",
    modules: mechanics,
  },
  {
    topic: "Rotation",
    name: "Rotational energy and torque",
    latex: String.raw`K_{\rm rot}=\tfrac12I\omega^2,\quad\tau=I\alpha`,
    note: "The torque relation assumes a fixed rotation axis and constant I.",
    modules: mechanics,
  },
  {
    topic: "Oscillations",
    name: "Small-angle pendulum",
    latex: String.raw`T=2\pi\sqrt{L/g},\quad g=4\pi^2L/T^2`,
    note: "Small amplitude, light string, point-like bob and negligible damping.",
    modules: mechanics,
  },
  {
    topic: "Electricity",
    name: "Ohm and circuit relations",
    latex: String.raw`V=IR,\quad V=\mathcal{E}-Ir,\quad P=VI`,
    note: "Ohm's law applies to ohmic conductors at fixed physical conditions.",
    modules: electric,
  },
  {
    topic: "Electrostatics",
    name: "Coulomb and Gauss laws",
    latex: String.raw`F=\frac{1}{4\pi\varepsilon_0}\frac{|q_1q_2|}{r^2},\qquad\oint\mathbf{E}\cdot d\mathbf{A}=Q_{\rm enclosed}/\varepsilon_0`,
    note: "Coulomb force is along the joining line; Gauss's law is a closed-surface flux law.",
    modules: electric,
  },
  {
    topic: "Optics",
    name: "Diffraction grating",
    latex: String.raw`d\sin\theta=m\lambda`,
    note: "Normal incidence, integer diffraction order; check |mλ/d|≤1.",
    modules: [...electric],
  },
  {
    topic: "Stoichiometry",
    name: "Moles and molarity",
    latex: String.raw`n=m/M,\quad c=n/V`,
    note: "For mol/L use volume in litres; stoichiometric coefficients compare mole amounts.",
    modules: chemistry,
  },
  {
    topic: "Gases",
    name: "Ideal gas law",
    latex: String.raw`PV=nRT`,
    note: "Match units to R. Use absolute temperature in kelvin and absolute pressure; ideal-gas approximation.",
    modules: chemistry,
  },
  {
    topic: "Equilibrium",
    name: "Reaction quotient",
    latex: String.raw`Q=\frac{a_C^c a_D^d}{a_A^a a_B^b}`,
    note: "For aA+bB⇌cC+dD. Activities are dimensionless; pure solids/liquids have unit activity.",
    modules: ["CHE1501"],
  },
  {
    topic: "Practical uncertainty",
    name: "Independent standard uncertainties",
    latex: String.raw`u_z^2=\sum_i\left(\frac{\partial z}{\partial x_i}\right)^2u_i^2`,
    note: "First-order propagation for independent input uncertainties; include covariance when correlated.",
    modules: ["PHY1503", "CHE1503"],
  },
  {
    topic: "Extension: series",
    name: "Ratio test",
    latex: String.raw`L=\lim_{n\to\infty}\left|a_{n+1}/a_n\right|`,
    note: "Outside the current Calculus A scope. For a series with eventually nonzero terms: L<1 gives absolute convergence; L>1 gives divergence; L=1 is inconclusive.",
    modules: calculus,
    extension: true,
  },
  {
    topic: "Extension: thermochemistry",
    name: "Sensible heat",
    latex: String.raw`q=mc\Delta T`,
    note: "Not part of the CHE1501 exam scope. Constant specific heat, no phase transition; match energy units.",
    modules: ["CHE1501"],
    extension: true,
  },
  {
    topic: "Extension: acid-base",
    name: "Activity definition of pH",
    latex: String.raw`\mathrm{pH}=-\log_{10}a_{\mathrm{H}^+}`,
    note: "Detailed acid-base equilibrium is outside CHE1501 exam scope. Concentration is an approximation to activity in dilute solutions.",
    modules: ["CHE1501"],
    extension: true,
  },

  {
    topic: "Matrices",
    name: "Matrix product and determinant identities",
    latex:
      "(AB)_{ij}=\\sum_{k=1}^{n}a_{ik}b_{kj},\\quad\\det(AB)=\\det(A)\\det(B),\\quad\\det(A^T)=\\det(A)",
    note: "For A of size m×n and B of size n×p. Determinant identities require square matrices of the same size.",
    modules: ["MAT1503"],
  },
  {
    topic: "Vectors",
    name: "Length and orthogonal projection",
    latex:
      "\\|\\mathbf{v}\\|=\\sqrt{\\mathbf{v}\\cdot\\mathbf{v}},\\qquad\\operatorname{proj}_{\\mathbf{v}}\\mathbf{u}=\\frac{\\mathbf{u}\\cdot\\mathbf{v}}{\\mathbf{v}\\cdot\\mathbf{v}}\\mathbf{v}",
    note: "Real Euclidean vectors; the projection direction v must be nonzero.",
    modules: ["MAT1503"],
  },
  {
    topic: "Limits",
    name: "Finite limit laws",
    latex: "\\lim(f+g)=L+M,\\quad\\lim(fg)=LM,\\quad\\lim\\frac{f}{g}=\\frac{L}{M}",
    note: "All limits use the same approach point. The separate finite limits must exist; the quotient rule requires M ≠ 0.",
    modules: ["MAT1512"],
  },
  {
    topic: "Derivatives",
    name: "Quotient and logarithm rules",
    latex:
      "\\left(\\frac{u}{v}\\right)\\prime=\\frac{u\\prime v-uv\\prime}{v^2},\\qquad\\frac{d}{dx}\\ln|u|=\\frac{u\\prime}{u}",
    note: "Differentiable functions, with nonzero denominators; ln|u| is valid only where u ≠ 0.",
    modules: ["MAT1512"],
  },
  {
    topic: "Integration",
    name: "Common antiderivatives",
    latex:
      "\\int\\sin x\\,dx=-\\cos x+C,\\quad\\int\\cos x\\,dx=\\sin x+C,\\quad\\int\\frac{dx}{x}=\\ln|x|+C,\\quad\\int e^{kx}\\,dx=\\frac{e^{kx}}{k}+C",
    note: "Radians for trig functions; exclude x=0 in the logarithmic integral and require k ≠ 0 in the exponential formula.",
    modules: ["MAT1512"],
  },
  {
    topic: "Identities",
    name: "Angle addition identities",
    latex:
      "\\sin(a\\pm b)=\\sin a\\cos b\\pm\\cos a\\sin b,\\qquad\\cos(a\\pm b)=\\cos a\\cos b\\mp\\sin a\\sin b",
    note: "Choose matching upper or lower signs throughout each identity.",
    modules: ["MAT1503", "MAT1512"],
  },
  {
    topic: "Energy and impulse",
    name: "Work–energy and impulse",
    latex:
      "K=\\tfrac12mv^2,\\quad W_{\\rm net}=\\Delta K,\\quad\\mathbf{J}=\\int\\mathbf{F}_{\\rm net}\\,dt=\\Delta\\mathbf{p}",
    note: "Classical mechanics. K uses constant mass; total momentum conservation requires zero external impulse on the chosen system.",
    modules: ["PHY1505", "PHY1503"],
  },
  {
    topic: "Oscillations",
    name: "Ideal spring motion",
    latex: "x=A\\cos(\\omega t+\\phi),\\quad\\omega=\\sqrt{k/m},\\quad T=2\\pi/\\omega",
    note: "Undamped motion under a linear restoring force about equilibrium, with k>0 and m>0.",
    modules: ["PHY1505"],
  },
  {
    topic: "Electricity",
    name: "Kirchhoff circuit laws",
    latex: "\\sum I_{\\rm in}=\\sum I_{\\rm out},\\qquad\\sum_{\\rm loop}\\Delta V=0",
    note: "Conservation of charge and signed potential changes in a lumped circuit; account separately for any induced electromotive force from changing magnetic flux.",
    modules: ["PHY1506", "PHY1503"],
  },
  {
    topic: "Waves",
    name: "Frequency, speed and wavelength",
    latex: "v=f\\lambda,\\qquad n=c/v",
    note: "Use wave speed in the actual medium. For optics n is the phase refractive index at the relevant wavelength.",
    modules: ["PHY1506", "PHY1503"],
  },
  {
    topic: "Modern practicals",
    name: "Photon energy and stopping potential",
    latex: "E_\\gamma=hf=hc/\\lambda,\\qquad eV_0=hf-\\Phi",
    note: "Vacuum wavelength; a stopping potential exists for emitted photoelectrons only above the threshold frequency.",
    modules: ["PHY1503"],
  },
  {
    topic: "Stoichiometry",
    name: "Balanced mole ratios and yield",
    latex:
      "\\frac{n_A}{\\nu_A}=\\frac{n_B}{\\nu_B},\\qquad\\%\\,\\mathrm{yield}=100\\frac{m_{\\rm actual}}{m_{\\rm theoretical}}",
    note: "The mole ratio refers to amounts consumed or formed in the balanced reaction, not arbitrary initial amounts. Compare the same product in the same units for yield.",
    modules: ["CHE1501", "CHE1503"],
  },
  {
    topic: "Solutions",
    name: "Dilution of one solute",
    latex: "c_1V_1=c_2V_2",
    note: "The amount of the same solute is conserved, no reaction occurs, and compatible concentration/volume units are used.",
    modules: ["CHE1501", "CHE1503"],
  },
  {
    topic: "Extension: series",
    name: "Geometric and p-series tests",
    latex:
      "\\sum_{n=0}^{\\infty}ar^n=\\frac{a}{1-r}\\quad(|r|<1),\\qquad\\sum_{n=1}^{\\infty}\\frac{1}{n^p}\\text{ converges iff }p>1",
    note: "Outside the current MAT1512 Calculus A scope. For a nonzero geometric first term, |r| ≥ 1 diverges.",
    modules: ["MAT1512"],
    extension: true,
  },
  {
    topic: "Extension: thermochemistry",
    name: "Standard reaction enthalpy",
    latex:
      "\\Delta_rH^\\circ=\\sum_{\\rm products}\\nu\\Delta_fH^\\circ-\\sum_{\\rm reactants}\\nu\\Delta_fH^\\circ",
    note: "Outside CHE1501 exam scope. Use the stated phases, temperature, standard states and a consistent molar basis for the balanced reaction.",
    modules: ["CHE1501"],
    extension: true,
  },
];
export const referenceTables = [
  {
    name: "Solubility tendencies",
    scope: "chemistry",
    rows: [
      ["Nitrates and Group 1 salts", "Usually soluble in water"],
      ["Chlorides", "Usually soluble; AgCl, PbCl₂, Hg₂Cl₂ are important exceptions"],
      [
        "Sulfates",
        "Usually soluble; BaSO₄, PbSO₄ and SrSO₄ are important exceptions; CaSO₄ is sparingly soluble",
      ],
      [
        "Carbonates and hydroxides",
        "Usually poorly soluble except Group 1; ammonium carbonates are soluble",
      ],
    ],
    source: "https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions",
  },
  {
    name: "Common polyatomic ions",
    scope: "chemistry",
    rows: [
      ["NH₄⁺", "ammonium"],
      ["OH⁻", "hydroxide"],
      ["NO₃⁻", "nitrate"],
      ["SO₄²⁻", "sulfate"],
      ["CO₃²⁻", "carbonate"],
      ["PO₄³⁻", "phosphate"],
      ["HCO₃⁻", "hydrogen carbonate"],
    ],
    source: "https://openstax.org/books/chemistry-2e/pages/2-7-chemical-nomenclature",
  },
  {
    name: "Metal reactivity (selected metals)",
    scope: "chemistry",
    rows: [
      [
        "K > Ca > Na > Mg > Al > Zn > Fe > Pb > H > Cu > Ag > Au",
        "General activity ordering; passivation and reaction conditions can prevent a predicted reaction",
      ],
    ],
    source: "https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions",
  },
  {
    name: "Standard reduction potentials",
    scope: "chemistry",
    rows: [
      ["Cu²⁺ + 2e⁻ → Cu", "+0.34 V"],
      ["Zn²⁺ + 2e⁻ → Zn", "−0.76 V"],
      ["Ag⁺ + e⁻ → Ag", "+0.80 V"],
      ["2H⁺ + 2e⁻ → H₂", "0 V (reference)"],
    ],
    source: "https://openstax.org/books/chemistry-2e/pages/17-3-electrode-and-cell-potentials",
  },
  {
    name: "Exact trig values",
    scope: "math",
    rows: [
      ["Angle", "sin; cos; tan"],
      ["0", "0; 1; 0"],
      ["π/6", "1/2; √3/2; 1/√3"],
      ["π/4", "1/√2; 1/√2; 1"],
      ["π/3", "√3/2; 1/2; √3"],
      ["π/2", "1; 0; undefined"],
    ],
    source: "https://openstax.org/books/precalculus-2e/pages/5-3-the-other-trigonometric-functions",
  },
  {
    name: "Electromagnetic spectrum",
    scope: "physics",
    rows: [
      [
        "Longer wavelength → shorter wavelength",
        "Radio → microwave → infrared → visible → ultraviolet → X-ray → gamma",
      ],
      ["Vacuum relation", "c = fλ"],
      ["Visible light (approximate)", "380–750 nm; boundaries vary by convention and sensitivity"],
    ],
    source:
      "https://openstax.org/books/university-physics-volume-3/pages/1-1-the-propagation-of-light",
  },
];
