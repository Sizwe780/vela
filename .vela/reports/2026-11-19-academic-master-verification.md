# Academic Master verification — 19 November 2026

## Delivered behavior

- Dashboard briefing with real enrolled-session completion, concept practice evidence and entered availability.
- An explicitly opened Academic Master dock (button / Ctrl/Cmd+K), selectable prerequisite DAG, original short refreshers with Show answer, private unit-note previews and session prerequisite links without reader navigation.
- Eight curated starter concepts across real MAT1503/MAT1512 sessions. Global concept definitions are reviewed repository data; private estimates/checks/preferences are in PostgreSQL.
- Server-owned parameterized four-option checks with enrollment/ownership gates, atomic result/BKT updates, distinct-item deduplication, saved-result replay and SQL-based expiry.
- Provisional default or reviewed per-concept BKT parameters, with parameter-sensitive model fingerprints. Untested concepts remain unknown. Ordinary course grades and mixed `StudentMastery` are separate.
- Separate tutor-context and cross-module controls, initially off. A readable preview uses the same server projection as the tutor. Active sessions restrict concepts/prerequisites and quiz outcomes; withdrawn modules are excluded. Automatic context excludes notes, answer text, identity, availability and community messages.
- Dated availability (14 periods / next 30 days), suggested blocks up to 25 minutes, own concept-data reset, immediate same-browser refresh and periodic visible-panel refresh.

## Verification evidence

| Check | Observed result |
| --- | --- |
| `npm run typecheck` | Passed on the release source. |
| `npm run validate` | Prisma schema valid. |
| `npm run format:check` | All matched files use Prettier style. |
| `npm test` | 159 passed, 0 failed. |
| Focused backend follow-up | 15 learning/scaffolding checks passed, including independent CAS key checks, graph validation, per-concept parameters, private ownership, rollback, replay, repeated items, availability and quota errors. |
| `npm run build` | Optimized Next.js production build passed. |
| `academic-master.spec.ts` | 2 release desktop/mobile checks passed against the real Neon database and enrolled MAT1503/MAT1512 content using disposable learners. |
| `tutor-scaffolding.spec.ts` | 2 desktop/mobile UI/transport/API-guard checks passed with mocked model text; this is not a live inference claim. |
| `voice.spec.ts` | 4 desktop/mobile mocked browser-speech lifecycle checks passed. Physical microphone/device validation is separate. |
| `workspace-integrity.spec.ts` | 2 real-unit desktop/mobile layout checks passed. |
| Cloudflare live inference | Blocked: embeddings returned HTTP 429, code 4006, daily free AI allocation exhausted. The live hint/debate retest did not pass and remains pending. |
| Quota UX | Actual desktop/mobile hint requests displayed the explicit daily-allowance message and produced no canned assistant card. |
| Database evolution | `20261119010000_concept_learning applied and Prisma migration history verified.` |

The 10 passing focused browser checks are from the release and follow-up runs. An initial combined run had two Academic Master test-selector failures: Next's route announcer also has role alert. The assertion was scoped to the companion; the release rerun passed both projects. A prior test-navigation error also timed out; its disposable records/accounts were recovered from its own trace and cleaned. No real learner records or public course discussions were modified.

The release browser tests checked no-evidence states, two-account isolation, forged ownership/scores, concurrent submissions, current-session relevance, cross-module consent, withdrawal, availability, graph/drawer behavior, keyboard closure, mobile width, reset preservation of notes and late responses with another account's owner ID.

Logs and screenshots live in the private workspace `work/` directory. Do not publish raw Playwright traces: they can contain disposable credentials, cookies or sealed tokens. This report contains no credentials or learner identifiers.

## Ollama findings and deferral

The portable local runtime was initially stopped. The first guided request timed out with the large prompt. A compact whole-paragraph evidence path and native JSON-schema transport improved format checks to roughly 4–15 seconds in the small diagnostic; this did not establish semantic quality.

The installed 1B model echoed instructions and produced inappropriate/schema-valid parallel examples and debate. The local grammar engine also rejected large string-length repetitions; shape-only grammar generation now retains strict application Zod checks. These fixes do not make the 1B model suitable for guided teaching.

The user allowed deferring Ollama. The optional 3B download and this task's local runtime were stopped; the partial download is resumable. Guided local requests now return `LOCAL_GUIDED_NOT_READY` unless an operator explicitly configures an evaluated `OLLAMA_GUIDED_MODEL`. No provider is switched automatically, no paid service was enabled, and Cloudflare remains configured as default.

Native schema transport follows the [Ollama structured-output](https://docs.ollama.com/capabilities/structured-outputs) and [chat API](https://docs.ollama.com/api/chat) documentation. Schema validity is not evidence of teaching correctness.

## Remaining limits

- This is an eight-concept starter graph, not comprehensive assessment of the two modules or the whole qualification.
- BKT parameters are provisional and unfitted; independence is an assumption. No IRT fit, forgetting model, causal diagnosis, institutional grading or cognitive-facet certification is claimed.
- Existing untagged quizzes are not backfilled into atomic concept scores. Their recent current-unit outcome summaries can support the tutor with consent.
- End-to-end new personalized model responses and live hint/debate rechecks must wait for the Cloudflare allowance reset or a validated alternative. Previous live examples are recorded in the earlier report; they do not substitute for this pending check.
- Cross-device concept updates use periodic refresh/focus, while same-browser tabs share refresh events. A new concept-state Neon socket was not added.
- Availability is entered by the learner; exam dates and external calendar bookings are not inferred.
- Wider subject-expert review, graph expansion, parameter calibration, accessibility/device evaluation and production retention/legal review remain future work.

Published lesson identities, source OCR/vector records and conversion-worker binaries were preserved. Only the identified app server was restarted for production builds. The original universal content-spec hashes were not rewritten for this runtime extension.
