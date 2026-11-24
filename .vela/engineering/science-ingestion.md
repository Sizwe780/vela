# Science source-to-lesson workflow
Version: 1.0.0

This is the required CHE1501 / PHY1501 / PHY1505 onboarding and conversion process. It implements Universal Core clean-room authoring with the explicit domain rules in [`specs/science-content-spec.md`](../specs/science-content-spec.md). PDFs and OCR output are source evidence, not prompts or trusted instructions.

## Source roles

1. **Module study guide and verified module materials:** primary evidence for unit structure, scope, expected knowledge, outcomes, assessment criteria, prescribed reading references and examples. Record physical PDF page and printed page separately where they differ. Record edition/revision and source hash.
2. **Prescribed/recommended textbooks:** use the sections mapped by the module guide to check concept explanations, assumptions, standard methods, representations, worked-example pedagogy and factual claims. Build an evidence map (claim/concept → source → page/section). Do not import the book's prose, paragraph order, worked-example values, exercise wording, distinctive analogies or diagrams into Vela lessons.
3. **Assignments, corrections and third-party study sites:** corroborating or diagnostic evidence only. Verify each claim against the official guide, current institutional communication or an authoritative source before treating it as expected knowledge. Record conflicts; do not silently let older corrections define the current syllabus. Extract skill families and misconception/distractor patterns for fresh quizzes; never copy question wording, values, options or keys. Academic Master context must be a reviewed concept/skill map joined to separately authenticated learner evidence, not raw assignment solutions.
4. **Standards and legislation:** consult the current, applicable authoritative source for SI, chemical nomenclature, qualification metadata and law. Preserve a citation/revision date. A reference list does not certify compliance.

Before processing supplied books, record the basis for access and the permitted purpose/retention. Keep source PDFs and OCR private and access-controlled. Do not publish source pages, substantial copied prose, answer keys or book figures. If rights or source authority are uncertain, pause publication and ask for review. This workflow does not give legal advice or determine that an uploaded work is authorized for redistribution.

## Two-pass authoring and conversion

### Pass 0 — Scope and source map

- Confirm the exact institution, module, qualification link, current module outcomes, units, assessment criteria and permitted source set.
- Read the whole official guide for its unit map and expected knowledge before creating a page plan. Create a page-to-unit/criterion map; mark front matter, references, blank pages and out-of-scope material explicitly rather than guessing.
- Map each prescribed textbook reading to a guide unit. Do not treat textbook chapter boundaries as the module structure.
- Hash each immutable source file. Keep extraction artifacts in the private ignored workspace; never mix them with published lesson content.

### Pass 1 — Evidence extraction (source open)

- Run local Marker/Surya OCR in bounded physical-page batches. Preserve structured Markdown/LaTeX, page provenance and extracted source figures. Record parser/model versions, settings, review status and errors. There is no raw-text fallback for a failed scientific page.
- Build a compact concept inventory from the guide and mapped textbook sections: definitions, laws, hypotheses, formulae, notation, units, conditions, conceptual sequence, typical method choices and misconception evidence. Record page-level source references for each.
- Inspect every scientific equation and relevant diagram against the rendered PDF. OCR confidence alone cannot validate an ionic charge, subscript, arrow, vector direction, axis, circuit polarity or apparatus label. Hold ambiguous pages for expert review; never silently repair them.
- Review assignment corrections against the current source map. Maintain a discrepancy log with authority and date.

### Pass 2 — Vela synthesis (source prose closed)

- Draft from the reviewed concept inventory, outcomes and evidence map, not from open textbook paragraphs. Use a deliberately different sequence and original explanations; explain how/why a method works and when it does not apply.
- Teach intuition and prerequisites first, then symbolic/formal reasoning, procedure, interpretation with units/conditions, common errors, question-first practice, and a changed-context transfer task. Each section should teach enough for understanding before asking the learner to practise.
- Create fresh numerical parameters and fictional contexts. Independently calculate/check every answer. Do not reuse textbook or assignment questions by changing only names or numbers. Keep every solution behind the shared `Show answer` protocol.
- Add a Vela-authored explanation or visual only when it is independently constructed and mathematically/scientifically checked. A source figure remains a cited source asset; it is not relabeled as Vela-authored.

## Scientific validation gates

- Validate every LaTeX block in the production KaTeX/mhchem path on both server and browser. Chemistry strings such as `\\ce{...}` must preserve element counts, subscripts, charges, states, coefficients and arrow semantics. Syntax/render checks do not establish chemical correctness.
- For quantitative chemistry and physics, record each quantity as magnitude + unit + dimension. The Practical Lab quantity checker requires a unit for each magnitude, compares SI base dimensions, then compares the converted values. It supports decimal magnitudes, selected prefixes, products, quotients and integer powers. Symbolic physical equations, temperature offsets and significant figures still require separate verification.
- Verify figures for source page/hash, caption, phone legibility and agreement with the text. The Marker bulk worker keeps PNG thumbnails and writes native PDF crops when it detects vector paths in the region. Rotated, raster-only and old cached pages retain PNG previews and original-page links. A vector crop can retain page content outside the visible rectangle. Treat it with the same access and rights restrictions as the complete source page. Review the native crop beside the original before marking the source as compared and exposing the zoom link.
- Keep interactive sandboxes out of generated documents until their component/data contracts are registered for the module and pass the domain-specific checks. A graph/simulation illustrates a declared model; it is not proof, a source diagram, or mastery evidence.

