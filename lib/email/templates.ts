import type { EmailConfig } from "./config";
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
export function emailTemplate(
  kind: "welcome" | "recall" | "test",
  config: EmailConfig,
  name: string,
  due: number,
  unsubscribeUrl?: string,
) {
  const greeting = `Hello ${name || "learner"},`;
  const subject =
    kind === "welcome"
      ? "Welcome to Vela — your learning starts here"
      : kind === "test"
        ? "Vela email delivery test"
        : "A little recall goes a long way";
  const intro =
    kind === "welcome"
      ? "Welcome to Vela. Choose your qualification and modules, then work through a session at your own pace. Try each example before revealing its answer, save useful notes, and return to active recall to strengthen understanding."
      : kind === "test"
        ? "This is the delivery test you requested in Vela. No reminder subscription was created by this test."
        : `You have ${due} learning ${due === 1 ? "outcome" : "outcomes"} ready for review. Before looking at the answer, try explaining the idea in your own words. A short, focused recall session is enough to get started.`;
  const url = config.origin + (kind === "welcome" ? "/onboarding" : "/review");
  const label = kind === "welcome" ? "Choose your modules" : "Open your review queue";
  const footer =
    kind === "recall"
      ? "You opted in to active recall reminders: at most one digest a day, only when a review is due. No study answers or notes are included in this email."
      : "Vela Learning (Pty) Ltd · Learn deeply. Teach confidently.";
  const text = `${greeting}\n\n${intro}\n\n${label}: ${url}\n\n${footer}${unsubscribeUrl ? `\nStop recall reminders: ${unsubscribeUrl}` : ""}\nSupport: ${config.replyTo}`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4f6f8;color:#213047;font-family:Arial,sans-serif"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #dce3e9;border-radius:16px"><h1 style="font-family:Georgia,serif">vela.</h1><p>${escapeHtml(greeting)}</p><p style="line-height:1.7">${escapeHtml(intro)}</p><p style="margin:28px 0"><a style="background:#28594d;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none" href="${escapeHtml(url)}">${label}</a></p><p style="font-size:13px;line-height:1.6">${escapeHtml(footer)}</p>${unsubscribeUrl ? `<p><a href="${escapeHtml(unsubscribeUrl)}">Stop recall reminders</a></p>` : ""}<p style="font-size:13px">Support: <a href="mailto:${escapeHtml(config.replyTo)}">${escapeHtml(config.replyTo)}</a></p></main></body></html>`;
  return { subject, text, html, unsubscribeUrl };
}
