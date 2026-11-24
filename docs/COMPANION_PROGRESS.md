# Companion and recall phase

Generic study-unit components live under `app/study/[unitId]/components`. Reader Focus, Split and Theater use 70/30, 50/50 and 30/70 desktop proportions with the existing mobile panel switch. Answer cards retain Markdown/KaTeX and source citations. Validated widget frames render lazy SVG graphs, secants, derivatives and limits for the explicitly labelled quadratic example; model-supplied executable formulas and unknown fields are rejected.

`POST /api/recall` accepts `action: queue`, `studyUnitId` and optional source-linked chat text, or `action: rate`, `studyUnitId`, `chunkId`, `rating` in [0,1]. Authentication supplies student identity. The server verifies source/unit membership before writing an atomic StudentMastery upsert and scheduling recall after one, three or seven days. Ratings are self-assessments and replace the outcome's current score; they are not official marks. Source cards extract an equation or definition paragraph. Conversation cards require a citation belonging to that unit; source-free chat stays ungraded. The quiz and study views share the drawer. The dashboard tree groups learner-owned outcome scores by institution/module and refreshes on window focus, alongside the existing live progress connection.

Voice records bounded 30-second turns, collects MediaRecorder buffers, uploads a complete recording to authenticated `POST /api/tutor/voice`, then sends the transcript through the normal tutor stream. Recordings are capped at 4 MB server-side, sent to Cloudflare Whisper through server-only credentials and not stored. Responses can be spoken sentence by sentence through browser speech synthesis. Tracks, recording timers and fetches are cleaned up on unmount. See [Cloudflare's Whisper input contract](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).

**Voice limitation:** this is turn-based transcription plus streamed-text playback, not bidirectional audio-buffer streaming or a low-latency realtime speech service. Live microphone and Cloudflare speech quota need manual verification in the browser. No continuous voice claim is made. Browser speech voices and spoken LaTeX quality vary.

No new tables or migrations were needed. Existing unit/outcome boundaries are reused and generic features contain no MAT1512 identifiers. This does not implement tenant memberships, billing or subscription enforcement; those remain a separate platform phase. A future tenant-aware curriculum access policy must wrap these same unit lookups before institutions have private catalogs.

Verification logs are in the private work directory. Build uses `next build --webpack` after the normal preparation script, without Prisma generation, while the existing bulk process continues. UI voice, rendering and source-backed recall should be reviewed with real learners before treating this as a finished realtime tutor.

Checks: TypeScript passed; Prisma schema valid; npm test 63 passed; production webpack build passed; 8 desktop/mobile browser checks passed (including new layout ratios, recall drawer and KaTeX). Browser recall checks used a controlled API fixture. Anonymous recall and voice requests returned 401. Authenticated rating persistence, microphone transcription and live voice playback have not been verified end to end in this session.

Final production rebuild and TypeScript check also passed after session-isolation cleanup in the dashboard tree. App restarted on port 3200; the bulk worker continued to 248/547 pages without a restart.

Access-fix verification update: the Rust-free application Prisma client now resolves the Windows TLS failure. Production desktop/mobile tests verified authenticated recall queue requests, a 0.75 rating persisted in StudentMastery and returned by the mastery API, with fixture cleanup. Microphone/continuous voice limitations above are unchanged.


Retention update: the header now opens the recall modal, and the fixed review intervals described above are superseded by adaptive Again/Good/Easy scheduling. Persistent private notes, clipping and current verification are documented in NOTES_AND_RETENTION.md.

