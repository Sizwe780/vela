export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { LearningShell } from "../../components/learning-shell";
import { ActivityOverview } from "../../components/activity-overview";
import { requireStudentPage } from "../../lib/student/page-auth";
export const metadata: Metadata = {
  title: "Your study activity · Vela",
  description: "Track your weekly study goal and focused learning activity.",
  robots: { index: false, follow: false },
};
export default async function ActivityPage() {
  await requireStudentPage("/activity");
  return (
    <LearningShell
      title="Your study rhythm"
      description="Follow your focused study time and check in on your weekly goal."
    >
      <ActivityOverview />
    </LearningShell>
  );
}
