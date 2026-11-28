# API

Routes return JSON unless noted. Learner identity comes from the authenticated session, never a supplied student ID. Administrative ingestion/generation uses a server-side bearer token. Mutating learner routes enforce request origin. Real study units and learning APIs require an active or completed enrollment in the module; withdrawn or absent enrollment returns 403 `ENROLLMENT_REQUIRED`. The public sample tutor remains available. Consult each route's validator for the authoritative field limits.

| Endpoint | Contract |
| --- | --- |
| `GET /api/activity` | Own private weekly goal, daily/module study totals and bounded streak; no shared caching. |
| `POST /api/activity` | `{sessionId,trackingId,action:"start"\|"pulse"\|"stop",takeover?}`; enrolled sessions only. Server-clock bounded credit, no identity/duration/date overrides; one active tab lease per learner. |
| `POST /api/email/welcome` | Session-owned, deduplicated welcome queue. Does not accept a recipient override; worker requires the current verified address. |
| `POST /api/email/test` | Delivery test for the configured, verified test account only; one per day, no recipient override. |
| `GET /email/unsubscribe?token=…` | Public, signed confirmation page; GET never changes consent. |
| `POST /api/email/unsubscribe?token=…` | Signed opt-out, no login required; invalid signature 400, superseded consent link 409, stopped/idempotent 200. Supports one-click POST. |
| `POST /api/jobs/email` | Scheduler bearer `EMAIL_JOB_SECRET`, bounded outbox batch; no learner identity in request. See EMAIL_SETUP.md. |
| `GET/PUT /api/profile` | Own display name/goal/preferences and scoped role summary. PUT rejects role/identity overrides; reminders require verified email, configured sending and explicit consent. |
| `GET/POST /api/study-position` | Own latest session per enrolled module; POST takes `{sessionId}` and derives module ownership server-side. |
| `GET/POST/DELETE /api/bookmarks` | Own enrolled-source library. POST `{studyUnitId,sourceType:"session" \| "chunk",sourceId,quote?}`; GET supports optional source filters and cursor; DELETE takes `?id=…`. |
| `GET /api/search?q=…&moduleId=…` | Search visible teaching/questions in enrolled sessions only. Hidden worked answers never enter search excerpts. |
| `GET /api/review` | Due/unpractised outcome counts grouped by enrolled unit; ratings still use `/api/recall`. |
| `GET /api/staff/analytics` | Qualification-scoped cohort aggregates/content checkpoints, guarded by server-owned staff memberships. |
| `GET/POST /api/staff/workspace` | Qualification-scoped staff authoring, review, cohorts, assignments and reports. Administration commands require the qualification admin role. GET accepts `qualificationId` and optional `assignmentId`, `sourceUnitId`, `sessionId` or `export=modules`. |
| `GET/POST /api/classroom` | Own assignments, feedback and announcements. POST accepts `submit` for enrolled assignments or `claim` for verified-email invitations. See [Teaching and administration](TEACHING_WORKSPACE.md). |
| `GET /api/enrollments` | Own enrollment records with qualification/module summaries, including withdrawn modules. Private and uncached. |
| `POST /api/enrollments` | `{action:"enroll",qualificationId,moduleIds}` creates/reactivates up to 40 distinct qualification modules atomically. `{action:"withdraw",enrollmentId}` revokes access while preserving work. `{action:"complete",enrollmentId}` requires all published sessions complete. Identity fields are rejected. |
| `POST /api/tutor` | `{studyUnitId, sessionId?, query, mode: "academic" | "pck", provider?, history?, live?}`. Streams Vercel AI SDK UI message events and citation data. Session must belong to the selected unit. |
| `POST /api/tutor/voice` | Pass `?studyUnitId=…` for enrolled-unit microphone turn transcription; browser audio playback is separate. This is turn-based voice, not a full realtime audio protocol. |
| `POST /api/quiz/generate` | `{studyUnitId, provider?}` generates a stored attempt with hidden answer keys. Live `auto` and `heuristic` requests use a fixed original unit bank (`provider: "bank"`) without an AI call. Explicit AI providers have a 20-second generation deadline and a bank fallback. Missing banks return a not-ready error; random-word cloze distractors are not issued. |
| `POST /api/quiz/submit` | `{attemptId, answers:[{questionId,value}]}` evaluates the learner-owned attempt and updates mastery transactionally. Supported short expressions use a bounded local symbolic checker. Feedback status is `correct`, `incorrect` or `unverified`; unverified items do not enter score denominators or mastery updates. `score` is null when no item can be graded. Old stored results remain unchanged. |
| `GET /api/notes?studyUnitId=…` | Returns `{body,revision,updatedAt,ownerId}` for this learner. |
| `PUT /api/notes` | `{studyUnitId,body,revision,ownerId?}`. Maximum 16,000 characters; stale revisions/account changes return 409, preserving the editor's draft. |
| `GET /api/sessions?unit=…` | Returns own completed session IDs. |
| `POST /api/sessions` | `{sessionId,complete}` changes own completion; completion does not overwrite assessed mastery. |
| `POST /api/recall` | `{action:"queue",studyUnitId,chat?}` retrieves cards; `{action:"rate",studyUnitId,chunkId,rating}` records a rating from 0 to 1. Ratings schedule future practice; they are self-reports, not grades. |
| `GET /api/progress`, `/api/mastery` | Own learner progress and mastery, with no shared response caching. |
| `GET /api/progress/live` | Authenticated progress updates through the configured realtime service. |
| `GET /api/catalog`, `/api/modules/[code]`, `/api/reading` | Curriculum lookup and paged reading; retain each handler's authorization checks. |
| `GET /api/chunks/[id]?unit=…` | Authorized source citation preview scoped to its unit. |
| `GET /api/sources/[document]`, `/api/figures/[asset]` | Authorized, validated source files/assets. Source PDFs support range reads and integrity checks. |
| `POST /api/ingest` | Administrative structured Markdown/LaTeX ingestion with module/outcome/criterion provenance, chunking and provider-specific vectors. See [MATH_PIPELINE.md](MATH_PIPELINE.md). |
| `POST /api/generate` | Administrative spec-driven draft generation/audit; publication remains a separate reviewed process. |

