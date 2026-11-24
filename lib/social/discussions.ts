import "server-only";
import { publishedStudyUnit } from "../study/published-units";
import { createHmac } from "node:crypto";
import { prisma } from "../db";
import { Prisma } from "../../generated/app-client";
import { IngestError } from "../ingest/errors";
import { discussionParagraphs, sourceDigest } from "./paragraphs";
export type DiscussionSource = {
  studyUnitId: string;
  sourceType: "session" | "chunk";
  sourceId: string;
};
type SourceDb = Pick<typeof prisma, "studySession" | "contentChunk" | "studyUnit">;
export async function readDiscussionSource(db: SourceDb, input: DiscussionSource) {
  const unit = await db.studyUnit.findFirst({
    where: { ...publishedStudyUnit, id: input.studyUnitId },
    select: { moduleId: true },
  });
  if (!unit) throw new IngestError(404, "SOURCE_NOT_FOUND", "This source is not available.");
  let markdown: string | null = null,
    revision = "";
  if (input.sourceType === "session") {
    const s = await db.studySession.findFirst({
      where: { id: input.sourceId, studyUnitId: input.studyUnitId },
      select: { markdown: true, version: true },
    });
    if (s) {
      markdown = s.markdown;
      revision = `session:${input.sourceId}:${s.version}`;
    }
  } else {
    const c = await db.contentChunk.findFirst({
      where: {
        id: input.sourceId,
        learningOutcome: { studyUnitId: input.studyUnitId },
        NOT: {
          ingestion: {
            structuredContent: { path: ["parser", "profile"], equals: "verified-blank-page" },
          },
        },
      },
      select: { body: true },
    });
    if (c?.body) {
      markdown = c.body;
      revision = `chunk:${input.sourceId}`;
    }
  }
  if (markdown === null)
    throw new IngestError(
      404,
      "SOURCE_NOT_FOUND",
      "This source does not belong to the selected unit.",
    );
  return {
    moduleId: unit.moduleId,
    sourceHash: sourceDigest(revision + "\n" + markdown),
    paragraphs: discussionParagraphs(markdown, revision),
  };
}
export async function scopedStaff(moduleId: string, ids: string[]) {
  return new Set(
    (
      await prisma.$queryRaw<{ studentId: string }[]>(
        Prisma.sql`SELECT DISTINCT sm."studentId" FROM "StaffMembership" sm JOIN "QualificationModule" qm ON qm."qualificationId"=sm."qualificationId" WHERE qm."moduleId"=${moduleId} AND sm.role IN ('staff','admin') AND sm."studentId" IN (${Prisma.join(ids)})`,
      )
    ).map((r) => r.studentId),
  );
}
export function peerAlias(studentId: string, sourceId: string) {
  return (
    "Learner " +
    createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET!)
      .update(sourceId + ":" + studentId)
      .digest("hex")
      .slice(0, 6)
  );
}
