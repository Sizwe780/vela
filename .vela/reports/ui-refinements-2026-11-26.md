# Practice, lesson-detail and favicon refinements — 26 November 2026

- Verified matrix steps retain their draft even when the accepted LaTeX remains unchanged. This closes the identity-operation reset edge case while retaining notebook drafts.
- Scratchpad shortcuts reflect the selected topic/check type; scalar inputs remain limited to fraction/power shortcuts.
- Current-expression and step cards use smaller padding, margins and display-math spacing.
- Motion Grapher starts its time cursor at zero, avoiding the peak-position spoiler.
- Counted labels across learner, module, progress and staff views use singular nouns at one.
- A transparent book-free V/star favicon is derived from the supplied logo, with versioned PNG and 16/32/48/64 ICO assets. Legacy favicon aliases are updated. The full site logo remains the supplied full logo.

Verification: all 193 automated tests passed; the production build passed TypeScript and standalone generation; desktop/mobile browser regressions passed (2 tests, 1.5m), including two consecutive verified identity matrix operations, topic-filtered controls, retained drafts and consistent 113/23 progress totals for the test enrollment. The first browser attempt was blocked by an Azure settings retrieval failure in temporary test-server setup; restarting with the valid local environment resolved it.

## Favicon generation

Built-in image_gen editing used public/vela-logo-v2.png as its reference. Project assets: public/vela-tab-v3.png, public/vela-tab-v3.ico and public/vela-tab-v3-{16,32,48}.png. PNG metadata verified RGBA, 512 square, corner alpha zero. The ICO contains 16, 32, 48 and 64 pixel sizes.

Initial prompt: Edit the supplied Vela logo into a crisp favicon asset. Preserve exactly the existing copper-orange curved V left stroke, sage-green sweeping right stroke and copper four-point star. Remove only the open book/page swooshes below the V entirely. Transparent background, no white or black rectangle, no checkerboard, no shadow, no lettering. Center and enlarge the remaining V-and-star mark with a small even transparent margin in a square canvas. Match the original silhouette and colors faithfully. Flat clean sharp edges suitable for downsampling to 16/32/48 pixel browser favicons.

Cleanup prompt: Clean this favicon cutout. Preserve the same V and star silhouette exactly. Use flat solid copper orange and flat solid sage green. Remove ALL colored speckle/noise/glow/halo outside the solid shapes. Absolutely clean transparent pixels outside three sharply bounded smooth vector-like shapes. No texture, gradients, shadow or noise. Retain V and four-point star only, no book.

Release logs: work/refinements-build.log, work/refinements-tests.log, work/refinements-deploy.log and work/refinements-browser-local/ in the parent workspace.

## Final production acceptance

Direct Azure deployment `f079f823-f449-4dec-808f-a92ac8e292d4` completed with RuntimeSuccessful, one successful instance and zero failed instances, without GitHub workflows. The live build marker matches the final local build. Root HTML references the V3 favicon; PNG and ICO endpoints return HTTP 200.

The final regression suite passed all 193 tests and the production build passed. Live desktop/mobile regressions passed: 2 passed (1.3m), including repeated unchanged matrix steps, topic controls, numeric feedback and consistent progress counts. Disposable learner cleanup completed. Final evidence: work/refinements-final-tests.log, work/refinements-final-build.log, work/refinements-final-deploy.log and work/refinements-browser-production/.
