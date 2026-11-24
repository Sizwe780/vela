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
      <div style={{ display: "flex", fontSize: 62, color: "#285849", marginBottom: 40 }}>vela.</div>
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
