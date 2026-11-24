import "server-only";
import { publishedStudyUnit } from "../study/published-units";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { visibleStudyText } from "./visible";
// Only published lesson text enters this cache. Access is checked on every search.
export const moduleSearchDocuments = unstable_cache(
  async (moduleId: string) => {
    const sessions = await prisma.studySession.findMany({
      where: { studyUnit: { ...publishedStudyUnit, moduleId } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        markdown: true,
        studyUnit: { select: { id: true, title: true, module: { select: { code: true } } } },
      },
    });
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      unitId: s.studyUnit.id,
      unitTitle: s.studyUnit.title,
      moduleCode: s.studyUnit.module.code,
      visible: visibleStudyText(s.markdown),
    }));
  },
  ["visible-session-search-v2"],
  { revalidate: 60, tags: ["curriculum"] },
);
