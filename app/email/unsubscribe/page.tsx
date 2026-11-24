import { LearningShell } from "../../../components/learning-shell";
import { readUnsubscribeToken } from "../../../lib/email/unsubscribe";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Email preferences · Vela",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const valid = readUnsubscribeToken(token, process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "");
  return (
    <LearningShell publicPage title="Recall email preferences">
      {valid ? (
        <>
          <p>
            Turn off active recall reminders? Your notes, progress and in-app review queue stay
            available.
          </p>
          <form method="post" action={`/api/email/unsubscribe?token=${encodeURIComponent(token)}`}>
            <button className="primary-button" type="submit">
              Stop recall reminders
            </button>
          </form>
        </>
      ) : (
        <p>This link is invalid. You can also turn reminders off in your profile.</p>
      )}
    </LearningShell>
  );
}
