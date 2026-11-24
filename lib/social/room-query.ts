import { rawSql } from "@neon/realtime/server";
export type RoomCount = { id: string; others: number };
export function roomCountQuery(studentId: string, moduleId: string, observedAt = new Date()) {
  return rawSql<RoomCount>(
    `SELECT 'room' AS id, count(*)::int AS others FROM "StudyRoomPresence" p
 WHERE p."moduleId"=$2 AND p."studentId"<>$1 AND p."expiresAt">$3::timestamptz
 AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=p."studentId" AND e."moduleId"=$2 AND e.status IN ('active','completed'))
 AND EXISTS(SELECT 1 FROM "Enrollment" e WHERE e."studentId"=$1 AND e."moduleId"=$2 AND e.status IN ('active','completed'))`,
    [studentId, moduleId, observedAt.toISOString()],
  );
}
