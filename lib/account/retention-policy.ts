export const retentionPolicy = {
  version: "2026-11-27-v1",
  deletionDays: 30,
  closedCaseMonths: 12,
  deliveryDays: 90,
  securityDays: 90,
  inactivityMonths: 24,
  closureNoticeDays: 30,
  expiredLeaseHours: 24,
  batchLimit: 500,
} as const;
export type RetentionScope = "all" | "account" | "support" | "moderation" | "delivery" | "security";
export type Hold = {
  id: string;
  scope: string;
  targetId: string | null;
  expiresAt: Date | null;
  releasedAt: Date | null;
  reason: string;
  createdAt: Date;
};
export function beforeMonths(now: Date, months: number) {
  const date = new Date(now),
    day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date;
}
export function beforeDays(now: Date, days: number) {
  return new Date(now.getTime() - days * 86400000);
}
export function retentionHeld(
  holds: Hold[],
  scope: RetentionScope,
  targetIds: (string | null | undefined)[],
  accountIds: (string | null | undefined)[],
  now: Date,
) {
  return holds.some(
    (h) =>
      !h.releasedAt &&
      (!h.expiresAt || h.expiresAt > now) &&
      ((h.scope === "all" &&
        (!h.targetId || targetIds.includes(h.targetId) || accountIds.includes(h.targetId))) ||
        (h.scope === scope && (!h.targetId || targetIds.includes(h.targetId))) ||
        (h.scope === "account" && (!h.targetId || accountIds.includes(h.targetId)))),
  );
}
export function deletionDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + retentionPolicy.deletionDays * 86400000);
}
