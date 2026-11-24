"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "../lib/auth/client";
import { authRecovery } from "../lib/auth/recovery";
import { PasswordField } from "./password-field";
import styles from "./student-pages.module.css";

type Device = {
  token: string;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};
export function AccountSecurity({
  email,
  verified,
  owner,
}: {
  email: string;
  verified: boolean;
  owner: string;
}) {
  const { data: signedIn } = authClient.useSession();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadDevices, setLoadDevices] = useState(false);
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!loadDevices || signedIn?.user.id !== owner) return;
    let active = true;
    void authClient
      .listSessions()
      .then((result) => {
        if (!active) return;
        if (result.error || !result.data) setError(authRecovery(result.error ?? {}, "session"));
        else setDevices(result.data);
      })
      .catch(() => {
        if (active) setError(authRecovery({}, "session"));
      });
    return () => {
      active = false;
    };
  }, [loadDevices, reload, signedIn?.user.id, owner]);

  async function run(action: string, callback: () => Promise<void>) {
    if (pending || signedIn?.user.id !== owner) return;
    setPending(action);
    setError("");
    setNotice("");
    try {
      await callback();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connection interrupted. Try again.");
    } finally {
      setPending("");
    }
  }
  function changePassword(event: FormEvent) {
    event.preventDefault();
    void run("password", async () => {
      if (password !== confirm) throw Error("Enter the same new password twice.");
      if (password === current) throw Error("Choose a password different from your current one.");
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (result.error) throw Error(authRecovery(result.error, "password"));
      setCurrent("");
      setPassword("");
      setConfirm("");
      setReload((value) => value + 1);
      setNotice("Password updated. Other sessions were signed out.");
    });
  }
  function changeEmail(event: FormEvent) {
    event.preventDefault();
    void run("email", async () => {
      const target = newEmail.trim().toLowerCase();
      if (target === email.toLowerCase())
        throw Error("Enter an email address different from your current one.");
      const result = await authClient.changeEmail({
        newEmail: target,
        callbackURL: window.location.origin + "/profile",
      });
      if (result.error) throw Error(authRecovery(result.error, "email"));
      setNewEmail("");
      setNotice(
        "Follow the email confirmation instructions to complete the change. Check both inboxes.",
      );
    });
  }

  return (
    <section className={styles.card}>
      <h2>Security and sign-ins</h2>
      <details>
        <summary>Change password</summary>
        <form className={styles.form} onSubmit={changePassword}>
          <PasswordField
            label="Current password"
            kind="current"
            value={current}
            onChange={setCurrent}
          />
          <PasswordField label="New password" kind="new" value={password} onChange={setPassword} />
          <PasswordField
            label="Confirm new password"
            kind="new"
            value={confirm}
            onChange={setConfirm}
          />
          <button className={styles.button} disabled={!!pending}>
            Update password and sign out other sessions
          </button>
          <Link href="/auth/reset-password">Forgot your current password?</Link>
        </form>
      </details>
      <details>
        <summary>Change email</summary>
        {verified ? (
          <form className={styles.form} onSubmit={changeEmail}>
            <label>
              New email address
              <input
                type="email"
                autoComplete="email"
                value={newEmail}
                required
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </label>
            <button className={styles.button} disabled={!!pending}>
              Send confirmation
            </button>
          </form>
        ) : (
          <p>Verify your current email above before changing it.</p>
        )}
      </details>
      <details
        onToggle={(event) => {
          if (event.currentTarget.open) setLoadDevices(true);
        }}
      >
        <summary>Manage signed-in devices</summary>
        {signedIn?.session && (
          <ul>
            {devices.map((device) => {
              const active = device.token === signedIn.session.token;
              return (
                <li key={device.token}>
                  <p>
                    <strong>{active ? "Current sign-in" : "Other sign-in"}</strong> · Last active{" "}
                    {new Date(device.updatedAt).toLocaleString()}
                  </p>
                  {device.userAgent && (
                    <p className={styles.note}>{device.userAgent.slice(0, 140)}</p>
                  )}
                  {!active && (
                    <button
                      type="button"
                      className={styles.button}
                      disabled={!!pending}
                      onClick={() =>
                        void run("session", async () => {
                          const result = await authClient.revokeSession({ token: device.token });
                          if (result.error) throw Error(authRecovery(result.error, "session"));
                          setReload((value) => value + 1);
                          setNotice("Session signed out.");
                        })
                      }
                    >
                      Sign out this device
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          className={styles.button}
          disabled={!!pending}
          onClick={() =>
            void run("session", async () => {
              const result = await authClient.revokeOtherSessions();
              if (result.error) throw Error(authRecovery(result.error, "session"));
              setReload((value) => value + 1);
              setNotice("All other sessions were signed out.");
            })
          }
        >
          Sign out all other devices
        </button>
      </details>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
