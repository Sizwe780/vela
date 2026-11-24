export const dynamic = "force-dynamic";
import { requireStudentPage } from "../../lib/student/page-auth";
import { prisma } from "../../lib/db";
import { LearningShell } from "../../components/learning-shell";
import Link from "next/link";
export const metadata = { title: "Study lounge · Vela", robots: { index: false, follow: false } };
export default async function Page() {
  const learner = await requireStudentPage("/lounge");
  const modules = await prisma.module.findMany({
    where: {
      qualifications: {
        some: {
          enrollments: { some: { studentId: learner.id, status: { in: ["active", "completed"] } } },
        },
      },
    },
    select: { id: true, code: true, title: true, institution: true },
    orderBy: { code: "asc" },
    take: 200,
  });
  return (
    <LearningShell
      title="A quiet place to study"
      description="Choose a module and join its anonymous study room when you’re ready."
    >
      <div className="lounge-module-grid outcome-grid">
        {modules.map((m) => (
          <article key={m.id}>
            <span className="eyebrow">
              {m.institution} · {m.code}
            </span>
            <h2>{m.title}</h2>
            <Link href={`/lounge/${m.id}`}>Open study room →</Link>
          </article>
        ))}
      </div>
      {!modules.length && <Link href="/onboarding">Choose modules to get started</Link>}
    </LearningShell>
  );
}
