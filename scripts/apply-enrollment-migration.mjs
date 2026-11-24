import "dotenv/config";
import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
const name =
  process.argv.find((a) => a.startsWith("--migration="))?.slice(12) ?? "20261117190000_enrollment";
if (
  ![
    "20261117190000_enrollment",
    "20261117210000_student_experience",
    "20261118090000_email_delivery",
    "20261118100000_study_activity",
    "20261118110000_concept_attempts",
    "20261118130000_practice_notebook",
    "20261118150000_social_learning",
    "20261119010000_concept_learning",
  ].includes(name)
)
  throw Error("Only reviewed additive migrations are supported");
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 20000,
});
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL statement_timeout='30s'");
  const lock = await db.query(
    "SELECT pg_try_advisory_xact_lock(hashtext('vela-schema-migration')) AS acquired",
  );
  if (!lock.rows[0].acquired) throw Error("Another migration is active; retry later");
  const applied = await db.query(
    'SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations"',
  );
  if (applied.rows.some((x) => !x.finished_at && !x.rolled_back_at))
    throw Error("Resolve an unfinished migration before proceeding");
  const prior = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((x) => x.isDirectory() && x.name < name)
    .map((x) => x.name);
  if (prior.some((n) => !applied.rows.some((x) => x.migration_name === n && x.finished_at)))
    throw Error("An earlier migration has not been applied");
  const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
  if (!applied.rows.some((x) => x.migration_name === name && x.finished_at)) {
    await db.query(sql);
    await db.query(
      'INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,CURRENT_TIMESTAMP,1)',
      [randomUUID(), createHash("sha256").update(sql).digest("hex"), name],
    );
  }
  await db.query("COMMIT");
  console.log(`${name} applied and Prisma migration history verified.`);
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error(e instanceof Error ? e.message : "Migration failed");
  process.exitCode = 1;
} finally {
  await db.end();
}
