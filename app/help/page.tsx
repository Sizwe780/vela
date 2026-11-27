import Link from "next/link";
import { auth } from "../../lib/auth/server";
import { SupportContact } from "../../components/support-contact";
import { GuestContact } from "../../components/guest-contact";
import { LearningShell } from "../../components/learning-shell";
import { SupportCenter } from "../../components/support-center";
import styles from "../../components/student-pages.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help and support · Vela" };

export default async function HelpPage() {
  const { data } = await auth.getSession();
  return (
    <LearningShell
      title="Help and support"
      description="Get back to studying or send us a report."
      publicPage={!data?.user}
    >
      <section className={styles.card}>
        <h2>Common requests</h2>
        <ul>
          <li>
            <Link href="/auth/reset-password">Reset a forgotten password</Link>
          </li>
          <li>
            <Link href="/profile">Verify your email or manage your account</Link>
          </li>
          <li>
            <Link href="/onboarding">Manage access to your modules</Link>
          </li>
        </ul>
        <p>
          Need help with access or privacy? <SupportContact />.
        </p>
      </section>
      <GuestContact />
      {data?.user ? (
        <SupportCenter />
      ) : (
        <p>
          <Link href="/auth/sign-in?redirectTo=%2Fhelp">Sign in to report an issue</Link>
        </p>
      )}
    </LearningShell>
  );
}
