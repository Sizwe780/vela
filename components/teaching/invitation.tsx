"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth/client";
import { studentNavUpdate, studentRequest } from "../../lib/student/client";
import { Panel } from "./shared";
import styles from "./workspace.module.css";

const storageKey = "vela:pending-invitation";
export function Invitation() {
  const { data, isPending } = authClient.useSession();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<"/staff" | "/classroom" | null>(null);
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(fragment)) {
      setToken(fragment);
      try {
        sessionStorage.setItem(storageKey, fragment);
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        /* Keep the fragment available if browser storage is blocked. */
      }
    } else {
      try {
        setToken(sessionStorage.getItem(storageKey) ?? "");
      } catch {
        /* No staged invitation. */
      }
    }
  }, []);
  async function accept() {
    setBusy(true);
    setError("");
    try {
      const result = await studentRequest<{ destination: "/staff" | "/classroom" }>(
        "/api/classroom",
        "POST",
        { action: "claim", token },
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* The server still burns the token. */
      }
      window.dispatchEvent(new Event(studentNavUpdate));
      setAccepted(result.destination);
      setToken("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const destination = encodeURIComponent("/classroom/invitation");
  return (
    <Panel title="Qualification invitation">
      {accepted ? (
        <p>
          Invitation accepted.{" "}
          <Link href={accepted}>
            {accepted === "/staff" ? "Open teaching workspace" : "Open Classroom"}
          </Link>
          .
        </p>
      ) : !token ? (
        <p>Open the complete invitation link shared by your administrator.</p>
      ) : isPending ? (
        <p role="status">Checking your account…</p>
      ) : !data?.user ? (
        <div className={styles.actions}>
          <Link href={`/auth/sign-in?redirectTo=${destination}`}>Sign in</Link>
          <Link href={`/auth/sign-up?redirectTo=${destination}`}>Create an account</Link>
        </div>
      ) : !data.user.emailVerified ? (
        <p>
          <Link href="/profile">Verify your email in your profile</Link>, then return here to
          accept.
        </p>
      ) : (
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => void accept()}>
            Accept invitation
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </Panel>
  );
}
