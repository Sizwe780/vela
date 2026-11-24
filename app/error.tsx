"use client";
import Link from "next/link";
import { useEffect } from "react";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Vela page failure", { digest: error.digest });
  }, [error]);
  return (
    <main id="main-content" tabIndex={-1} className="home-content">
      <h1>A pause in your learning</h1>
      <p>This page could not load. Please retry.</p>
      <button className="primary-button" type="button" onClick={reset}>
        Try again
      </button>{" "}
      <Link href="/">My learning</Link>
    </main>
  );
}
