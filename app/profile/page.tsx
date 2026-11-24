import { requireStudentPage } from "../../lib/student/page-auth";
import { LearningShell } from "../../components/learning-shell";
import { ProfileSettings } from "../../components/profile-settings";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your profile · Vela", robots: { index: false, follow: false } };
export default async function Page() {
  await requireStudentPage("/profile");
  return (
    <LearningShell
      title="Your profile"
      description="Manage your account, study goals and email preferences."
    >
      <ProfileSettings />
    </LearningShell>
  );
}
