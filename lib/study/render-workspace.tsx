import { notFound, redirect } from "next/navigation";
import { prisma } from "../db";
import { auth } from "../auth/server";
import { IngestError } from "../ingest/errors";
import { requireUnitAccess } from "../enrollment/access";
import { loadStudyUnit } from "./load-unit";
import { StudyWorkspace } from "../../components/study-workspace";
export async function renderStudyWorkspace(unitId: string, initialSessionId?: string) {
  const destination = `/study/${unitId}${initialSessionId ? `/sessions/${initialSessionId}` : ""}`;
  const session = await auth.getSession();
  if (unitId !== "demo" && !session.data?.user)
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(destination)}`);
  if (unitId !== "demo" && session.data?.user) {
    try {
      await requireUnitAccess(session.data.user.id, unitId);
    } catch (error) {
      if (error instanceof IngestError && error.status === 403) {
        const u = await prisma.studyUnit.findFirst({
          where: { OR: [{ id: unitId }, { code: unitId }] },
          select: { moduleId: true },
        });
        redirect(
          `/onboarding?moduleId=${u?.moduleId ?? ""}&next=${encodeURIComponent(destination)}`,
        );
      }
      if (error instanceof IngestError && error.status === 404) notFound();
      throw error;
    }
  }
  const unit = await loadStudyUnit(unitId);
  if (!unit) notFound();
  if (initialSessionId && !unit.sessions?.some((s) => s.id === initialSessionId)) notFound();
  return (
    <StudyWorkspace
      key={`${unit.id}:${initialSessionId ?? "first"}`}
      initialSessionId={initialSessionId}
      unit={unit}
    />
  );
}
