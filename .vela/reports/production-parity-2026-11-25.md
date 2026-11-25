# Production parity review

Production is served through Cloudflare and Azure App Service. The home page returned HTTP 200 with dynamic caching. A read-only comparison of the Azure-configured Neon database and the dedicated staging database matched sessions by institution, module, unit code and position. It compared Markdown hashes and checked session IDs separately.

| Module | Missing from production | Changed Markdown | Production-only | Matched session IDs |
| --- | ---: | ---: | ---: | ---: |
| BPT1501 | 0 | 5 | 1 | 5 |
| CHE1501 | 31 | 0 | 0 | 0 |
| MAT1503 | 0 | 78 | 0 | 78 |
| MAT1512 | 0 | 30 | 0 | 30 |
| PHY1503 | 17 | 0 | 0 | 0 |
| PHY1505 | 26 | 0 | 0 | 0 |
| TPS2601 | 4 | 0 | 0 | 0 |

Promote reviewed content by its stable identifiers. Keep the production-only BPT1501 session out of automatic replacement until its retirement and learner references are reviewed. Preserve enrollment, notes, attempts and mastery. Verify final routes and active-session citations after publishing and indexing the promoted Markdown. Changing the Azure connection to the staging database would also change the learner-data environment.

Azure’s effective configured settings showed a database URL, Groq as the designated provider and Cloudflare token mode. The provider API key and Cloudflare account/token settings were absent from the App Service app settings. Local Groq, Gemini and OpenRouter credentials were found. Local Cloudflare was configured without a deployable API token. Add the account ID and a scoped Workers AI token through production secrets, with provider keys in Azure settings or Key Vault references. Use a real authenticated lesson request to check streaming and citations after deploying.

The workspace changes use a versioned favicon with a compact tab-size variant of the supplied brand. Standard page headers, auth screens and study status screens share the logo asset. Legacy favicon lookups also get the updated ICO. The provider defaults replace unavailable model IDs and route chat-only providers to Cloudflare for embeddings when a chat-only model is configured as primary.