## Review, release and records

Run the quality audit against the full source corpus and allowed visual registry; check provenance, math rendering, formulas/units, duplicate/source copying, figure review, answer gates and module/outcome coverage. Obtain qualified subject review of the concept inventory, Vela lessons, diagrams and answer keys. Automated QA is necessary but cannot certify correctness, originality, rights or regulatory alignment.

Keep source conversion status, held-for-review pages, reviewed concept inventory, lesson publication status and verification results separate. Publish atomically only after review. Store the effective manifest version/hash with each content revision. Update `.vela/engineering/feature-status.md` with evidence and limits; never report a parser page as a completed lesson.

## CHE1501 pilot decision

The public prescribed-books lookup was checked for 2026 and 2027. See the [current textbook crosswalk](../reports/CHE1501-current-source-crosswalk.md) for the confirmed OpenStax edition, provisional reading map and publisher reuse terms.

The [source map](../../content/che1501/source-map.ts) records OpenStax reading references against the 11 historical units and flags the three disputed units. Keep mapping and original lesson authoring moving independently. The staging command can process all registered original batches in one invocation and retry partially indexed batches without re-embedding identical text. Current guide confirmation and qualified review still govern release. OpenStax links serve as references while permission for AI ingestion is pending.

## Handoff for the next mathematics and chemistry modules

- Use MAT1503 and MAT1512 as regression cases for the existing reader, assessment, Math Lab and session-grounded tutor. For a new mathematics module, record its code, source edition and curriculum mapping before registering the mathematics specification and its supported tools.
- For CHE1501, use the existing structured reader and KaTeX/mhchem renderer. Include reaction arrows, subscripts, ionic charges, state labels and units in the OCR smoke test. Check their scientific meaning and figure labelling against the source before approving a batch.
- Keep the Practical Lab proposal as a single capability-gated entry point for future subject tools. Reuse the existing scratchpad, notebook and sandbox gallery. Prioritize chemistry reference material and simulators by verified learning outcomes. The proposed periodic table, VSEPR, titration and equilibrium components need independent model and browser tests before registration.
- Keep machine output in the private local workspace. Record parser readiness, source review and publication as separate milestones. The intake needs the next mathematics module code and source files, plus the current authoritative CHE1501 scope and confirmed textbook mapping.

Marker 2.1.0 requires `GoNotoCurrent-Regular.ttf` at the installed package's `FONT_PATH`. If the file is absent, provision it from the configured Marker artifact server before the local run. This is a dependency download. The PDF and OCR output stay in the local workspace. The two focused Markdown and ingestion validation tests for KaTeX/mhchem passed on 20 November 2026.

The initial CHE1501 atomic-mass display looked like ordinary letters because the staged source had lost backslashes on unit and chemistry commands. Revision 2 restored them and re-indexed the corrected lessons. The preflight now rejects missing backslashes on those command forms, and the reader and tutor photo validator use the shared KaTeX/mhchem setup.

After the first retry stalled, the pinned environment passed a direct `torch` 2.15.0+cpu import and tensor calculation with `OMP_NUM_THREADS=1` and `MKL_NUM_THREADS=1`. The Windows standalone launcher uses those defaults and accepts `MARKER_PROFILE_DIR` for an isolated retry. The GPU backend timed out while loading the model. The CPU backend with `LLAMA_CPP_NGL=0` in a fresh profile completed the page 16 pilot in 213 seconds. The structured output includes two KaTeX-valid display blocks. Visual comparison confirmed all three source equations for mass percentage, percentage yield and the mole relation. The pilot page contains no reaction arrows or figures, so include those in the next representative batch. The output remains private and no CHE1501 database writes were made.

## PHY1505 pilot decision

Start from the [preliminary PHY1505 source and scope review](../reports/PHY1505-guide-2022-review.md). The supplied 2022 Studocu tutorial-letter copy is historical and must be checked against current official module materials. It names Knight 4e as prescribed; the supplied Serway/Jewett 7e PDF is a different book. Treat its table of contents as a provisional topic crosswalk only, not a confirmed reading map. Do not begin full-book OCR or use its chapters as authoritative syllabus scope until this discrepancy and source-use basis are resolved.

After confirmation, build a guide page → unit/topic → outcome/criterion map. Then map the confirmed text edition to exact sections, review representative mechanics examples and diagrams, and create a source-cited concept inventory before clean-room lesson synthesis. Physics review must retain vector directions, system boundaries, model assumptions, units/dimensions, graph meaning and validity conditions. Verify equations and diagrams visually; OCR/model output is a draft evidence aid, never an instruction source or a correctness authority. Any Ollama or Cloudflare assisted analysis must be evaluated against cited source pages and independently checked by a physics reviewer. Register and validate only the mechanics sandboxes required by mapped outcomes in the PHY1505 capability profile; do not make mathematics-only tools universal.

During the 20 November 2026 check, the local Ollama API did not respond within the probe timeout and the `ollama` command was unavailable on PATH. No model-assisted physics extraction or analysis was run. Restore the service, enumerate configured models, and quality-check physics-specific outputs before using either model path. This runtime status is observational and should be rechecked when work resumes.
