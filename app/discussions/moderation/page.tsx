export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { IngestError } from "../../../lib/ingest/errors";
import { staffScopes } from "../../../lib/staff/access";
import { requireStudentPage } from "../../../lib/student/page-auth";
import { LearningShell } from "../../../components/learning-shell";
import { ModerationQueue } from "../../../components/social/moderation-queue";
export const metadata = {
  title: "Peer report review · Vela",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireStudentPage("/discussions/moderation");
  try {
    await staffScopes(user.id);
  } catch (error) {
    if (error instanceof IngestError && error.status === 403) notFound();
    throw error;
  }
  return (
    <LearningShell title="Peer report review">
      <ModerationQueue />
    </LearningShell>
  );
}
