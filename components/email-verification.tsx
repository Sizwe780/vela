"use client";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "../lib/auth/client";
import styles from "./student-pages.module.css";
export function EmailVerification({
  email,
  verified,
  onVerified,
}: {
  email: string;
  verified: boolean;
  onVerified: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(verified);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (verified) setConfirmed(true);
  }, [verified]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function send() {
    setPending(true);
    setNotice("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (result.error) throw Error(result.error.message ?? "Verification code could not be sent.");
      setCooldown(60);
      setNotice("Verification code sent. Enter the code from your email below.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Verification is unavailable.");
    } finally {
      setPending(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setNotice("");
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp: otp.trim() });
      if (result.error)
        throw Error(
          result.error.message ?? "The code could not be verified. Check it or request a new code.",
        );
      setOtp("");
      setConfirmed(true);
      setNotice("Email verified.");
      void fetch("/api/email/welcome", { method: "POST" }).catch(() => {});
      onVerified();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Verification failed. Please retry.");
    } finally {
      setPending(false);
    }
  }
  if (confirmed) return <p role="status">Email verified ✓</p>;
  return (
    <section aria-label="Email verification">
      <p>
        Email is not verified. Vela sends a one-time code; enter it here. If you already received a
        code, you can use it without requesting another.
      </p>
      <button
        type="button"
        className={styles.button}
        disabled={pending || cooldown > 0}
        onClick={() => void send()}
      >
        {cooldown ? `Resend in ${cooldown}s` : "Send verification code"}
      </button>
      <form className={styles.form} onSubmit={verify}>
        <label>
          Email verification code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            maxLength={10}
            minLength={4}
            required
            onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))}
          />
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={pending || !/^\d{4,10}$/.test(otp.trim())}
        >
          {pending ? "Checking…" : "Verify email"}
        </button>
      </form>
      <p role="status">{notice}</p>
    </section>
  );
}
