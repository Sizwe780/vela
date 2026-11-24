import { notFound, redirect } from "next/navigation";
import { IngestError } from "../../../../lib/ingest/errors";
import Link from "next/link";
import { requireStudentPage } from "../../../../lib/student/page-auth";
import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { prisma } from "../../../../lib/db";
import { Icon } from "../../../../components/icons";
import { LearningShell } from "../../../../components/learning-shell";
import { canonicalChemistryUnitCode } from "../../../../lib/study/chemistry-numbering";
export const dynamic = "force-dynamic";
export const metadata = { title: "Unit overview · Vela", robots: { index: false } };
export default async function Sessions({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const canonical = canonicalChemistryUnitCode(unitId);
  if (canonical !== unitId) redirect(`/study/${canonical}/sessions`);
  const user = await requireStudentPage(`/study/${unitId}/sessions`);
  const id = await requireUnitAccess(user.id, unitId).catch((e) => {
    if (e instanceof IngestError && e.status === 403)
      redirect(`/onboarding?next=${encodeURIComponent(`/study/${unitId}/sessions`)}`);
    if (e instanceof IngestError && e.status === 404) notFound();
    throw e;
  });
  const unit = await prisma.studyUnit.findUnique({
    where: { id },
    select: {
      title: true,
      position: true,
      module: { select: { id: true, code: true } },
      learningOutcomes: { select: { id: true, description: true }, orderBy: { code: "asc" } },
      sessions: {
        select: {
          id: true,
          position: true,
          title: true,
          progress: { where: { studentId: user.id }, select: { completedAt: true } },
          studyPositions: { where: { studentId: user.id }, select: { sessionId: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!unit) notFound();
  const path = `/study/${id}`;
  const done = unit.sessions.filter((session) => session.progress.length).length;
  const resume = unit.sessions.find((session) => session.studyPositions.length);
  const next =
    resume ?? unit.sessions.find((session) => !session.progress.length) ?? unit.sessions[0];
  return (
    <LearningShell
      title={unit.title}
      description={`${unit.module.code} · Unit ${String(unit.position).padStart(2, "0")}`}
      breadcrumb={[{ label: unit.module.code, href: `/modules/${unit.module.id}` }]}
    >
      <div className="unit-overview-grid">
        <section className="unit-session-list" aria-labelledby="unit-sessions">
          <h2 id="unit-sessions">Learning sessions</h2>
          {unit.sessions.length ? (
            <ol>
              {unit.sessions.map((session) => (
                <li key={session.id}>
                  <Link href={`${path}/sessions/${session.id}`}>
                    <span className="curriculum-unit-index">
                      {String(session.position).padStart(2, "0")}
                    </span>
                    <strong>{session.title}</strong>
                    <span className="session-list-state">
                      {session.progress.length ? "Complete" : "Open"}{" "}
                      <Icon name={session.progress.length ? "check" : "arrow"} size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              No sessions have been published yet. <Link href={path}>Open the study materials</Link>
            </p>
          )}
        </section>
        <aside className="unit-study-plan">
          <section>
            <h2>Your progress</h2>
            <p>
              {done} of {unit.sessions.length} sessions complete
            </p>
            {unit.sessions.length > 0 && (
              <progress aria-label="Sessions complete" value={done} max={unit.sessions.length} />
            )}
            <div className="unit-study-actions">
              {next && (
                <Link className="primary-button" href={`${path}/sessions/${next.id}`}>
                  {resume ? "Resume session" : done ? "Continue studying" : "Start reading"}{" "}
                  <Icon name="arrow" size={16} />
                </Link>
              )}
              <Link className="curriculum-secondary" href={`${path}/quiz`}>
                Open unit quiz
              </Link>
            </div>
          </section>
          {unit.learningOutcomes.length > 0 && (
            <details className="unit-outcomes">
              <summary>Learning outcomes</summary>
              <ul>
                {unit.learningOutcomes.map((outcome) => (
                  <li key={outcome.id}>{outcome.description}</li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </LearningShell>
  );
}
