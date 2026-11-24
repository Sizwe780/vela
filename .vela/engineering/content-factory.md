# Content factory delivery timeline
Version 1.0.0 · 20 November 2026

The factory uses the Universal Core and the module’s registered domain specifications. Start with [spec onboarding](../specs/README.md) and the [science source workflow](science-ingestion.md). Advancement depends on scope, evidence and reviewer readiness.

| Stage | Exit gate | Delivery |
| --- | --- | --- |
| 1 · Intake | Register editions, physical pages and permitted processing. Verify SHA-256 and capture a private evidence copy. Use local Marker 2.1.0/Surya and compare every instructional and excluded range with the physical PDF. | Manifest, source locks and ledger implemented. Reuses existing OCR tooling. Full CHE1501 page map and batch pending. |
| 2 · Preflight | Validate KaTeX/mhchem. Require complete reviewed page coverage, check declared quantity conversions and screen lesson prose against the source. Independently check scientific meaning and worked solutions. | Implemented. Trigram coverage and paragraph edit similarity must be below 25%, alongside the Universal Core eight-word check. Bare quantitative statements are warnings. |
| 3 · Synthesis | Extract a factual inventory with evidence references. Generate one schema-validated session at a time from the inventory and Vela specs. Run full-unit QA. | Implemented via CLI. Reusable density, VSEPR, reaction balancing and Riemann sum widgets are available. |
| 4 · Editorial staging | Compare the locked PDF and lesson preview. Edit or regenerate one visible section. Obtain an independent sign-off tied to the exact revision. | Implemented. Factory drafts, staging and approval have separate audited transitions. |
| 5 · Release snapshots | Introduce semantic versions, immutable module snapshots, archives and enrollment pinning. Verify that past attempts, links and progress resolve to the correct version. | Next delivery. The approval already records lesson and evidence hashes. |
| 6 · Publishing and indexing | Write release data and queued jobs in a PostgreSQL transaction. Compute Cloudflare and Ollama embeddings outside it, check search and concept links, and activate the new release atomically when ready. | Planned. The existing reader stays available during indexing and on job failure. |
| 7 · Feedback and patches | Use coarse aggregate struggle signals, minimum sample sizes and targeted patch releases. Define opt-in telemetry and retention before collecting events. | Planned. |

The next registry expansion is parameterised exercise templates and additional discipline-specific widgets. Use module capabilities and independent scientific/mathematical checks before adding a widget. A new lesson should need no module-specific authoring script or bespoke React component.

## Contributor runbook

Run from the app root. The module manifest lives under content/<lowercase-module>/manifest.json. Verify every named file against the private source directory:

~~~powershell
npm run content:verify -- --module=CHE1501 --source-root="C:/path/to/private/sources"
~~~

Add --capture=true to store verified copies by SHA-256. The default is ../work/content-factory/evidence. CONTENT_FACTORY_EVIDENCE_DIR can designate an operator-managed private volume shared with the editor. Keep PDF evidence and Marker figures outside public. Existing OCR tooling preserves raster figures and, where available, vector PDF crops. Use the existing local bulk/Marker process only after mapping physical page ranges.

Create a private reviewed ledger as a JSON array. Each entry has one of these forms:

~~~json
[
  {
    "kind": "instructional",
    "document": {
      "version": 1,
      "parser": { "name": "marker", "version": "2.1.0", "review": "source-compared" },
      "source": { "document": "source-id", "sha256": "<actual SHA-256>", "pageStart": 2, "pageEnd": 2 },
      "blocks": [{ "id": "reading", "type": "markdown", "markdown": "Reviewed text and delimited equations." }]
    }
  },
  {
    "kind": "cover", "sourceId": "source-id", "sha256": "<actual SHA-256>",
    "first": 1, "last": 1, "compared": true, "note": "Confirmed against the physical PDF cover."
  }
]
~~~

Exclusion types are blank, cover, table_of_contents and out_of_scope. Compare each exclusion with the original PDF. The ledger rejects overlaps and missing mapped pages. Machine-only OCR is blocked. Provide a reviewed factual transcription when a figure-only page informs a lesson.

~~~powershell
npm run content:verify -- --module=CHE1501 --unit=CHE1501-U5 --source-root="C:/path/to/private/sources" --evidence="C:/path/to/private/reviewed-ledger.json"
npm run content:generate -- --module=CHE1501 --unit=CHE1501-U5 --source-root="C:/path/to/private/sources" --evidence="C:/path/to/private/reviewed-ledger.json" --allow-provisional=true
~~~

Generation defaults to Ollama. CONTENT_FACTORY_MODEL selects a suitable model. Cloudflare processing requires --provider=cloudflare and clearance on every included source. Only the first pass sees the passages. The second pass receives the validated factual inventory and Vela specs. Artifacts and audit reports go to ../work/content-factory/drafts. Run preflight again with --artifact=... to check the saved output against the exact ledger and current spec.

