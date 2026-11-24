# Personal notes and active recall

## Personal notebook

`StudyNote` stores one Markdown notebook per Neon Auth learner subject and study unit. It follows the existing `StudentMastery.studentId` identity convention and has a foreign key to `StudyUnit`. Notes remain private through session-derived ownership on every read and write; request bodies cannot select another learner.

`GET /api/notes?studyUnitId=…` returns the current notebook and revision. `PUT /api/notes` accepts `{ studyUnitId, body, revision, ownerId? }`. The optional owner hint rejects a queued draft after an account change; it never selects the account being written. Writes use an atomic compare-and-swap upsert. A stale revision returns 409 instead of overwriting another tab. Notes are capped at 16,000 characters and requests enforce the existing origin policy.

The **My Notes** header button opens a keyboard-accessible side drawer. The editor autosaves after 750 ms, serializes writes while typing continues, flushes when closed, and retains failed drafts for retry. Write/Preview tabs support Markdown and KaTeX. “Clip to Notes” appends the chosen answer card with its heading and mathematical notation. Pending clips are consumed once. The notebook resets when learner identity or unit changes, and uses a best-effort keepalive flush on unmount. Leave the editor open until it reports Saved; the browser warns on full-page exit with an unsaved draft. For a revision conflict, copy the draft before reloading the server copy.

The additive migration `20261107000000_study_notes` was applied transactionally and recorded with its checksum in Prisma's migration history. The scoped `scripts/apply-study-notes.mjs` uses verified Node TLS and is safe to rerun. No existing tables or content records were rewritten. Only the application client was regenerated; the ingestion client was left intact.

## Recall and spaced reviews

The header **Practice active recall** button now opens the shared assessment modal. The quiz page and floating reader toolbar reuse the same component. The full graded quiz remains accessible from the modal.

The queue selects unseen/due outcomes for the signed-in learner, deduplicates provider copies, and prefers structured ingestions when available. Cards extract source formulas or definition/teaching paragraphs without a model key. Source-linked conversation cards remain supported. Reveal the answer, check its source, then choose **Again**, **Good** or **Easy**. These are self-assessments, not official academic marks.

- Again sets the score to 0 and schedules a retry in ten minutes.
- Good sets the score to 0.7 and expands the prior review interval by 1.7, with a one-day initial interval.
- Easy sets the score to 1 and expands the interval by 2.5, with a three-day initial interval.
- Intervals are capped at 365 days. The score, attempt count and review dates are updated together in `StudentMastery`.

When nothing is due, **Practice ahead / retry** can retrieve future cards. Scheduling is outcome-level because the existing mastery model tracks outcomes, rather than independent per-card memory states.

## Vela-written pedagogy

The shared system-prompt builder used by `/api/tutor` now requires Intuition First, Multi-Layered Scaffolding, and Pause and Predict. It asks the tutor to teach in its own words, preserve essential equations, cite supporting passages, label invented analogies, and avoid invented CAPS policy. Explanations stay proportionate to the question. Existing evidence and citation rules remain in force.

## Verification

TypeScript, Prisma schema validation, 66 unit tests and the production build passed. Browser checks cover autosave persistence after reload, equation clipping, unit/learner isolation, revision conflicts, source-backed recall ratings, and the dashboard mastery response. Temporary learners, notes and mastery fixtures are cleaned up. The persistence scenario runs once on desktop; mobile checks exercise the same drawer UI and header controls with controlled fixtures. The bulk ingestion worker continues independently.

Final results: 66 unit tests passed; 11 browser tests passed, with the duplicate mobile persistence scenario intentionally skipped. TypeScript, Prisma validation and production build passed. Real-browser tests also verified owner-hint rejection after an account switch. The app remains on localhost:3200. The bulk worker advanced to 387/547 pages with zero review holds during implementation.


Session refactor verification: notes autosave, clipping, isolation and recall ratings were re-tested on the real units after their primary reader switched to conceptual sessions. Unit identity stayed stable, so existing notebooks and mastery did not need remapping.
