import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { spawnSync } from "node:child_process";
async function main() {
  const accounts = JSON.parse(
    await readFile("../work/academic-master-recovered-qa.json", "utf8"),
  ) as { id: string; email: string }[];
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } });
  await db.connect();
  try {
    for (const account of accounts) {
      if (
        !/^[a-zA-Z0-9_-]{1,100}$/.test(account.id) ||
        !/^workspace-[a-f0-9-]+@example\.invalid$/.test(account.email)
      )
        throw Error("Not a verified disposable fixture");
      const result = await db.query(
        'SELECT (SELECT count(*) FROM "ConceptCheck" WHERE "studentId"=$1)+(SELECT count(*) FROM "LearningConceptState" WHERE "studentId"=$1)+(SELECT count(*) FROM "Enrollment" WHERE "studentId"=$1)+(SELECT count(*) FROM "StudyNote" WHERE "studentId"=$1) AS remaining',
        [account.id],
      );
      console.log(JSON.stringify({ remainingPrivateRecords: Number(result.rows[0].remaining) }));
      await db.query("BEGIN");
      try {
        for (const table of [
          "EmailDelivery",
          "PracticeNotebook",
          "DiscussionReport",
          "DiscussionPost",
          "StudyRoomPresence",
          "ConceptAttempt",
          "StudyPresence",
          "StudyActivityDay",
          "StudyBookmark",
          "StudyPosition",
          "QuizAttempt",
          "StudyNote",
          "SessionProgress",
          "StudentMastery",
          "LearningConceptState",
          "ConceptCheck",
          "LearningPreference",
          "StudentProfile",
          "Enrollment",
        ])
          await db.query(`DELETE FROM "${table}" WHERE "studentId"=$1`, [account.id]);
        await db.query("COMMIT");
        console.log("Disposable private fixtures removed.");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }

      const command = `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${account.id} --branch production --project-id square-grass-82468951`;
      const deleted = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 60000,
      });
      if (
        deleted.status === 0 ||
        /not found|404|does not exist/i.test(deleted.stdout + deleted.stderr)
      )
        console.log("Disposable auth account removed or already absent.");
      else throw Error("Disposable auth cleanup needs attention");
    }
  } finally {
    await db.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Cleanup failed");
  process.exitCode = 1;
});