After ingesting the exact source-compared instructional documents through the existing scoped ingestion procedure, open Teaching workspace → Editorial review or /staff/editor/<MODULE>. Select the qualification and unit and import the generated artifact. The portal verifies the manifest and spec hashes, page coverage and exact stored evidence. The source pane streams a captured PDF through a staff-only endpoint. Use the verified local copy if the server has no captured file.

The author edits and stages their draft. Regeneration suggests replacement prose for a selected visible section and still requires an explicit save. A different qualification administrator checks the exact edition, page ranges and worked solutions before approving. Approval freezes the lesson hash. Provisional syllabus scope can be staged for feedback. Approval requires verified scope. Factory drafts await the module release runner before going live.

## Multi-module batches

Write a private JSON plan beside the source and ledger paths it references. Paths may be absolute or relative to the plan file.

~~~json
{
  "modules": [
    {
      "code": "CHE1501",
      "sourceRoot": "./chemistry/sources",
      "allowProvisional": true,
      "units": [{ "code": "CHE1501-U5", "evidence": "./chemistry/u5-ledger.json" }]
    },
    {
      "code": "PHY1505",
      "sourceRoot": "./mechanics/sources",
      "units": [{ "code": "PHY1505-U1", "evidence": "./mechanics/u1-ledger.json" }]
    }
  ]
}
~~~

The codes and paths illustrate a plan. Register each real module manifest and lock its complete physical page mapping before running its batch.

~~~powershell
npm run content:batch -- --plan="../work/content-factory/plan.json"
npm run content:batch -- --plan="../work/content-factory/plan.json" --generate=true
~~~

The first command is an offline preflight. It verifies each module's source hashes once, checks every unit's reviewed ledger and validates scope, specification requirements and evidence limits. A bad unit is reported individually and other units continue. The CLI exits with a nonzero code if any units are blocked or fail. Each unit emits one JSON result. Neither mode updates the learner database.

Generation defaults to local Ollama and one worker. Two or three workers are available with `--workers=2` or `--workers=3` if the provider can sustain that concurrency. For Cloudflare, use `--provider=cloudflare` and record remote-processing permission on the included sources. Run one invocation per plan at a time. If the run stops, rerun the same plan. Passed drafts are reused only when the evidence, manifest, specification and model are unchanged and the saved artifact hash matches. Fix the cause of a failed unit and rerun. Each generated artifact and its audit are saved under `../work/content-factory/batch-drafts/<module>/<unit>`. Import the plain artifact JSON in the staff editor after submitting the matching reviewed evidence.

After authorization to index a reviewed source, use the same ingestion entry point for any mapped module. Supply the actual outcome and criterion IDs so rows are associated with the correct curriculum records. The command validates the source range and remote-processing policy before contacting an embedding provider. Index only material whose permitted use covers the target database and tutor access.

~~~powershell
npm run ingest:structured -- "./reviewed-page.json" CHE1501-U5 ollama --institution=UNISA --module=CHE1501 --outcome=OUTCOME_ID --criterion=CRITERION_ID
~~~

Use the same plan to schedule local OCR before the referenced ledgers exist. The first command lists the verified PDF ranges. The second runs a one-page pilot. Omit `--max-pages` when ready for the full plan. One Marker worker stays warm between pages.

~~~powershell
npm run content:ocr -- --plan="../work/content-factory/plan.json"
npm run content:ocr -- --plan="../work/content-factory/plan.json" --run=true --max-pages=1
~~~

The OCR worker writes resumable page documents and private PNG and native PDF figure crops under `../work/content-factory/ocr`. A blank or failed page stays held for review. Compare it with the physical PDF before adding it as an exclusion. Source-compare successful pages, check formulas and captions, then assemble the reviewed ledger. The synthesis command rejects machine-only pages. Keep private figures and draft page text out of public storage.

A new module uses the same OCR and synthesis entry points with its own verified source mapping, reviewed ledger and domain specification. Editorial review and publishing are separate steps.

## CHE1501 pilot

The [historical checklist page map](../reports/CHE1501-page-map.md) records the reviewed guide pages and the private ledger paths. Vela U7 is general equilibrium and corresponds to historical Unit 8. Vela U8 is gases and corresponds to historical Unit 11. Leave historical Units 7, 9 and 10 outside the lesson corpus. The current assigned scope awaits the official UNISA materials.

The full chemistry specification can exceed a tutor model's default Ollama context. Use a dedicated local model profile with `PARAMETER num_ctx 8192` or higher for the small pilot, and choose it with `CONTENT_FACTORY_MODEL`. The CLI allows a longer per-request deadline through `CONTENT_FACTORY_TIMEOUT_MS`. Keep the full specification and repeat the audit after any change to the manifest, lessons or evidence.

The next phase should test a small chemistry batch with a reaction, ionic charges, a dimensioned calculation, a reviewed figure and an excluded page. Then compare the existing chemistry workspace against mapped learning outcomes and add chemistry tools where they support those outcomes. Run that pilot before a bulk conversion or content release.
