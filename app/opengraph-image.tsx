import { ImageResponse } from "next/og";
export const alt = "Vela — Learn deeply. Teach confidently.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 90,
        background: "#f6f8fb",
        color: "#1e293b",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 62,
          color: "#285849",
          marginBottom: 40,
        }}
      >
        <svg width="72" height="72" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="1" y="1" width="30" height="30" rx="7" fill="#f8f5eb" />
          <path fill="#a64b25" d="M4 10c5-3 8-1 11 5 2 4 3 5 5 4l-4 5c-5-3-6-13-12-14Z" />
          <path fill="#52775e" d="M17 4c8 4 12 9 10 16-4-2-8 0-11 4 3-5 7-13 1-20Z" />
          <path fill="#aa542d" d="M15 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
          <path
            d="M5 23c5 0 8 2 11 4 3-2 6-4 11-4"
            fill="none"
            stroke="#214a39"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
        vela.
      </div>
      <div style={{ display: "flex", fontSize: 70, fontWeight: 700, maxWidth: 1000 }}>
        Learn deeply.
      </div>
      <div style={{ display: "flex", fontSize: 70, fontWeight: 700 }}>Teach confidently.</div>
      <div style={{ display: "flex", fontSize: 28, color: "#526173", marginTop: 40 }}>
        Lessons · AI companion · Active recall
      </div>
    </div>,
    size,
  );
}
