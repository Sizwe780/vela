import { LearningShell } from "../../../components/learning-shell";
import { Invitation } from "../../../components/teaching/invitation";

export const metadata = {
  title: "Accept invitation · Vela",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <LearningShell title="Accept an invitation" publicPage>
      <Invitation />
    </LearningShell>
  );
}
