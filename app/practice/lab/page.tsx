export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { LearningShell } from "../../../components/learning-shell";
import { PracticalLabWorkspace } from "../../../components/practical/practical-lab-workspace";
import { requireStudentPage } from "../../../lib/student/page-auth";

export const metadata: Metadata = {
  title: "Practical Lab · Vela",
  description: "Use module-specific practical tools, simulations and scratchpads.",
  robots: { index: false, follow: false },
};

export default async function PracticalLabPage({
  searchParams,
}: {
  searchParams: Promise<{ notebook?: string; view?: string }>;
}) {
  const params = await searchParams;
  const openNotebook = params.notebook === "1";
  const openVisuals = params.view === "visuals" && !openNotebook;
  const path = openNotebook ? "?notebook=1" : openVisuals ? "?view=visuals" : "";
  await requireStudentPage(`/practice/lab${path}`);
  return (
    <LearningShell
      title="Practical Lab"
      description="Explore ideas, test working and use tools for your enrolled modules."
    >
      <PracticalLabWorkspace openNotebook={openNotebook} openVisuals={openVisuals} />
    </LearningShell>
  );
}
