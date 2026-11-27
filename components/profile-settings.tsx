"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "../lib/auth/client";
import { useStudentResource, studentRequest, studentNavUpdate } from "../lib/student/client";
import { ProfileLearningPreferences } from "./learning/profile-learning-preferences";
import { EmailVerification } from "./email-verification";
import { AccountSecurity } from "./account-security";
import { SupportCenter } from "./support-center";
import { ThemeToggle } from "./theme-toggle";
import styles from "./student-pages.module.css";
type Profile = {
  studentId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  role: string;
  weeklyGoalMinutes: number;
  emailReminders: boolean;
  classroomAlerts: boolean;
  staffScopes: { qualificationId: string; role: string }[];
  emailDelivery: string;
  emailRemindersAvailable: boolean;
  emailTestAllowed: boolean;
  emailProvider: string | null;
  hasClassroom?: boolean;
};
export function ProfileSettings() {
  const { data, error, loading, reload } = useStudentResource<Profile>("/api/profile");
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || (loading ? "Loading your profile…" : "Sign in to see your profile.")}
      </p>
    );
  return <ProfileEditor key={data.studentId} data={data} reload={reload} />;
}

function ProfileEditor({ data, reload }: { data: Profile; reload: () => void }) {
  const [name, setName] = useState(data.displayName);
  const [goal, setGoal] = useState(data.weeklyGoalMinutes);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [reminders, setReminders] = useState(data.emailReminders);
  const [classroomAlerts, setClassroomAlerts] = useState(data.classroomAlerts);
  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setNotice("");
    try {
      const result = await authClient.updateUser({ name });
      if (result.error) throw Error(result.error.message ?? "Account name could not be updated.");
      await studentRequest("/api/profile", "PUT", {
        displayName: name,
        weeklyGoalMinutes: goal,
        emailReminders: reminders,
        classroomAlerts,
      });
      window.dispatchEvent(new Event(studentNavUpdate));
      setNotice("Profile saved.");
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className={styles.card}>
        <h2>Your account</h2>
        <EmailVerification
          key={data.email}
          email={data.email}
          verified={data.emailVerified}
          onVerified={reload}
        />
        <form className={styles.form} onSubmit={save}>
          <label>
            Display name
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={data.email} readOnly />
          </label>
          <label>
            Weekly study goal, in minutes
            <input
              type="number"
              min={15}
              max={1200}
              step={15}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            />
          </label>
          <p className={styles.note}>
            Your weekly target for the optional focused study timer. View recorded minutes on the
            activity page; time is separate from mastery and attendance.
          </p>
          <label className={styles.checkChoice}>
            <input
              type="checkbox"
              checked={reminders}
              disabled={!data.emailRemindersAvailable && !reminders}
              onChange={(e) => setReminders(e.target.checked)}
            />
            Email me active recall reminders
          </label>
          <p className={styles.note}>
            Optional: at most one digest per day, only when enrolled learning outcomes are due. Sent
            between 09:00 and 18:00 South African time. Turn this off here or use the unsubscribe
            link in any reminder. Save your profile to apply.
          </p>
          <label className={styles.checkChoice}>
            <input
              type="checkbox"
              disabled={!data.hasClassroom}
              checked={data.hasClassroom && classroomAlerts}
              onChange={(event) => setClassroomAlerts(event.target.checked)}
            />{" "}
            {data.hasClassroom
              ? "Show a Classroom badge for assignments I still need to submit"
              : "Assignment badges become available when you join a class"}
          </label>
          {!data.emailRemindersAvailable && (
            <p className={styles.note}>
              {!data.emailVerified
                ? "Verify your email to enable reminders."
                : "Email delivery is not connected for this account yet."}
            </p>
          )}
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save profile"}
          </button>
          <p role="status">{notice}</p>
        </form>
      </section>
      <ProfileLearningPreferences />
      <ReminderPreview />
      <AccountSecurity
        key={data.studentId}
        owner={data.studentId}
        email={data.email}
        verified={data.emailVerified}
      />
      <section className={styles.card}>
        <h2>Your data</h2>
        <p>Download a JSON copy of your profile, settings and activity saved in Vela.</p>
        <a className={styles.link} href="/api/account/export" download>
          Download my data
        </a>
      </section>
      {data.emailVerified ? (
        <SupportCenter key={data.studentId} deletionOnly />
      ) : (
        <p>Verify your email to request account deletion.</p>
      )}
      <section className={styles.card}>
        <h2>Preferences and access</h2>
        <div className={styles.row}>
          <span>Appearance · light by default</span>
          <ThemeToggle />
        </div>
        <p>
          Account role: {data.role}. Roles are managed by the operator and scoped to qualifications.
        </p>
        {!!data.staffScopes.length && (
          <Link className={styles.link} href="/staff">
            Open teaching workspace
          </Link>
        )}
        <p>
          Email delivery:{" "}
          {data.emailDelivery === "connected"
            ? `${data.emailProvider} connected`
            : data.emailDelivery === "test"
              ? `${data.emailProvider} test mode · approved test inbox only`
              : "not connected"}
          . Your{" "}
          <Link className={styles.link} href="/review">
            review queue
          </Link>{" "}
          is available in the app.
        </p>
        {data.emailTestAllowed && (
          <button
            className={styles.button}
            type="button"
            onClick={async () => {
              try {
                await studentRequest("/api/email/test", "POST", {});
                setNotice(
                  "Delivery test queued. The email worker will send it; at most one test per day.",
                );
              } catch (e) {
                setNotice(e instanceof Error ? e.message : "Delivery test could not be queued.");
              }
            }}
          >
            Send me a delivery test
          </button>
        )}
        <details>
          <summary>Your account identifier</summary>
          <code>{data.studentId}</code>
        </details>
        <p>
          <Link className={styles.link} href="/onboarding">
            Manage enrolled modules
          </Link>{" "}
          ·{" "}
          <Link className={styles.link} href="/privacy">
            Privacy and data requests
          </Link>
        </p>
      </section>
    </>
  );
}

function ReminderPreview() {
  const { data, error } = useStudentResource<{ due: number }>("/api/review");
  return (
    <details className="profile-learning-settings">
      <summary>Preview your recall digest</summary>
      <h3>Your next review is ready</h3>
      <p>
        {data
          ? `${data.due} learning ${data.due === 1 ? "outcome is" : "outcomes are"} due for review.`
          : error || "Loading your current review count…"}
      </p>
      <p>Open your review queue, recall the idea, then choose what to practise next.</p>
      <Link href="/review">Open review queue →</Link>
      <p>
        This is an in-app preview. It sends no email and does not change your reminder preference.
        Your notes, answers and scores are not included in the digest.
      </p>
    </details>
  );
}
