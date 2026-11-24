# CHE1501 lesson authoring and staging handoff

## Current state

Units 1–4 are in Neon staging. [Unit 4](http://localhost:3200/study/CHE1501-U4) is the working example for reaction-heavy units. Its six sessions cover reaction families, soluble species and net ionic equations, conservation, oxidation states and agents, acidic/basic half-reactions, and product prediction with qualitative heat changes. The atom/charge preflight is recorded in [the Unit 4 report](../reports/CHE1501-U4-preflight.json). Qualified chemistry review and current UNISA scope confirmation remain release gates.

The [reading crosswalk](../reports/CHE1501-current-source-crosswalk.md) and [source map](../../content/che1501/source-map.ts) follow the historical UNISA sequence. Use publisher pages as linked references. The staging index contains original Vela teaching. Keep source PDFs, OCR, credentials and copyrighted figures in their approved private locations.

## What the next author must deliver

- Record the working scope and what currently confirms it. Map each outcome to one or more sessions and to original independent assessment. Note any unverified source or conflicting year explicitly.
- For every session, write a learning goal, prerequisites, an intuition-first explanation and a substantive explanation of how the method works. Include assumptions, common errors, a gated assessment and a gated Pause and Predict. Use new examples. Across the unit include recognition, procedure, error correction and transfer under those exact cognitive headings. Keep answers out of the visible teaching surrounding each question.
- Show every assessed formula in the same KaTeX/mhchem form the learner will see. Independently recalculate answers. Check chemical species, atom counts, net charge, state labels, applicable media and the direction of transfer. For numerical work, check dimensions, conversions, precision and units. For an equation-heavy batch, register any deliberately unbalanced expressions as exact skeleton/error exceptions in the batch entry. The checker verifies conservation for its supported formula syntax. Separately verify whether the reaction is chemically appropriate under the stated conditions.
- For a visual, give learners a prediction to make and a question to answer afterwards. Use an existing typed, domain-registered model where it fits. Check default and limiting inputs, keyboard use, labels and mobile fit. Include a useful text or table alternative. For a source figure, retain its rights, exact page, caption, hash and review evidence.
- Keep existing unit and session identities stable. Append new sessions when adding material. Revisions to existing sessions preserve identifiers and bump the revision. Request qualified subject review before promoting the batch.

## Remaining working scope

| Unit | Coverage to verify before signing off |
| --- | --- |
| U5 · Stoichiometry | Moles and particles, molar mass, empirical and molecular formulas, equation ratios, limiting and excess reagents, theoretical and percentage yield. Include a transfer task that chooses the limiting reagent before predicting yield. |
| U6 · Solutions and concentrations | Molarity, molality, mole fraction, dilution, concentration comparisons and choice of units. Check mass of solvent versus volume of solution. Verify any requested scope for normality separately. |
| U7 · Chemical equilibrium | Dynamic equilibrium, equilibrium expressions and omitted pure phases, reaction quotient, and directional predictions after changing conditions. Include a graph or simulation with explicit assumptions about forward and reverse rates. |
| U8 · Gases | Boyle and ideal-gas relationships, absolute temperature, pressure/volume unit consistency, partial pressures and gas density or molar mass. Include a transfer problem that checks conditions for the ideal model. |
| Excluded historical units | Kinetics, acid–base equilibria and thermochemistry are not in the CHE1501 examinable syllabus. Do not stage or assess them under U7, U9 or U10 labels. |

## Repeatable checks

Run commands from the app root. Replace the code with the unit being delivered.

~~~powershell
npm run chemistry:stage -- --plan
npm run chemistry:stage -- --unit=CHE1501-U5
npm run chemistry:stage -- --unit=CHE1501-U5 --apply --index
~~~

Add an entry in [the batch registry](../../content/che1501/batches.ts) before auditing. For an existing staged unit, use the same command with --revise. A rerun reuses identical embeddings. Report failed or pending sessions separately. Verify the new revision and index in staging before handing it over.

For every submitted batch, attach the preflight JSON, a list of lesson URLs, a source-to-session coverage table, independent answer-key evidence, and desktop/mobile results. As an enrolled test learner, open each session, try the worked-answer control, use each visual, check the exercises in active recall, and ask the tutor about the active session. Confirm it uses the right source and session. Record the provider and flag any provider failure. Check the reader, not just a response from the ingestion script.

The author owns the batch and its editorial evidence. The platform maintainer owns reusable renderers, validators, access, and learner-workflow regressions. Keep those workstreams independent so a pending lesson does not block platform fixes.
