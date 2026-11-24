# Physics pilot source and coverage map

Reviewed 24 November 2026. Page numbers are physical PDF pages. This ledger is editorial evidence. The learner lessons teach physics directly, using original examples and illustrations.

| Source | SHA-256 | Reviewed scope |
| --- | --- | --- |
| PHY1505 tutorial letter 101/0/2022, supplied historical copy | `6cdd784c60ddd57d74385c6d42d577eefdaa363a0e2fc8188623847978c4df37` | PDF p. 5 for mechanics outcomes, p. 6 for the historically prescribed Randall D. Knight 4e. |
| Serway and Jewett, Physics for Scientists and Engineers with Modern Physics, 7e | `5b61383452fab7e49827885cdc14deddf34da4dc7fbd339c2ffc31caa7377347` | Title and contents. Secondary chapter navigation, with Chapter 2 for one-dimensional motion. |
| PHY1503 tutorial letter 101/0/2024, supplied historical copy | `fd5c07cedf71357394430e4070b3051f69e6b6f50f54f3cf83f81b3d0a269ec0` | PDF pp. 6 and 11–12 for purpose, outcomes and assessment, p. 14 for the historical supervised-lab requirement. |

UNISA lists all three as 12-credit NQF 5 year modules. PHY1503 lists PHY1505 and PHY1506 as co-requisites. The PHY1503 letter provides the scope evidence for the optics and modern-physics experiments. PHY1506's published theory scope is electromagnetism and heat. [PHY1503 catalogue](https://w2.unisa.ac.za/CW/SITES/CORPORAT/DEFAULT/REGISTER/SUBJECTS/ALL_MODU/PHYSIC-5.HTM) · [PHY1505 catalogue](https://w2.unisa.ac.za/CW/SITES/CORPORAT/DEFAULT/REGISTER/SUBJECTS/ALL_MODU/MECHAN-6.HTM) · [PHY1506 catalogue](https://w2.unisa.ac.za/CW/SITES/CORPORAT/DEFAULT/REGISTER/SUBJECTS/ALL_MODU/ELECT-11.HTM)

The PHY1503 letter names ten experiment topics in §2.1 and lists eight in §9.1. Current balance and potentiometer/meter bridge appear only in §2.1. Data handling and report writing are separate skills. Internal cell resistance is a proposed extension of the Ohm's law bench. The 33% threshold, 30% report weighting and pre-/post-test weights belong to the historical letter. Use current official materials before exposing institutional rules or identifying apparatus as prescribed.

| Unit | Pilot | Remaining |
| --- | --- | --- |
| PHY1505-U1–U3 | Motion graphs, variable acceleration, projectile components, relative velocity, friction and coupled bodies | More mixed multi-stage problems and independent vector practice |
| PHY1505-U4–U6 | Energy and momentum, sticking and separating two-dimensional collisions, signed variable-force work, circular orbits, escape speed, inertia derivations and rotational work–energy | More mixed problems involving several models or stages |
| PHY1505-U7 | Small oscillations, rigid pendulums, damping, driven resonance, continuity, Bernoulli, buoyancy, axial/shear/bulk elasticity and timed mixed practice | Broader mixed assessment bank and qualified subject review |
| PHY1503-U1 | Fine-scale reading and signed zero correction | Full measurement series, propagation practice and detailed instrument controls |
| PHY1503-U2 | Regression and report authoring | Residual plot, reviewed report rubric and additional pre-lab checks |
| PHY1503-U3 | Pendulum timing, centripetal force and ideal air-track collisions with photogate timing | Air-track levelling, blower and supervised apparatus calibration |
| PHY1503-U4 | DC cell, meter-placement feedback, terminal-voltage fit and slide-wire nulls | Fixed-resistor characterization and verification of current bridge/potentiometer scope |
| PHY1503-U5 | Grating diffraction, angular reference and grating calibration, and equal-current balance | Real instrument scales and verification of current-balance assessment scope |
| PHY1503-U6 | Photoelectric threshold, charge-to-mass tube, field and radius calibration, and electron diffraction rings | Apparatus-specific field and radius standards, repeat readings and supervised procedures |

The staging series spans 13 Vela units. The depth batch adds rod and parallel-axis derivations, plate and sphere integration, two-point model calibration with independent checks, and photogate uncertainty propagation. Each session includes an original worked example, four levels of practice and an answer-gated prediction. Production release and institutional assessment claims require qualified review and current source confirmation. Bridge/potentiometer and current-balance simulations are scope-pending preparation. Virtual readings are synthetic.

Run `node --require ./scripts/windows-runtime.cjs --import tsx scripts/stage-physics.ts --expanded` from the app to audit the full series. Supplying `--apply --index` on the allowlisted Neon staging endpoint adds Cloudflare embeddings and links them to their source sessions. Session IDs remain stable across runs. Academic Master scopes physics retrieval to the active session when one is open.

## Historical assessment comparison

- The supplied 2024 Assessment 1 copy (PDF pp. 3–5, SHA-256 `95996c61a8e1e60628b02f77be1274cdb08160d417888c8a515e9ad3bb54fbea`) supports checking the range of contexts for kinematics, vectors, friction, collisions, energy and gravitation.
- The supplied May/June 2018 exam (PDF pp. 3–4, SHA-256 `194d404833f2b73c5f31f2b422478f32f4e1e07d93c98fbcbd5762fcdb348890`) was visually reviewed for graph interpretation, motion across phases, force and energy methods, vector gravitation, rigid-pendulum modelling and Bernoulli. Both sources inform the coverage review. Neither establishes the current syllabus, and neither was imported into the tutor index.
- The enrichment batch adds two-dimensional momentum, a pressure-work derivation of Bernoulli, rigid pendulum dynamics, variable acceleration, relative velocity, coupled bodies and escape speed. Spectrometer calibration covers angular wrapping and grating spacing. Electron-tube calibration covers the field offset and propagation of measurement uncertainty. Both use simulated measurements and await apparatus-specific review.

- For the pendulum, fit squared period against length under the small-angle approximation. Gravity equals four pi squared divided by slope.
- The regression studio uses unweighted ordinary least squares. The slope standard error comes from vertical residuals. Displayed x and y uncertainties do not enter the fit.
- Distinguish the positive voltage-current slope for an ohmic resistor from the negative terminal-voltage slope for a discharging cell.
- In small-angle nonrelativistic electron diffraction, ring diameter scales with inverse square root of accelerating voltage. Squared diameter can be plotted against inverse voltage. Check the distance and lattice-spacing convention against the actual apparatus.
- The electron bench models use the recommended electron mass, elementary charge and Planck constant. [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/RevModPhys.97.025002.pdf)
