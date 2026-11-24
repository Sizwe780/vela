import { LearningShell } from "../../components/learning-shell";
import { LearnerClassroom } from "../../components/teaching/learner-classroom";
import { requireStudentPage } from "../../lib/student/page-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classroom · Vela", robots: { index: false, follow: false } };
export default async function Page() {
  await requireStudentPage("/classroom");
  return (
    <LearningShell
      title="Classroom"
      description="See assignments, instructor feedback, and announcements for your enrolled modules."
    >
      <LearnerClassroom />
    </LearningShell>
  );
}
