import { IngestError } from "../../lib/ingest/errors";
import { notFound } from "next/navigation";
import { requireStudentPage } from "../../lib/student/page-auth";
import { requireModuleAccess } from "../../lib/enrollment/access";
import { LearningShell } from "../../components/learning-shell";
import { LearningPanel } from "../../components/learning/learning-panel";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Concept connections · Vela",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ moduleId?: string; concept?: string }>;
}) {
  const user = await requireStudentPage("/learning-map"),
    { moduleId, concept } = await searchParams;
  if (moduleId) {
    if (typeof moduleId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(moduleId)) notFound();
    try {
      await requireModuleAccess(user.id, moduleId);
    } catch (error) {
      if (error instanceof IngestError && [403, 404].includes(error.status)) notFound();
      throw error;
    }
  }
  return (
    <LearningShell
      title="Concept connections"
      description="Explore prerequisites and find connections across your enrolled modules."
    >
      <LearningPanel
        moduleId={moduleId}
        initialConcept={
          typeof concept === "string" && /^[a-z][a-z0-9.-]{1,80}$/.test(concept)
            ? concept
            : undefined
        }
      />
    </LearningShell>
  );
}
