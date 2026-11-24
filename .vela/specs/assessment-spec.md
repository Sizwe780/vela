# Universal exercise escalation specification
Version: 1.1.0

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
