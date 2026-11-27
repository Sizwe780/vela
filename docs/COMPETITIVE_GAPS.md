# Competitive gap reconciliation

Reviewed against the supplied HTML analysis on 17 November 2026. The analysis is a useful backlog, but several “missing” entries were already implemented. This file records actual implementation and remaining limits, rather than claiming full production readiness.

| Area | Current implementation | Remaining work / limit |
| --- | --- | --- |
| Identity | Neon sign-up/sign-in/reset; explicit code-entry email verification; durable welcome queue | Resend development-inbox delivery is verified; wider student delivery needs sender-domain verification or activated Brevo. Auth verification remains managed by Neon. |
| Enrollment | Qualification/module picker, active/completed/withdrawn model, authenticated server-side learning/source gates | Subscription billing and institutional registration are separate future capabilities. |
| Profile | Editable display name, weekly study goal tied to automatic lesson timing with a 10-second idle pause, theme, enrollment links, verification, role display | Time is an estimate rather than proof of attention; changing email uses the auth-provider lifecycle. |
| Staff roles | Application roles plus qualification-scoped memberships; operator CLI assignment; scoped aggregate dashboard | Full staff invitation/role-management UI and individual learner intervention workflows are not built. |
| Study workspace | Responsive reader/companion, source drawers, notes, clip-to-notes, math, visual widgets, source-grounded active-session tutor | Continued editorial/content expansion and provider quality evaluation. |
| Session navigation | Controlled session state, previous/next, all-sessions page, reloadable `/study/[unitId]/sessions/[sessionId]`, history navigation and active tutor context | Resume stores the latest session per module, not an exact pixel/paragraph position. |
| Retention | Review queue, recall ratings, live progress, opt-in due-date email digests and signed unsubscribe | Local email worker requires the laptop to be on; a public HTTPS deployment is needed for cloud scheduling. Sandbox mail reaches only the approved test inbox. |
| Saved work | Session/chunk bookmarks, selected-passage snapshots, saved library with pagination, inline marks for unchanged exact text | Selections spanning multiple formatting/math nodes remain saved in the library even when no exact inline text match can be restored. |
| Search | Enrolled-module/session search, ranked visible teaching/questions, private responses | A bounded cached lexical index; not a multilingual/semantic search product. Hidden worked answers are excluded. |
| Dashboard | Enrolled modules, completion, outcome mastery, review prompts, resume, weekly goal, personal daily/module activity and a bounded activity streak | `/progress` separates dated recent quiz/conceptual evidence and explains deterministic recommendations. Evidence is bounded to a recent window; score differences do not prove learning gains. Activity does not award grades or attendance. |
| Subject support | Explicit institution/module capability registry and trusted versioned metadata overrides; unknown subjects keep universal learning without specialist clutter | New subject tools require their own contracts, editorial review and visibility/server checks. Generation domains are registered separately. |
| Guided thinking | Live three-tier hints, gated independent parallel examples and opt-in conceptual Socratic debate | AI behavior needs live evaluation; prompts cannot guarantee correctness or zero leakage. No participation mastery. |
| Academic Master | Dashboard briefing, summonable context dock, eight-concept starter DAG, original refreshers, focused server-graded checks and provisional BKT estimates; private entered-availability scheduling | Subject-expert graph expansion, parameter calibration, validated causal diagnostics, forgetting/IRT and mapping existing untagged questions remain future work. |
| Social learning | Opt-in anonymous live module room, synchronized quiet Pomodoro, paragraph discussions, reports and scoped removal | Short leases with periodic timestamp refresh; full moderation audit/reasons, appeals, archival browsing and production community operations remain future work. |
| Staff analytics | Qualification-scoped cohort completion/mastery aggregates, published content and conversion checkpoints | Checkpoint status is not a live worker heartbeat. No student contact details are exposed by this aggregate API. |
| Public pages | Overview/marketing page, signup CTA, draft terms/privacy with provided operator/contact details | Business address, retention schedule, source publication rights and final legal/operator review are still launch requirements. |
| Error handling | App and root error boundaries, segment not-found and explicit global 404 | New error paths must keep regression coverage as routes expand. |
| SEO | Per-page metadata, generated social image, sitemap and robots | Set the real public origin before launch. Local development is disallowed from crawling; private learning routes stay excluded. |
| PWA | Install manifest/icon and public offline fallback; authenticated HTML/APIs are never cached by the service worker | Full private course downloads, offline edits and cross-device conflict resolution are not implemented. |
| Accessibility | Skip links, labelled controls, focus movement on session navigation, semantic marks, contrast tokens and automated desktop/mobile checks | A manual screen-reader audit and broader assistive-technology testing remain necessary; automated checks are not WCAG certification. |

## Operator and access

Operator name provided: **Vela Learning (Pty) Ltd**. Current support/privacy contact: **sizwe.ngwenya78@gmail.com**. The verified account at this address was assigned app admin membership for the currently registered UNISA 90104 qualification. This is separate from learner enrollment and the server-side ingestion token.

`StudentProfile.role` is a display summary. Actual staff access always requires `StaffMembership` for each returned qualification. Student preference endpoints reject identity and role fields. Assignment is deliberately outside the student-facing API:

