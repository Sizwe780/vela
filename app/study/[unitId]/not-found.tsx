import { VelaLogo } from "../../../components/vela-logo";
import Link from "next/link";

export default function UnitNotFound() {
  return (
    <main className="state-page">
      <div className="brand">
        <VelaLogo size={48} />
      </div>
      <h1>We couldn’t find that study unit.</h1>
      <p>Return to your course library to choose another reading.</p>
      <Link className="primary-button" href="/">
        Back to my learning
      </Link>
    </main>
  );
}
