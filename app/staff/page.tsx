import Link from "next/link";
import { requireStudentPage } from "../../lib/student/page-auth";
import { staffScopes } from "../../lib/staff/access";
import { LearningShell } from "../../components/learning-shell";
import { TeachingWorkspace } from "../../components/teaching/workspace";
import { notFound } from "next/navigation";
import { IngestError } from "../../lib/ingest/errors";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Teaching workspace · Vela",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireStudentPage("/staff");
  try {
    await staffScopes(user.id);
  } catch (e) {
    if (e instanceof IngestError && e.status === 403) notFound();
    else throw e;
  }
  return (
    <LearningShell title="Teaching workspace">
      <p>
        <Link href="/staff/review">Open editorial review</Link>
      </p>
      <TeachingWorkspace />
    </LearningShell>
  );
}
