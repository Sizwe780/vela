# Workspace redesign and real-unit access

## Access fix

The application log showed native Windows Prisma TLS failures (`No credentials are available in the security package`) when opening real study units. The app now uses a separate Rust-free Prisma client and `@prisma/adapter-pg` with Node TLS and certificate verification enabled. A live query returned all five registered units. The original ingestion/CLI client is unchanged. `npm run build` generates only the app client, so it does not replace the ingestion client's executable or generated files.

Real units still require sign-in. Signed-out visitors are redirected to sign-in with a return URL to their chosen unit. No database or authentication failure falls back to demo content.

## Workspace

- One desktop navigation bar contains breadcrumbs, selected provider, three layout modes, practice link and account controls. Sample information is a dismissible pill.
- Reader Focus, Balanced Split and Companion Focus retain 70/30, 50/50 and 30/70 proportions. Mobile uses the reader/companion panel switch and wraps the navigation controls.
- Reading text has bounded line lengths and comfortable margins. Module facts and conversion details are expandable. The floating recall/text-size toolbar remains available in narrow reader views.
- A compact companion header contains segmented Academic/PCK controls, voice icons with tooltips and a reset action. Message cards, soft borders and a pinned translucent composer replace the stacked control banners.
- Citations open a native modal side drawer with KaTeX and source links. Chat scroll position stays intact. Escape, the close button and backdrop dismiss the drawer; browser-native modal focus handling keeps keyboard navigation inside it.

The recall drawer is portalled to the document body so its fixed positioning is not trapped by the floating toolbar's blur effect. Reduced-motion preferences disable the drawer animation.

## Verification

TypeScript, Prisma validation, the 63-test unit suite and production build passed. Browser verification covers desktop/mobile proportions, narrow-reader recall controls, citation modal dismissal and scroll preservation, signed-out redirection, authenticated real-unit equations, original figures/PDF links and persisted self-ratings in the mastery tree. Temporary learner data is removed after checks. The bulk worker remains running independently.

Final results: 10/10 production browser tests passed on desktop and mobile, including real-unit access, sign-in return navigation, recall writes and mastery reads. TypeScript, Prisma validation, 63 unit tests and npm run build passed. Temporary learners/mastery fixtures were cleaned up. The app remains running on localhost:3200 and the independent bulk worker advanced to 293/547 pages during this work.

