import type { Metadata } from "next";
import { getUnitMetadata } from "../../../lib/study/catalog";
import { renderStudyWorkspace } from "../../../lib/study/render-workspace";
import { redirect } from "next/navigation";
import { canonicalChemistryUnitCode } from "../../../lib/study/chemistry-numbering";
export const dynamic = "force-dynamic";
export default async function StudyPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const canonical = canonicalChemistryUnitCode(unitId);
  if (canonical !== unitId) redirect(`/study/${canonical}`);
  return renderStudyWorkspace(unitId);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ unitId: string }>;
}): Promise<Metadata> {
  const { unitId } = await params;
  const unit = await getUnitMetadata(unitId);
  if (!unit) return { title: "Study unit unavailable · Vela" };
  const title = `${unit.module.code} · ${unit.title} · Vela`;
  const description = `Study ${unit.title} with guided explanations, original examples and active recall.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: ["/opengraph-image"] },
  };
}
