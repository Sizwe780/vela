import { requireStudentPage } from "../../lib/student/page-auth";
import { LearningShell } from "../../components/learning-shell";
import { SavedLibrary } from "../../components/saved-library";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your saved library · Vela",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireStudentPage("/saved");
  return (
    <LearningShell
      title="Your saved library"
      description="Return to the lessons and passages you’ve bookmarked."
    >
      <SavedLibrary />
    </LearningShell>
  );
}
