# Visual lesson authoring

Start from the learning decision. Identify what a learner must compare, follow, interpret or predict. Put the representation beside that concept, with a short action prompt and an interpretation in prose. Exercises and their existing hidden answers remain separate from an exploration.

| Purpose | Representation | Review |
| --- | --- | --- |
| Observe an authentic setting, object or phenomenon | Attributed photograph or verified source figure | Check rights, consent, caption, view scale and whether identifying details are necessary. Record creator, source URL, license, retrieval date and asset digest. For classroom examples use fictional or anonymised material. |
| Explain a relationship or structure | Original labelled cross-section, sequence, comparison, decision tree or process cycle | Match labels and direction to the concept. Mark scale and idealisations. Add a short equivalent explanation in the reader. |
| Explore how a variable affects an outcome | Bounded slider, step-through model, toggled comparison or coordinate plot | Check initial values, ranges and readouts independently, including signs, degenerate cases and units. Provide keyboard controls, a text readout and a mobile layout. |

## Implementation path

1. Use `npm run audit:visuals` on the intended environment. Review each listed session against its learning goal. Prioritise places where the explanation otherwise asks students to imagine a structural or quantitative change.
2. Use a typed `:::widget` directive in the explanation or Visual exploration section. Reuse `lesson_preset` for registered presets that still match the concept. Keep an existing session preset during imports only when needed for compatibility. Its adapter renders through the same inline registry. Gate tools by capability. A separate exploratory model needs its own labelled givens.
3. Register approved images in the lesson figure registry. Use a local asset with exact alt text, caption and credit. Retain source hashes and provenance in the source or editorial ledger. Use the existing protected source-figure path for licensed extracted source assets. Keep arbitrary URLs and model-generated asset references outside the renderer’s trusted figure paths.
4. Verify the visual alongside the teaching. Test both desktop and narrow mobile layouts, keyboard controls and the nonvisual explanation. Scientific models require subject review. Question-first exercises retain their reveal gates, and interacting with a figure earns no mastery credit.

For a ledger or sequence, keep the row and column meanings visible while the learner switches cases. Highlight the changed quantity and explain what stayed fixed. Compare measured values on one scale with the same unit. For a coordinate sketch, hold the scale fixed across cases and give the coordinates or result in text.

Use an inline Pause and check for decisions the model makes visible. Ask for a prediction or interpretation, let the learner commit, then explain the result and allow another attempt. These checks are formative. Reserve persisted mastery evidence for the assessment workflow.

Serve approved photographs from local WebP variants. Keep the author, original source, licence, modifications and the published asset digest together in the registry. A Markdown figure in a worked solution follows the same answer reveal as the surrounding prose. The tutor and untrusted reusable Markdown keep their restricted rendering paths.

Use the published anonymised version of a real portfolio excerpt and label Vela annotations separately. When a source requires a public-use notice, record it with the figure so it appears alongside the credit. The visual audit counts sourced figures and photographs alongside session coverage.

## Domain priorities

- Education and professional practice use fictional cases, role comparisons, process cycles and classroom or portfolio schematics. Attribute named frameworks and place institutional course administration in the internal reference record.
- Mathematics uses plots, vectors, matrices and linked symbolic readouts. Introduce the model before the procedure. Test alignment between sample values and the visible lesson and preserve cases where a quantity vanishes or changes sign.
- Chemistry uses particle-level diagrams, clearly stated models of bonding and equilibrium, and verified experimental images. A lattice slice represents a three-dimensional structure. Model colour, shape and spacing require a legend or a text equivalent. Use only concepts within the approved teaching scope.

For the learner-facing voice, follow the [universal learning design specification](../specs/learning-design-spec.md). For release checks, follow the [quality audit](../specs/quality-audit-spec.md).
