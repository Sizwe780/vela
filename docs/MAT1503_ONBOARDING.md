# MAT1503: Linear Algebra learning module

This release uses the three user-supplied PDFs as evidence. The2023 tutorial resource identifies thirteen topic units; the2018 tutorial letter supplies a historical outcome inventory; the large textbook is Anton and Rorres, Elementary Linear Algebra, Applications Version,11th edition. Semester/year delivery and administrative rules differ between the historical documents, so no old deadlines, contact details or pass requirements are promoted to current policy. The original files are unchanged; SHA-256-verified working snapshots are stored privately.

## Published learning path

MAT1503 is registered with Universal Core + mathematics + education-PCK under `.vela/specs/manifest.json`. All13units have six original Vela sessions:78sessions and468question-first exercises. Goals, prerequisites, intuition, method justification, visual reasoning, procedure, interpretation, common mistakes, application and four cognitive assessment levels appear in every session. Solutions stay behind Show answer; reveal is not mastery. PCK notes are teaching suggestions, not independently verified CAPS requirements. Local outcome/criterion mappings remain CURRICULUM.

Topic order follows the supplied resource: systems; Gaussian elimination; matrix operations; inverses; elementary matrices; invertibility; special matrices; cofactor determinants; determinant row reduction; determinant identities/Cramer; vectors/norms; dot/projection/cross/lines/planes; complex arithmetic/polar/powers/roots/trigonometric connections. The later general vector-space, eigenvalue and numerical-method chapters of the802-page textbook are not silently added as required scope.

Interactive SVG models illustrate line intersections, matrix/inverse actions, elementary row replacement, determinant area, vector combinations/projections and complex roots. They are independently labelled teaching models; their parameters are not the givens of a separate gated exercise. Other visual layers use accessible original constructions.

## Original lessons and source OCR are separate

The authored78sessions are already available in `/modules/[moduleId]` and `/study/MAT1503-U1` through U13. The active-session tutor reads the persisted lesson server-side. `index-module-lessons.ts` embeds them for both Cloudflare and Ollama as explicitly Vela-authored evidence. Provider/model/dimension/endpoint separation is preserved. A later structured textbook source does not suppress these original lessons from retrieval/recall. Lesson indexing does not claim that a textbook page was OCR-converted.

Original-document conversion covers192selected physical pages:159 textbook pages (sections1.1–1.7, chapter2, chapter3, AppendixB) and33tutorial-resource pages16–48. Older assignment papers and administrative contacts are not copied into current exercises. The complete originals remain accessible through authenticated, hash-checked PDF links. Native PDF text is used privately to screen narrative overlap and detect gross OCR omissions; it is not published as math-aware teaching text.

Local Marker/Surya converts pages with formula syntax gates, figure retention and per-page checkpoints. Source Library labels machine OCR and links the immutable original for comparison. Strict syntax cannot prove OCR semantic accuracy. Conversion can continue while students use the original lessons.

## Monitoring and power-loss recovery

From the application directory (`outputs`):

```powershell
npm run mat1503:watch
npm run mat1503:status
npm run mat1503:pause
npm run mat1503:convert -- --resume
npm run mat1503:convert -- --resume --retry-review
```

Use the monitor in a separate terminal; Ctrl+C there closes the monitor only. Keep the converter process and laptop running. Pause completes the current page. Resume uses source hashes, cached OCR, cached provider-specific vectors and committed database receipts. A stale live-process lock fails closed rather than terminating another process. The checkpoint directory is `work/math-parser/modules/MAT1503`; MAT1512 checkpoints are untouched. Database/provider interruptions retain pending work and perform bounded retries rather than being presented as mathematical review failures.

## Reproducible authoring and checks

`npm run mat1503:audit` screens all78sessions against the full selected native-source prose without writes. `npm run mat1503:publish` stages every unit, applies spec/math/privacy/visual/originality gates, atomically writes the lesson set, then verifies text, visual and content hashes. It refuses unexpected ownership/stale-session changes. This is a heuristic source screen and editorial workflow, not a plagiarism or regulatory certificate.

`npm run mat1503:index` resumes idempotent lesson embedding for both providers. The source conversion uses Cloudflare embeddings for reference pages; its page totals must not be confused with the two-provider original-lesson index.

Reports: `.vela/reports/MAT1503-publication.json`, `module-lessons-MAT1503.json` and `module-conversion-MAT1503.json`. Verification includes975strictKaTeX expressions and373independent exact checks (94systems,169determinant,110vectors/complex), plus32peer numerical cross-checks. These do not prove every sentence or future AI answer.

## Final verification

Production build, TypeScript, schema validation and88tests passed. Authenticated desktop/mobile tests traversed all13units and78sessions, checked question-first reveal/hide and widgets, notes, recall, free heuristic quiz generation, immutable PDF byte ranges/version rejection and liveCloudflare tutoring. The initial live test found a boolean-token wire-format issue; the normalizer now handles both numeric and boolean JSON scalar text tokens while preserving malformed-object/provider errors, and the live reruns passed. Both providers have78lesson records/182chunks each, with zero missing vectors. MAT1512's30published lesson hashes were independently rechecked and are unchanged. Original source OCR is still a separate running192-page queue; consult its live checkpoint rather than treating this lesson verification as completion of every reference page.
