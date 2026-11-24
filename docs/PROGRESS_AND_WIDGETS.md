# Progress, widgets and completed conversion

MAT1512 source conversion completed on 7 November 2026: 547/547 pages, no held pages, and full Ollama and Cloudflare coverage. `conversion-audit.json` records the independent database audit: all five unit page totals, 689 hash-verified figure assets, zero missing 768-dimensional vectors and zero structured Markdown math syntax failures. Syntax validation cannot establish OCR semantic correctness.

## Reading and illustrations

The 20 Vela-written sessions are the core learning path, not a rewrite of every source exercise. Each real unit now has a **Source library** drawer with a deduplicated page index, on-demand structured reading, extracted source illustrations, machine/review provenance and original PDF links. This keeps the initial unit route small and makes all converted reference pages accessible. Original PDF comparison remains necessary for OCR uncertainty; extracted figures are reference material, separate from original interactive teaching visuals.

## Safe chat widgets

`ChatWidget.tsx` renders responsive SVG quadratic graphs, secants, tangents, limiting secant slopes and vector components. Quadratics accept bounded `[a,b,c]` coefficients and show the actual equation. Sliders change x, h or vector components. Only registered data is accepted; no expression evaluation or arbitrary executable model code.

The shared CompanionChat/CompanionAnswer parser supports:

```text
<widget type="secant" data='{"coefficients":[2,-1,0],"label":"Compare nearby slopes"}' />
```

Existing `render_widget` tags and complete fenced `widget` JSON frames also work. Invalid, oversized-parameter and incomplete frames are discarded, and messages have at most three widgets. Widget delivery remains model-dependent; live UI execution is tested with controlled streaming frames, separately from provider connectivity.

## Personal progress

The unified header shows completed sessions and a ring, alongside assessed mastery. The dashboard shows unit/session counters, module completion and registered qualification module completion. Unpublished modules remain incomplete. Counts derive from the database; they do not pretend the planned 40-module catalogue is already populated.

Session completion atomically saves SessionProgress and initializes missing StudentMastery outcomes at zero. It is idempotent and never overwrites quiz scores, recall ratings, attempts or due dates. Reading is not evidence of assessed competence. Quiz submissions and recall ratings update mastery through their existing grading/scheduling routes.

Successful session completion, recall ratings and quiz submissions dispatch a local refresh and BroadcastChannel notification. Open dashboard tabs and the header reload learner-scoped data immediately. Returning focus also refreshes. This is same-browser synchronization; it does not promise cross-device push.

## Repeat checks

From the application directory, with the Windows runtime shim when needed:

```powershell
$env:NODE_OPTIONS='--require=./scripts/windows-runtime.cjs'
npm run typecheck
npm run validate
npm test
npm run build
npm run audit:conversion
npm run test:e2e
```

No migration, worker restart or ingestion rewrite is needed for these features. The audit is read-only. Browser persistence tests use temporary learners and clean their data up.

## Verification result

TypeScript, Prisma validation, production build and 69 tests passed. Authenticated browser checks passed on desktop/mobile: all five routes, 20 session renderings, persisted milestones and header ring, personal notes, recall scheduling, idempotent completion without overwriting mastery, learner isolation, cross-tab dashboard sync and graph sliders. One repeated mobile persistence case is intentionally skipped.

Live provider checks passed for Ollama (after restarting its stopped server) and Cloudflare: 768-dimensional query embeddings and actual model responses. Authenticated original PDF byte-range delivery and extracted PNG delivery also passed.

The optional authenticated live-RAG check (`VERIFY_LIVE_AI=1` with the desktop structured browser test) retrieved six real MAT1512 source citations and streamed actual answers with each provider. Results are in `live-tutor-check.json`. The local Ollama chat request took about 2 minutes 38 seconds on this laptop; Cloudflare completed much faster. This verifies connectivity/retrieval/streaming, not mathematical accuracy of every generated explanation.
