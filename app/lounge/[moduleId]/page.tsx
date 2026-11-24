export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { requireStudentPage } from "../../../lib/student/page-auth";
import { hasModuleAccess } from "../../../lib/enrollment/access";
import { prisma } from "../../../lib/db";
import { LearningShell } from "../../../components/learning-shell";
import { StudyRoom } from "../../../components/social/study-room";
export const metadata = { title: "Study room · Vela", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const learner = await requireStudentPage(`/lounge/${moduleId}`);
  if (!(await hasModuleAccess(learner.id, moduleId))) redirect("/onboarding");
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { code: true, title: true },
  });
  if (!module) notFound();
  return (
    <LearningShell title={`${module.code} · ${module.title}`}>
      <StudyRoom key={moduleId + ":" + learner.id} moduleId={moduleId} ownerId={learner.id} />
    </LearningShell>
  );
}
