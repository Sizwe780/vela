# Practical Lab

Open `/practice/math` after signing in, or choose **Try in math scratchpad** under a lesson exercise containing mathematics. The lesson's answer is never supplied to the scratchpad. The starting expression is editable because an exercise can contain several expressions.

Choose **Visual simulations** in the Practical Lab to explore the tools available for your enrolled modules. The scratchpad stays open in the background so you can return to the same working. The private notebook is in the scratchpad’s **Your notebook** panel.

## Write, then verify

MathLive supplies a visual editor, live mathematical notation and an on-screen keyboard. The fraction, power, matrix, integral, limit and derivative buttons insert editable templates. Arrow keys move between slots; fill every placeholder before checking. Live KaTeX previews use the same safe renderer as lessons. The companion's **Insert math** control inserts an expression into the question without submitting it.

Choose the checking mode explicitly:

- **Equivalent expression** compares the next complete expression to the most recent verified line.
- **Antiderivative** differentiates each submitted line and compares it to the original integrand. Intermediate integration-by-parts lines may contain an unevaluated integral. A constant of integration is allowed on each connected interval.
- **Derivative** compares the submitted expression to the derivative of the starting expression.
- **Matrix row operation** verifies every entry, including an augmented column, against the declared swap, nonzero scaling or row addition. Integer and exact fraction entries are supported, up to 3 × 4.

Verified cancellation carries excluded inputs forward. A finite numerical counterexample can demonstrate a wrong sign or coefficient; unsuccessful symbolic simplification alone does not mark a step wrong. Unsupported notation is explicitly **unverified**. This is a bounded real-expression checker, not a general proof assistant: roots, variable logarithms, inequalities, definite integrals, one-sided/infinite limits and unrestricted expressions require tutor review.

## Original variations

**Try another variation** creates original coefficients for algebraic expansion, polynomial differentiation, integration by parts, rational removable limits or linear systems. Practice answers and explanations appear only after **Show practice answer**. Generating another variation clears previous steps and hides the answer again. Seeds are reproducible through `createMathProblem(topic, seed)` for QA; there is no fixed worksheet limit.

## Runtime and privacy

Nerdamer runs in a disposable Web Worker with a four-second deadline. Only bounded, validated notation reaches it; no user expression is executed as JavaScript. MathLive fonts are copied from the pinned package to `/public/mathlive/fonts` by the predev/prebuild script; the editor requires no hosted OCR, CAS or paid AI service. Package licenses are copied with these assets.

Scratchpad checks do not send work to the server, award mastery or change quiz grades. Unsaved work is temporary and resets when leaving the page. Students can explicitly save inputs and reflections to the private [practice notebook](PRACTICE_NOTEBOOK.md), export them, or delete copies. Reopening rechecks saved lines locally rather than trusting old results. Inserting math into a companion question sends that expression only when the student submits the question, under the companion's existing provider/privacy settings. Existing short-answer quizzes retain their published grading rules; scratchpad verification is separate practice evidence.

## Validation

`npm test` covers algebra, trigonometric parsing, by-parts steps and sign mistakes, excluded inputs, poles, rejected notation, exact row operations and generated template answers. `tests/browser/math-practice.spec.ts` covers the actual worker bundle, live editor keystrokes, template insertion, keyboard, answer reveal and variation reset on desktop and mobile. Auth and enrollment continue to govern lesson routes.
