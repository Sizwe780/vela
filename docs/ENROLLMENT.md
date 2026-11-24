# Student enrollment and content readiness

## Student journey

Email signup → `/onboarding` → select qualification → select modules → enrollment is created → home dashboard or the originally requested study unit. Returning learners use **Choose modules** on the home dashboard. Module overview pages also link to the picker.

The enrollment links a Neon Auth subject to the composite `QualificationModule` key, preserving qualification/year context when a module is reused across courses. No client-supplied student ID is accepted. Batch selection validates every mapping before writing and is idempotent. A future tenant must remain part of the qualification/catalog authorization boundary; titles and source registry entries already carry institution context.

- **active:** study and practice access.
- **completed:** all published sessions completed; continued review/practice access. This is personal completion, never an institutional grade or qualification award.
- **withdrawn:** learning access removed. Notes, quiz history, session completion and mastery are retained; re-enrollment restores access.

Finishing/undoing a session recalculates enrollment completion. An explicit complete request also checks all published sessions. Existing learners are not silently enrolled in the whole catalog; they select modules while keeping their existing work.

## Access boundary

Authentication and enrollment checks occur before loading protected page data, retrieving chunks or calling AI providers. They cover study and quiz routes, tutor, unit-scoped voice transcription, notes, recall, session progress, readings, citations, original PDFs and figure assets. Figures must belong to an accessible module's structured source record. A completed enrollment in another qualification that shares the module also permits access.

The public catalog contains module/unit titles. The demo remains public and does not award mastery. Enrollment/learner responses are private and uncached; public curriculum caching never caches an enrollment decision.

## Migration

The additive migration is `prisma/migrations/20261117190000_enrollment/migration.sql`. It creates the enum/table/indexes and composite foreign key, with a short DDL lock timeout. It does not backfill enrollment or change content/progress.

Normal deployment uses `npm run db:deploy`. In this Windows ARM64 environment the native Prisma schema engine failed without a diagnostic. The reviewed fallback `node scripts/apply-enrollment-migration.mjs` applies this one known migration transactionally through PostgreSQL, checks all earlier migrations, uses a bounded lock and records the exact checksum in Prisma's migration ledger. It is repeatable and refuses unfinished prior migrations. Build continues generating only the separate app client; conversion's existing binary client is untouched.

## Source readiness

```powershell
npm run audit:modules
npm run mat1503:status
npm run mat1503:watch
```

The audit writes `.vela/reports/module-readiness.json`: actual database coverage against the planned source hashes/unit mappings, KaTeX and exercise parsing, composed-spec checks, figure hashes and provider-specific missing vectors. Authored lessons and source OCR are reported separately. Source OCR remains machine transcription unless explicitly source-compared; syntax checks do not certify every mathematical assertion.

The final 17 November audit verified MAT1512's 547 planned pages for Cloudflare and Ollama, 30 sessions, 179 exercises and 689 figure assets. MAT1503 completed all 192 planned physical pages in Cloudflare, with 78 sessions, 468 exercises and 153 figure assets; its authored lessons also have Ollama embeddings. Nine mathematical source holds were repaired, and the remaining held page was visually confirmed blank. The audit distinguishes its 191 instructional pages from that blank page. No review holds remain. Use the status command and audit report for current counts after future imports.

The repairs remove only verified decorative end-marker OCR aliases, preserve display-equation tags, restore omitted matrix notation on PDF page 40, and correct a conjugate-product transcription on page 736 against the source. Evidence is recorded in each repaired document's review notes and the private `work/mat1503/review-20261117` report.
