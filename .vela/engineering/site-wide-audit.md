# Site-wide interface and learning-flow audit
27 November 2026. This records the requested cross-page audit and the implementation boundaries. Runtime verification is recorded below; a styled screen is not proof of assessment validity.

## Shared changes

- Learn / Practice / Insights navigation groups; search lives in the header with Ctrl/Cmd+K. Academic briefing uses Ctrl/Cmd+Shift+K. Profile, appearance, installation, offline library and sign-out live in the account disclosure. Staff and institution links retain server-backed scoped capability checks.
- Keep KaTeX CSS global and mhchem in the shared renderer. Multiple-choice option text now uses that renderer too. Never hide accessible MathML by removing it from the DOM or use copied screen-reader text as evidence of malformed source mathematics.
- Overview no longer repeats the full outcome tree. Recent quiz evidence, conceptual reviews, mixed recall scores and focused time remain labelled separately. Module progress accordions default closed when there is no assessed activity.
- Review queue, recall eligibility and reminder counts use the same SAST calendar-day cutoff. Exactly the next midnight belongs to the next day. Historical review timestamps are preserved.
- Thirteen MAT1503 outcome descriptions now state concrete skills using the existing outcome IDs. The guarded metadata repair changed thirteen descriptions and one session title; it did not change learner records, unit/session counts or source text.

## Page-by-page delivery

| Page | Changes |
| --- | --- |
| Overview | Removed full mastery tree, grouped unpublished modules under Coming soon, put withdrawal behind Module options plus confirmation, added a weekly-goal ring and a primary start-today action. |
| Unit overview | Not started / In progress / Completed states, concrete MAT1503 skills, concept topics, reading-time estimates and quiz readiness guidance. |
| Study session | Source library in the workspace menus (no standalone Sources button), nested account utilities, one Companion entry rather than a duplicated footer button, adaptive answer placeholders, measured sticky-control clearance and deduplicated adjacent assessment headings. Cofactor exploration has row selection, entry-to-minor interaction and sign overlays. |
| Unit quiz | Fixed authored banks for 48 current units, 96 original questions; validated at build time. Default requests make no AI call. Optional AI failure uses the bank, never random-word cloze distractors. Mathematical choices render with KaTeX. A–D selection, Enter progression, linear completion and current-unit reading links remain available. Issued attempts keep their own question/key snapshot. |
| Review | Module filters, consistent date policy, a mixed daily set of up to twelve cards across four eligible units, explicit reveal/rating and retained individual-unit review. Ratings are self-assessments. |
| Concept map | Fit-to-view, mouse pan and native touch scrolling, stronger directional edges, full multi-line titles, click-to-open refresher drawer, plain-language estimates. Privacy and availability settings moved to Profile. |
| Practical Lab | Dedicated Unit Converter tab, collapsible notebook rail, draggable matrix basis handles with numeric keyboard alternatives. Specialist tools remain capability-scoped. |
| Progress | Module accordions, separate evidence counters, compact quiz-evidence distribution and a weakest-recorded-outcome link. No prerequisite mastery or four cognitive-facet evidence is invented. |
| Classroom | Purposeful empty-state preview, independent-study guidance and one inline invitation flow. Invitations still require backend ownership/verification checks. |
| Lounge | Content-in-preparation modules are labelled and do not advertise an active room. Existing anonymous presence and shared Pomodoro remain opt-in inside a room. |
| Profile | Vela verification copy, numeric-code validation, relocated tutor/privacy/schedule controls, explicit SAST review policy, muted class-badge preference without an eligible class or assignment, and a non-sending digest preview. |
| About | Public editorial hero and feature cards. |
| Privacy / Terms | Public editorial frame, narrow reading measure, section index, individually spaced anchored sections and responsive layout. Existing operator facts, draft status and policy substance are preserved; no legal approval is implied. |

## Boundaries and follow-up

- The fixed banks are starter practice, not comprehensive exam papers. Expanding them across recognition, procedure, error correction and transfer needs further original items and academic review. Future module onboarding must supply a bank; missing banks fail closed with a lesson-practice alternative.
- The low-level legacy extractive generator remains for compatibility tests; live default generation and AI fallbacks are wrapped by the fixed-bank resolver. Do not wire the raw legacy generator into a learner route.
- Review and activity policy remains explicitly SAST. A per-learner scheduling-timezone override requires a coordinated preference migration, reminder scheduling and historical activity-day policy. A cosmetic timezone selector must not pretend to change that policy.
- The concept map shows practice evidence rather than locking learning access or declaring mastery from sparse estimates. Universal instant/100%-accurate symbolic or conceptual grading is not claimed; unsupported answers remain unverified.
- Timers and predictions are learning tools, not attendance, institutional grades or evidence that a qualification requirement was met.
- Class-badge availability uses the same assignment audience as Classroom, including general assignments for enrolled learners; cohort-only material requires membership and an eligible enrollment. Enrollment alone still does not imply a class.

## Verification

Release checks: 216 unit tests, TypeScript and Prisma validation pass. Fixed banks validate 96 questions across 48 units. Isolated retention tests preserve legal holds, pending deliveries and welcome deduplication. The live retention preview removed nothing. Desktop/mobile production verification is recorded in the release note. A stale local test server was restarted on port 3212 only after its sign-up route also timed out. Port 3211 and source workers were not stopped. The batch is now deployed directly to Azure; see [release verification](azure-release-2026-11-27.md).

## Follow-up: workspace control density

The 27 November screenshot showed an unstyled standalone Sources control. The latest user direction supersedes the earlier audit recommendation to keep that control in the top bar: source access belongs in the desktop More study tools menu and the mobile Study tools drawer. Citations and the source reader are retained. Opening the source reader closes its parent menu.

The mobile More menu had a specificity mismatch that could override its hide rule, leaving duplicate overflow controls. The scoped rule now hides the desktop menu below 960px while keeping the mobile drawer and Display control. The concept map now has labelled evidence swatches; these remain practice indicators, not certified mastery or access locks.

Verification for this follow-up is tracked separately from the earlier Azure release. Do not assume local changes have been deployed.

Follow-up verification: production build, TypeScript, schema validation, formatting and 216 unit tests pass. Three focused browser cases pass (desktop and 360px mobile real MAT1503/MAT1512 source-menu flows, plus server-backed Classroom eligibility); the duplicate mobile-only backend case is intentionally skipped. Checked screenshot layout and confirmed no standalone Sources control or horizontal overflow. Scoped tests cover general assignments, cohort-only assignments, membership and withdrawn enrollments using isolated fixtures. Temporary fixtures from failed setup attempts were recovered and removed; those setup failures are not counted as successful UI checks. Local standalone preview: port 3216. This follow-up is not deployed to Azure.


Scratchpad follow-up: wider generators, domain-aware real expressions/finite limits, isolated substitution notes and exact matrix declaration/equivalence diagnostics are implemented. Rejected lines do not advance the mathematical baseline. Verification and remaining conservative proof boundaries are tracked in learning-tools-task-checklist.md and reference-data-and-practice.md. Azure publication remains separate.
