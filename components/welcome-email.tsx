"use client";
import { useEffect } from "react";
import { authClient } from "../lib/auth/client";
export function WelcomeEmail() {
  const { data } = authClient.useSession();
  const id = data?.user?.id;
  const verified = data?.user?.emailVerified;
  useEffect(() => {
    if (!id || !verified) return;
    const controller = new AbortController();
    void fetch("/api/email/welcome", { method: "POST", signal: controller.signal }).catch(() => {});
    return () => controller.abort();
  }, [id, verified]);
  return null;
}
