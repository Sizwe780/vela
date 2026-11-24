import { requireUnitAccess } from "../../../lib/enrollment/access";
import { publicError } from "../../../lib/ingest/errors";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { z } from "zod";
const sourceSchema = z.object({
  document: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  sha256: z.string(),
  pageStart: z.number(),
  pageEnd: z.number(),
});
import { structuredDocumentSchema } from "../../../lib/content/structured";
export async function GET(request: Request) {
  try {
    const learner = await requireLearner();
    const params = new URL(request.url).searchParams;
    const unit = params.get("unit") ?? "";
    const id = params.get("id");
    await requireUnitAccess(learner.id, unit);
    if (id) {
      const row = await prisma.ingestion.findFirst({
        where: { id, learningOutcome: { studyUnitId: unit } },
        select: { structuredContent: true },
      });
      const parsed = structuredDocumentSchema.safeParse(row?.structuredContent);
      return parsed.success
        ? Response.json(
            { document: parsed.data },
            { headers: { "Cache-Control": "private,no-store" } },
          )
        : Response.json({ error: "Page not found" }, { status: 404 });
    }
    const rows = await prisma.$queryRaw<
      { id: string; source: unknown; review: string }[]
    >`SELECT i.id,i."structuredContent"->'source' AS source,i."structuredContent"->'parser'->>'review' AS review FROM "Ingestion" i JOIN "LearningOutcome" o ON o.id=i."learningOutcomeId" WHERE o."studyUnitId"=${unit} AND i."structuredContent" IS NOT NULL ORDER BY CASE WHEN i."structuredContent"->'parser'->>'review'='source-compared' THEN 0 ELSE 1 END,i."createdAt" DESC`;
    const seen = new Set<string>();
    const pages = rows
      .flatMap((r) => {
        const p = sourceSchema.safeParse(r.source);
        if (!p.success) return [];
        const result = [];
        for (let page = p.data.pageStart; page <= p.data.pageEnd; page++) {
          const key = `${p.data.document}:${page}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ id: r.id, ...p.data, pageStart: page, review: r.review });
        }
        return result;
      })
      .sort((a, b) => a.document.localeCompare(b.document) || a.pageStart - b.pageStart);
    return Response.json({ pages }, { headers: { "Cache-Control": "private,no-store" } });
  } catch (e) {
    const f = publicError(e);
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private,no-store" } },
    );
  }
}
