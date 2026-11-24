# Vela modular specification and masterclass pipeline

## Universal core plus additive extensions

The Next.js application root is `outputs/`; policies live in its `.vela/specs/` directory. Four mandatory files govern every registered module: learning design, mastery, assessment and quality audit. The manifest explicitly maps institution/module pairs to selected domains. MAT1512 selects mathematics + education-pck; COS1511 selects programming; BPT1501 selects education-pck. Unknown or ambiguous profiles fail closed. Module prefixes never select a domain.

Add a domain Markdown file and manifest requirements (minimum session count, section headings, unit evidence patterns). Add a module profile using those domain IDs. The database, generation service and generic study reader need no module-code conditionals. New executable visual types still require a registered, safe renderer; policy text cannot execute arbitrary graph expressions.

Effective specs record ordered policy files, exact file hashes, version and a SHA-256 composition hash. Generation receives the universal core plus its selected extensions. Next.js tracing includes policy files for the authoring route. Changes to selected policy bytes change the hash even if the operator forgets a version bump.

## Two-pass authoring API

`POST /api/generate` requires the same server-side bearer credential as ingestion (`INGEST_API_TOKEN`). Do not expose it to student browsers. All responses are private drafts; this endpoint never overwrites live lessons.

- `action: "spec"`, `institution`, `moduleCode`: inspect effective policy composition, including future registered profiles such as COS1511.
- `action: "generate"`, plus `studyUnitId` and optional free provider `cloudflare` or `ollama`: pass1 extracts schema-checked fact records from bounded ingested source evidence, with validated source IDs. Pass2 receives those records and policies, not source paragraphs. It synthesizes an original structured lesson draft and runs the audit.
- `action: "audit"`, plus the selected unit and `draft: {code,sessions:[{title,markdown,visual,concepts}]}`: validate a proposed draft. A failed audit returns422. Draft sampling is explicitly non-exhaustive; passing this endpoint is not publication approval.

Source OCR remains evidence, not original Vela prose. The generation unit test verifies that source narrative never enters pass2. Fact provenance/schema checks do not prove fact correctness; editorial and numerical review remain necessary.

## Pre-publication gate and database publication

`npm run audit:masterclasses` produces an offline structural report at `.vela/reports/masterclass-preflight.json`. Missing source evidence is an explicit warning, never a completed source screen.

`npm run db:seed:sessions -- --audit-only` runs full registered MAT1512 source-corpus screening without changing lessons. `npm run db:seed:sessions` first stages every unit, checks strict KaTeX, seven layers, answered assessment, privacy/executable-content screens, visual registration, eight-word prose overlap and marked original numerical formulas against source formulas. Any failure prevents all writes. Source formulas are syntax-checked candidates, not independently certified facts.

After all five pass, a bounded transaction atomically publishes the thirty version2 sessions, with policy/file/content hashes in existing StudySession.concepts. Original session identities are preserved by position; newly appended sessions use unit-scoped IDs. Ownership and stale-session guards refuse silent moves/deletion. Notes, mastery and existing personal completion remain intact. The reader explicitly labels the expanded revision and keeps reading completion separate from assessed mastery. Four previously completed sessions become four of six milestones.

The publication receipt is `.vela/reports/publication.json`. No schema migration or ingestion rewrite is needed. This process leaves raw source chunks, provider-separated vectors and private source illustrations intact.

## MAT1512 masterclasses

Each of U1–U5 now has six sessions. Every session includes Intuition first, Visual exploration, Procedure, Interpretation, Common mistakes, Assessment, Application and Pause and Predict. Assessment exercises cover Recognition, Procedure, Error correction and Transfer with worked feedback. The first four conceptual titles/order stay stable; new sessions extend the path. The original source library remains available for the full547-page reference corpus; thirty sessions do not claim to reproduce every source exercise.

Interactive models include removable limits, continuity, secant-to-tangent slopes, Riemann accumulation, chain-rule composition and constrained area optimisation. Models are original and matched to the stated equations. Other visual reasoning uses accessible labelled constructions rather than copied diagram placeholders. Widgets render beside the relevant visual layer rather than only after the complete lesson.

Validation includes strict KaTeX on272 expressions,67 independent exact symbolic/numerical checks, composed-spec coverage tests, source-corpus screening, TypeScript/build checks and authenticated real-unit browser checks. These are checks, not an absolute mathematical proof or plagiarism certificate.

## Regulatory boundaries

The policies reference official POPIA and SAQA resources. They require data minimisation, learner isolation and source provenance; they do not assert legal certification. PCK activities are teaching suggestions. Official CAPS alignment needs a verified phase/grade/edition/page extract before it can be claimed. Local criteria remain CURRICULUM; qualification SAQA metadata does not turn them into SAQA_VERIFIED criteria.

## Final verification

Published and independently verified30 sessions with matching content/specification hashes. All77 tests, TypeScript compilation, Prisma validation and the production build passed. Authenticated authoring-domain selection, notes/recall isolation and widget checks passed. Initial desktop/mobile route walks encountered Neon connection timeouts; both full route walks passed on isolated rerun (desktop about60s, mobile56s), including six sessions per unit, all math rendering, new widgets,17% one-session progress, notes, source library and PDF/PNG access. One duplicate mobile persistence case remains intentionally skipped. App HTTP200 at localhost:3200. These measurements are integration-run times, not individual page-load latencies.
