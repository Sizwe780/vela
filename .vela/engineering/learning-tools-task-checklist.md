# Learning tools and persistence delivery checklist

Requested 27 November 2026. Check items only after implementation and verification. Preserve learner identity, enrollment, content versions and evidence boundaries. Offline practice is not assessed mastery. Scientific reference data must name its source and distinguish unavailable or estimated values.

## Immediate fixes
- [x] Persist submitted formative attempts and feedback in Neon by owner/session/content version/question key.
- [x] Save owner-scoped local drafts and offline submissions; rehydrate answers and tried/checked counters.
- [x] Make all compact Companion/Briefing launchers icon-only with accessible labels.
- [x] Verify actual KaTeX HTML/MathML and GFM behaviour for superscripts, matrices and chemical subscripts; repair defects without deleting accessible MathML.
- [x] Hide synthetic/QA qualifications from student onboarding; expose only through verified staff/QA authority.
- [x] Fix privacy notice replacement character.
- [x] Deduplicate atom-count table labelling.
- [x] Use one authenticated desktop shell across Activity, Onboarding, Staff, module and lab routes.
- [x] Synchronize lesson section controls with reader scroll position.

## Learning continuity and rollout
- [x] Distinguish source conversion registration from published lesson retrieval/citations in Teaching workspace.
- [x] Badge/disable empty module enrollment choices as Coming soon.
- [x] Add opt-in timer auto-start, persisted preference and an idle-return notification.
- [x] Allow a missed formative check to be sent into a private spaced-repetition review queue.
- [x] Ensure MAT1503 system/row-operation visual slots use registered interactive widgets beside their explanation.

## Contextual reference drawer
- [x] Add module-capability-scoped reference chips beside exercise controls.
- [x] Keep exercise state mounted while references open; allow resizing and insert-into-answer.
- [x] Publish a sourced 118-element periodic grid, search/filter controls and element inspector.
- [x] Show full/shorthand configurations and available scientific properties with units and missing-value labels.
- [x] Add molar mass and mass-percent calculations and periodic-trend overlays.
- [x] Add sourced SI/CODATA constants, uncertainties and SI prefixes.
- [x] Add checked conversions for energy, pressure, volume and angle.
- [x] Add topic-scoped mathematics, physics and chemistry formula/identity sheets.
- [x] Add source-labelled chemistry/trigonometry/spectrum reference tables.

## Verification and handoff
- [x] Add owner/enrollment/version isolation, persistence/reload/offline and deterministic reference-data tests.
- [x] Check real MAT1503, MAT1512 and CHE1501 exercises on desktop/mobile.
- [x] Run typecheck, schema validation, unit tests, rendering checks and production build.
- [x] Record remaining content review, source ingestion and deployment work honestly.

## Publication boundaries
CHE1501 exam exclusions remain enforced. Thermochemistry, detailed acid-base equilibria, series tests and future physics/organic topics must not appear as current assessed syllabus merely because a reference exists. Missing conversion records must not be invented or marked reviewed. Live AI feedback remains labelled fallible and separate from assessed mastery. No automatic email or community posting is part of these tests.


## Verification log
- 220/220 unit tests pass, including canonical attempt/revision/owner isolation, immutable submission snapshots, unsupported-client-grade rejection, all 118 electron counts/grid positions, molar mass/hydrates and conversion checks.
- Prisma schema validation passes; both additive migrations applied and application client regenerated without touching native OCR-worker clients.
- Production build passes (96 fixed questions across 48 banks validated); KaTeX/GFM SSR checks retain accessible MathML and a single visual formula, without phantom HTML pipe tables.
- Desktop and 390px mobile browser checks pass on real MAT1503-U1, MAT1512-U1 and CHE1501-U1: Neon save/reload, tried-counter rehydration, 118 periodic cells, drawer close without answer loss, offline edit/reconnect/reload. Screenshots inspected for clean math and mobile fit. The extended desktop pass verifies timer preference/auto-start, reference insertion, private review scheduling and enrollment withdrawal. The isolated mobile rerun passes, including the second MAT1503 session, clean hidden MathML, the icon-only Companion header, offline recovery, reference insertion, queue scheduling and withdrawal.


