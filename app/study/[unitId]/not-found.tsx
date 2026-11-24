import Link from "next/link";

export default function UnitNotFound() {
  return (
    <main className="state-page">
      <span className="brand">vela.</span>
      <h1>We couldn’t find that study unit.</h1>
      <p>Return to your course library to choose another reading.</p>
      <Link className="primary-button" href="/">
        Back to my learning
      </Link>
    </main>
  );
}
