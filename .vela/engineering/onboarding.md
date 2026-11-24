# Contributor entry points and module onboarding
Version: 1.0.0

Run commands from the `outputs` application directory. Read the status guide before treating a design item as implemented.

## Find the existing implementation

| Concern | Starting points |
| --- | --- |
| Published-content contract | `.vela/specs/manifest.json`, `lib/specs/`, `app/api/generate/`, module publishing/audit scripts |
| Runtime subject tools | `.vela/module-capabilities.json`, `lib/capabilities.ts`, `components/module-capabilities.tsx`, `lib/study/load-unit.ts`, `app/api/capabilities/` |
| Shared interface | `components/learning-frame.tsx`, `components/learning-shell.tsx`, `app/tokens.css`, `app/vela-design.css` |
| Workspace and reader | `components/study-workspace.tsx`, `components/workspace/`, `components/session-reader.tsx`, `app/study/[unitId]/components/` |
| Auth and access | `lib/auth/`, `lib/enrollment/`, `proxy.ts` |
| Tutor and scaffolding | `app/api/tutor/route.ts`, `lib/tutor/` (including `guided.ts` checked drafts), `.vela/specs/tutor-scaffolding-spec.md` |
| Assessments and private recall | `app/api/quiz/`, `app/api/recall/`, `lib/quiz/`, `lib/student/` |
| Evidence/recommendations | `app/api/insights/`, `lib/insights/`, `components/outcome-insights.tsx`, `app/progress/` |
| Concept learning / Academic Master | `.vela/concepts/graph.json`, `lib/learning/`, `components/learning/`, `app/api/learning/`, `app/api/concept-check/`, `app/learning-map/` |
| Community | `lib/social/`, `components/social/`, `app/api/rooms/`, `app/api/discussions/`, `app/lounge/` |
| Data evolution | `prisma/schema.prisma`, `prisma/migrations/`, `scripts/apply-enrollment-migration.mjs` |
| Focused runtime verification | `tests/browser/social-learning.spec.ts`, `tests/browser/tutor-scaffolding.spec.ts`, `tests/browser/sandboxes.spec.ts` |

Paths are entry points, not ownership silos: a cross-cutting change must preserve shared identity, evidence, rendering and access contracts.

## Onboard a module

1. Confirm institution, qualification-module link, trustworthy curriculum/outcome mappings, source permissions and provenance. Distinguish supplied local curriculum criteria from verified official criteria. Do not infer SAQA verification from a qualification ID.
2. Register exact institution/module domains in the generation manifest. Select the universal core plus applicable content extensions. A conceptual module needs its own representations and assessment design; do not paste a maths template over it.
3. Register runtime capabilities independently. Prefer a reviewed explicit registry profile; a trusted version-1 metadata override is available. Debate is appropriate only where premise/evidence challenges serve the learning outcomes. No client can choose its own capabilities.
4. Ingest into the correct embedding space with parser/review metadata. Source OCR, verified blank pages, original teaching and illustrations remain distinct. Never silently reconstruct damaged formulas as verified source text.
   - For CHE1501/PHY1501/PHY1505, follow [`science-ingestion.md`](science-ingestion.md): use the official module guide to establish units/outcomes and map prescribed textbook sections; extract a cited concept inventory; then synthesize Vela teaching with the source prose closed. Assignment corrections are corroboration to verify, not a syllabus authority. Confirm source rights, scientific figures and unit checks before expanding beyond a reviewed pilot.
5. Extract facts, synthesize original teaching, create independent examples and gate answers. Provide visible prerequisites, intuition, reasoning/conditions, common mistakes, prediction checkpoints and appropriate original visuals. Run source-backed QA plus independent subject/editorial review.
6. Preflight before atomic publication. Preserve stable unit/session identities and recorded policy hashes. Document changed examples, revision behavior and existing learner milestones; do not silently award mastery for expanded content.
7. Test enrolled access and direct routes, session-grounded tutor answers, supported/unsupported tools, question-first answers, notes/recall and responsive layout. Unknown module profiles must retain universal learning without specialist clutter.
8. Update the feature-status guide and root API/setup documentation with observed coverage and limits. Separate source coverage, lesson publication, subject correctness, UI tests and live inference evidence.

## Verification commands

```powershell
npm run typecheck
npm run validate
npm run format:check
npm test
npm run build
npm start -- --hostname '::' --port 3200
# In another terminal, against the completed production build:
$env:PLAYWRIGHT_BASE_URL='http://localhost:3200'
npx playwright test tests/browser/social-learning.spec.ts tests/browser/tutor-scaffolding.spec.ts
```

Use a distinct `--output` directory for concurrent Playwright invocations or run sequentially; they otherwise delete one another's trace files. Live AI tests are explicitly enabled with `VERIFY_SCAFFOLD_AI=1` and require the existing configured free provider. Review generated output for hint leakage, genuinely different example results, correct arithmetic, valid math formatting and respectful debate. A passing mock test proves transport/UI behavior only. Do not send test mail or enable reminders for real learners.

## Development strategy

Prefer the smallest coherent free feature: deterministic recommendations, local interactive models and explicitly opted-in collaboration before new paid dependencies. Keep budgets, cancellation and transparent unavailable states. Add subject-specific extensions behind a capability boundary instead of expanding a universal toolbar. Future pedagogy simulations, programming sandboxes or lab representations need their own contracts and quality checks. Distributed rate limits, a fuller moderation audit/appeals workflow, offline synchronization and validated cognitive-facet measurement remain separate roadmap work.
