import type { EmailConfig } from "./config";
import { mayEmail } from "./config";
import { EmailSendError } from "./errors";
export { EmailSendError } from "./errors";
export async function sendBrevo(
  config: EmailConfig,
  message: { id: string; to: string; subject: string; text: string; html: string },
  fetcher: typeof fetch = fetch,
) {
  if (!mayEmail(config, message.to)) throw new EmailSendError("TEST_RECIPIENT_BLOCKED");
  let response: Response;
  try {
    response = await fetcher("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Vela Learning", email: config.from },
        replyTo: { name: "Vela support", email: config.replyTo },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
        headers: { idempotencyKey: message.id },
        tags: ["vela-learning"],
      }),
    });
  } catch {
    throw new EmailSendError("DELIVERY_OUTCOME_UNKNOWN", false, true);
  }
  if (response.status === 429) throw new EmailSendError("BREVO_RATE_LIMIT", true);
  if (response.status >= 500) throw new EmailSendError("BREVO_OUTCOME_UNKNOWN", false, true);
  if (!response.ok) throw new EmailSendError(`BREVO_HTTP_${response.status}`);
  const payload = (await response.json().catch(() => null)) as { messageId?: unknown } | null;
  if (typeof payload?.messageId !== "string")
    throw new EmailSendError("BREVO_RECEIPT_UNKNOWN", false, true);
  return payload.messageId;
}
