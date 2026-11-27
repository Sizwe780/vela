import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Database } from "../lib/ingest/repository";
import { runRetention } from "../lib/account/retention";
import { retentionPolicy } from "../lib/account/retention-policy";
const url = new URL(process.env.DATABASE_URL!);
const apply = process.argv.includes("--apply");
if (
  apply &&
  (process.argv.find((a) => a.startsWith("--host="))?.slice(7) !== url.hostname ||
    !process.argv.includes(`--policy=${retentionPolicy.version}`))
)
  throw Error(
    "Applying retention requires --apply, --host=<exact database host> and --policy=" +
      retentionPolicy.version,
  );
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
});
async function main() {
  try {
    const actor = process.env.VELA_SUPPORT_OPERATOR_ID;
    if (!actor) throw Error("Configure the verified support operator before preview or apply.");
    const [verified] = await db.$queryRaw<
      { ok: boolean }[]
    >`SELECT EXISTS(SELECT 1 FROM neon_auth."user" u JOIN "StaffMembership" s ON s."studentId"=u.id::text WHERE u.id::text=${actor} AND u."emailVerified"=true AND s.role='admin') AS ok`;
    if (!verified?.ok)
      throw Error("The configured operator is not a verified scoped administrator.");
    const adapter: Database = {
      query: (sql) => db.$queryRaw(sql),
      transaction: (callback) =>
        db.$transaction((tx) => callback({ query: (sql) => tx.$queryRaw(sql) }), {
          maxWait: 5000,
          timeout: 25000,
        }),
    };
    const result = await runRetention(adapter, actor, apply);
    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          policyVersion: result.policyVersion,
          eligible: result.counts,
          deleted: result.deleted,
          overdueDeletionRequests: result.deletionRequests.filter((r) => r.overdue).length,
          inactivityCandidates: result.inactivityCandidates.length,
          mayHaveMore: result.mayHaveMore,
          providerLogs: result.providerLogs,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Retention maintenance failed. Verify the operator, migration and explicit apply arguments. No success is claimed.",
  );
  process.exitCode = 1;
});
