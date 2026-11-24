# CHE1501 prescribed textbook and source crosswalk

Checked 21 November 2026. The supplied syllabus clarification excludes kinetics, acid–base equilibria and thermochemistry, listed as Units 7, 9 and 10 in the historical guide. Vela's numbering for general equilibrium and gases differs from that guide. The public catalogue corroborates the broad included topics. Exact assigned page boundaries still need the current guide.

UNISA's public lookup returned **Chemistry 2e**, Paul Flowers, OpenStax, second edition, 2019, for CHE1501 in both the 2026 and 2027 academic-year selections. The public module catalogue identifies CHE1501 as General Chemistry IA, an English-medium year module at NQF Level 5 with 12 credits. [UNISA prescribed-books lookup](https://www.unisa.ac.za/sites/myunisa/default/Books/Prescribed-Books) · [UNISA module catalogue](https://unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Subjects-%26-modules/All-modules/General-Chemistry-IA-%E2%80%93-CHE1501)

This crosswalk pairs the supplied [2018 tutorial letter](CHE1501-guide-2018-review.md) with relevant OpenStax chapters. It is a preparation aid. The current Tutorial Letter 101 or official myModules materials are needed to confirm the unit sequence, assigned sections, outcomes and assessment scope. Use the supplied Brown editions as historical references. [UNISA's study material guidance](https://adovh.unisa.ac.za/course/view.php?id=3&section=11)

Use the [historical checklist page map](CHE1501-page-map.md) for physical PDF pages and Vela identifiers. Vela U7 corresponds to historical Unit 8, while Vela U8 corresponds to historical Unit 11.

| Vela unit | Topic | Candidate OpenStax reading |
| --- | --- | --- |
| 1 | Chemical foundations | Chapters [1](https://openstax.org/books/chemistry-2e/pages/1-introduction) and [2](https://openstax.org/books/chemistry-2e/pages/2-introduction), measurements, matter, atomic composition and symbols |
| 2 | Quantum mechanics and periodicity | Chapter [6](https://openstax.org/books/chemistry-2e/pages/6-introduction) and §2.5 for the periodic table |
| 3 | Chemical bonding | Chapter [7](https://openstax.org/books/chemistry-2e/pages/7-introduction), with §8.2 for hybrid orbitals and §10.1 for intermolecular forces |
| 4 | Reaction classes | §4.2 in [reaction stoichiometry](https://openstax.org/books/chemistry-2e/pages/4-introduction), alongside §17.1 where the guide calls for redox balancing |
| 5 | Stoichiometry | §§3.1–3.2 and §§4.1, 4.3–4.4 for mole conversions, empirical formulas, balancing, limiting reactants and yield |
| 6 | Solutions and concentrations | §§3.3–3.4 for concentration and dilution. Check any guide-specific treatment of normality separately. |
| 7 | Chemical equilibrium | Chapter [13](https://openstax.org/books/chemistry-2e/pages/13-introduction) |
| 8 | Gases | Chapter [9](https://openstax.org/books/chemistry-2e/pages/9-introduction) |

## Use in Vela

Link to the publisher reading and author independent Vela lessons, worked examples and diagrams from a reviewed factual concept inventory. OpenStax's current reuse notice requires prior written permission for ingestion into generative AI offerings. Keep publisher text and figures out of Vela's model-facing source index while permissions are unresolved. [OpenStax reuse notice](https://openstax.org/books/chemistry-2e/pages/3-introduction)

## Continuous staging

The historical sequence is the working order for CHE1501. Register each newly written unit in [the batch catalogue](../../content/che1501/batches.ts) with its position, local outcome and publisher reading links. Unit 1 covers matter, measurements, isotope notation and ionic formulas. Its density lab lets learners vary mass and volume independently. Unit 2 covers spectra, quantum numbers, configuration and periodic trends. Its photon lab lets learners reverse transitions and compare energy gaps.

```powershell
# The first command audits locally. Each subsequent command uploads one audited unit.
npm run chemistry:stage -- --unit=CHE1501-U1
npm run chemistry:stage -- --unit=CHE1501-U1 --apply --index
npm run chemistry:stage -- --unit=CHE1501-U2 --apply --index
npm run chemistry:stage -- --unit=CHE1501-U3 --apply --index
# List the mapped units, then stage every ready original batch.
npm run chemistry:stage -- --plan
npm run chemistry:stage -- --all --apply --index
```

The staging script expects the privately extracted historical guide prose in `../work/che1501-historical-guide-prose.json`. It writes a separate preflight report for each unit. The staging connection is stored privately in `../work/neon-cli/che1501-staging-url.txt`. The script verifies the dedicated staging endpoint before writing. A repeat run preserves identical session rows and reuses indexed chunks. If indexing fails after the sessions are staged, rerun the same unit command to resume. The Cloudflare index contains original Vela lessons. Publisher readings are references.

For a correction to one staged unit, add `--revise` to its `--apply --index` command. This preserves session IDs, increases changed session revisions, and retires superseded Cloudflare index entries after the replacement is indexed. Use the same revision command to resume after an indexing failure.

The local production-build preview uses port 3200 and connects to the staging database. Sign in and enroll in CHE1501 to open `/study/CHE1501-U1` or `/study/CHE1501-U2`. The Playwright staging spec requires `VELA_CHEMISTRY_STAGING_TEST=1`, `PLAYWRIGHT_BASE_URL=http://localhost:3200` and the same staging database.

Unit 3 is available at `/study/CHE1501-U3`. The staged batch covers ionic and covalent bonding, Lewis structures and resonance, molecular geometry and polarity, sigma and pi overlap, and intermolecular forces. Its molecular visual compares five labelled structures and distinguishes ideal angles from approximations. The staged sessions are available for testing while chemistry review is pending.

Units 4, 5, 6, 7 and 8 are staged in the dedicated chemistry staging database with sequential numbering. Unit 4 covers reaction classes and redox practice. Unit 5 covers moles, formulas, equation ratios, limiting reagents and yield. Unit 6 covers molarity, molality, mole fraction, dilution and concentration basis. Unit 7 covers dynamic equilibrium and $Q/K$ direction under an explicit closed-system model. Unit 8 covers absolute temperature and ideal-gas relationships and clearly marks nonideal model limits.

Unit 4 has been audited and revised in staging. The current CHE1501 sequence has eight units: equilibrium is U7 and gases is U8. Kinetics, acid-base equilibria and thermochemistry are excluded from the CHE1501 exam syllabus and must not be staged as assessed lessons. Basic acid-base definitions remain part of Unit 4 reaction classes.

CHE1502 is registered as an organic-focused follow-on profile. Future work must use current outcomes for hybridization, nomenclature, stereoisomers, alkanes, alkenes, alkynes, alcohols and carbonyl compounds. Do not infer kinetics or thermochemistry into that module from older printed guides.
