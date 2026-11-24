# PHY1505 source and scope review (2022 tutorial letter)

Status: preliminary source review; not a verified current PHY1505 curriculum, a complete textbook analysis, or published Vela content.

## Sources and authority

- User-supplied `PHY1505 Mechanics Tutorial Letter 101 0 - Important Module Info.pdf`. The cover is a Studocu-hosted copy; its internal title is *PHY1505/101/0/2022*. Treat it as a historical guide copy until the same scope and readings are confirmed against current official UNISA module materials. The visible copy includes personal uploader/contact page furniture; that information is intentionally excluded here.
- User-supplied `physics-for-scientists-7th-ed.pdf`. Its title page identifies *Physics for Scientists and Engineers with Modern Physics*, 7th edition, by Raymond A. Serway and John W. Jewett, Jr. This edition is not the text named as prescribed in the supplied guide.

The guide names *Physics for Scientists and Engineers: A Strategic Approach with Modern Physics*, 4th edition, by Randall D. Knight (Pearson, 2017) as the prescribed book. The supplied Serway/Jewett 7th edition may be useful as a secondary comparison, but it must not be represented as the prescribed PHY1505 text or used as the default page map without confirmation from current module materials. The chapter map below is a topic-based candidate crosswalk from the supplied book's contents only; no textbook body or worked examples have yet been analyzed.

## Scope stated by the supplied guide

The guide presents PHY1505 as a year module and describes a mechanics scope. Its purpose/outcomes identify the following topic families:

- describe motion using displacement, velocity and acceleration in words, graphs and equations; derive constant-acceleration relations;
- motion in one and two dimensions, vectors and projectile motion;
- state and explain Newton's laws and universal gravitation;
- circular motion and rigid-body rotation, including angular quantities, torque and moments of inertia;
- conservation of mechanical energy and linear momentum, including collisions;
- oscillations, fluids and elasticity, including continuity and Bernoulli relations for incompressible flow;
- combine the ideas to solve mechanics word problems and explain the reasoning coherently.

The outcomes explicitly mention deriving moments of inertia for regular uniform-density objects (thin rod, circular disc, rectangular plate, cylinder and sphere). This is evidence that the guide expects derivation and model assumptions, not only lookup and substitution. Confirm the wording and all required cases against the authoritative current guide before lesson planning.

### Historical assessment information (do not treat as current policy)

The 2022 copy describes six assignments: A1 motion/kinematics in one and two dimensions; A2 Newton's laws; A3 circular motion/rotation; A4 energy/momentum; A5 gravitation; and A6 oscillations/fluids/elasticity. It describes two multiple-choice assignments weighted 10% each, four written assignments weighted 20% each, assignments collectively contributing 20%, a timed multiple-choice examination contributing 80%, and two submitted assignments for exam admission. These are dated rules from a third-party copy, not current assessment policy. Do not expose these weights, admission requirements or formats as present-day facts without current official confirmation.

The reviewed guide describes the need for conceptual understanding and clearly explained calculations. It does not establish a practical/laboratory requirement in the pages reviewed. Do not infer a lab syllabus from textbook chapters or example apparatus.

## Provisional guide-to-book crosswalk

The supplied Serway/Jewett 7th-edition brief contents place candidate mechanics material in Chapters 1–18. The mapping is a navigation aid, not a prescription, complete section-level reading assignment, or evidence that the chapter prose/examples have been analyzed.

| Guide topic family | Candidate chapters in supplied Serway/Jewett 7e | Scope caution |
| --- | --- | --- |
| Measurement, SI quantities, units, dimensional reasoning | 1 | Establish the current guide's required depth; do not assume all measurement sections are assessed. |
| Motion in one dimension and constant acceleration | 2 | Check graph/derivation expectations in the verified guide. |
| Vectors and components | 3 | Use only mechanics-relevant vector sections. |
| Motion in two dimensions, projectile motion and relative velocity | 4 | Map each listed outcome and assignment scope before selecting sections. |
| Newton's laws, force models, friction and weight | 5 | Include free-body reasoning only where supported by the outcomes. |
| Circular motion and non-inertial frames | 6 | Distinguish required uniform circular motion from optional accelerated-frame material. |
| Work, energy, power and conservative forces | 7 | Candidate source for energy methods, not proof every subsection is in scope. |
| Conservation of energy | 8 | Map overlap with Chapter 7 to avoid duplicate teaching. |
| Linear momentum, impulse and collisions | 9 | Include one- and two-dimensional collision reasoning as outcomes require. |
| Rigid-body rotation about a fixed axis | 10 | Candidate source for rotational kinematics and moments of inertia. |
| Angular momentum | 11 | Include only if verified outcomes/assessment scope require it. |
| Static equilibrium and elasticity | 12 | The guide names elasticity; verify which equilibrium/elasticity models are expected. |
| Universal gravitation | 13 | Check whether orbital applications are in scope. |
| Fluid mechanics | 14 | Candidate source for pressure, continuity and Bernoulli; verify model assumptions. |
| Oscillatory motion | 15 | Candidate source for simple/damped/forced oscillations; verify required subset. |
| Waves and sound | 16–18 | The guide names oscillations but not necessarily wave/sound units; do not include without evidence. |

