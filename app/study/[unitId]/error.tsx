"use client";

import Link from "next/link";

export default function StudyError({ reset }: { reset: () => void }) {
  return (
    <main className="state-page">
      <span className="brand">vela.</span>
      <h1>A brief pause in your learning.</h1>
      <p>This study unit is temporarily unavailable. Please try again in a moment.</p>
      <button type="button" className="primary-button" onClick={reset}>
        Try again
      </button>
      <Link href="/study/demo">Explore the sample unit instead →</Link>
    </main>
  );
}
