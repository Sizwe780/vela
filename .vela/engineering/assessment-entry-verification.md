# Assessment entry and companion controls

Current changes, 27 November 2026:

- Normal/Deep transfer radio controls now live in Companion → Tools → Response style. Preview keeps its fixed responses. Tool selection still sends the selected pacing policy to the existing server route. Closing Tools with Escape does not close the Companion.
- Quiz and written lesson attempts offer collapsible, question-scoped notation tools using the existing lazy MathLive editor. Written reasoning stays available. Formula checks use a bounded local CAS worker; reviewed terminology and server-owned alias rules supplement it. Unsupported responses are ungraded and excluded from mastery updates.
- Automatic quizzes use instant source recall. Explicit AI requests have a 20-second generation deadline and free fallback; the UI exposes elapsed time and cancellation. Client requests retain answers after failure.
- Progress reads have a client deadline, retry action and a bounded database transaction. The conceptual metric explicitly counts verified Teach-the-Tutor reviews. Its help text distinguishes reading, quiz, concept-map and formative evidence.
- Complete copied equations preserve their original TeX via MathML annotations. Canonical MAT1512-U1-S1 source equations were inspected and were already valid; no source rewrite was needed. KaTeX rendering is kept unbroken within an expression.

Verification: schema validation, TypeScript and the production build passed. All 209 unit tests passed, including rational rewrites, domain restrictions, contradictory alternatives, reviewed aliases and exclusion of unverified items from mastery. Four desktop/mobile browser checks passed on disposable enrolled learners and real lesson routes. They cover KaTeX fonts/copy, symbol insertion, topic-filtered templates, ungraded feedback, progress timeout/retry, pacing requests/draft retention and New chat confirmation. The insights API returned 200 for the test learner. Final UI polish increases symbol touch targets to 44px and enables notation tools for chemistry prompts without equations.

Evidence logs under the private task work directory: assessment-final-unit.log, assessment-domain-tests.log, assessment-repair-browser-final.log and assessment-final-build.log. Quiz/tutor browser responses were mocked. These are UI checks, not certification of provider reasoning, physical keyboards or every supported mathematical equivalence. Production deployment is separate; this batch has not been deployed to Azure.
