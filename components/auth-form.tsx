"use client";
import Link from "next/link";
import Image from "next/image";
import { velaLogoSrc } from "./vela-logo";
import { useState, type FormEvent } from "react";
import { PasswordField } from "./password-field";
import { authRecovery } from "../lib/auth/recovery";
import { authClient } from "../lib/auth/client";

export function AuthForm({
  path,
  redirectTo,
  token,
}: {
  path: "sign-in" | "sign-up" | "reset-password";
  redirectTo?: string;
  token?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const signup = path === "sign-up";
  const reset = path === "reset-password";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (reset && token && password !== confirm) throw Error("Enter the same password twice.");
      if (reset) {
        const result = token
          ? await authClient.resetPassword({ newPassword: password, token })
          : await authClient.requestPasswordReset({
              email,
              redirectTo: `${window.location.origin}/auth/reset-password`,
            });
        if (result.error) throw new Error(authRecovery(result.error, "reset"));
        setNotice(
          token
            ? "Password updated. You can sign in now."
            : "If your account is eligible, password-reset instructions will arrive by email.",
        );
        return;
      }
      const result = signup
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(authRecovery(result.error, signup ? "signup" : "signin"));
      if (signup && !result.data?.user) {
        setNotice("Check your email to finish creating your account.");
        return;
      }
      // Resolve against our origin to reject protocol-relative/external redirects.
      const destination = signup
        ? `/onboarding${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`
        : redirectTo || "/";
      const target = new URL(destination, window.location.origin);
      window.location.assign(
        target.origin === window.location.origin
          ? `${target.pathname}${target.search}${target.hash}`
          : "/",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Authentication is temporarily unavailable.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1} className="auth-shell">
      <Link className="brand" href="/">
        <Image
          src={velaLogoSrc}
          alt="Vela"
          width={48}
          height={48}
          className="auth-brand-logo"
          priority
        />
        vela.
      </Link>
      <section className="auth-card">
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h1>{reset ? "A fresh start." : signup ? "Make space to learn." : "Welcome back."}</h1>
        <p>
          {reset
            ? "Let’s help you get back to your learning."
            : "Subject understanding. Classroom possibilities."}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <label>
              Full name
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {(!reset || !token) && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          {(!reset || token) && (
            <PasswordField
              label={reset ? "New password" : "Password"}
              kind={signup || reset ? "new" : "current"}
              value={password}
              onChange={setPassword}
            />
          )}
          {reset && token && (
            <PasswordField
              label="Confirm password"
              kind="new"
              value={confirm}
              onChange={setConfirm}
            />
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending
              ? "One moment…"
              : reset
                ? token
                  ? "Update password"
                  : "Send reset instructions"
                : signup
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>
        <div className="auth-links">
          {reset ? (
            <Link href="/auth/sign-in">Back to sign in</Link>
          ) : (
            <>
              <Link href={signup ? "/auth/sign-in" : "/auth/sign-up"}>
                {signup ? "Already learning here? Sign in" : "New here? Create an account"}
              </Link>
              {!signup && <Link href="/auth/reset-password">Forgot your password?</Link>}
              {!signup && <Link href="/auth/institution">Institution sign-in</Link>}
            </>
          )}
        </div>
        <p className="auth-policy-links">
          <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy notice</Link> ·{" "}
          <Link href="/help">Help</Link>
        </p>
      </section>
    </main>
  );
}