## Remaining rollout work (not implied complete)
- CHE1501, PHY1505, PHY1503, BPT1501 and TPS2601 still need their missing source-conversion/page-review ledgers registered from actual reviewed evidence; published lesson chunks and conversion status are now reported separately.
- Empty module shells remain Coming soon; this delivery does not manufacture lessons or reviewed PDF anchors for them.
- Final interaction tests use a deliberate provider-unavailable response for the free review-queue recovery path, not a live AI grading-quality evaluation. Physical microphone/camera testing is outside this batch.
- Changes have not been deployed to Azure in this task. The complete local production preview is on port 3216; existing source workers are unchanged.
- Global Prettier check now passes after formatting 11 pre-existing style discrepancies; no behavior was intentionally changed in those formatting-only files.

- Device-cache race harness passes on desktop and mobile: clearing drafts aborts a pending retry and does not restore private working.
- Two test-harness issues were corrected: concurrent runs shared a trace directory, and the matrix sub-test did not initially return to the session used by its offline assertion. Final browser output folders are isolated.

## Follow-up work outside this implementation batch
- [ ] Register reviewed source-page conversion ledgers for CHE1501, PHY1505, PHY1503, BPT1501 and TPS2601 from actual evidence.
- [ ] Author/review the remaining Coming soon module shells before enabling ordinary self-enrollment.
- [ ] Deploy this application batch to Azure when requested; local verification does not update velastudy.app.

- Final integration: saved lesson checks participate in the Review queue due count, selected-module/unit filtering and caught-up message. Ratings continue to schedule practice without awarding assessed mastery. The handoff browser run passes these assertions on desktop and mobile.


## Handoff verification
- Four browser cases pass in one isolated run: real MAT1503/MAT1512/CHE1501 lesson persistence, matrix/MathML rendering, reference insertion, timer opt-in, review counts/filtering/rating, withdrawal, plus cache-clear cancellation on desktop/mobile.
- The formula registry now contains 39 formula/identity groups, with conditions and explicit extension flags. All groups pass the shared KaTeX/GFM rendering checks; the expanded focused suite passes 4/4.
- The two public element snapshots total about 86 KB of raw factual data and are loaded on demand; no learner data is sent to PubChem at runtime.


## Timer policy revision — 28 November 2026
The earlier opt-in timer item is superseded by the requested automatic policy: every real enrolled lesson starts timing; ten seconds without pointer movement, touch, scrolling, typing or input pauses it until interaction resumes. The profile opt-in UI is removed; the legacy field remains compatibility-only. Server heartbeats are five seconds apart with bounded credit and single-tab ownership. A manual pause remains available for the current lesson.

- [x] Implement automatic lesson start, a ten-second idle deadline and interaction-driven resume.
- [x] Remove misleading opt-in UI and update timer descriptions.
- [x] Verify desktop/mobile activity types, idle boundary, owner/session switching and live Neon accounting.
- [x] Pass unit tests, TypeScript, formatting and production build; restart the local preview.

Timer verification: 220 unit tests pass; four browser cases pass on desktop/mobile, covering real Neon recording, enrollment/withdrawal, one-tab ownership, idle pause/resume, reload, hidden pages and unchanged mastery/milestone counters. Clock-controlled cases cover each input type, exact ten-second cutoff, owner/lesson switching, a departing-tab lease retry and late-response suspension. TypeScript, schema and formatting checks pass. The activity dashboard now describes automatic recording instead of the superseded manual-start instructions.


