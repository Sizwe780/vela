# MAT1512 conceptual session architecture

All five registered units now default to four authored sessions each. The generic `StudySession` and `SessionProgress` models support other modules without MAT1512 branches in reader components. Notes and mastery remain attached to the existing internal unit/outcome IDs, so the readable routes do not create duplicate units or notebooks.

| Unit route | Conceptual milestones |
|---|---|
| `/study/MAT1512-U1` | Approaching a value; continuity and precise control; infinity/asymptotes; domains and inverses |
| `/study/MAT1512-U2` | Average to instantaneous change; differentiation rules; differentiability; local linear models |
| `/study/MAT1512-U3` | Nested changes; implicit/logarithmic methods; related rates; extended derivative reference |
| `/study/MAT1512-U4` | Extrema and theorems; shape and indeterminate limits; optimisation; rational-curve synthesis |
| `/study/MAT1512-U5` | Accumulation; fundamental theorem; substitution; net change versus total travel |

## Content pipeline

`scripts/seed-sessions.ts` makes a separate source-fact inventory under `../work/session-audit/`, extracting mathematical expressions and chunk provenance without exporting source narrative as lesson text. Extracted expressions are syntax-checked candidates, not a claim that machine OCR is semantically perfect. The synthesis module, `content/mat1512/sessions.ts`, is independently authored and does not import those source files or source paragraphs.

Each session uses an intuition hook, scaffolded reasoning, original worked examples and Pause and Predict checks. Standard mathematical definitions, theorem conditions and formulas are retained as mathematical facts. Examples use independently selected values and contexts, rather than copied problem sets. The seed rejects matching eight-word prose sequences against the available ingested source corpus and exact long numerical formulas in worked-example sections. All lessons passed these checks. These are useful automated guards, not a guarantee against every form of similarity.

The lessons form a core conceptual path, not a page-for-page rewrite or a claim to replace every source exercise. Source PDFs and OCR ingestions are retained separately for audit and grounded tutor retrieval. They are not displayed as the default lesson narrative. No copied source figures or figure placeholders occur in the session content.

## Mathematical and visual verification

Every session is validated with the same strict KaTeX parser used by ingestion. `scripts/verify-session-math.py` independently checks 27 worked-example calculations with exact SymPy arithmetic and differentiation/integration. The checks include first-principles rates, signs, quotient/chain rules, implicit points, extrema, Riemann sums, substitutions, rational-curve derivatives and signed-versus-total travel. These checks do not constitute a formal proof of every explanatory sentence; course editorial review remains appropriate.

Original SVG widgets illustrate the removable limit at 13, a piecewise continuity assignment, the secant-to-tangent rate for `2t²+3`, and rectangle accumulation for `3t+2`. Sliders update the coordinates and displayed quantities directly. Fixed registered widget implementations do not execute model-supplied code.

## Routing, loading and progress

Routes accept either the internal ID or a unique unit code. Ambiguous codes fail closed rather than selecting an arbitrary institution's unit. The home library links to the code routes. The lightweight lesson loader selects only session bodies, unit metadata and outcomes; it does not send all source ingestions/chunks to the browser. Browser checks bound each unit response below 200 KB. Switching milestones is local React state and does not fetch another source page.

Citation excerpts load on demand through an authenticated, unit-scoped API. The source drawer keeps original evidence distinct from authored instruction. Session completion is learner-owned, idempotent and saved separately from assessment scores. Completing a milestone is a personal progress marker, not evidence of official academic attainment.

## Reproduce

```powershell
# From the app directory, after the base curriculum is registered:
node scripts/apply-study-sessions.mjs
npm run db:seed:sessions
```

The additive migration is recorded in Prisma migration history; the script is safe to rerun. Session IDs are stable, so reseeding preserves learner milestone records. Content version changes and any policy for invalidating previous completion should be deliberate future editorial decisions.

The background converter was briefly checkpointed to load the hyperbolic-operator fix, then resumed. Four held Stewart pages used unsupported `csch`/`sech` command names; standard operator notation repaired their rendering without changing signs or expressions. All four were published and review holds returned to zero.

Validation: TypeScript, Prisma validation, 68 unit tests, production build and exact CAS checks passed. Production browser checks cover all five routes and all 20 sessions on desktop/mobile, lazy evidence previews, personal notes, recall ratings, learner isolation and progress persistence. The duplicate mobile database-persistence scenario is intentionally skipped; mobile notes/recall interfaces are exercised separately.

Final verification: 11 production browser checks passed (one duplicate mobile persistence scenario skipped). A strengthened additional desktop check confirmed a saved milestone returns disabled after reload and the progress bar restores value 1. All five routes and all 20 sessions were checked on desktop/mobile; the production app remains running. Latest conversion check: 515/547 pages, zero review holds.

