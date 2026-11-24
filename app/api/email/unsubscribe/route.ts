import { prisma } from "../../../../lib/db";
import { stopReminders } from "../../../../lib/email/service";
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await stopReminders(prisma, token);
  return new Response(
    result === "stopped"
      ? "Recall reminders are off."
      : result === "stale"
        ? "This older link does not control your current reminder subscription. Use the newest email link or your Vela profile."
        : "This unsubscribe link is invalid. You can turn reminders off in your Vela profile.",
    {
      status: result === "stopped" ? 200 : result === "stale" ? 409 : 400,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
