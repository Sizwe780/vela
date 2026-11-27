/**
 * Azure Communication Services email adapter for Vela Learning.
 *
 * Uses the ACS REST API directly (no SDK dependency) so we stay within
 * the existing zero-extra-dep pattern used by the Brevo adapter.
 *
 * Required env vars:
 *   ACS_CONNECTION_STRING  — from Azure Portal → Communication Services → Keys
 *   EMAIL_PROVIDER=acs
 */
import type { EmailConfig } from "./config";
import { mayEmail } from "./config";
import { EmailSendError } from "./errors";

/** Parse endpoint + key out of an ACS connection string. */
function parseAcs(connectionString: string): { endpoint: string; key: string } {
  const parts = Object.fromEntries(
    connectionString.split(";").map((p) => {
      const eq = p.indexOf("=");
      return [p.slice(0, eq).toLowerCase(), p.slice(eq + 1)];
    }),
  );
  const endpoint = parts["endpoint"];
  const key = parts["accesskey"];
  if (!endpoint || !key) throw new Error("Invalid ACS_CONNECTION_STRING");
  return { endpoint: endpoint.replace(/\/$/, ""), key };
}

/** HMAC-SHA256 signature for ACS REST requests (Azure Shared Key auth). */
async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function sendAcs(
  config: EmailConfig,
  message: { id: string; to: string; subject: string; text: string; html: string },
  fetcher: typeof fetch = fetch,
): Promise<string> {
  if (!mayEmail(config, message.to)) throw new EmailSendError("TEST_RECIPIENT_BLOCKED");

  const connStr = process.env.ACS_CONNECTION_STRING;
  if (!connStr) throw new EmailSendError("ACS_NO_CONNECTION_STRING");

  const { endpoint, key } = parseAcs(connStr);
  const url = `${endpoint}/emails:send?api-version=2023-03-31`;

  const body = JSON.stringify({
    senderAddress: config.from,
    recipients: { to: [{ address: message.to }] },
    content: {
      subject: message.subject,
      plainText: message.text,
      html: message.html,
    },
    replyTo: [{ address: config.replyTo }],
    userEngagementTrackingDisabled: true,
    // idempotency key — ACS honours this header
  });

  const contentHash = btoa(
    String.fromCharCode(
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))),
    ),
  );

  const date = new Date().toUTCString();
  const urlObj = new URL(url);
  const stringToSign = [
    "POST",
    urlObj.pathname + urlObj.search,
    `${date};${urlObj.host};${contentHash}`,
  ].join("\n");

  const signature = await hmacSha256Hex(key, stringToSign);
  const authorization = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        "x-ms-date": date,
        host: urlObj.host,
        "x-ms-content-sha256": contentHash,
        Authorization: authorization,
        "Operation-Id": message.id,
      },
      body,
    });
  } catch {
    throw new EmailSendError("DELIVERY_OUTCOME_UNKNOWN", false, true);
  }

  if (response.status === 429) throw new EmailSendError("ACS_RATE_LIMIT", true);
  if (response.status >= 500) throw new EmailSendError("ACS_OUTCOME_UNKNOWN", false, true);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    const code = detail?.error?.code ?? `ACS_HTTP_${response.status}`;
    throw new EmailSendError(code);
  }

  // ACS returns 202 Accepted with an operation-id header; use that as receipt.
  const operationId =
    response.headers.get("operation-id") ?? response.headers.get("x-ms-request-id") ?? message.id;
  return operationId;
}
