import { prisma } from "../../../../lib/db";
import type { Metadata } from "next";
import { getUnitMetadata } from "../../../../lib/study/catalog";
import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { auth } from "../../../../lib/auth/server";
import { IngestError } from "../../../../lib/ingest/errors";
import { notFound, redirect } from "next/navigation";
import { demoUnit } from "../../../../lib/study/demo";
import { QuizWorkspace } from "../../../../components/quiz-workspace";
import { canonicalChemistryUnitCode } from "../../../../lib/study/chemistry-numbering";
export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const canonical = canonicalChemistryUnitCode(unitId);
  if (canonical !== unitId) redirect(`/study/${canonical}/quiz`);
  if (unitId !== "demo") {
    const session = await auth.getSession();
    if (!session.data?.user)
      redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`/study/${unitId}/quiz`)}`);
    try {
      await requireUnitAccess(session.data.user.id, unitId);
    } catch (e) {
      if (e instanceof IngestError && e.status === 403) {
        const u = await prisma.studyUnit.findFirst({
          where: { OR: [{ id: unitId }, { code: unitId }] },
          select: { moduleId: true },
        });
        redirect(
          `/onboarding?moduleId=${u?.moduleId ?? ""}&next=${encodeURIComponent(`/study/${unitId}/quiz`)}`,
        );
      }
      if (e instanceof IngestError && e.status === 404) notFound();
      throw e;
    }
  }
  if (unitId === "demo")
    return (
      <QuizWorkspace
        unitId={demoUnit.id}
        title={demoUnit.title}
        moduleCode={demoUnit.moduleCode}
        preview
      />
    );
  // The quiz shell needs metadata only; questions retrieve their own sources.
  // Avoid fetching every full PDF reading and chunk merely to open practice.
  const unit = await getUnitMetadata(unitId);
  if (!unit) notFound();
  return (
    <QuizWorkspace
      unitId={unit.id}
      title={unit.title}
      moduleCode={unit.module.code}
      preview={false}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unitId: string }>;
}): Promise<Metadata> {
  const { unitId } = await params;
  const unit = await getUnitMetadata(unitId);
  if (!unit) return { title: "Study unit unavailable · Vela" };
  const title = `${unit.module.code} · ${unit.title} · Practice · Vela`;
  const description = `Study ${unit.title} with guided explanations, original examples and active recall.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: ["/opengraph-image"] },
  };
}