```powershell
# Preview first; requires a uniquely matched, verified Neon Auth email.
node scripts/assign-staff.mjs --email=operator@example.com --role=admin
# Apply only after checking the displayed scope.
node scripts/assign-staff.mjs --email=operator@example.com --role=admin --apply
# Or specify a single qualification explicitly.
node scripts/assign-staff.mjs --student-id=AUTH_SUBJECT --qualification-id=QUALIFICATION_ID --role=staff --apply
```

The account-ID mode is for trusted operators who have independently confirmed the subject. No client can appoint itself. Staff invitations/revocation UI remains future work.

## Content readiness

Authored lessons and source conversion are different pipelines. MAT1512 contains 30 published sessions; MAT1503 contains 78. Use `npm run audit:modules` for actual persisted lesson/spec/figure/vector checks and `npm run mat1503:watch` for the worker checkpoint.

The repaired MAT1503 pages preserve original source provenance. PDF page 740 is genuinely blank; it is recorded as a source-compared blank page rather than invented instructional text, and excluded from tutor/quiz/recall/generation evidence.

The final 17 November database audit passed for both modules: MAT1512 has all 547 planned physical pages in both provider spaces, 30 sessions and 689 verified figure assets. MAT1503 has all 192 planned physical pages (191 instructional and one verified blank) in Cloudflare, 78 sessions and 153 verified figure assets. Its authored lesson embeddings are present for both Cloudflare and Ollama. No review holds remain. These are configured-source coverage and automated publication checks, not certification of every OCR statement or publication rights.

## Next priorities after this tranche

1. Continue source-compared mathematical review and editorial evaluation; preserve the completed conversion baseline when adding new sources.
2. Activate wider email sending (verified domain or Brevo phone/sender verification), deploy the scheduler against a public HTTPS app, and finish bounce/complaint reconciliation. Welcome and recall previews have been received in the approved Resend test inbox; see EMAIL_SETUP.md.
3. Complete policy/source-rights/retention review and configure the production domain.
4. Validate with real learners: accessibility interviews, tutor correctness and learning outcomes.
5. Add deeper cohort tools, semantic search, offline course packs and subscription/multi-tenant controls against measured demand.

## 18 November: free activity tools and reader integrity

The screenshot regression was reproduced on a real MAT1503 unit: one session reader grew six bookmark toolbars as data loaded. The toolbar and lesson body had identical sibling React keys. They now have distinct keys. The empty companion now stays at the top instead of being auto-scrolled past its heading. Regression coverage includes bookmarking, text sizing, layout switching and session navigation in both modules.

The new `/activity` page and home goal card use the existing database without a paid analytics service. A learner explicitly starts the timer in a real enrolled session. Hidden/unfocused/idle pages pause it; one active lease per learner prevents overlapping tabs from double counting. Server-clock credit is bounded per heartbeat and split at South African midnight. Personal weekly goals, daily bars, module totals and the current streak are shown separately from mastery. See [ACTIVITY.md](ACTIVITY.md) for the counting rules and limitations.

The next free product gaps remain scoped staff role management/learner interventions, richer learning-outcome trends, semantic search using the existing embedding spaces, and further keyboard/assistive-technology evaluation. Wider email sending and a cloud scheduler still await the sender/public deployment prerequisites described in EMAIL_SETUP.md.

## Local mathematical practice

A free MathLive editor and bounded Nerdamer worker now support algebra, basic calculus and exact matrix step checks, original parameterized practice, explicit answer reveal and lesson scratchpads. The private [practice notebook](PRACTICE_NOTEBOOK.md) now saves inputs/reflections, supports manual mistake revisits, export and deletion, and rechecks saved steps on reopening without awarding mastery. See MATH_PRACTICE.md. General domain reasoning/proof verification, server-authoritative mathematical quiz marking, and offline draft synchronization remain future work.


## Multimodal and conceptual tutor

Snap & Diagnose, Feynman-style conceptual practice and browser voice tools are implemented; see AI_TUTOR_TOOLS.md. OCR needs student confirmation, AI grades remain estimates, and actual handwriting/accent/device evaluation remains necessary. Voice uses browser turn-taking and sentence playback, not a full-duplex paid realtime service. Cloudflare free allowance limits still apply; production needs shared inference rate limits and independent grading/editorial review.

## Rich visualizations

Free Canvas 2D matrix transformations, Riemann refinement and limit zoom are available in registered lessons, streaming tutor cards and a shared gallery. See [VISUAL_SANDBOXES.md](VISUAL_SANDBOXES.md) for supported models and verification. Matrices are 2×2 and functions are bounded quadratic polynomials; arbitrary functions, 3D/WebGL, general symbolic plotting and authored animation timelines remain future capabilities. Explorations do not award mastery or substitute for proofs.


Contributor restrictions and implementation boundaries are maintained at [.vela/README.md](.vela/README.md); verify current test reports before deployment.

Adaptive learning uses a hard curriculum boundary with optional cognitive bridges. Consent and source/session gates remain mandatory; see [.vela adaptive-learning specification](.vela/specs/adaptive-learning-spec.md). The earlier Ollama 1B model failed guided-mode quality checks. `llama3.2:3b` is now installed as an initial local guided candidate with a structured JSON probe; broader semantic evaluation remains required, and Cloudflare remains the default.
