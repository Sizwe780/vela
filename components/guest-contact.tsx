"use client";
import { useState } from "react";
export function GuestContact() {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [sent, setSent] = useState(false);
  return (
    <section id="contact" className="profile-learning-settings">
      <h2>Contact Vela</h2>
      <p>
        You can contact us here even if you cannot sign in. Privacy requests go to the same private
        support inbox.
      </p>
      <form
        className="guest-contact-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = e.currentTarget,
            data = new FormData(form);
          setBusy(true);
          setNotice("");
          try {
            const response = await fetch("/api/support/guest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.fromEntries(data)),
              signal: AbortSignal.timeout(25000),
            });
            const result = await response.json();
            if (!response.ok)
              throw Error(result.error?.message ?? "Your request could not be saved. Retry.");
            setSent(true);
            setNotice(
              `Request received. Your reference is ${result.reference}. Keep it if you need to follow up. No account information is changed by this request.`,
            );
            form.reset();
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Reply email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Topic
          <select name="topic" defaultValue="account">
            <option value="account">Account access</option>
            <option value="privacy">Privacy or data request</option>
            <option value="accessibility">Accessibility</option>
            <option value="technical">Something is not working</option>
          </select>
        </label>
        <label>
          Subject
          <input name="subject" required minLength={5} maxLength={140} />
        </label>
        <label>
          Your message
          <textarea name="message" required minLength={20} maxLength={3000} rows={5} />
        </label>
        <label className="contact-honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <small>
          Include only what we need to help. Do not send passwords, one-time codes, identity
          documents or another learner’s information. We verify identity separately before changing
          an account or fulfilling a data request.
        </small>
        <button type="submit" disabled={busy}>
          {busy ? "Sending…" : sent ? "Send another request" : "Send request"}
        </button>
        <p role="status">{notice}</p>
      </form>
    </section>
  );
}
