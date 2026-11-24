import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { emailConfig } from "../lib/email/config";
const config = emailConfig();
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 1,
  }),
});
async function main() {
  try {
    const counts = await db.emailDelivery.groupBy({ by: ["kind", "status"], _count: true });
    const budget = await db.emailBudget.findUnique({
      where: { day: new Date().toISOString().slice(0, 10) },
    });
    console.log(
      JSON.stringify(
        {
          provider: config?.provider ?? null,
          mode: config?.mode ?? "not-connected",
          dailyLimit: config?.dailyLimit ?? null,
          reservedToday: budget?.attempts ?? 0,
          outbox: counts,
        },
        null,
        2,
      ),
    );
    if (config?.provider === "brevo" && process.argv.includes("--provider")) {
      const response = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": config.apiKey },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      console.log(
        JSON.stringify({ brevoAccountReachable: response.ok, httpStatus: response.status }),
      );
      const senders = await fetch("https://api.brevo.com/v3/senders", {
        headers: { "api-key": config.apiKey },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      const data = (await senders.json()) as { senders?: { email: string; active: boolean }[] };
      console.log(
        JSON.stringify({
          senderVerified: !!data.senders?.some(
            (s) => s.email.toLowerCase() === config.from.toLowerCase() && s.active,
          ),
        }),
      );
    }
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Email status unavailable. Check connectivity and configuration.");
  process.exitCode = 1;
});