## Pedagogical and assessment implications for Vela

This module requires multiple representations to work together: verbal descriptions, position/velocity/acceleration graphs, vectors/free-body diagrams, equations, energy or momentum system boundaries, and interpretation of physical units. Each future session should connect these representations explicitly, state idealizations and valid conditions, and ask learners to predict before calculation. Worked solutions should show a model choice, diagram/system definition, symbolic setup, unit-aware calculation, reasonableness check and physical interpretation. Keep each worked answer hidden behind the shared `Show answer` control so the learner can attempt it first.

Build fresh numerical examples from reviewed concepts; independently derive/check the result, units, signs, vector directions, assumptions and limiting cases. Use textbook examples only to identify concept sequence, method choice, representations, misconceptions and explanation moves. Never copy their prose, order, contexts, values, diagrams, problem wording, choices or answer keys. Assignment topic allocations may inform a verified outcome map; assignment questions are not a bank for Vela or raw Academic Master context.

Physics capability should be modular. The future PHY1505 profile may enable only reviewed mechanics tools such as a free-body-diagram builder, projectile model, energy/momentum model, rotation visualizer or oscillation sandbox where they directly support a mapped outcome. These are not implemented or validated as part of this source review. Do not surface chemistry tools, generic math sandboxes or every physics widget automatically. Register visibility and server/API capability in `.vela/module-capabilities.json`, separately from the content domain in `.vela/specs/manifest.json`; keep unknown capabilities hidden.

## Review performed and limits

- Visually reviewed all 12 physical pages of the supplied tutorial-letter copy, focusing on module purpose/outcomes, prescribed resource, study sequence and historical assessment details.
- Visually inspected the supplied book's title page, front matter and brief contents. The visible contents support the chapter candidates above. The book body, section-level worked examples, figures and problem sets have not been reviewed.
- No OCR batch has been run; no source chunks, embeddings, database rows, lesson pages or assessment items were created. This report is source-scope analysis, not an ingestion-completion claim.
- The discrepancy between prescribed Knight 4e and supplied Serway/Jewett 7e is unresolved. Obtain/confirm current official module materials and the intended source/edition before a detailed reading map.
- The supplied guide is a 2022 Studocu copy, not verified current policy. Revalidate outcomes, unit sequence, exam rules, admission requirements and resource edition before presenting them as current.
- The local Ollama API at `http://localhost:11434` did not respond within the probe timeout; the `ollama` CLI was not available on PATH in this execution environment. No installed model could be enumerated, and no Ollama/Cloudflare model extraction or analysis was executed. Cloudflare credentials/provider availability were not tested for this source-review step.
- Source access/retention basis for textbook pages and any downstream OCR artifacts still requires review under the science-ingestion workflow. No book figure or extended textbook content is to be published.

## Next gated steps

1. Confirm the current official PHY1505 guide, outcomes/assessment criteria, prescribed edition and permitted source scope. Resolve the Knight-vs-Serway mismatch.
2. Record file hashes and source access/retention basis. Build the verified guide page → unit/topic → outcome/criterion map first; mark excluded pages and uncertain scope explicitly.
3. Restore/check local Ollama (`ollama serve`, then `/api/tags`) and validate a suitable model on physics-specific questions before using it for extraction assistance. A successful HTTP response alone does not establish physics accuracy. Use Cloudflare only within its configured free allowance and compare candidate outputs to source evidence.
4. Map verified readings to exact chapter sections in the confirmed source edition. Review a small representative batch of worked examples and diagrams, with rendered-page verification and provenance, before any bulk OCR.
5. Create a reviewed evidence inventory, then independently authored Vela lessons and original examples. Complete unit/dimension, diagram/vector-direction, equation-rendering, subject-review and quality-audit gates before release.
6. Design and test relevant mechanics sandboxes as separate module capabilities before adding interactive lesson hooks. Sandboxes illustrate explicit physical models; they do not replace derivations, answer checking or mastery evidence.
