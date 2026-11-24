import { requireStudentPage } from "../../lib/student/page-auth";
import { LearningShell } from "../../components/learning-shell";
import { ReviewQueue } from "../../components/review-queue";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your review queue · Vela",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string | string[] }>;
}) {
  const params = await searchParams;
  const preferredUnit =
    typeof params.unit === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(params.unit)
      ? params.unit
      : undefined;
  await requireStudentPage("/review");
  return (
    <LearningShell
      title="Your review queue"
      description="Recall what you know and revisit the ideas that need another pass."
    >
      <ReviewQueue preferredUnit={preferredUnit} />
    </LearningShell>
  );
}