## Periodic-reference accuracy and viewport revision — 28 November 2026
- [x] Use CIAAW abridged weights in the grid, inserted values and calculations; retain full standards and uncertainty.
- [x] Distinguish unassigned standard weights from isotope masses; preserve raw source snapshots.
- [x] Render electron occupancies and isotope mass numbers as superscripts.
- [x] Keep category colours, legend, block and group filters consistent, including H, He and Group 12 boundaries.
- [x] Wrap filters by container width and keep search text and the last table rows reachable at 320px and resized desktop widths.
- [x] Complete full tests, production build and local restart for this reference revision.


## Converter and scientific calculator — 28 November 2026
- [x] Remove redundant converter disclosure/quantity selector; show direct fields, actions and preset chips.
- [x] Support explicit common aliases, case-sensitive SI prefixes, affine temperature conversion and dimension feedback.
- [x] Add a bounded free/local scientific calculator with visible DEG/RAD, functions, constants, history and result reuse.
- [x] Scope tools to STEM capabilities and integrate calculator into the lab and non-destructive lesson reference drawer.
- [x] Verify numeric engine domains, precedence and conversions; desktop/mobile lesson insertion retains working and tried count.
- [x] Finish production build, formatting and local restart for the combined reference/tool revision.

Combined verification: 225 unit tests pass; TypeScript, formatting and production build pass. Calculator/converter component browser checks pass on desktop and mobile, including preserved lesson working and result/history reuse. Local standalone preview responds on port 3216. These component tests do not certify every live learner account or production deployment.


## Expressive scratchpad and exact matrix feedback — 28 November 2026
- [x] Parameterize higher binomial powers, trinomial powers, mixed products, substitution/parts/logarithmic integrals and mixed-rule derivatives.
- [x] Add finite radical, trig and exponential limit families, retaining the limit operator until evaluation.
- [x] Normalize leading equals, inline/display math wrappers, plain function notation and explicit simple domain notes.
- [x] Preserve earlier accepted domain restrictions and compare algebra with the last accepted line; rejected/unverified steps never become baselines.
- [x] Verify primitives against the original integrand by differentiation, including log-absolute-value derivatives on each connected interval.
- [x] Keep substitution notes separate and include them in explicitly saved private notebook snapshots, with old snapshot compatibility.
- [x] Distinguish row equivalence from declaration mismatch, offer a detected operation for review, and support exact matrices up to 6×7 with an explicit overall-equivalence mode.
- [x] Regression-test the supplied mixed expansion, mixed primitive, radical limit, derivative and matrix cases. Independent SymPy expansion gives 7x⁴−36x³+4x²+35x−28; the supplied −32x² line is genuinely wrong.
- [x] Finish full suite, production build and enrolled desktop/mobile browser verification; restart port 3216.


Expressive-scratchpad verification: 233 unit tests, Prisma validation, TypeScript, formatting and the production build pass. Two final desktop/mobile browser cases pass against the built app with disposable MAT1503/MAT1512-enrolled accounts and no stylesheet injection. They cover valid-line anchoring after a real polynomial error, the mixed logarithmic/exponential primitive, radical rationalisation and 1/4 limit, preserved working notes across calculator switches, real Neon notebook save/read, exported notes, exact matrix declaration correction and no page overflow for long expressions. Unit cases independently cover the multi-rule derivative, finite trig/exponential limits, impossible domains, empty intervals, all generated families, 6×7 and rank-deficient exact RREFs. SymPy independently confirms the supplied expansion's +4x² final coefficient and the radical limit 1/4.

The first mobile run exposed long-expression grid expansion and moving tap targets; zero-minimum-width tracks/cards fixed it. The final run uses normal clicks with settled scrolling, not force clicks. Notes are included in text exports; constants such as 4≠0 are omitted from the domain display. Temporary accounts and notebook records are cleaned after each browser case. Local app stays on port 3216; Azure deployment is separate. These results certify the stated bounded cases, not all mathematical notation, proofs or symbolic parameter matrices.
