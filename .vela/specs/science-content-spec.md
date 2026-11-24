# Physical sciences domain extension: chemistry and physics
Version: 1.0.0

Applies only to modules explicitly registered with the `chemistry` or `physics` domain in `manifest.json`. This extension supplements the Universal Core and assessment/mastery rules. A shared science profile may be selected by both domains, but subject-specific claims, tools, and assessments must remain distinct.

## Authority, scope and evidence

- Start from the current institution-approved module outcomes, study guide, assessment criteria and prescribed source scope. Record document/version/page provenance. Do not infer a module syllabus from a code, textbook table of contents or another institution's course.
- Preserve distinctions among measured observations, idealized models, approximations, conventions and derived conclusions. State significant assumptions, applicable conditions and uncertainty where they affect an answer.
- Use the current BIPM SI Brochure for SI units and symbols, and current institution-approved conventions for examination notation. For chemical terminology, formulae and nomenclature, consult current applicable IUPAC recommendations; the Gold Book is a terminology reference and may contain entries whose source recommendations need checking. Cite the exact entry/document and access/version date in editorial evidence when claims depend on it.
- Map teaching and assessment to the registered module outcomes and verified qualification/NQF metadata. Do not claim accreditation, SAQA alignment or compliance solely because a content template includes those words.

## Chemistry representation and reasoning

- Render chemical equations, ionic charges, isotopes, states, equilibrium and reaction arrows using supported mhchem syntax (`\\ce{...}`) inside math delimiters. The deployed Markdown pipeline must load KaTeX's `mhchem` extension in both server and client rendering. A source string containing `\\ce` is not proof of successful rendering: preflight and browser checks must detect undefined commands and compare rendered formula text.
- Preserve atom counts, net charge, oxidation-state signs, stoichiometric coefficients, state labels, reversible/equilibrium arrows and units through OCR cleanup, normalization, embedding and display. Never silently balance, repair or reinterpret an ambiguous source equation. Keep source transcription and reviewed display correction separately traceable.
- Teach conservation reasoning before balancing procedures; distinguish coefficients from subscripts and formula units from molecular counts. For redox, equilibrium, acid-base and titration material, state the applicable model assumptions and conditions rather than implying one model applies universally.
- Any proposed VSEPR or molecular-viewer data must carry an explicit, reviewed molecular structure, geometry, bond-angle status (idealized/approximate/observed), lone-pair treatment and, where shown, dipole direction. A decorative 3D shape is not chemical evidence.

## Physics representation and reasoning

- Define the physical system, coordinate axes, sign convention, initial conditions and idealizations before equations. Separate vector components from magnitudes and distinguish scalar from vector quantities.
- Derive relationships with symbols before substituting values. Track units through each expression; report precision and rounding consistently with supplied data and uncertainty. Check limiting cases and conservation laws where relevant.
- Diagrams for forces, circuits, apparatus and trajectories must identify the represented system and relevant directions/polarities. Free-body diagrams show only forces acting on the isolated body; components are not additional forces. A simulation supplements and cannot replace a force balance, derivation or evidence-based explanation.
- Projectile and collision visualizations must declare the model assumptions (for example, uniform gravitational field and neglected air resistance) and use internally consistent position, velocity, momentum and energy calculations.

## Dimensional analysis and numerical verification

- Treat units as typed quantities, not strings attached after calculation. Every value-bearing quantity in generated examples and answer keys records a magnitude, unit and dimension; unit conversions must preserve dimensions and use explicit conversion factors.
- Validate dimensional homogeneity of each physical equation and answer. Reject or flag incompatible dimensions, missing units where the outcome requires them, invalid prefixes, accidental degree/radian mixing and unsupported conversions. Do not claim full unit verification if the active evaluator only checks arithmetic or syntax.
- Canonicalize to SI for calculation only when appropriate; show the requested output unit and conversion path. Preserve derived units such as `N m` and distinguish quantities that share dimensions but differ in meaning (e.g. energy and torque).
- The CAS or checker must fail closed on unrecognized symbols, units, ambiguity, and unsupported compound expressions. Independent hand derivation or a second trusted calculation is required for publication of consequential answer keys.

## Source figures and diagrams

- Keep each extracted figure as an immutable, hashed source asset with original document revision and page, figure/caption association, extraction method and review status. Prefer vector extraction where fidelity is verified; otherwise keep a high-resolution raster. Never claim a vector was preserved when it was rasterized.
- Serve zoomable figures through the existing allowlisted, content-hash-checked asset path. Preserve labels, arrows, axes, legends, scale and caption; do not redraw unclear details as fact. A Vela-authored reconstruction must be explicitly labeled and linked to its source evidence.
- QA must inspect figure presence, readability at mobile size and correspondence between prose and diagram. OCR text alone cannot certify a scientific diagram; low-confidence labels and unreadable schematics remain held for review.

## Domain tools are profile-gated

Register each component and data contract in the supported visual registry before authored content can invoke it. Unknown or unregistered hooks fail closed.

- Physics may opt in to reviewed free-body diagrams and trajectory/collision sandboxes.
- Chemistry may opt in to reviewed molecular geometry, equilibrium or titration sandboxes and a periodic-table/reference dock.
- Physics reference docks expose only reviewed constants/formulae with source, units, assumptions and version. Chemistry reference docks expose reviewed periodic data with source and units. Examination-format sheets require institution approval.
- Sandboxes must be keyboard operable, responsive, bounded, accessible without color alone, and accompanied by a textual explanation and static fallback. Inputs are range-checked and outputs are computed from the declared model. They do not award mastery merely for slider interaction.

## Minimum evidence before publication

For every science unit, retain a review record for outcome coverage, source provenance/rights, equation and unit checks, rendered math/formula checks, figure review, assessment answer-key verification, mobile/readability inspection and domain-component registry validation. A structural audit is necessary but cannot establish scientific correctness. A qualified subject reviewer must approve scientific claims and answer keys before publication.

## Reference standards (consult current revisions)

- BIPM, *The International System of Units (SI Brochure)*, 9th ed., current online revision: https://www.bipm.org/en/web/guest/publications/si-brochure
- IUPAC, *Compendium of Chemical Terminology (Gold Book)* and its cited source recommendations: https://goldbook.iupac.org/ and https://iupac.org/what-we-do/nomenclature/
- South African NQF legal framework and level descriptors: National Qualifications Framework Act 67 of 2008, https://www.gov.za/documents/national-qualifications-framework-act and SAQA level descriptors, https://saqa.org.za/level-descriptors-for-the-south-african-national-qualifications-framework/

These references guide technical practice; they do not supersede UNISA-approved module material, the law, or qualified review. Recheck the current source when onboarding or revising a module.
