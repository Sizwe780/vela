export function nextRecall(
  rating: number,
  previous: { lastAssessedAt: Date | null; nextReviewAt: Date | null } | null,
  now: Date,
) {
  if (!Number.isFinite(rating) || rating < 0 || rating > 1) throw Error("Invalid recall rating");
  if (rating < 0.5) return new Date(now.getTime() + 10 * 60000);
  const oldDays =
    previous?.lastAssessedAt && previous.nextReviewAt
      ? Math.max(
          0,
          (previous.nextReviewAt.getTime() - previous.lastAssessedAt.getTime()) / 86400000,
        )
      : 0;
  const days = Math.min(
    365,
    rating < 0.9 ? Math.max(1, oldDays * 1.7) : Math.max(3, oldDays * 2.5),
  );
  return new Date(now.getTime() + Math.round(days * 86400000));
}
