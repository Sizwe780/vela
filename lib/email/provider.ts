import { mayEmail, type EmailConfig } from "./config";
import { sendBrevo } from "./brevo";
import { sendAcs } from "./acs";
import { EmailSendError } from "./errors";
export type EmailMessage = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
};
export async function sendEmail(
  config: EmailConfig,
  message: EmailMessage,
  fetcher: typeof fetch = fetch,
) {
  if (config.provider === "brevo") return sendBrevo(config, message, fetcher);
  if (config.provider === "acs") return sendAcs(config, message, fetcher);
  if (!mayEmail(config, message.to)) throw new EmailSendError("TEST_RECIPIENT_BLOCKED");
  let response: Response;
  try {
    const oneClickUrl = message.unsubscribeUrl?.replace(
      "/email/unsubscribe?",
      "/api/email/unsubscribe?",
    );
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.id,
      },
      body: JSON.stringify({
        from: `Vela Learning <${config.from}>`,
        reply_to: config.replyTo,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(oneClickUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${oneClickUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });
  } catch {
    throw new EmailSendError("DELIVERY_OUTCOME_UNKNOWN", false, true);
  }
  if (response.status === 429) throw new EmailSendError("RESEND_RATE_LIMIT", true);
  if (response.status >= 500) throw new EmailSendError("RESEND_OUTCOME_UNKNOWN", false, true);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    const message = typeof detail?.message === "string" ? detail.message : "";
    const code = /only send testing emails.*own email address/i.test(message)
      ? "RESEND_TEST_INBOX_MISMATCH"
      : /domain.*not verified|verify a domain/i.test(message)
        ? "RESEND_SENDER_NOT_VERIFIED"
        : /api key.*invalid|invalid.*api key/i.test(message)
          ? "RESEND_KEY_INVALID"
          : `RESEND_HTTP_${response.status}`;
    throw new EmailSendError(code);
  }
  const result = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof result?.id !== "string")
    throw new EmailSendError("RESEND_RECEIPT_UNKNOWN", false, true);
  return result.id;
}
