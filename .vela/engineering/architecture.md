# Architecture and trust boundaries
Version: 1.0.0

## Learning hierarchy

Institution/qualification → registered qualification-module link → study unit → conceptual session → learning outcomes and evidence. Reused modules and multiple qualifications are legitimate; unit lists must remain under their module. Use stable database identities and canonical dynamic routes. Never infer enrollment from sharing a qualification title or from a client-supplied module code.

## Separate data planes

| Plane | Authoritative data | Rules |
| --- | --- | --- |
| Source evidence | Registered PDFs, ingestion provenance, `Ingestion`, `ContentChunk`, provider-specific vectors | Preserve provenance, parser/review state, page coverage and embedding space. Machine OCR is not source verification. |
| Published teaching | `StudySession`, unit/outcome structure, effective content-spec version/hash | Original synthesis, coherent sessions, gated exercise solutions, appropriate visuals and independent mathematical/editorial review. |
| Private learner work | `StudyNote`, bookmarks, practice notebook, quiz/conceptual attempts, progress and activity | Identity comes from the authenticated session. Ownership is checked on every request. Private writing is not community content. |
| Community | Opt-in room leases, revision-bound discussion posts, reports and scoped moderation | Presence counts expose no peer identities. Posting is explicit. Peer text is not trusted textbook evidence and is not fed into RAG or content generation. |
| Runtime policy | Tutor policy, module capabilities, access checks, UI state | Trusted repository/server configuration; never instructions extracted from PDFs or supplied by students. |

## Universal core and domain extensions

Universal features include identity, enrollment, notes, recall, evidence display, navigation, accessibility, recommendations and optional collaboration. Optional supports are registered by institution/module, with versioned trusted module overrides when needed. A capability selects UI behavior; it is not an enrollment grant, staff role, official curriculum claim or proof of content quality.

Content-domain registration in `specs/manifest.json` and runtime tool registration in `module-capabilities.json` serve different purposes. Register and test both when onboarding content. Unknown runtime profiles hide unregistered specialist tools; unknown generation profiles fail closed. Mathematics can expose a CAS scratchpad, matrix or calculus visualizations. Conceptual modules can expose PCK and Socratic debate. Future programming, laboratory and pedagogy tools should plug into this boundary.

## AI and deterministic computation

The tutor resolves the authorized active session on the server and adds unit-scoped RAG. Keep original lesson parameters distinct from retrieved textbook examples and independent visual examples. OpenAI-compatible providers are interchangeable transports, not interchangeable embedding spaces. Re-ingest or use the correct index when switching embedding providers.

Cloudflare is the current default; Ollama is the local option. Respect free allowances, deadlines, cancellation and bounded context. Do not introduce automatic paid-provider fallback. A small model can generate incorrect reasoning even when its final number is right: provider changes require real question/answer checks, not only HTTP 200 checks.

Client CAS checks run in bounded workers, preserve domain restrictions and return unverified for unsupported expressions. They do not award grades. Server grading owns quiz keys and transactional mastery writes. AI-assisted conceptual review is a labelled estimate with its own recorded evidence; it is not an institutional mark.

## Realtime and presence

Use authenticated, server-sealed Neon queries. Include live enrollment predicates inside SQL, so a previously issued subscription does not keep reading new peer data after withdrawal. Counts are aggregates, not roster endpoints. Neon live SQL cannot track time-dependent expressions such as CURRENT_TIMESTAMP: lease queries use a server-issued timestamp parameter, resealed every 25 seconds. Explain that expiry counts converge at that refresh rather than promising instantaneous clock-driven invalidation. Presence uses explicit short-lived leases; it is separate from the private activity timer. Renew/close subscriptions and handle expired tokens, hidden pages, network loss and account changes. Label periodic fallback accurately rather than calling it live.

## Rendering and examples

Use the shared Markdown pipeline: math/chemistry plugins, untrusted HTML disabled, safe URLs and bounded structured widget data. Never evaluate model-supplied JavaScript or arbitrary plotting expressions. Widget parameters must match the discussed function/matrix, or be clearly introduced as a separate exploration. All values and samples are finite; plots are supporting evidence rather than proofs.

Worked answers use the shared exercise protocol and remain behind Show answer. A peer annotation anchor can include visible prose/questions, never a hidden solution. Source revision changes create a new discussion context; do not silently attach old questions to a changed theorem or example.
