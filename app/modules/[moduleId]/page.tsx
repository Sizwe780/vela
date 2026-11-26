import { LearningFrame } from "../../../components/learning-frame";
import { PublicFrame } from "../../../components/vela-landing";
import { auth } from "../../../lib/auth/server";
import { hasModuleAccess } from "../../../lib/enrollment/access";
import { Icon } from "../../../components/icons";
import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { getModule } from "../../../lib/study/catalog";
import type { Metadata } from "next";
export const revalidate = 60;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}): Promise<Metadata> {
  const { moduleId } = await params;
  const module = await getModule(moduleId);
  if (!module) return { title: "Module unavailable · Vela" };
  const title = `${module.code} · ${module.title} · Vela`;
  const description = `Explore ${module.title}: conceptual study units, guided sessions and active recall on Vela.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: ["/opengraph-image"] },
  };
}
export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const [module, session] = await Promise.all([getModule(moduleId), auth.getSession()]);
  if (!module) notFound();
  const metadata = z
    .object({
      sourceNote: z.string().optional(),
      sourceFiles: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            url: z.string().startsWith("/api/sources/"),
          }),
        )
        .optional(),
      conversion: z
        .object({
          converted: z.number(),
          total: z.number(),
          needsReview: z.number(),
          status: z.string(),
        })
        .optional(),
    })
    .passthrough()
    .safeParse(module.metadata);
  const info = metadata.success ? metadata.data : null;
  const student = session.data?.user;
  const enrolled = student && (await hasModuleAccess(student.id, module.id));
  const sessionCount = module.studyUnits.reduce((sum, unit) => sum + unit._count.sessions, 0);
  const content = (
    <main id="main-content" tabIndex={-1} className="home-content curriculum-page">
      <nav className="curriculum-crumb" aria-label="Module breadcrumb">
        <Link href="/">My learning</Link> › {module.code}
      </nav>
      <section className="curriculum-hero">
        <div>
          <span className="eyebrow">
            {module.institution} · {module.code}
          </span>
          <h1>{module.title}</h1>
          <p>
            {module.studyUnits.length}{" "}
            {module.studyUnits.length === 1 ? "study unit" : "study units"} · {sessionCount}{" "}
            {sessionCount === 1 ? "learning session" : "learning sessions"}
          </p>
        </div>
        <Link
          className={enrolled ? "curriculum-secondary" : "primary-button"}
          href={`/onboarding?moduleId=${module.id}`}
        >
          {enrolled ? "Manage enrollment" : "Enroll in this module"}
        </Link>
      </section>
      <div className="curriculum-section-title">
        <h2>Study units</h2>
        {info?.sourceFiles?.length ? (
          <details className="module-materials">
            <summary>Learning materials</summary>
            <p>{info.sourceNote}</p>
            <ul>
              {info.sourceFiles.map((file) => (
                <li key={file.id}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.title} · PDF ↗
                  </a>
                </li>
              ))}
            </ul>
            {info.conversion && (
              <p>
                Source pages prepared {info.conversion.converted}/{info.conversion.total} ·{" "}
                {info.conversion.needsReview} held · {info.conversion.status}
              </p>
            )}
          </details>
        ) : null}
      </div>
      <div className="unit-grid curriculum-units">
        {module.studyUnits.map((u) => (
          <Link className="unit-card" href={`/study/${u.id}/sessions`} key={u.id}>
            <div className="unit-card-top">
              <span className="curriculum-unit-index">{String(u.position).padStart(2, "0")}</span>
              <Icon name="arrow" size={18} />
            </div>
            <h3>{u.title}</h3>
            <p>
              {u._count.sessions}{" "}
              {u._count.sessions === 1 ? "learning session" : "learning sessions"}
            </p>
          </Link>
        ))}
      </div>
      {!module.studyUnits.length && <p>Study units for this module are being prepared.</p>}
    </main>
  );
  return student ? (
    <LearningFrame label={module.code}>{content}</LearningFrame>
  ) : (
    <PublicFrame>{content}</PublicFrame>
  );
}
