import { notFound } from "next/navigation";
import { requireStudentPage } from "../../lib/student/page-auth";
import { prisma } from "../../lib/db";
import { institutionScopes } from "../../lib/institution/access";
import { LearningShell } from "../../components/learning-shell";
import { InstitutionWorkspace } from "../../components/institution/workspace";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Institution workspace · Vela",
  robots: { index: false, follow: false },
};

export default async function InstitutionPage() {
  const user = await requireStudentPage("/institution");
  if (!(await institutionScopes(prisma, user)).length) notFound();
  return (
    <LearningShell
      title="Institution workspace"
      description="Manage curriculum, access, reporting and sign-in for your institution."
    >
      <InstitutionWorkspace />
    </LearningShell>
  );
}
