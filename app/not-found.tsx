import Link from "next/link";
import { LearningShell } from "../components/learning-shell";
export default function NotFound() {
  return (
    <LearningShell title="This page isn't here">
      <p>The address may have changed. Your saved work is linked to your account.</p>
      <Link className="primary-button" href="/">
        Return to my learning
      </Link>
    </LearningShell>
  );
}
