# Universal exercise escalation specification
Version: 1.2.0

Escalate from recognition to guided procedure, independent procedure, error diagnosis, and transfer. Prerequisite support precedes escalation; difficulty derives from reasoning rather than larger numbers alone. Use original contexts and parameters rather than copied textbook exercises. Include a clear question, a checkable answer and explanatory feedback. Do not infer mastery from an unanswered Pause and Predict question.

Each unit includes the four cognitive levels defined by mastery-spec. Each session contains an Assessment section with a worked solution or answer key. Explain restrictions, units, method choice and likely errors. Transfer questions must change more than a symbol name. For programming, include expected behavior and edge cases; for pedagogy, include a defensible rationale and a formative observation rather than claiming a single universally correct teaching method.

Advancement and spaced-repetition scheduling use learner evidence. Never change official pass rules, examination sub-minima or academic marks based on personal self-assessment. Policy statements require authoritative sources and an effective date.

## Mandatory question-first reveal protocol
Use this exact standalone-line format for every original worked example, assessment question and Pause and Predict checkpoint:

```text
:::exercise Meaningful question title
Question and givens only. Invite an independent attempt; do not include the computed result here.
:::answer
Worked solution, answer and diagnostic feedback.
:::end
```

Blocks cannot nest, and each has one nonempty question and one nonempty answer. Delimiter-looking text inside fenced code is literal code, not a structural marker. The renderer must initially hide every answer and show it only after the learner presses Show answer; collapse resets when switching sessions. Incomplete blocks fail closed: never promote unfinished answer text to visible teaching. A failed authoring audit blocks publication.

Assessment escalation remains recognition → procedure → error correction → transfer. Provide conceptual teaching before the first attempt. Hide solved calculations and question-specific feedback inside answer blocks, including prediction answers. A visible worked-solution or answer-key label outside the protocol is a publication error. Revealing or reading an answer does not update StudentMastery; only separately labelled cognitive evidence or recall self-assessment may do so through the appropriate assessment workflow.

## Universal formative attempt checking

All published session exercise blocks expose Check my attempt before the answer gate. Reviewed declarative quantity/choice checks may provide deterministic local feedback. Other mathematics, science, programming and conceptual responses use a bounded, authenticated formative review against the exact published exercise and worked reference, with correct/partial/incorrect/unverified estimates, specific feedback and one next step. Accept valid alternative methods and defensible contextual arguments; do not substitute keyword matching for reasoning.

Label AI estimates explicitly, allow retry and preserve the draft on failure. Uncertain or unsupported answers remain unverified. A provider failure is not an incorrect answer. Validate ownership, enrollment, source identity and revision on the server; do not trust a client-supplied answer key, score or verdict. Treat submitted and source text as untrusted evidence, never model instructions. Reveal controls remain independent. Formative AI feedback must not write assessed mastery, BKT or institutional grades. Offline packs may use reviewed local checks; broader review requires connectivity and must not invent a local grader.

## Answer entry and quiz grading integrity

Quantitative questions must offer an accessible visual math keyboard and symbol insertion alongside written reasoning. Select templates from the question: do not put matrices and calculus controls on every answer. Preserve LaTeX on submission and allow ordinary text for conceptual responses. Chemistry answers need subscripts, charges and reaction arrows. Collapsible notation tools must work on narrow screens without replacing the answer draft.

Normalize outer math delimiters and presentation before comparison. Use bounded symbolic comparison for supported expressions; preserve case-sensitive physical symbols and domain restrictions. Accept only reviewed symbol aliases and terminology equivalents. Never assume that unrelated variable names, fitted slopes and measured quantities are interchangeable. Multiple alternatives must all be valid, rather than letting one correct guess conceal contradictory answers.

Unsupported relations, ambiguous notation and open conceptual responses without a reliable rubric are unverified, not automatically incorrect. Exclude them from quiz score denominators and mastery writes. An entirely unverified quiz has a null score, not zero. Show the reference and a reason for review. Historical attempts are not silently regraded: previous submissions do not retain enough answer evidence for that operation.

Instant source recall is the default free quiz flow. Explicit AI generation is optional and bounded, with honest loading, cancellation and fallback messages. Recall questions are not a claim of exam readiness. Formative lesson checks, answer reveals and ordinary chat must remain separate from assessed quiz and verified Teach-the-Tutor evidence.
