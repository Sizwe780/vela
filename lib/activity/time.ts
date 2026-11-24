export const PULSE_MS = 15000;
export const LEASE_MS = 45000;
export const IDLE_MS = 120000;
const OFFSET = 2 * 3600_000;
export function studyDay(now: Date) {
  return new Date(now.getTime() + OFFSET).toISOString().slice(0, 10);
}
export function shiftDay(day: string, offset: number) {
  return new Date(Date.parse(day + "T00:00:00Z") + offset * 86400_000).toISOString().slice(0, 10);
}
export function weekStart(day: string) {
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  return shiftDay(day, -(weekday === 0 ? 6 : weekday - 1));
}
/** Server elapsed time, bounded per heartbeat; never accepts a client duration. */
export function allocateStudyTime(previous: Date, now: Date) {
  const gap = now.getTime() - previous.getTime();
  if (gap <= 0 || gap > LEASE_MS) return [];
  const seconds = Math.min(20, Math.floor(gap / 1000));
  if (!seconds) return [];
  const start = new Date(now.getTime() - seconds * 1000);
  const day = studyDay(start),
    endDay = studyDay(now);
  if (day === endDay) return [{ day, seconds }];
  const midnight = Date.parse(endDay + "T00:00:00+02:00");
  const first = Math.max(0, Math.floor((midnight - start.getTime()) / 1000));
  return [
    { day, seconds: first },
    { day: endDay, seconds: seconds - first },
  ].filter((r) => r.seconds > 0);
}
export function activitySummary(
  rows: { day: string; seconds: number }[],
  now: Date,
  goalMinutes: number,
) {
  const today = studyDay(now),
    monday = weekStart(today);
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.day, (map.get(row.day) ?? 0) + row.seconds);
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: shiftDay(monday, i),
    seconds: map.get(shiftDay(monday, i)) ?? 0,
  }));
  const weekSeconds = days.reduce((sum, d) => sum + d.seconds, 0);
  let streak = 0;
  let cursor = (map.get(today) ?? 0) >= 60 ? today : shiftDay(today, -1);
  while ((map.get(cursor) ?? 0) >= 60) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return {
    today,
    weekStart: monday,
    days,
    weekSeconds,
    todaySeconds: map.get(today) ?? 0,
    goalMinutes,
    goalPercent: Math.min(100, Math.floor((weekSeconds / (goalMinutes * 60)) * 100)),
    streakDays: streak,
    streakWindowDays: 90,
  };
}
