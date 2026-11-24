import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { IngestError } from "../../../lib/ingest/errors";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { activityInput } from "../../../lib/activity/input";
import { activitySummary, studyDay, shiftDay } from "../../../lib/activity/time";
import { recordStudyActivity } from "../../../lib/activity/service";
export async function GET() {
  try {
    const user = await requireLearner();
    const now = new Date(),
      today = studyDay(now);
    const [rows, profile] = await Promise.all([
      prisma.studyActivityDay.findMany({
        where: { studentId: user.id, day: { gte: shiftDay(today, -89), lte: today } },
        select: {
          day: true,
          seconds: true,
          moduleId: true,
          module: { select: { code: true, title: true } },
        },
        orderBy: { day: "asc" },
      }),
      prisma.studentProfile.findUnique({
        where: { studentId: user.id },
        select: { weeklyGoalMinutes: true },
      }),
    ]);
    const summary = activitySummary(rows, now, profile?.weeklyGoalMinutes ?? 120);
    const modules = new Map<string, { id: string; code: string; title: string; seconds: number }>();
    for (const row of rows.filter((r) => r.day >= summary.weekStart)) {
      const entry = modules.get(row.moduleId) ?? { id: row.moduleId, ...row.module, seconds: 0 };
      entry.seconds += row.seconds;
      modules.set(row.moduleId, entry);
    }
    return Response.json(
      { ...summary, modules: [...modules.values()], ownerId: user.id },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const p = activityInput.safeParse(await readJson(request));
    if (!p.success)
      throw new IngestError(
        400,
        "INVALID_ACTIVITY",
        "Choose a session and timer action. Identity, durations and dates cannot be supplied.",
      );
    return Response.json(await recordStudyActivity(prisma, user.id, p.data), {
      headers: privateHeaders,
    });
  } catch (e) {
    return studentFailure(e);
  }
}
