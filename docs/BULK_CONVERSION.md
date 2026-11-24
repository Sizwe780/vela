# MAT1512 bulk math conversion

The full selected scope is queued: **547 physical PDF pages** across all five study units (128 guide pages, 419 Stewart pages). This is guide pages 10–137 and Stewart pages 41–459, not the entire 1,404-page textbook. Source PDFs remain unchanged. See [current progress](bulk-conversion-status.json); refresh the course page to load newly published readings.

## How the queue is faster

- A persistent local Marker/Surya worker loads its models once. The verified native Windows ARM64 Adreno OpenCL backend performs visual OCR locally; no paid OCR service is used.
- Normal pages use 144 DPI, with a 192-DPI retry for invalid math, missing content or inconsistent numeric limit tables. Failed pages are held for review rather than published as flattened text.
- One page is OCR'd while the preceding page's embeddings are published. There is one OCR worker and one sequential publisher, keeping memory use bounded and provider configurations separate.
- Completed OCR, structured documents and embeddings are cached by source hash, page, settings and embedding space. Pause/resume reuses them. Provider failures leave resumable work; they do not trigger a paid fallback.
- Guide pages are interleaved across units first, then Stewart pages, so every unit gains usable readings early.

Measured guide page 14 at 192-DPI CPU OCR took 197.72 seconds; 144-DPI CPU OCR took 104.36 seconds and preserved the same 13 recognized formulas. The native GPU's cold page-14 run took 136.16 seconds including setup. A subsequent, different page (15) took 34.06 seconds with the worker warm. These are page-specific measurements, not a guaranteed speedup for every page. The status file estimates remaining OCR time from recent warm pages; retries, publication, review and system load can increase elapsed time.

## Reading and source fidelity

The reader displays one structured reading at a time with Previous/Next navigation and a page selector. Provider copies share one reading while citations still find either ingestion. Math uses KaTeX/mhchem. Original figures are preserved as private, authenticated PNG assets with content-hash checks and source-page links. Existing interactive teaching graphs remain interactive; automatic OCR does not invent interactive interpretations of every source diagram.

Most bulk pages are labelled **machine OCR**, not source-compared. Automated validation catches some errors but does not prove every formula correct. The original PDF remains available for comparison. Guide page 15 contains a printed numeric inconsistency: its table gives −5.1 at x=2.1 for `(x²−5)/(x−2)`, whose computed value is −5.9. The reviewed reading preserves the printed table and adds an explicit correction note. Reviewed page 14 and page 15 are retained when the bulk job resumes.

Each published page is mapped to its existing study unit, learning outcome and local assessment criterion. Ollama/Nomic and Cloudflare/BGE embeddings remain separate. Curriculum criteria retain their local, unverified authority labels. Units with structured material ground tutoring in that converted material; conversion progress is visible so partial coverage is clear.

## Operate the queue

From the app directory:

```powershell
npm run bulk:start
npm run bulk:status
npm run bulk:watch
npm run bulk:pause
npm run bulk:resume
```

`start` and `resume` run in the foreground: keep their process and this computer running. Use another terminal for status or pause. Pause finishes the current publication and any page already prefetched, then saves the checkpoint. A prefetched page may be cached but not yet published; resume publishes it without repeating OCR. To explicitly retry held pages after investigating them:

```powershell
npm run bulk:resume -- --retry-review
```

From the workspace root (one level above the app), use `npm --prefix outputs run bulk:watch` for a compact live monitor, or `npm --prefix outputs run bulk:status` for full JSON including held-page reasons. The monitor refreshes every 15 seconds and shows published pages, pending pages, review holds, provider coverage, each unit and the last checkpoint time in SAST. Ctrl+C closes only the monitor; conversion continues. Counts update when a page is checkpointed, so they can stay unchanged while a dense page is being processed.

The queue has an exclusive PID lock and validates source hashes before resuming. Private caches, figures, native models and checkpoints are under `../work/math-parser/`; keep that directory because the app serves its figure assets. The status snapshot is `bulk-conversion-status.json`; detailed review reasons are listed there. Cloudflare failures cause a 15-minute publication cooldown while local conversion continues. Resume retries missing provider publications.

