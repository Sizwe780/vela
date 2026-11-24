# PHY1503 Source & Scope Review (2024 Tutorial Letter 101)

**Document**: `Tutorial Letter 101/0/2024 · Physics Practical Work I · PHY1503` (Year Module)  
**Institution**: University of South Africa (UNISA), Department of Physics  
**Primary Lecturer**: Miss L Menzi (Florida Science Campus, Eureka Building)  
**Intake Date**: 23 November 2026  
**Applicable Specifications**: [`science-content-spec.md`](../specs/science-content-spec.md), [`laboratory-practical-spec.md`](../specs/laboratory-practical-spec.md)

---

## 1. Module Overview & Operational Reality

`PHY1503` (Physics Practical Work I) is an NQF 5 year module (12 credits) designed to accompany `PHY1505` (Mechanics) and `PHY1506` (Electricity and Magnetism).

### The In-Person Florida Campus Laboratory Requirement
Tutorial Letter 101/0/2024 specifies:
1. **Compulsory In-Person Laboratory Sessions**: Practicals take place exclusively at the **Unisa Science Campus in Florida (Johannesburg)**.
2. **Assignment Gate (Subminimum 33%)**: To gain admission to the Florida Campus practical sessions, students must submit Assignments 1, 2, and 3 and obtain a year mark average of at least **33%**.
3. **Pre-Tests & Post-Tests**: Students write a **pre-test** in the laboratory before each experiment begins and a comprehensive **post-test** at the conclusion of their practical visit.
4. **Grading Weight Breakdown**:
   - Assignment 1 (Measurements and errors): **6.6%**
   - Assignment 2 (Interpretation of results): **6.6%**
   - Assignment 3 (Graphs and report write-up): **6.8%**  *(Assignments total: 20%)*
   - Practical Pre-Test: **10%**
   - Practical Reports (conducted on campus): **30%**
   - Practical Post-Test: **40%**  *(Laboratory component total: 80%)*

---

## 2. Complete Inventory of Prescribed Practicals & Apparatus

Section 2.1 names ten experiment topics plus data handling. Section 9.1 lists eight experiment topics. Current balance and potentiometer/meter bridge appear in §2.1 only. The first two rows below are skills. Proposed apparatus, internal resistance and analysis variants require confirmation against the supervised lab manual. See the [reviewed scope ledger](physics-pilot-scope.md).

