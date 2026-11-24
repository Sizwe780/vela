# Attempt-first lessons, session-aware tutoring and module navigation

Spec version1.1 and MAT1512 content version3.

The home library lists modules. `/modules/[moduleId]` lists only that module's units, and a unit opens its own sessions. Module routes use unique database IDs so shared codes across institutions cannot merge unit lists. Existing study-unit links remain valid, and breadcrumbs return to the parent module.

All thirty MAT1512 sessions now provide specific learning goals, prerequisites, visible conceptual teaching and a substantive Why this works section with assumptions/conditions.179 exercises separate the question from feedback with the safe protocol:

```text
:::exercise Example title
Question and given information only.
:::answer
Worked reasoning and answer.
:::end
```

The reader renders questions first. Solutions are not rendered in the initial DOM; Show answer mounts the worked solution, Hide answer removes it. Navigating to another session resets reveal state. Concept teaching stays visible. This is a learning interaction, not secure examination storage: the delivered lesson data contains solutions and should never be used as a protected test bank. Reading, revealing and self-rating do not certify mastery.

Original worked examples, all four cognitive question types and Pause and Predict feedback use the same gates. Graphs remain exploratory; their captions no longer announce the numerical conclusions of matching worked exercises. The pre-publish audit rejects broken protocols, visible answer labels, un-gated tasks, inadequate teaching foundations and earlier QA failures. Spec and content hashes change with the revision. The source-corpus audit still screens all units before one atomic publication; notes, mastery and personal completion are retained.

The companion sends the selected session ID alongside the unit ID. The server loads the published session and verifies membership before embedding/retrieval. Its actual title, revision, examples and worked reasoning are included with provider-separated textbook RAG. The prompt gives active-lesson parameters priority over different textbook examples, asks for clarification when the intended question is ambiguous and requests hints before unsolicited solutions. Session changes abort/reset the conversation, and Ask tutor for a hint supplies the chosen question without its answer. A different unit's session is rejected. These controls improve grounding; they cannot guarantee every model calculation is correct.

The authoring generator reads updated policies automatically. The common audit/parser/renderer is domain-independent, including programming and education modules. No module-specific answer-rendering branches or database migrations were added.

Validation:83 tests, strict335-expression KaTeX validation,67 exact mathematical checks, source-corpus screening, database publication/hash verification, TypeScript and production build. Live browser and optional session-tutor check results are recorded in the task logs and session-tutor-check.json when enabled.

Final verification:83 tests passed; TypeScript, Prisma validation and production build passed. Desktop/mobile browser suite:9 passed,1 intentionally skipped duplicate persistence case. All30 published session texts/specification hashes match the authored revision. A live Cloudflare request for MAT1512-U1-S1 correctly identified excluded input13, limit26 and the restriction on cancelling t−13; session-tutor-check.json records the response. This is one checked example, not a guarantee of all AI answers.
