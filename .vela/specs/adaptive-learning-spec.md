# Adaptive learning and the Academic Master
Version: 1.0.0

## Hard curriculum boundary, soft cognitive bridge

The current module owns sources, assessment criteria, official scope and grading rules. A general analogy may illuminate an idea; it is never retrieved evidence from an unenrolled module, an alternate syllabus or an imported grading rubric. Do not invent textbook pages, exam dates, prior mastery or learner traits.

Positive acceleration means increasing signed velocity; it does not by itself imply increasing speed. Speed increases where velocity and acceleration have the same sign. Check conditions and units in all cross-subject examples. An illustrative page number from a proposal is not a source citation.

Do not infer a prerequisite failure from a downstream wrong answer. Offer a targeted check. Only direct, server-graded concept evidence updates that concept. Recognition, procedure, error correction and transfer remain separate pedagogical requirements; these starter multiple-choice checks do not certify all four.

## Concept definitions and graph governance

Definitions live in `.vela/concepts/graph.json`. The starter registry covers eight concepts and selected real MAT1503/MAT1512 sessions, not every concept in either module or the full qualification. Nodes have stable global identities, explicit versions, curated prerequisite IDs, original short refreshers, a registered problem kind and exact institution/module/unit/session-position mappings.

Validate duplicate IDs, unknown prerequisite references and cycles at load time. Prerequisite edges form a DAG; explanatory cross-subject connections are a separate relation and must not be misrepresented as necessary mathematical dependencies. A concept can map to several modules. Unknown modules do not acquire math tooling or concept assessments through a code-prefix heuristic.

Repository review is the authoring boundary for now. Graph definitions are separate from private learner state in PostgreSQL. A future database authoring UI must preserve review, cycle checks, provenance, versions and scoped authorization; it must not let learners redefine concepts or answer keys.

Register new subject problem generators explicitly. An unregistered generator fails closed. Do not default a future pedagogy or programming assessment to a mathematical template. Conceptual beliefs and debate participation are never automatically scored as mathematical correctness.

## Provisional BKT evidence

The implementation uses the classic four-parameter knowledge-tracing update described by [Corbett and Anderson](https://doi.org/10.1007/BF01099821): a prior, learning transition, guess probability and slip probability. For observed correctness, compute the posterior using the known/unknown response likelihoods, then apply the learning transition for the next practice state.

Current defaults (prior .20, learn .10, guess .25, slip .10) are provisional engineering settings, not fitted population parameters. A reviewed concept can override parameters; its resolved parameters participate in the model fingerprint. Do not silently reinterpret earlier observations under a new parameter version. Four-option MCQs do not establish that actual guessing is uniform. There is no estimated forgetting/retention-decay model or IRT fit. Never invent decay colors, confidence intervals or a root-cause diagnosis from this model.

An untested node is unknown in the UI; do not display the prior as an observed 20% score. A green node means a higher practice estimate with at least three distinct items, not certified mastery. Practice is unproctored and item independence is an assumption, not a guarantee.

`LearningConceptState` is separate from `StudentMastery`, quiz outcome history, AI conceptual feedback and self-rated recall. Existing untagged questions and past aggregates are not retroactively converted into concept evidence. Opening a lesson, revealing an answer, chatting, elapsed study time, photo review and debate do not generate BKT observations.

## Assessment integrity

`ConceptCheck` stores a server-owned immutable question/answer/parameter snapshot, concept/model version, current module/unit and an item fingerprint. Issue only concepts with published mappings in an enrolled module. Return prompt/options/expiry, never the key or private payload before submission.

Submission derives identity from auth, verifies ownership/current enrollment/expiry/version/issued option, then grades and writes the result plus estimate in one transaction. Learner and enrollment advisory locks serialize retries and withdrawal. Replays return the saved result. The same item fingerprint contributes at most once for a concept/model version, even across modules. Expiry is evaluated in SQL; do not parse timezone-less database timestamps in local JavaScript to decide validity.

A failed result write rolls back the estimate. Invalid options, account changes, spoofed scores and unknown concepts fail visibly. No other prerequisite node is updated. These concept checks do not alter institutional marks or the mixed `StudentMastery` aggregate.

## Consent and minimum tutor context

Tutor use of practice summaries and cross-module use are separate controls, both off initially. Cross-module use requires tutor context enabled. With consent, transmit at most four relevant concept summaries plus three recent current-unit/module quiz outcome summaries; never notes, raw answers, names, email, availability or community posts.

When an active session is selected, choose concepts mapped to that session plus their authorized prerequisite ancestors. Quiz outcome summaries stay in that session's unit. Module-only context is broader and the settings preview makes that distinction explicit. Without cross-module consent, use only that module's observations. With it, replay at most 1,000 recent directly assessed checks from currently enrolled modules. Withdrawn-module observations are excluded from tutor context immediately; a retained private global estimate is not an access grant.

`/api/learning/context` provides a human-readable preview derived from the same server projection used by the tutor. It exposes no system prompt or answer keys. Viewing it requires enrollment in the selected module. Privacy opt-out stops sharing on the next request. Reset deletes the learner's concept checks/estimates; notes, ordinary grades and completion remain separate.

## Scheduling and UI

Recommend study blocks only within explicitly entered future availability, up to 25 minutes per block. Store dated ISO instants for at most 14 non-overlapping periods in the next 30 days. Device-local input is converted by the browser; do not infer an exam calendar, employment schedule or external calendar bookings. Availability stays out of the AI prompt.

The Academic Master briefing is a calm dashboard surface and an explicitly opened dock, not an automatic chatbot popup. Ctrl/Cmd+K avoids stealing input from editable fields or another open modal. Preserve the reading route/session/scroll while showing a prerequisite refresher. Use question-first answer gates, accessible keyboard controls, semantic theme tokens and internal graph panning on narrow screens. Private unit notes are fetched only after the learner requests them and are not shared with the tutor.

Self-submission updates local/other-tab views through the shared refresh event. Open learning panels also refresh periodically while visible. Do not call that a new cross-device Neon socket implementation.

## Verification and remaining work

Run the learning-engine unit suite, two-account Academic Master browser checks, existing hints/debate checks and workspace regressions against a completed production build. Validate all refresher/probe KaTeX and independently check numerical keys. Tests must include no-evidence states, consent, source/module/session bounds, withdrawal, resets, repeated items, transactional rollback and scheduling overlap.

Next stages: subject-expert graph review/expansion, calibrated parameters, validated multidimensional assessment, reviewed mappings for ordinary question banks, richer diagnostic evidence, user studies and a formal retention model. Neither a DAG nor BKT alone grants causal diagnostic certainty.

Local-model evaluation found that the installed 1B model could produce schema-valid but semantically bad hints/debate. Guided local modes require an explicit evaluated `OLLAMA_GUIDED_MODEL`; absence returns a visible unavailable status. Native grammar shape constraints do not replace application length/semantic checks. During the current verification Cloudflare returned 429/code 4006 for exhausted daily free allocation. Keep this failure explicit; no paid or canned fallback. Deterministic concept practice continues without AI.