| Category | Experiment Title | Physical Principles & Apparatus | Data Analysis & Graphical Relationships |
| :--- | :--- | :--- | :--- |
| **Foundational** | **1. Measurements, Errors & Data Handling** | Vernier caliper, micrometer screw gauge, traveling microscope, digital balance, stopwatch, zero errors. | Mean, standard deviation, standard error, significant figures, error propagation in sums, products, and powers. |
| **Foundational** | **2. Linear Regression & Scientific Report** | Best-fit straight line $y = mx + c$, Pearson correlation $r$, residuals, error bars, formal report write-up structure. | Determining physical constants from gradient and $y$-intercept with absolute and percentage uncertainty. |
| **Mechanics** | **3. Simple Pendulum** | Retort stand, bob, suspension string, stopwatch, meter stick. | Period $T$ vs length $L$: $T = 2\pi \sqrt{\frac{L}{g}} \implies T^2 = \left(\frac{4\pi^2}{g}\right)L$. Plot $T^2$ vs $L$ to calculate local acceleration due to gravity $g$. |
| **Mechanics** | **4. Air Track (Air Tract)** | Linear air track, blower, air gliders, photogates, digital timer, hanging masses, pulleys, bumpers. | Constant acceleration kinematics ($v^2 = 2as$), Newton's Second Law ($a$ vs $F_{\text{net}}$ and $a$ vs $1/M$), elastic and inelastic momentum/kinetic energy conservation. |
| **Mechanics** | **5. Circular Motion** | Whirling mass apparatus, motor with variable speed, tachometer, slotted masses, spring balance. | Centripetal force $F_c = m\omega^2 r = \frac{4\pi^2 m r}{T^2}$. Plot $F_c$ vs $\omega^2$ or $F_c$ vs $r$ to verify centripetal acceleration relation. |
| **Electricity** | **6. Ohm's Law & Internal Resistance** | DC power supply, resistors, rheostat, DC voltmeter, DC ammeter, connecting leads, switch. | Current-voltage characteristics ($V = IR$). Plot $V_{\text{terminal}}$ vs $I$ for a real cell: $V = \mathcal{E} - Ir$, extracting EMF $\mathcal{E}$ from intercept and internal resistance $r$ from negative slope. |
| **Electricity** | **7. Potentiometer & Meter Bridge** | 1-meter slide wire bridge, galvanometer, standard resistance box, unknown resistor, jockey, Leclanché / Daniell cell. | Null-deflection principle. Balanced Wheatstone condition $\frac{R_x}{R_s} = \frac{L_1}{100 - L_1}$. Measurement of unknown resistance and wire resistivity $\rho = R \frac{A}{L}$. |
| **Electromagnetism** | **8. Current Balance** | Dual parallel conductors, knife-edge pivot, analytical balance weights, high-current DC supply, ammeter. | Magnetic force between parallel conductors $F/L = \frac{\mu_0 I_1 I_2}{2\pi d}$. Plot force $F$ vs $I^2$ to measure permeability of free space $\mu_0$. |
| **Optics** | **9. Physical Optics: Diffraction Grating** | Monochromatic light source (Na vapor lamp / He-Ne laser), spectrometer table, collimator, telescope, transmission grating (e.g., 300 or 600 lines/mm). | Grating equation $d\sin\theta = m\lambda$. Angular deflection measurements in 1st and 2nd orders to calculate unknown optical wavelengths. |
| **Modern Physics** | **10. Photoelectric Effect** | Photocell / vacuum photodiode tube, spectral filters (mercury arc lines: 365 nm, 404 nm, 436 nm, 546 nm, 577 nm), reverse bias DC supply, sensitive electrometer / picoammeter. | Stopping potential $V_0$ vs frequency $f$: $eV_0 = hf - \Phi$. Linear regression gives Planck's constant $h = e \cdot (\text{slope})$ and work function $\Phi = -e \cdot (y\text{-intercept})$. |
| **Modern Physics** | **11. Determination of $e/m$ of an Electron** | Fine-beam tube (Thomson tube) with hydrogen/helium gas, Helmholtz coils, high voltage anode supply, coil current supply, mirror scale. | Circular electron trajectory radius $r$ in uniform magnetic field $B$: $\frac{e}{m} = \frac{2V}{B^2 r^2}$ where $B = \left(\frac{4}{5}\right)^{3/2} \frac{\mu_0 N I}{R}$. Plot $r^2$ vs $1/B^2$ or $V$ to compute charge-to-mass ratio. |
| **Modern Physics** | **12. Electron Diffraction** | Teltron electron diffraction tube (polycrystalline graphite target), high voltage HT power supply (0–5 kV), digital caliper. | De Broglie wavelength $\lambda = \frac{h}{\sqrt{2m_e e V}}$. Bragg diffraction ring diameters $D_1, D_2$: $D = \frac{2L\lambda}{d}$. Plot $D$ vs $1/\sqrt{V}$ to verify matter wave hypothesis. |

---

## 3. How Vela Bridges Distance Learners to In-Person Lab Success

In distance education, laboratory practicals pose the single greatest failure risk because students arrive at the physical campus laboratory with zero prior hands-on familiarity with delicate apparatus (Helmholtz coils, galvanometers, spectrometers).

Vela supports pre-lab preparation, data analysis and report practice. Simulated readings do not satisfy supervised attendance, competency or assessment requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VELA PHY1503 PREPARATION PIPELINE                      │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│ 1. Apparatus &      │ 2. Interactive      │ 3. Data Collection,             │
│    Measurement Prep │    Lab Simulators   │    Regression & Report Writing  │
├─────────────────────┼─────────────────────┼─────────────────────────────────┤
│ • Interactive       │ • Photorealistic    │ • Sliders with realistic        │
│   Vernier &         │   schematics of     │   synthetic noise and error     │
│   Micrometer scales │   circuits & optics │ • Live scatter & linear fit     │
│ • Zero-error drills │ • Virtual dry-runs  │ • Formal IMRAD report templates │
│ • Uncertainty math  │ • Pre-test practice │ • Pre-test self-assessment bank │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```
