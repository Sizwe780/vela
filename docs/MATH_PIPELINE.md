# Math-aware ingestion — 5 November 2026

**6 November update:** [Bulk conversion](BULK_CONVERSION.md) is running over all 547 selected pages, using a persistent GPU-backed local worker, cached checkpoints and OCR/publication overlap. All five units now have structured readings; the reader adds page navigation and authenticated extracted figures. [Current coverage](bulk-conversion-status.json) supersedes the historical pilot counts below. Machine OCR remains clearly distinguished from source-compared material. The page-14 pilot findings below describe the initial verification, not the current coverage limit.

The app now accepts structured study documents: ordered Markdown and safe interactive graph blocks, with original PDF hashes, physical page ranges, parser versions and review status. `Ingestion.structuredContent` persists that JSON through the existing learning-outcome → study-unit relationship. `ContentChunk.body` retains delimited LaTeX for retrieval and citations.

## Current coverage

[Open MAT1512 U1](http://localhost:3200/study/cmw3pzzwl0001khuc8rb9u4xz) after signing in. The source-checked teaching adaptation covers **guide PDF page 14, printed page 8**, including

```latex
$$
\lim_{x\to 2}\frac{x^2-4}{x-2}=4.
$$
```

Its interactive graph shows the removable discontinuity: moving either the slider or pointer changes the function value; exactly at 2 it reports `undefined`, while the limit remains 4. The original guide uses numerical tables; the widget is explicitly a teaching adaptation. It is not presented as an automatically reconstructed source image.

Local Marker has now also parsed the original page successfully: **197.72 seconds, 13 valid LaTeX expressions**. Source comparison found one omitted standalone limit; it was restored from the PDF and recorded in `parser.reviewNotes`. The reviewed OCR document has **14 valid expressions**, persisted as two chunks per provider. See [reviewed OCR document](content/mat1512/guide-page14-marker.json) and [database verification](math-verification.json).

The teaching adaptation was compared visually with the original PDF. Its parser is labelled `reviewed-transcription`, review `source-compared`. It is **not an automatic Marker OCR result**. Both the adaptation and reviewed OCR have Nomic/Ollama and BGE/Cloudflare embeddings. At the initial pilot checkpoint, the module had **1,996 chunks / 124 ingestions**: the original 1,990 chunks plus six structured vector records. The previous 1,990 raw-text chunks are retained separately; they have not been silently relabelled as math-aware OCR. Bulk conversion now adds structured readings to all units; see the current status linked above.

For a unit with structured readings, the reader opens those first and offers an explicit legacy-text checkbox. The tutor retrieves only that unit's structured readings in the selected embedding space, ordered by cosine similarity and subject to the existing relevance threshold. The UI states that tutor evidence covers pilot pages only. If that provider has no structured vectors, retrieval returns no evidence rather than reverting to damaged extraction. Free quiz generation retains the existing readable-prose source selection.

## Local parser

The [Marker 2.1.0 CLI](https://github.com/datalab-to/marker/tree/v2.1.0) is called by `scripts/parse-math-pdf.ts`. It uses balanced mode, forced OCR and explicit inline-math OCR. No paid LLM enhancement is enabled. Parsing runs locally before `/api/ingest`, not inside a timed Next.js request.

The pinned parser uses Surya's local inference server. `marker-local.py` requires forced, balanced OCR, bypasses redundant text-quality classification, and fixes Windows process cleanup without disabling visual recognition. The adapter is pinned to Marker 2.1.0 / Surya 0.23.0; other versions must use a separately verified adapter. CPU installations need a compatible `llama-server` binary and Surya model/projector weights. See [Surya](https://github.com/datalab-to/surya) and [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases). The workspace installation uses an x64 Python runtime for Marker and a native ARM64 inference binary. Native Windows ARM dependency resolution currently fails on Marker's pinned OpenCV wheel.

Install into an isolated workspace environment with Python 3.12 and `uv`; set `UV_CACHE_DIR` and `UV_PYTHON_INSTALL_DIR` inside `../work/math-parser` if the default user directories are unavailable. On this Windows sandbox, concurrent package copying hit resource error 1450; serial installation and repair from a SHA-256-verified wheel were needed. `torch` tensor execution and Marker CLI startup subsequently passed.

```powershell
uv venv --python 3.12 ../work/math-parser/venv
$env:RAYON_NUM_THREADS = "1"
$env:UV_CONCURRENT_INSTALLS = "1"
$env:UV_LINK_MODE = "copy"
uv pip install --python ../work/math-parser/venv/Scripts/python.exe -r scripts/requirements-math.txt

npm run parse:math -- --pdf="C:/Users/sizwe/Documents/LMS/Mat1512/Mat1512-guide.pdf" --document=guide --pages=14-14 --annotations=content/mat1512/limits-visuals.json
```

Pages on this interface are **one-based physical PDF pages**; the wrapper converts them to Marker's zero-based page selection. Batches are limited to ten pages. Output and caches stay in ignored `../work/math-parser`. A successful job prints its `structured.json` path. Parser failures or invalid math stop the job; there is no raw-text fallback.

`MARKER_EXECUTABLE` can point to another local installation. `LLAMA_CPP_BINARY`, `SURYA_GGUF_LOCAL_MODEL_PATH` and `SURYA_GGUF_LOCAL_MMPROJ_PATH` override local backend paths. The wrapper also detects the workspace backend under `../work/math-parser/backend`. Use compatible models and review OCR against the source before marking it `source-compared`.

On Windows the standalone launcher defaults `OMP_NUM_THREADS` and `MKL_NUM_THREADS` to one. Explicit values take precedence. Set `MARKER_PROFILE_DIR` to a fresh workspace path for a diagnostic run if an interrupted Surya server left a stale lock in the default profile. This keeps the diagnostic separate from the bulk worker.

## Ingest and render

```powershell
npm run ingest:structured -- PATH/TO/structured.json MAT1512-U1 ollama
# Optional second embedding space, using the existing free Cloudflare setup:
npm run ingest:structured -- PATH/TO/structured.json MAT1512-U1 cloudflare
```

The same document can be submitted to `POST /api/ingest` using its existing staff bearer token. Supply `moduleCode`, `studyUnitId`, `learningOutcomeId`, `assessmentCriterionId`, optional `sourceName`, and **exactly one** of `structuredContent`, `text` or `parsedPdf`. Existing plain-text inputs remain compatible; `parsedPdf.text` is explicitly legacy extraction and does not restore lost formula structure. The old batch script requires `--legacy-raw`; new PDF work uses `parse:math`.

The payload schema is in `lib/content/structured.ts`. A structured document has:

- `version: 1`, `parser: { name, version, review }` and a SHA-256/page-range `source`;
- Markdown blocks: `{ id, type: "markdown", markdown }`;
- interactive blocks: `{ id, type: "interactive", kind, title, caption, initialX, sourcePage }`.

The fixed graph kinds are `limit` for the removable discontinuity `(x²−4)/(x−2)`, `tangent` for `x²`, and `integral` for the area under `x²`. They use accessible sliders, pointer interaction and SVG. Arbitrary expressions, JavaScript, component names or remote executable content are rejected. Other source diagrams require an explicitly authored adaptation; Marker does not automatically turn every diagram into a widget. Original PDF links remain available for comparison.

LaTeX delimiters `\(...\)` and `\[...\]` normalize to Markdown math. The Markdown AST is validated with KaTeX and mhchem before embedding or opening a database transaction. Unclosed delimiters, unsupported formulas and unsafe commands return HTTP 422. Schema errors return 400. Code spans/fences are excluded from formula validation. Syntax validity does not prove mathematical correctness or OCR accuracy.

Canonical chunk windows remain **500 cl100k tokens / 50 overlap**, with their original token offsets. Body/byte boundaries expand when needed to contain complete formulas, as they already do for UTF-8 characters. Display bodies and local/Cloudflare embedding text can therefore be longer than the canonical window. OpenAI retains its canonical token-array input. Structured fingerprints include blocks and parser provenance, preventing reuse of older raw-text vectors as corrected output.

The reader uses `remark-math`, `rehype-katex` and `katex/contrib/mhchem`; HTML is suppressed and KaTeX trust stays disabled. Valid `\ce{...}` chemistry notation is supported inside math delimiters.

## Verification

- Migration `20261105000500_structured_documents` applied first to an isolated Neon branch, then production. The temporary branch was deleted.
- `npm test`: **54 passed**, covering structured persistence/idempotence, math/chemistry, formula boundaries, validation, and exclusion of legacy tutor sources after upgrade.
- `npm run test:e2e`: **8 passed**, desktop and mobile; includes authenticated MAT1512 reading, real stored LaTeX, rendered fractions, slider/hover behavior, source links, HTTP reuse and malformed-math rejection. Temporary learners were removed.
- `npm run test:math`: both providers have 14 reviewed source expressions, intact fraction/limit notation, valid chunk math and original-page links.
- `npm run test:mat1512`: both tutors, structured-only live citations, 83% quiz score, idempotent mastery, Realtime updates, mobile layout and HTTP ingestion reuse passed; temporary learners removed.
- Production build passed on Next.js 16.4.5. TypeScript and the five-unit free-quiz audit passed.
- Live pgvector searches retrieved the teaching adaptation with Ollama cosine **0.7359** and Cloudflare cosine **0.7297**, mapped to `LOCAL-MAT1512-U1`. This remains a local curriculum criterion, not verified SAQA/CAPS policy.

Automatic Marker conversion is verified for **one source page**, including local server shutdown. The accelerated public-model downloader returned HTTP 401; a resumable HTTP download succeeded and publisher SHA-256 hashes were verified. Initial Windows package copying hit resource error 1450 and was repaired from the verified wheel. These setup failures were recovered.

Full-corpus OCR and automatic digitization of arbitrary diagrams remain outside this completed pilot. The remaining source pages have not been relabelled as corrected OCR. OCR still requires source comparison: syntax checks cannot detect omitted equations.
