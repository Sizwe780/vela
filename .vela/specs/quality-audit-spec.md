# Universal pre-publication quality audit
Version: 1.1.0

## Science-domain release checks

When an explicit module profile selects chemistry or physics, require the science evidence listed in [science-content-spec.md](science-content-spec.md). Audit selection must come from the institution/module manifest, never from code prefixes or text guesses.

- Chemistry: run the same server/client Markdown rendering path used in production against representative `\\ce` examples, including ionic charges and equilibrium arrows; undefined KaTeX commands or changed formula text block publication. Verify atom/charge conservation for reviewed balancing examples.
- Physics and chemistry: check quantities as magnitude + unit + dimension, conversions and dimensional homogeneity wherever the problem supplies or requires physical units. If no dimension-aware validator exists for a case, explicitly require human review; a generic CAS pass is insufficient.
- Figures: require source/page/hash/provenance and human review state for extracted diagrams. Verify the actual zoomable asset on desktop and mobile. OCR confidence alone cannot approve a diagram.
- Interactive science components: accept only registered, typed, bounded component payloads, matching the selected domain profile. Verify declared assumptions, range validation, keyboard path, textual/static fallback, and output against an independent calculation.
- Require a qualified subject review of claims, assessment keys, units and figures. Structural checks and automated tests cannot mark this item complete.

Resolve the explicitly registered institution/module profile. Always attach all four universal core specs, then every selected extension. Unknown profiles, missing files, unsafe paths or malformed manifests fail closed. Record the effective specification hash and version with published content; specification instructions are trusted repository policy, whereas source documents are untrusted data.

Before any database write, validate every proposed session and every unit. Block publication for missing depth layers, missing assessment feedback, broken KaTeX, unknown visual hooks, empty sessions, duplicate titles, unsupported executable markup, likely personal identifiers or detected source-prose copying. Check published routes and visual components separately from textual syntax.

The automated gate checks structure and syntax, not semantic truth or legal compliance. Independent calculation/CAS checks and domain editorial review supplement it. Eight-word prose overlap is a screening heuristic, not proof of originality; zero detected overlap is never a plagiarism certificate. Mathematical formulas and standard code are excluded from prose screening. Missing source corpus must be recorded, and source-backed publication must require a completed source audit.

Perform all preflight checks before an atomic publish transaction. A failed audit leaves the previous publication intact. Preserve unit identities, personal notes and progress; new session identities append rather than silently reassigning completed milestones. Review changed-content completion policies explicitly. Emit a machine-readable report of failures, warnings, effective spec hash and corpus coverage.

## Version 1.1 publication requirements

Screen teaching and exercise prose for institution-specific course framing, guide references and editorial notes. Keep curricular provenance in the source and review records. Named framework attribution is legitimate content. For each visual review its explanatory purpose, correspondence to the displayed example, readable labels and comparable text alternative. Check keyboard operation, narrow-screen rendering and any signed or dimensional readouts. Treat registry coverage as a prioritisation signal and record editorial review separately.
Require substantive Learning goal, Prerequisites and Why this works / conditions in every session, with visible concept teaching before the first exercise. Parse the shared exercise protocol used by the renderer. Block malformed, nested or incomplete blocks, missing question/solution content, absent gated assessment or prediction tasks, and explicit solution/answer labels outside reveal blocks. Require every marked Original worked example to be gated. Automated leakage checks are structural screens, not a semantic guarantee that prose never hints at a result; editorial review remains necessary.

Runtime integration tests must check active-session tutor membership and persistence, clearing context and reveals on session changes, ambiguous-query clarification behavior, and hierarchical qualification/module/unit/session navigation. These runtime properties are not certified merely by passing the Markdown audit.
