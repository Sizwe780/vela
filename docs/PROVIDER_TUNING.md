# Cloudflare default and Ollama tuning

Updated 11 November 2026. Leave Tutor source on **Configured AI** to use Cloudflare, or select Ollama explicitly for local inference.

Local tutoring uses llama3.2:3b, one complete source chunk, at most two recent history messages bounded to 600 tokens, a compact system prompt, a 60-word instruction and a 192-token output limit. Guided mode explicitly selects `OLLAMA_GUIDED_MODEL=llama3.2:3b`. Cloudflare retains six chunks and the 1,600-token output limit. Source equations and citation IDs are preserved; existing embedding spaces are unchanged.

The portable Ollama launcher uses one parallel generation, a 4,096-token context, two resident models and a 30-minute keep-alive. This machine uses CPU inference. Cold starts and system load still affect latency; ask follow-up questions for longer explanations.

Start from the application directory:

```powershell
npm run ollama:serve
npm run start -- --hostname 127.0.0.1 --port 3200
```

Real units start at http://localhost:3200/study/MAT1512-U1. Sign in to use notes, recall, source illustrations and live tutoring.

Verification: TypeScript and production build passed, alongside 70 tests. The default provider live check identified Cloudflare and generated an embedding and answer. Timed real-unit RAG checks write live-tutor-check.json.

Final real-unit benchmark on 11 November 2026: Ollama 38.6 seconds with one source citation; Cloudflare 14.8 seconds with six citations. Both completed streaming without error frames. The local model was warm; these are single-run measurements, not latency guarantees. The earlier local request took about 158 seconds. Real-unit notes, recall, widget, source image/PDF and persisted milestone checks also passed.

A progress-save regression check exposed Prisma P2028: the default five-second transaction budget expired on the remote database. A standalone probe reproduced the failure and completed the same atomic save in 7.9 seconds with a twenty-second budget. Session saves now use maxWait 10 seconds and timeout 20 seconds; no score, scheduling or completion semantics changed.

Final persistence retest passed: all five real-unit routes, saved/reloaded milestones, header progress, source library, original PDF byte ranges and PNG delivery (45 seconds). The production app is running on localhost:3200.
