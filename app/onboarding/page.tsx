import { syntheticQualification } from "../../lib/enrollment/catalog-visibility";
import { publishedStudyUnit } from "../../lib/study/published-units";
import { LearningFrame } from "../../components/learning-frame";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth/server";
import { prisma } from "../../lib/db";
import { isPsmQualification } from "../../lib/curriculum/psm-first-level";
import { currentStudyPeriod } from "../../lib/curriculum/psm-enrollment";
import { EnrollmentPicker } from "../../components/enrollment-picker";
import { safeReturnPath } from "../../lib/enrollment/return-path";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Choose your modules · Vela",
  description: "Select your qualification and modules to begin learning.",
};
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ moduleId?: string; next?: string }>;
}) {
  const options = await searchParams;
  const session = await auth.getSession();
  if (!session.data?.user)
    redirect("/auth/sign-in?redirectTo=" + encodeURIComponent("/onboarding"));
  const staff = await prisma.staffMembership.findMany({
    where: { studentId: session.data.user.id },
    select: { qualificationId: true },
  });
  const staffIds = new Set(staff.map((s) => s.qualificationId));
  const moduleSelect = {
    id: true,
    code: true,
    title: true,
    _count: {
      select: { studyUnits: { where: { ...publishedStudyUnit, sessions: { some: {} } } } },
    },
  };
  const qualifications = await prisma.qualification.findMany({
    where: {
      archivedAt: null,
      OR: [{ teachingSettings: null }, { teachingSettings: { allowSelfEnrollment: true } }],
    },
    orderBy: [{ institution: "asc" }, { code: "asc" }],
    select: {
      id: true,
      institution: true,
      code: true,
      stream: true,
      title: true,
      streamTitle: true,
      modules: {
        orderBy: [{ studyYear: "asc" }, { position: "asc" }],
        select: {
          studyYear: true,
          acceptingEnrollments: true,
          archivedAt: true,
          module: { select: moduleSelect },
        },
      },
    },
  });

  const available = qualifications
    .filter((q) => !syntheticQualification(q) || staffIds.has(q.id))
    .map(({ modules, ...qualification }) => ({
      ...qualification,
      isPsm: isPsmQualification(qualification),
      modules: modules
        .filter((link) => link.acceptingEnrollments && !link.archivedAt)
        .map(({ studyYear, module }) => ({ studyYear, module })),
    }));
  const existing = await prisma.enrollment.findMany({
    where: { studentId: session.data.user.id, status: { in: ["active", "completed"] } },
    select: {
      qualificationId: true,
      moduleId: true,
      status: true,
      enrolledAt: true,
      studyPlanYear: true,
      studyPlanSemester: true,
      qualificationModule: { select: { module: { select: { code: true } } } },
    },
  });
  return (
    <LearningFrame label={"Choose modules"}>
      <main id="main-content" tabIndex={-1} className="home-content">
        <EnrollmentPicker
          qualifications={available}
          initialPeriod={currentStudyPeriod()}
          existing={existing.flatMap((row) => {
            if (row.status === "withdrawn") return [];
            const inferred = currentStudyPeriod(row.enrolledAt);
            return [
              {
                qualificationId: row.qualificationId,
                moduleId: row.moduleId,
                status: row.status,
                code: row.qualificationModule.module.code,
                year: row.studyPlanYear ?? inferred.year,
                semester: row.studyPlanSemester ?? inferred.semester,
              },
            ];
          })}
          requestedModule={options.moduleId}
          next={safeReturnPath(options.next)}
        />
      </main>
    </LearningFrame>
  );
}
