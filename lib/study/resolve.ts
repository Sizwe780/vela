import "server-only";
import { publishedStudyUnit } from "./published-units";
import { prisma } from "../db";
export async function resolveStudyUnitId(value: string) {
  const rows = await prisma.studyUnit.findMany({
    where: { ...publishedStudyUnit, OR: [{ id: value }, { code: value }] },
    select: { id: true },
    take: 2,
  });
  return rows.length === 1 ? rows[0].id : null;
}
