"use client";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
import { authClient } from "../lib/auth/client";

function AccountDetails() {
  const { data, isPending } = authClient.useSession();
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
    <div className="account-menu">
      <Link href="/profile" className="avatar" title="Your profile" aria-label="Your profile">
        {(data.user.name || "Learner").slice(0, 1).toUpperCase()}
      </Link>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          window.location.assign("/");
        }}
      >
        Sign out
      </button>
    </div>
  );
}

export function AccountMenu() {
  return (
    <div className="account-menu">
      <ThemeToggle />
      <AccountDetails />
    </div>
  );
}