The tutor serves sample responses for `studyUnitId: "demo"`, regardless of `provider` or the legacy `live` flag. Tutor explanations in enrolled units use the persisted active session and unit-scoped retrieval. Voice upload requires an enrolled unit. See [MAT1512_INGESTION.md](MAT1512_INGESTION.md) for ingestion payload examples.

Public curriculum data caches for 60 seconds; the home enrollment dashboard shell is request-bound. Study/quiz authentication, notes, quiz attempts, recall, session completion and progress remain request-bound. Do not place learner objects inside curriculum cache functions.


Session deep links use `/study/[unitId]/sessions/[sessionId]`, with unit membership and enrollment validation before content renders. Email OTP calls go through Neon's installed Auth SDK (`emailOtp.sendVerificationOtp` / `emailOtp.verifyEmail`); codes are entered in the profile form, not logged or stored by the LMS.

### AI learning tools

- POST /api/tutor/photo: confirmed crop to structured transcription, enrollment/session gated.
- POST /api/tutor/diagnose: AI review of student-confirmed numbered working; no mastery award.
- POST /api/tutor/teach: issue or submit a session-bound conceptual attempt; server-only grading and capped points.
- GET /api/tutor/teach: private conceptual-points summary.
- POST /api/tutor/voice: bounded Cloudflare recording fallback.

See [AI_TUTOR_TOOLS.md](AI_TUTOR_TOOLS.md) for exact payloads, privacy and validation limits.

### Private practice notebook

