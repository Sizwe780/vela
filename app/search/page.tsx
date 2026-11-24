import { requireStudentPage } from "../../lib/student/page-auth";
import { LearningShell } from "../../components/learning-shell";
import { SessionSearch } from "../../components/session-search";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Search your lessons · Vela",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireStudentPage("/search");
  return (
    <LearningShell
      title="Search your lessons"
      description="Find a concept, formula or session in your enrolled modules."
    >
      <SessionSearch />
    </LearningShell>
  );
}
