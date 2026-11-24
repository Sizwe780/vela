# Visual sandboxes

Open **Visuals** in the learning navigation (`/practice/visuals`), or **Tutor tools → Visual sandboxes** inside a learning session. These free, local Canvas 2D models need no AI request. The corresponding registered lesson illustrations also use them: matrix transformations in MAT1503, and limits and integration in MAT1512.

## Explore before calculating

- **Matrix transformations:** adjust four entries, try a shear, rotation, reflection or singular map, inspect signed determinant and area scaling, show real eigendirections, and test a vector or inverse. The zero matrix collapses the whole plane to a point; other singular presets collapse it to a line. Negative eigenvalues reverse vectors along their span. Some rotations have no real eigendirections.
- **Riemann sums:** choose left, midpoint or right samples, refine from 1 to 512 rectangles, and adjust the interval. Predict the error before revealing the exact integral. True per-cell polynomial minima/maxima provide lower/upper bounds even when the curve turns. Signed integral and geometric area are reported separately.
- **Limit zoom:** approach a missing input from both sides and zoom independently. Assigning a point value leaves the nearby trend unchanged. Compare a removable hole with a jump, where the one-sided trends disagree.

Animation starts only on request, stops when the document is hidden or the component is unmounted, and is disabled for reduced motion. Sliders remain usable. Readouts describe the current preview matrix, including its inverse when selected. Rotation previews follow a true rotation path; other maps use the labelled linear interpolation. Matrix plots use equal coordinate scales so a rotation does not distort shapes.

All displayed partitions and samples are finite. Pictures support an argument; they do not prove convergence or award mastery/session completion. Changing a preset starts a separate exploration and does not change a lesson's stated givens. Existing notes, source text, progress and published session records are preserved.

## Streaming tutor widgets

The shared validated parser accepts either a `widget` JSON fence or a `widget`/`render_widget` tag. For example:

```text
<render_widget type="matrix" data='{"matrix":[1,1,0,1]}' />
<render_widget type="riemann" data='{"coefficients":[1,0,0],"bounds":[0,2]}' />
<render_widget type="limitzoom" data='{"coefficients":[0,2,1],"center":3}' />
```

Matrices use row-major `[a,b,c,d]` with entries in [-3,3]. Polynomial coefficients are `[quadratic,linear,constant]` in [-20,20]. Riemann bounds lie in [-4,4] with width at least 0.25. Limit centers lie in [-20,20]; that input is removed from the polynomial's domain. Frames reject unknown/executable fields, invalid numeric data and partial payloads. At most three widgets render per answer. The tutor must match the actual function/matrix or explicitly introduce a separate example. These are supported mathematical templates, not an arbitrary expression interpreter.

## Implementation and verification

Reusable components live in `components/sandboxes/`; numerical functions live in `lib/sandboxes/math.ts`. `SessionVisual` dispatches by registered model ID, never by module code. Chat and the gallery lazy-load the same components. No schema migration, lesson rewrite or OCR worker restart is required.

`tests/sandboxes.test.ts` independently checks determinant/inverse/eigenvector identities, area-preserving rotation, closed-form Riemann sums, turning-point bounds and signed area. `tests/browser/sandboxes.spec.ts` checks real enrolled lessons, controls, answer reveal, reduced motion, animation pause, mobile/dark layout, streaming frames and absence of assessment credit. Streaming frames in this visual regression test are deterministic fixtures; live Cloudflare tutor-tool tests are separate in `tests/browser/coach.spec.ts`.

To additionally request actual matrix/Riemann frames from Cloudflare in the enrolled desktop lesson test, set `$env:VERIFY_SANDBOX_AI='1'` before running `npm run test:e2e -- tests/browser/sandboxes.spec.ts`. This checks the returned frame's exact mathematical parameters and uses the configured Workers AI allowance. Mixed tag/fence frames retain their original order.
