import "dotenv/config";
import pg from "pg";
const arg = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const email = arg("email"),
  id = arg("student-id"),
  qualification = arg("qualification-id"),
  role = arg("role") ?? "staff";
if (!["staff", "admin"].includes(role) || (!email && !id))
  throw Error("Supply --email or --student-id and --role=staff|admin");
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } });
try {
  await db.connect();
  let studentId = id;
  if (email) {
    const table = await db.query("SELECT to_regclass('neon_auth.user') AS name");
    if (!table.rows[0].name)
      throw Error(
        "Auth directory is not available through this database; use the account ID shown on the profile page.",
      );
    const users = await db.query(
      'SELECT id,"emailVerified" FROM neon_auth."user" WHERE lower(email)=lower($1)',
      [email],
    );
    if (users.rows.length !== 1)
      throw Error(
        "No unique existing account matches that email. Create/sign in to the account first.",
      );
    if (!users.rows[0].emailVerified)
      throw Error("Verify the account email before assigning operator privileges.");
    studentId = users.rows[0].id;
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(studentId)) throw Error("Invalid account ID");
  const q = qualification
    ? await db.query('SELECT id,code,institution FROM "Qualification" WHERE id=$1', [qualification])
    : await db.query('SELECT id,code,institution FROM "Qualification" ORDER BY institution,code');
  if (!q.rows.length) throw Error("No qualification selected");
  console.log(
    JSON.stringify(
      {
        accountMatched: true,
        role,
        qualifications: q.rows.map((q) => ({ code: q.code, institution: q.institution })),
        apply: process.argv.includes("--apply"),
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--apply")) {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query(
      `INSERT INTO "StudentProfile"("studentId",role,"updatedAt") VALUES($1,$2,CURRENT_TIMESTAMP) ON CONFLICT("studentId") DO UPDATE SET role=CASE WHEN "StudentProfile".role='admin' THEN 'admin'::"ApplicationRole" ELSE EXCLUDED.role END,"updatedAt"=CURRENT_TIMESTAMP`,
      [studentId, role],
    );
    for (const row of q.rows)
      await db.query(
        'INSERT INTO "StaffMembership"("studentId","qualificationId",role) VALUES($1,$2,$3) ON CONFLICT("studentId","qualificationId") DO UPDATE SET role=EXCLUDED.role',
        [studentId, row.id, role],
      );
    await db.query("COMMIT");
    console.log("Scoped staff assignment verified.");
  }
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error(e instanceof Error ? e.message : "Staff assignment failed");
  process.exitCode = 1;
} finally {
  await db.end();
}