Authenticated `GET`, `POST` and `DELETE /api/practice-notebook` list, save and delete account-owned mathematical practice copies. Saves are strict, bounded and idempotent by UUID; optional snapshot.notes holds separate ungraded working notes, and exact matrix snapshots accept an explicit overall-equivalence check; they never accept feedback/grades or update mastery. See [PRACTICE_NOTEBOOK.md](PRACTICE_NOTEBOOK.md) for payloads, capacity, export and replay behavior.


### Guided tutor strategies

`POST /api/tutor` additionally accepts `strategy: "coach" | "debate"` (default coach) and optional integer `hintTier: 1 | 2 | 3`. Debate and hints cannot be combined. The server resolves capabilities from the authorized module; debate or PCK without the relevant capability returns 400. Sample-only tutoring rejects adaptive hint/debate requests; live inference plus published session or retrieved evidence is required. Citation stream metadata records the requested strategy/tier. No mastery writes occur. Guided replies pass a bounded JSON drafting/format/math check before entering the message stream. Parallel examples check private reported results for equality (including bounded numeric/fraction equivalents) and reject matching explicit solution assignments. One redraft is allowed; a second rejection returns 503 HINT_REVIEW_REQUIRED. Internal result fields are never returned. These checks are not a general semantic/proof verifier or a guarantee of zero answer leakage. Normal conversation retains incremental inference streaming.

### Outcome evidence and opt-in collaboration

- `GET /api/capabilities`: own enrolled capability union, ownerId and scoped moderation availability.
- `GET /api/insights`: own outcome evidence, dated recent quiz/concept histories, legacy mixed score and deterministic recommendations. Recent attempt history covers 90 days, bounded at 1,000 per evidence type. No peer data.
- `GET /api/rooms`: own enrolled module picker; with moduleId, anonymous peer count, server clock and optional sealed query (`live=1`).
- `POST /api/rooms`: `{ownerId,moduleId,trackingId,action:"join"|"pulse"|"leave"}`. One 90-second lease per own module; another active tab conflicts. Heartbeats/resealing every 25 seconds; hidden tabs leave. Live expiry uses a server timestamp parameter because Neon does not permit time-dependent SQL expressions; expired counts converge at the next refresh.
- `GET /api/discussions`: authorized `studyUnitId,sourceType:"session"|"chunk",sourceId`, optional anchor/live. Canonical visible paragraphs, sourceHash, root counts and bounded recent thread/reply DTOs. Hidden answers excluded. All activity is opt-in at the client; read routes still check enrollment.
- `POST /api/discussions`: `{ownerId,id,studyUnitId,sourceType,sourceId,sourceHash,anchor,body,parentId?}`. Server verifies canonical source/version/anchor, parent scope, idempotency and posting limit. Peer IDs/emails are never returned.
- `PATCH /api/discussions`: `{ownerId,id,action:"report"|"remove"}`. Reports deduplicate; removal is own author or enrolled scoped staff. Removed text is tombstoned.
- `GET /api/discussions/moderation`: active reported posts within enrolled staff qualification scopes only. Staff-action reasons/audit/appeals remain future work.

All private APIs use no-store responses. Presence, chat, discussions, reading completion and answer reveal do not establish assessed mastery. Realtime subscriptions expose only authorized aggregate counts, never presence identities or private text.

### Academic Master and concept practice

- `GET /api/learning?moduleId=…`: authenticated own mapped concept graph, provisional estimates, reading counts, deterministic recommendations, saved context controls and suggested periods. A supplied module requires enrollment.
- `GET /api/learning/context?moduleId=…&sessionId=…`: enrollment-gated readable preview of permitted tutor summaries; session is optional and must belong to that module. The same projection feeds the tutor. No notes, answer keys, raw responses or system instructions are returned.
- `PUT /api/learning`: strict `{ownerId,tutorContext,crossModule,availability:[{startAt,minutes}]}`. Both controls default false. Up to 14 non-overlapping future periods within 30 days; durations 10–120 minutes. Cross-module context requires tutor context enabled.
- `DELETE /api/learning`: strict `{ownerId}` deletes own concept checks/estimates only. It does not delete ordinary quiz/mastery, notes or completion.
- `POST /api/concept-check`: strict issue `{action:"issue",ownerId,moduleId,conceptId}` or submit `{action:"submit",ownerId,checkId,choice:"a"|"b"|"c"|"d"}`. Server-owned source mapping, question, answer and BKT parameter snapshot; 30-minute expiry; saved-result replay; repeated item fingerprints do not earn extra observations. Only the directly assessed concept changes, with an atomic result/state write. No `StudentMastery` writes.