### Shutdown recovery — 7 November 2026

The stopped run left zero-filled checkpoint and summary files. Recovery found **89 published pages** in Neon and **126 readable cached OCR results** (including retries). The damaged files and previous log were preserved privately. The queue reconstructed provider receipts from Neon and retained 11 content-quality holds from the server's progress copy; two infrastructure-related holds are retryable. Cloudflare publication resumed successfully from cached documents without repeating OCR.

Checkpoints now flush file contents before rename and keep the preceding valid state as `state.json.bak`. If both state copies are unreadable, published ingestions and original page caches reconstruct progress. The bulk process uses the existing `pg` driver with verified Node TLS because Windows Schannel rejected the restricted process's credentials. The same ingestion repository still provides parameterized SQL, transactions and fingerprint deduplication. OCR timeout cleanup now clears the failed worker before a retry.

The portable Ollama server restarted, but Windows denied access while loading its model manifests; local embeddings that are not already cached remain pending. Cloudflare is publishing with the existing free connection. This does not prevent local Marker OCR or source reading. Provider totals in the status file show the difference; later resume can fill missing local vectors when Ollama is available.

**Ollama restored later on 7 November:** the installed 0.40.14 build returned `Access is denied` when resolving manifests under this restricted Windows account. A separate [official Windows ARM64 0.15.6 build](https://github.com/ollama/ollama/releases/tag/v0.15.6), verified against the release archive SHA-256 `35c52af3ff325266f9e5afd2f61e12942ef480b6ebab4ec8991c6ce44bed3c84`, successfully loaded both existing models. No model download or vector-space configuration change was needed. `content/ollama-runtime.json` pins that compatibility runtime; `npm run ollama:serve` starts it on loopback port 11434. `OLLAMA_EXECUTABLE` can explicitly override the binary. The original newer binary remains available. The compatibility probe on port 11435 was stopped.

Live checks returned HTTP 200 for a real 768-dimensional Nomic embedding and a Llama chat completion (`7 + 9 = 16` at temperature zero). An earlier unconstrained small-model response answered incorrectly, so successful connectivity is not a claim of mathematical reliability. The queue was checkpointed and resumed to fill its missing local embeddings from cached documents while continuing the remaining OCR.

Recovery validation: TypeScript passed; all **20 bulk/ingestion tests passed**. A live query confirmed all five curriculum mappings. The resumed process repaired missing provider publications and increased published-page coverage beyond the recovered 89-page checkpoint.

On Windows, pause the queue and stop the app before rebuilding: Prisma's engine executable can be locked by either running process. Resume both afterward. Source selection comes from `../work/mat1512/ingestion-plan.json`; changing that scope requires a separate checkpoint workspace.

## Verification — 6 November 2026

```text
npm test:          tests 60; pass 60; fail 0
npm run typecheck: passed
npm run build:     passed (production routes, including /api/figures/[asset])
npm run test:e2e:  8 passed
```

Checks cover scope deduplication and unit ordering, invalid math/content rejection, numeric table detection, provider reading deduplication, private figure integrity, production reading pagination, rendered equations, an actual extracted figure, interactive controls, authenticated source links and responsive layout. The queue has also published real pages into Neon with both Ollama and Cloudflare embeddings and resumed from checkpoints across all five units. Full-scope conversion is ongoing; the live status file is the source for completion counts.

### Aligned-equation repair — 7 November

All 13 held guide pages contained valid aligned LaTeX with adjacent Markdown dollar fences. Display-fence normalization now places these environments on separate lines without changing their algebra, while preserving code and existing simple formulas. All 13 cached 192-DPI pages pass validation; 12 targeted tests pass, including an idempotence regression test. Retrying held pages now takes priority over the remaining bulk queue. These remain machine OCR, not source-compared transcriptions. The app can serve published readings while the queue runs; refresh to load newly published pages.

Repair verification: all 13 previously held pages were republished in both embedding spaces; full suite 61 passed, production build passed, app HTTP 200 on port 3200.
