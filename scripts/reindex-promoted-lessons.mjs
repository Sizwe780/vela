import "dotenv/config";
import { Pool } from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Re-embed the exact promoted records; do not relabel another endpoint's vectors.
const directory = resolve(process.argv[2] ?? "");
const source = JSON.parse(await readFile(resolve(directory, "source.json"), "utf8"));
await readFile(resolve(directory, "committed.json"), "utf8");
const url = new URL(process.env.PROMOTE_TARGET_URL);
if (url.hostname.includes("ep-gentle-rice")) throw Error("Expected production target");
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
});
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!/^[a-f0-9]{32}$/i.test(account ?? "") || !process.env.CLOUDFLARE_API_TOKEN)
  throw Error("Missing Cloudflare configuration");
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`;
const model = "@cf/baai/bge-base-en-v1.5";
const path = resolve(directory, "reindexed.json");
const done = JSON.parse(await readFile(path, "utf8").catch(() => "[]"));
try {
  const ids = source.ingestions.map(({ id }) => id);
  const ingestions = (await db.query('SELECT * FROM "Ingestion" WHERE id=ANY($1)', [ids])).rows;
  const chunks = (
    await db.query(
      'SELECT id,body,"ingestionId" FROM "ContentChunk" WHERE "ingestionId"=ANY($1) ORDER BY id',
      [ids],
    )
  ).rows;
  if (ingestions.length !== ids.length || chunks.length !== source.chunks.length)
    throw Error("Promoted records changed");
  const pending = ingestions.filter((i) => !(done.includes(i.id) && i.embeddingBaseUrl === base));
  while (pending.length) {
    const group = [];
    let batch = [];
    while (pending.length) {
      const next = chunks.filter(({ ingestionId }) => ingestionId === pending[0].id);
      if (batch.length && batch.length + next.length > 24) break;
      group.push(pending.shift());
      batch.push(...next);
    }
    const response = await fetch(`${base}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: batch.map(({ body }) => body),
        encoding_format: "float",
      }),
    });
    if (!response.ok) throw Error(`Embedding HTTP ${response.status}; rerun to resume`);
    const { data } = await response.json();
    if (!Array.isArray(data) || data.length !== batch.length)
      throw Error("Invalid embedding batch");
    data.sort((a, b) => a.index - b.index);
    if (
      data.some(
        (d, i) =>
          d.index !== i ||
          d.embedding?.length !== 768 ||
          !d.embedding.every(Number.isFinite) ||
          !d.embedding.some((n) => n !== 0),
      )
    )
      throw Error("Invalid vector");
    const vectors = new Map(batch.map((chunk, i) => [chunk.id, data[i].embedding]));
    for (const ingestion of group) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const current = (
          await client.query('SELECT "sourceText" FROM "Ingestion" WHERE id=$1 FOR UPDATE', [
            ingestion.id,
          ])
        ).rows[0];
        if (current?.sourceText !== ingestion.sourceText)
          throw Error("Evidence changed during indexing");
        for (const chunk of batch.filter((c) => c.ingestionId === ingestion.id)) {
          const result = await client.query(
            'UPDATE "ContentChunk" SET "embedding768"=$1::vector WHERE id=$2 AND body=$3',
            [`[${vectors.get(chunk.id).join(",")}]`, chunk.id, chunk.body],
          );
          if (result.rowCount !== 1) throw Error("Chunk changed during indexing");
        }
        await client.query(
          'UPDATE "Ingestion" SET "embeddingBaseUrl"=$1,"embeddingProvider"=\'cloudflare\',"embeddingModel"=$2,"embeddingDimensions"=768 WHERE id=$3',
          [base, model, ingestion.id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      if (!done.includes(ingestion.id)) done.push(ingestion.id);
      await writeFile(path, JSON.stringify(done));
      console.log(`Reindexed ${done.length}/${ids.length} lessons`);
    }
  }
  console.log(
    `Verified ${done.length} lessons, ${chunks.length} chunks on current Cloudflare endpoint`,
  );
} finally {
  await db.end();
}
