"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 40,
          fontFamily: "system-ui",
          background: "#f6f8fb",
          color: "#1e293b",
        }}
      >
        <main>
          <h1>Vela could not load</h1>
          <p>Please reconnect and try again.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>{" "}
          <a href="/">My learning</a>
        </main>
      </body>
    </html>
  );
}
