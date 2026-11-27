"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { InstallVela } from "./offline/install-vela";
import { authClient } from "../lib/auth/client";
export function AccountMenu() {
  const { data, isPending } = authClient.useSession();
  const menu = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    function close(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target))
        menu.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  if (isPending)
    return (
      <span className="account-loading" aria-label="Loading account">
        …
      </span>
    );
  if (!data?.user)
    return (
      <Link className="account-signin" href="/auth/sign-in">
        Sign in →
      </Link>
    );
  return (
    <details
      className="account-dropdown"
      ref={menu}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          menu.current?.removeAttribute("open");
          menu.current?.querySelector("summary")?.focus();
          e.stopPropagation();
        }
      }}
    >
      <summary className="avatar" aria-label="Account options" title="Account options">
        {(data.user.name || "Learner").slice(0, 1).toUpperCase()}
      </summary>
      <div className="account-popover">
        <strong>{data.user.name || "Your account"}</strong>
        <Link href="/profile" onClick={() => menu.current?.removeAttribute("open")}>
          Profile & preferences
        </Link>
        <Link href="/offline.html" onClick={() => menu.current?.removeAttribute("open")}>
          Offline library
        </Link>
        <InstallVela />
        <div className="account-appearance">
          <span>Appearance</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await authClient.signOut();
              if (result.error) throw Error("Could not sign out. Please retry.");
              window.location.assign("/");
            } catch {
              setError("Could not sign out. Please retry.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
