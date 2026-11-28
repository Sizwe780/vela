# Contextual references and durable formative practice
27 November 2026.

Formative practice uses owner/session/version/question keys and optimistic revisions. The server matches the exact published exercise, recomputes supported local checks, and never accepts a client grade or model-feedback claim. Submitted checks have separate immutable answer snapshots; latest drafts remain editable. AI review is labelled fallible and does not update assessed mastery. Account export includes attempts/submissions and account deletion cascades them. Local owner-scoped drafts are plaintext working copies, separate from encrypted lesson downloads; clear them on sign-out. Never reuse an old owner's draft under a new identity. Resolve multi-tab conflicts explicitly.

Reference drawers must not unmount exercises. Inserted values remain editable, and changing an answer invalidates its current local-check status. Heavy chemistry data is loaded on demand. Tools follow explicit module capabilities; formula sheets additionally require the registered institution/module context. Do not infer teaching scope from a module prefix. CHE1501 exam exclusions and MAT1512 series extensions remain labelled and hidden from default formula sheets.

## Data ledger
- PubChem periodic table: https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON . Snapshot 27 November 2026; response SHA-256 `6abc1932a117fccc4c61bf9cdbcf96a0355beac82cddba82bd436e6ce4aee72a`. All 118 elements, with category/state and reported weights/configurations/properties. Do not relabel representative masses as exact natural standard atomic weights.
- PubChem element records: `content/references/pubchem-element-properties.json` contains individual source URLs, hashes and date for 118 records, extracting factual covalent radii and reported isotopes only. No copied narrative. Refresh through `python scripts/update-element-reference.py`, throttled below the PubChem API limit; do not run it as part of a build or send learner data. Unknown/predicted measurements remain explicit.
- NIST/CODATA 2022: https://physics.nist.gov/cuu/Constants/ and https://physics.nist.gov/cuu/Constants/Table/allascii.txt . The 2026 adjustment is not yet published at this snapshot date. Exact SI defining constants differ from experimentally determined constants and from conventional standard gravity.
- BIPM SI prefixes: https://www.bipm.org/en/measurement-units/si-prefixes . The displayed teaching subset is pico through tera.
- OpenStax sources are linked per factual reference table. Standard potentials are approximate values at 25 degrees Celsius against SHE, with standard-state conditions. Solubility/activity summaries are tendencies, not universal guarantees. Keep source attribution and conditions beside the data.

## Rollout boundaries
A PDF conversion ledger, a published Vela-written lesson and a retrieval index are different artifacts. Staff analytics reports them separately. Never fabricate reviewed page anchors, source hashes or completed conversion counts. Empty catalog modules stay visible as Coming soon but cannot accept a new ordinary learner self-enrollment until lessons exist. Synthetic qualifications require explicit scoped staff authority to appear in onboarding.


## Atomic-weight and classification revision — 28 November 2026

The periodic grid, inserted masses and molar-mass calculator now use the factual CIAAW 2024 abridged standard atomic-weight table, not the rounded PubChem AtomicWeight field. Full standard values/intervals and abridged uncertainties remain available in the inspector. Preserve source precision (including meaningful trailing zeros) rather than imposing a universal decimal count. For example Ar is 39.95 ± 0.16, with full interval [39.792,39.963]; Zn is 65.38 ± 0.02. Elements without assigned standard weights show a dash; calculations require an isotope-specific mass rather than silently treating a representative isotope as a natural standard weight.

`content/references/ciaaw-weights.json` records both official URLs, response hashes, edition and retrieval date. Refresh explicitly with `python scripts/update-atomic-weights.py`; its completeness/edition checks finish before an atomic file replacement. This does not run during builds or contact any learner service. Review source changes and calculation tolerances before committing a new snapshot.

Display formatting converts orbital occupancies and isotope mass-number prefixes to superscripts without modifying raw configurations or source isotope lists. Category families, block and group remain distinct. H is a nonmetal in Group 1/s-block; He is a noble gas in Group 18/s-block. Group 12 metals are a separate teaching family rather than being labelled transition elements solely from d-block position. This deliberate legend convention follows the IUPAC transition-element distinction; it is not a claim that CIAAW defines category colours. The extended detached f-series display does not resolve the Group 3 placement convention.

Narrow-panel references use container-responsive filter columns, a full-width search control, and one vertical drawer scroll with horizontal table panning. Tests must check controls and placeholder text fit, category colours agree with the legend, and lower/rightmost cells are inside the actual viewport and dialog after scrolling, not merely inside an off-screen nested container.


## Scientific calculator and quantity conversion — 28 November 2026
- The Practical Lab and STEM exercise references expose a local numerical calculator. Capability profiles scope it to relevant modules; conceptual modules retain their own tools. No AI request or new server endpoint is involved.
- DEG/RAD is always visible. Changing angle mode invalidates the displayed result. Real-number functions, roots, powers, logarithms, factorials and combinations/permutations use a bounded parser, never JavaScript eval. Floating-point results are not symbolic proofs. History is temporary component state, scoped by the signed-in owner in the lab; it is not sent to an AI provider.
- Switching lab tools keeps the scratchpad mounted. The lesson reference modal inserts a numeric result into the existing editable answer without submitting or resetting attempts. Switching reference tabs preserves calculator input and history while the drawer stays open.
- Unit conversion has direct original/target fields with convert and comparison actions. Explicit aliases accept l/L, ml/mL, cc/cm³, hr/h and common pressure/energy units. Never globally lowercase SI units: mPa and MPa differ. C remains coulomb unless K/°C on the other side supplies explicit temperature context. Affine Celsius offsets apply only to standalone temperature units; use K in compound units.
- mmHg and torr have distinct conventional factors. Numeric feedback reports SI dimensions, expected value and conversion scale/offset. Significant figures remain the learner's responsibility.
- Standards: [BIPM kelvin](https://www.bipm.org/en/si-base-units/kelvin), [NIST SI guidance](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-4-two-classes-si-units-and-si-prefixes).
