import { createHmac, timingSafeEqual } from "node:crypto";
export function unsubscribeToken(studentId: string, consentAt: Date, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ s: studentId, c: consentAt.toISOString(), v: 1 }),
  ).toString("base64url");
  return payload + "." + createHmac("sha256", secret).update(payload).digest("base64url");
}
export function readUnsubscribeToken(
  token: string,
  secret: string,
): { studentId: string; consentAt: Date } | null {
  if (token.length > 600 || secret.length < 32) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const actual = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", secret).update(payload).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed.v !== 1 || typeof parsed.s !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(parsed.s))
      return null;
    const date = new Date(parsed.c);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== parsed.c) return null;
    return { studentId: parsed.s, consentAt: date };
  } catch {
    return null;
  }
}
