import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
const name = "20261107000000_study_notes";
const sql = await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
const checksum = createHash("sha256").update(sql).digest("hex");
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
url.searchParams.delete("sslmode"); url.searchParams.delete("channel_binding");
const pool = new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:20000});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '3s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[name]);
  const prior = await client.query('SELECT checksum, finished_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL',[name]);
  if (prior.rows.length) { if(prior.rows[0].checksum !== checksum || !prior.rows[0].finished_at) throw Error("Migration state requires inspection"); console.log("StudyNote migration already applied"); }
  else {
    await client.query(sql);
    await client.query('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)',[randomUUID(),checksum,name]);
    console.log("StudyNote migration applied and recorded");
  }
  await client.query("COMMIT");
} catch(e) { await client.query("ROLLBACK"); throw e; }
finally { client.release(); await pool.end(); }
