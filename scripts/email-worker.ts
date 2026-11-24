import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { runEmailBatch } from "../lib/email/service";
import { emailConfig } from "../lib/email/config";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 2,
  }),
});
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function main() {
  try {
    if (!emailConfig())
      throw Error("Email is disabled or incomplete. See EMAIL_SETUP.md. No messages sent.");
    do {
      try {
        console.log(
          JSON.stringify({ checkedAt: new Date().toISOString(), ...(await runEmailBatch(db)) }),
        );
      } catch {
        console.error(
          "Email batch unavailable; no automatic retry of ambiguous deliveries. Check connection and outbox status.",
        );
        if (process.argv.includes("--once")) process.exitCode = 1;
      }
      if (process.argv.includes("--once")) break;
      // Short slices allow a clean stop; every process uses the same durable claims/budget.
      for (let i = 0; i < 60 && !stopping; i++)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (!stopping);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Email worker failed");
  process.exitCode = 1;
});
