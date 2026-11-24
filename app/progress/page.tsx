export const dynamic = "force-dynamic";
import { requireStudentPage } from "../../lib/student/page-auth";
import { LearningShell } from "../../components/learning-shell";
import { OutcomeInsights } from "../../components/outcome-insights";
export const metadata = {
  title: "Outcome progress · Vela",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireStudentPage("/progress");
  return (
    <LearningShell
      title="Progress & outcomes"
      description="See what you’ve completed, what you’ve practised and where to focus next."
    >
      <OutcomeInsights />
    </LearningShell>
  );
}
