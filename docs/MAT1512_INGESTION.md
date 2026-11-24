# MAT1512 pilot — 5 November 2026

The supplied guide and Stewart chapters 1–5 are indexed in Neon production. Original PDFs remain unchanged; private snapshots provide authenticated, version-checked page links.

**6 November update:** [Math-aware bulk conversion](BULK_CONVERSION.md) is running across all 547 selected pages and has published structured readings in all five units. [Live counts](bulk-conversion-status.json) track coverage and review holds. U1 also retains its source-checked teaching adaptation and interactive limit graph. The tables and vector counts below describe the retained **legacy extraction baseline**; structured vectors are additional and increase as the queue runs.

## Open the course

Sign in or create a learner account first.

| Unit | Study | Quiz | Pages | Chunks per provider |
| --- | --- | --- | ---: | ---: |
| U1 — Limits and Continuity | [Open](http://localhost:3200/study/cmw3pzzwl0001khuc8rb9u4xz) | [Practice](http://localhost:3200/study/cmw3pzzwl0001khuc8rb9u4xz/quiz) | 168 | 286 |
| U2 — Differentiation Foundations | [Open](http://localhost:3200/study/cmw3q05dg0007khucpdpnax9d) | [Practice](http://localhost:3200/study/cmw3q05dg0007khucpdpnax9d/quiz) | 70 | 130 |
| U3 — Advanced Derivatives and Implicit Methods | [Open](http://localhost:3200/study/cmw3q08uu000dkhucraexbemb) | [Practice](http://localhost:3200/study/cmw3q08uu000dkhucraexbemb/quiz) | 114 | 203 |
| U4 — Applications of Differentiation | [Open](http://localhost:3200/study/cmw3q0bs3000jkhucrdmo21q5) | [Practice](http://localhost:3200/study/cmw3q0bs3000jkhucrdmo21q5/quiz) | 86 | 195 |
| U5 — Integration Foundations | [Open](http://localhost:3200/study/cmw3q0en0000pkhucapvis5gs) | [Practice](http://localhost:3200/study/cmw3q0en0000pkhucapvis5gs/quiz) | 109 | 181 |

**547 selected pages, 60 source segments, 995 chunks per provider.** There are 120 ingestions and **1,990 page-linked vector records**: 995 Nomic/Ollama and 995 BGE/Cloudflare vectors. The two 768-dimensional embedding spaces are isolated by provider/model/endpoint metadata. Chunk windows remain 500 canonical tokens with 50-token overlap within each segment. Reading text and quiz passages are deduplicated between providers.

## Scope and source fidelity

- **Guide:** 185 physical PDF pages; pages 10–137 indexed (128 pages). Its own unit numbering differs from the app's five thematic groups. Guide chapter 6 and appendices remain outside this pilot.
- **Stewart:** 1,404 physical PDF pages; pages 41–459 indexed (419 pages), covering chapters 1–5. Functions are prerequisite review in U1; section 4.9 antiderivatives belong to U5.
- The supplied book is the eighth-edition US student edition, ISBN 9781285741550. The guide names Metric Version 8e, ISBN 9781305272378. Topics were mapped by section title; pagination follows the supplied files.
- The source guide marks formal epsilon-delta material as read-only/supplemental for other modules. U1's scope records that qualification.
- Legacy PDF extraction flattens some fractions, superscripts and special-font symbols. It is **not verified mathematical OCR**. Units now offer their available structured readings with conversion coverage, page navigation and original figures; legacy text remains separately labelled. Page links preserve the original mathematical layout. Bulk machine OCR is validated automatically but requires source comparison before being labelled reviewed.
- SHA-256 hashes identify source versions. PDF routes require a learner session, whitelist filenames, support byte ranges and reject version mismatches with HTTP 409. Original files are served from private local snapshots, not uploaded as public assets.
- Document instructions were treated as source data, never as instructions to change the app or its security settings.

## Academic metadata

Qualification metadata stays **90104–PSM / SAQA 103108 / NQF exit level 7**. MAT1512 is separately recorded at **module NQF 5, 12 credits**, with approximately 120 notional hours.

The [UNISA catalog listing](https://unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Subjects-%26-modules/All-modules/Calculus-A-%E2%80%93-MAT1512) describes a **year module**. The supplied semester-1 description is preserved as a reported claim.

The prerequisites, 20% formative / 80% exam weights, overall 50% threshold, exam minimum of 40%, and IRIS/Invigilator statements are retained in `Module.metadata.userReported` as **UNVERIFIED_CURRENT_POLICY**. A current tutorial letter was not supplied. Those values are not presented as verified rules or used to decide official pass/fail. Practice quiz scores remain separate from module marks.

The five supplied alignment statements use `LOCAL-MAT1512-U*` codes and **CURRICULUM** authority. They are local learning criteria, not independently verified SAQA assessment criteria or CAPS requirements. Both the interface and tutor expose this distinction. A qualification's SAQA ID does not verify a local criterion.

## Verification

```text
COMPLETE ollama:     60 segments, 995 chunks
COMPLETE cloudflare: 60 segments, 995 chunks
Database audit:     1,990 page-linked chunks, 120 ingestions
Free quiz audit:    all five real units generated six questions
npm run build:      exit 0; compiled in 6.5s, TypeScript completed in 10.6s
npm test:           47 passed, 0 failed
npm run test:e2e:   6 passed (desktop/mobile Chrome)
npm run test:mat1512: passed against the real, retained module data
```

Live tests verified original PDF access (206), anonymous rejection (401), wrong-version rejection (409), Cloudflare chat in the real study UI, excerpt/source-page navigation, local Ollama PCK responses, six-question quizzes scoring **5/6 = 83%**, feedback, idempotent mastery updates, and the homepage Realtime count changing without a reload. Study and quiz layouts fitted a 390-pixel mobile viewport. Replaying the actual parsed-PDF request through `/api/ingest` reused its existing receipt.

The audit also caught formula-heavy opening passages in U3. Quiz generation now selects three readable passages from a bounded candidate pool, excludes duplicate embedding copies, joins soft-wrapped prose and rejects incomplete headings/formula fragments. All five units then passed free quiz generation. This is exact-term recall practice, not essay grading or symbolic equivalence.

Temporary learners, attempts and mastery rows were removed; real course data remains. The migration was checked on a temporary child branch before production, and the branch was deleted.

See [machine-readable counts and metadata](mat1512-ingestion.json), [study screenshot](mat1512-pilot-study.png) and [quiz screenshot](mat1512-pilot-quiz.png). Each new extractive attempt varies its terms.

## Maintain or repeat

```powershell
npm run ingest:mat1512 -- --provider=ollama
npm run ingest:mat1512 -- --provider=cloudflare
npm run audit:mat1512
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3200'
npm run test:mat1512
```

Extraction results, the explicit page mapping, embedding caches, receipts and versioned PDF snapshots are in ignored `../work/mat1512`. `.env` sets `MAT1512_SOURCE_DIR` to that snapshot directory. Retain those files to serve originals locally. Hosting elsewhere requires transferring sources to private storage; the extracted text and vectors already reside in Neon.

No plan was upgraded. Ollama must remain running locally; Cloudflare uses the existing browser OAuth connection/free allocation. Neon AI Gateway remains pending. Remaining curation includes a current tutorial letter, verified SAQA/CAPS mappings, guide content beyond the pilot and mathematical OCR review.
