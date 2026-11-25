import { VelaLogo } from "../../../components/vela-logo";
export default function Loading() {
  return (
    <main className="state-page">
      <div className="brand"><VelaLogo size={48} /></div>
      <div className="loading-line" />
      <h1>Opening your study unit…</h1>
      <p>A little space for a new idea.</p>
    </main>
  );
}
