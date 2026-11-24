import type { APIRequestContext } from "@playwright/test";
import type { PrismaClient } from "../../../generated/app-client";
export async function enrollTestLearner(
  request: APIRequestContext,
  db: PrismaClient,
  moduleIds?: string[],
) {
  const links = await db.qualificationModule.findMany({
    where: {
      acceptingEnrollments: true,
      archivedAt: null,
      ...(moduleIds
        ? { moduleId: { in: moduleIds } }
        : {
            module: { studyUnits: { some: {} } },
          }),
    },
    select: { qualificationId: true, moduleId: true },
  });
  for (const q of new Set(links.map((l) => l.qualificationId))) {
    const response = await request.post("/api/enrollments", {
      headers: {
        origin: new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3200").origin,
      },
      data: {
        action: "enroll",
        qualificationId: q,
        moduleIds: links.filter((l) => l.qualificationId === q).map((l) => l.moduleId),
      },
    });
    if (!response.ok()) throw Error(`Test enrollment failed: ${response.status()}`);
  }
}
