import { LearningFrame } from "../components/learning-frame";
import { AcademicBriefing } from "../components/learning/learning-panel";
import { StudentMomentum } from "../components/student-momentum";
import { EnrollmentDashboard } from "../components/enrollment-dashboard";
import Link from "next/link";
import { ActivityOverview } from "../components/activity-overview";
import { ConceptProgress } from "../components/coach/concept-progress";
import { connection } from "next/server";
import { LearnerServices } from "../components/learner-services";
import { OutcomeInsights } from "../components/outcome-insights";
import { auth } from "../lib/auth/server";
import { VelaLanding } from "../components/vela-landing";

export default async function Home() {
  await connection();
  const { data } = await auth.getSession();
  if (!data?.user) return <VelaLanding />;
  return (
    <LearningFrame label="Overview">
      <main id="main-content" tabIndex={-1} className="home-content">
        <AcademicBriefing
          fallback={
            <section className="home-hero">
              <div>
                <span className="eyebrow">YOUR STUDY WORKSPACE</span>
                <h1>Make the subject yours.</h1>
                <p>
                  Choose a module, then a study unit and session. Your lessons, notes and practice
                  stay in context.
                </p>
                <div className="learning-actions">
                  <Link className="primary-button" href="/onboarding">
                    Manage my modules
                  </Link>
                </div>
              </div>
            </section>
          }
        />
        <StudentMomentum />
        <div className="vela-dashboard-grid">
          <div className="vela-dashboard-main">
            <EnrollmentDashboard />
            <OutcomeInsights compact />
          </div>
          <aside className="vela-dashboard-support" aria-label="Study rhythm and practice">
            <ActivityOverview compact />
            <ConceptProgress />
            <LearnerServices />
          </aside>
        </div>
        <footer className="vela-dashboard-footer">
          <Link href="/about">About Vela</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </footer>
      </main>
    </LearningFrame>
  );
}