Tutor personalization is optional and uses authorized current-session concepts/prerequisites plus recent current-unit quiz outcomes. Cross-module consent permits related estimates only from currently enrolled modules. The bounded recent replay and provisional parameters are disclosed; no unobserved prerequisite diagnosis or retention decay is inferred. Concept maps currently cover eight starter concepts rather than full-module/full-qualification assessment.

Local guided requests return `503 LOCAL_GUIDED_NOT_READY` unless the operator configures `OLLAMA_GUIDED_MODEL` after evaluation. The native structured local path uses compact whole-paragraph evidence and keeps application Zod checks; it is not silently replaced by Cloudflare. Ordinary provider behavior is unchanged.

### POST /api/practice/check

Authenticated, same-origin formative feedback for a published lesson exercise. Accepts ownerId, studyUnitId, sessionId, version, title, question and attempt (1–6000 characters). The server verifies enrollment and matches the exercise to the stored session, loading its own worked reference. Returns ownerId, verdict (correct/partial/incorrect/unverified), feedback, nextStep, method: ai and masteryUpdated: false. Responses are private/no-store. Exact local quantity/choice checks remain client-side; broad written feedback uses the existing free-provider coach chain and request allowance. Invalid/ambiguous source, stale revision, account change, withdrawal or unavailable provider never become a failing grade. This endpoint stores no attempt history and awards no mastery.

### Retention operations

`GET /api/support/retention` previews bounded eligibility and deletion review deadlines for the configured, verified support administrator only. `POST` creates or releases a documented legal hold; same-origin protection applies. Neither endpoint runs deletion. `npm run retention:preview` produces aggregate counts; `retention:apply` additionally requires the exact database hostname and approved policy version. Inactive accounts are review candidates only. Provider logs/backups require separate configuration.


## Durable formative practice and contextual references

`GET /api/practice/attempts?studyUnitId=...&sessionId=...&version=...` returns only the authenticated learner's current-version saved answers. `PUT /api/practice/attempts` accepts ownerId, studyUnitId, sessionId, version, canonical title/question, draft, submitted, revision and optional UUID mutationId. Enrollment, canonical exercise and optimistic revision checks run on the server. Local checks are recomputed; client verdicts are not accepted. Submitted working has a separate history. These records do not award assessed mastery.

`POST /api/practice/check` saves verified AI review feedback against the unchanged attempt and returns attemptRevision. AI feedback remains an estimate. `GET /api/practice/review` lists private queued current-version exercises; `POST` takes `{action:"queue",id}` or `{action:"rate",id,rating}`. Ratings schedule review only. All routes are private/no-store and writes enforce same-origin requests.

The legacy optional `autoStartTimer` profile field is accepted for compatibility but no longer controls recording: real enrolled lessons start automatically, pause after 10 seconds without activity, and resume on interaction. Hidden/unfocused pages and one-active-tab protections remain enforced. Account export includes attempts/submissions; verified deletion removes them. Device practice drafts are owner/session/version-scoped plaintext localStorage, distinct from encrypted downloaded lessons, and can be cleared in Profile or on sign-out.

Reference drawers lazy-load local sourced snapshots, preserve the mounted exercise and insert values into working. Module capabilities control visibility; formula entries are institution/module scoped. Source/provenance and scientific limits: `.vela/engineering/reference-data-and-practice.md`.
