import { z } from "zod";
export const EMAIL_CONSENT_VERSION = "recall-daily-v1";
export type EmailConfig = {
  provider: "brevo" | "resend" | "acs";
  mode: "test" | "live";
  apiKey: string;
  from: string;
  replyTo: string;
  origin: string;
  unsubscribeSecret: string;
  testRecipient: string;
  dailyLimit: number;
};
export function emailConfig(
  env: Record<string, string | undefined> = process.env,
): EmailConfig | null {
  if (env.EMAIL_MODE !== "test" && env.EMAIL_MODE !== "live") return null;
  const from = z.string().email().safeParse(env.EMAIL_FROM);
  const reply = z.string().email().safeParse(env.EMAIL_REPLY_TO);
  const test = z.string().email().safeParse(env.EMAIL_TEST_RECIPIENT);
  const provider = env.EMAIL_PROVIDER ?? "brevo";
  if (provider !== "brevo" && provider !== "resend" && provider !== "acs") return null;
  const apiKey =
    provider === "resend"
      ? env.RESEND_API_KEY
      : provider === "acs"
        ? env.ACS_CONNECTION_STRING
        : env.BREVO_API_KEY;
  if (
    !from.success ||
    !reply.success ||
    !apiKey ||
    (env.EMAIL_UNSUBSCRIBE_SECRET?.length ?? 0) < 32
  )
    return null;
  if (
    provider === "resend" &&
    env.EMAIL_MODE === "live" &&
    from.data.toLowerCase().endsWith("@resend.dev")
  )
    return null;
  try {
    const url = new URL(env.EMAIL_APP_URL!);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (
      url.protocol !== "https:" &&
      !(
        env.EMAIL_MODE === "test" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    if (env.EMAIL_MODE === "test" && !test.success) return null;
    const limit = Number(env.EMAIL_DAILY_LIMIT ?? (provider === "resend" ? 85 : 250));
    if (!Number.isInteger(limit) || limit < 1 || limit > (provider === "resend" ? 90 : 280))
      return null;
    return {
      provider,
      mode: env.EMAIL_MODE,
      apiKey,
      from: from.data,
      replyTo: reply.data,
      origin: url.origin,
      unsubscribeSecret: env.EMAIL_UNSUBSCRIBE_SECRET!,
      testRecipient: test.success ? test.data.toLowerCase() : "",
      dailyLimit: limit,
    };
  } catch {
    return null;
  }
}
export function mayEmail(config: EmailConfig, email: string) {
  return config.mode === "live" || email.toLowerCase() === config.testRecipient;
}
export function emailDeliveryStatus() {
  const c = emailConfig();
  return c ? (c.mode === "test" ? "test" : "connected") : "not-connected";
}
export function recallDay(now: Date) {
  return new Date(now.getTime() + 2 * 3600_000).toISOString().slice(0, 10);
}
export function recallSendWindow(now: Date) {
  const hour = new Date(now.getTime() + 2 * 3600_000).getUTCHours();
  return hour >= 9 && hour < 18;
}
