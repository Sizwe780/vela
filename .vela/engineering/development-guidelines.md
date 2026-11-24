# Contributor restrictions and delivery workflow
Version: 1.0.0

## Before coding

- Read `AGENTS.md`, relevant installed Next.js documentation and the relevant provider skill/reference for the installed version. This application has moved beyond its initial Next.js 15 target; verify installed APIs.
- Inspect existing implementation and the feature-status guide before declaring a capability missing. Extend shared services instead of creating parallel identity, grading, rendering or enrollment systems.
- Identify the feature's scope: universal, subject-specific, institution-specific, or operator-only. Register specialist tools explicitly. No module-code-prefix heuristics or domain-specific branches scattered through generic components.
- Establish what is evidence, what is an AI estimate, and what is merely participation. A feature specification is not a compliance certificate or learning-outcome study.
- Before onboarding a subject, register its exact institution/module profile and domain extensions in `.vela/specs/manifest.json`; inspect `module-support-spec.md` for runtime capabilities. Chemistry and physics use `.vela/specs/science-content-spec.md`, BIPM SI guidance, current IUPAC references where applicable, UNISA source material and qualified review. Never imply that KaTeX parsing, CAS arithmetic, an OCR confidence score or a visual sandbox verifies science correctness by itself.
- For science ingestion, preserve formula/source provenance, validate `\\ce` through the production Markdown renderer, retain reviewed/hash-addressed figures, and gate dimensions/units and subject widgets on explicit tested support. Unimplemented requirements must remain documented as blockers or human-review items, not be papered over by generated text.

## Data and authorization

- Authenticate every private API. Derive identity on the server; reject identity/role/score injection. A frontend visibility check is not authorization.
- Recheck active/completed enrollment for real unit/source access. Staff authority requires actual qualification-scoped membership, not the display role on a profile. Keep institution/module boundaries intact.
- Bind drafts and asynchronous responses to the current account and source. Account/session/provider changes must stop inappropriate voice/context reuse. Never save an old account's draft under a new identity silently.
- Keep database keys, model credentials and realtime secrets out of the client, logs, screenshots and committed files. Use private uncached responses for learner data. Do not cache authenticated HTML/API data in the public service worker.
- Community posts require an explicit posting action. Never publish private highlights/notes, infer consent from enrollment, or send welcome/reminder/community messages as a side effect of a test against real recipients.
- Reports and staff moderation need scope checks. Removing a post redacts its body; document remaining reply/report retention honestly. Final operator/legal retention decisions remain outstanding.

## Evidence integrity

- Opening a drawer, revealing an answer, requesting a hint, joining a room, debate participation, elapsed time and confidence ratings do not establish assessed mastery.
- `StudentMastery` currently mixes practice and recall updates. Label that aggregate honestly. Use submitted quiz results and verified conceptual-review records to show separate histories. Never fabricate historical provenance or four cognitive-facet scores from an aggregate.
- Trend windows, result limits, denominators and missing evidence must be visible. Different quiz questions can change scores; a score difference is not proof of learning gain.
- Concept BKT estimates live in `LearningConceptState`; only directly assessed, versioned `ConceptCheck` results update them. Never recursively score prerequisites, reinterpret old untagged quizzes or label a practice estimate as an institutional grade. Honor separate tutor/cross-module context controls and active-session/enrollment boundaries; reset only the private concept evidence requested.
- Recommendations explain their actual basis and remain suggestions. Current recommendations can be deterministic and free of inference. Do not claim predictive personalization that has not been measured.

## Mathematical and conceptual teaching

- Verify signs, domains, hypotheses, units, interval boundaries, singular cases and exact original examples independently. KaTeX success alone is insufficient.
- Preserve the distinction between signed and geometric area; finite approximation and limit/proof; real eigendirections and unchanged vector length/orientation; unsupported checks and incorrect answers.
- Conceptual subjects require defensible reasoning, premises, evidence, contextual limits and counterarguments. Do not manufacture a unique correct teaching method or present a devil's-advocate position as official policy.
- Tiered hints must obey the requested level and protect the actual task's answer. Tier 3 uses a genuinely different parallel example. Keep generated worked examples question-first with gated solutions.

## Changes and migrations

- Use additive migrations, stable learner/unit/session identities and explicit content revision behavior. Do not reset or reseed production data to make tests pass.
- Preserve active OCR/conversion work. Do not kill all Node/Python processes, lock source tables unnecessarily, regenerate a binary Prisma client used by a worker, or restart a source worker merely to deploy a frontend feature.
- This app uses the generated `appClient` with the node-postgres adapter. Use the existing database/project and appropriate pooled/direct connections. On this Windows environment the native Prisma migration engine has failed; the reviewed transactional migration runner is an available fallback and records checksums/history. Do not mark a failed migration applied without actually executing and verifying it.
- Keep development and production build directories separate. Finish a build before starting its production server. Stop only the identified app process when a restart is necessary.

## Verification and handoff

- Run typecheck, schema validation, appropriate tests, formatting checks and production build. Focus tests on real contracts and failure modes; avoid tests that only mirror code.
- Check real enrolled routes and module capability boundaries. Test two-account isolation, retries, withdrawal, source changes and moderation scope for collaborative features.
- Use clearly isolated synthetic fixtures for test posts and grades. Never publish QA posts into real module discussions or mutate real student records. Clean up only fixtures created by the test.
- Distinguish mock transport/UI tests, live provider tests, physical handwriting/microphone tests and completed source audits. Do not generalize a synthetic fixture into a guarantee about real handwriting, accessibility or AI correctness.
- Verify actual socket updates separately from periodic refresh; label fallback honestly. Include expiry/visibility/cancellation and account-switch behavior.
- Update root setup/API guides, the gap tracker and `.vela/engineering/feature-status.md` with observed results and material limitations. Do not call planned or unverified work complete.

Use readable components, shared semantic CSS tokens, light mode by default, explicit dark preference, compact headers and mobile overflow controls. Keep teaching text readable and controls keyboard-labelled; automated checks do not replace a manual screen-reader audit.

Use the public frame for discovery and policy pages and the learning frame for private learner routes. Keep the primary task and its controls visible at the current pane width. Put supporting lists and technical details behind labelled disclosures when they would push reading or practice below the fold. Verify resizing on real unit routes, including tablet widths between the desktop split and mobile tabs.
