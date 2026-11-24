import "server-only";
import { publishedStudyUnit } from "./published-units";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { resolveStudyUnitId } from "./resolve";
import { demoUnit } from "./demo";

// Only public curriculum data belongs here. Never cache cookies, notes or mastery.
// Revalidate after 60s; the first hit may serve stale data while refreshing.
// Learner APIs remain uncached.
export const listModules = unstable_cache(
  () =>
    prisma.module.findMany({
      orderBy: [{ institution: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        institution: true,
        _count: { select: { studyUnits: { where: publishedStudyUnit } } },
      },
    }),
  ["public-module-catalog-v2"],
  { revalidate: 60, tags: ["curriculum"] },
);
export const getModule = unstable_cache(
  (id: string) =>
    prisma.module.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        institution: true,
        metadata: true,
        studyUnits: {
          where: publishedStudyUnit,
          orderBy: { position: "asc" },
          select: {
            id: true,
            code: true,
            title: true,
            position: true,
            _count: { select: { sessions: true } },
          },
        },
      },
    }),
  ["public-module-v2"],
  { revalidate: 60, tags: ["curriculum"] },
);
export const getUnitMetadata = unstable_cache(
  async (id: string) => {
    if (id === "demo")
      return { id: demoUnit.id, title: demoUnit.title, module: { code: demoUnit.moduleCode } };
    const resolved = await resolveStudyUnitId(id);
    if (!resolved) return null;
    return prisma.studyUnit.findUnique({
      where: { id: resolved },
      select: { id: true, title: true, module: { select: { code: true } } },
    });
  },
  ["public-unit-metadata-v2"],
  { revalidate: 60, tags: ["curriculum"] },
);
