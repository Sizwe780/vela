import "server-only";
import { createRealtime, rawSql } from "@neon/realtime/server";

export type ProgressRow = {
  id: string;
  learningOutcomeId: string;
  score: number;
  attempts: number;
};

export function progressQuery(userId: string) {
  return rawSql<ProgressRow>(
    'SELECT "id", "learningOutcomeId", "score", "attempts" FROM "StudentMastery" WHERE "studentId" = $1 ORDER BY "id" LIMIT 1000',
    [userId],
  );
}

export async function sealProgress(userId: string) {
  const realtime = createRealtime({
    secret: process.env.NEON_REALTIME_SECRET!,
    db: decodeURIComponent(new URL(process.env.DATABASE_URL!).pathname.slice(1)),
  });
  return realtime.seal({ query: progressQuery(userId) });
}
