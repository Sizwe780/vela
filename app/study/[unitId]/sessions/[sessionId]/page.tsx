import { renderStudyWorkspace } from "../../../../../lib/study/render-workspace";
import { getUnitMetadata } from "../../../../../lib/study/catalog";
import { prisma } from "../../../../../lib/db";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canonicalChemistryUnitCode } from "../../../../../lib/study/chemistry-numbering";
export const dynamic = "force-dynamic";
export default async function SessionPage({
  params,
}: {
  params: Promise<{ unitId: string; sessionId: string }>;
}) {
  const { unitId, sessionId } = await params;
  const canonical = canonicalChemistryUnitCode(unitId);
  if (canonical !== unitId) redirect(`/study/${canonical}/sessions/${sessionId}`);
  return renderStudyWorkspace(unitId, sessionId);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ unitId: string; sessionId: string }>;
}): Promise<Metadata> {
  const { unitId, sessionId } = await params;
  const unit = await getUnitMetadata(unitId);
  const session = unit
    ? await prisma.studySession.findFirst({
        where: { id: sessionId, studyUnitId: unit.id },
        select: { title: true },
      })
    : null;
  const title =
    session && unit
      ? `${unit.module.code} · ${session.title} · Vela`
      : "Session unavailable · Vela";
  return {
    title,
    openGraph: { title, images: ["/opengraph-image"] },
    robots: { index: false, follow: false },
  };
}
