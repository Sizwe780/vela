import { loadModuleSpec, auditUnit } from "../lib/specs";
import { visualPresetIds } from "../lib/content/visual-presets";
import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { structuredDocumentSchema } from "../lib/content/structured";
import { mathSpans, normalizeMath } from "../lib/content/math";
import { parseLearningBlocks } from "../lib/content/exercises";
import { pageJobs, type ScopePlan } from "../lib/content/bulk";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 2,
  }),
});
async function main() {
  try {
    const report: any = {
      checkedAt: new Date().toISOString(),
      scope:
        "Configured module source pages, published lessons and provider-specific vectors; machine OCR is not an exhaustive mathematical fact audit.",
      modules: [],
    };
    for (const code of ["MAT1512", "MAT1503"]) {
      const expected = new Map<string, { unitCode: string; sha256: string }>();
      if (code === "MAT1512") {
        const plan = JSON.parse(
          await readFile("../work/mat1512/ingestion-plan.json", "utf8"),
        ) as ScopePlan;
        for (const j of pageJobs(plan))
          expected.set(j.key, { unitCode: j.unitCode, sha256: j.sha256 });
      } else {
        const plan = JSON.parse(await readFile(`content/${code.toLowerCase()}/plan.json`, "utf8"));
        for (const u of plan.units)
          for (const ref of u.references) {
            const source = plan.sources.find((s: any) => s.id === ref.source);
            for (let p = ref.pageStart; p <= ref.pageEnd; p++)
              expected.set(`${ref.source}:${p}`, { unitCode: u.code, sha256: source.sha256 });
          }
      }
      const module = await db.module.findUniqueOrThrow({
        where: { institution_code: { institution: "UNISA", code } },
        include: {
          studyUnits: {
            orderBy: { position: "asc" },
            include: { sessions: { orderBy: { position: "asc" } } },
          },
        },
      });
      const rows = await db.ingestion.findMany({
        where: { learningOutcome: { studyUnit: { moduleId: module.id } } },
        select: {
          id: true,
          sourceName: true,
          embeddingProvider: true,
          structuredContent: true,
          _count: { select: { chunks: true } },
          learningOutcome: { select: { studyUnit: { select: { code: true } } } },
        },
      });
      const covered = new Map<string, Set<string>>();
      const blankPages = new Set<string>();
      const assets = new Set<string>();
      const issues: string[] = [];
      let math = 0,
        gates = 0,
        widgets = 0,
        sourceMath = 0;
      const spec = await loadModuleSpec({ institution: module.institution, moduleCode: code });
      for (const expectedCode of new Set([...expected.values()].map((v) => v.unitCode)))
        if (!module.studyUnits.some((u) => u.code === expectedCode))
          issues.push(`Missing planned unit: ${expectedCode}`);
      for (const u of module.studyUnits) {
        const qa = auditUnit(
          spec,
          {
            code: u.code,
            sessions: u.sessions.map((s) => ({
              title: s.title,
              markdown: s.markdown,
              visual: s.visual,
              concepts: Array.isArray(s.concepts)
                ? s.concepts.filter((c): c is string => typeof c === "string")
                : [],
            })),
          },
          { allowedVisuals: visualPresetIds },
        );
        for (const issue of qa.issues)
          if (issue.severity === "error") issues.push(`${u.code}: ${issue.code}`);
      }
      for (const u of module.studyUnits)
        for (const s of u.sessions) {
          try {
            math += mathSpans(normalizeMath(s.markdown)).length;
          } catch {
            issues.push(`Invalid lesson math: ${s.id}`);
          }
          const blocks = parseLearningBlocks(s.markdown);
          if (blocks.errors.length) issues.push(`Invalid exercise blocks: ${s.id}`);
          gates += blocks.blocks.filter((b) => b.type === "exercise").length;
          if (s.visual) widgets++;
        }
      for (const row of rows) {
        if (!row.structuredContent) continue;
        const parsed = structuredDocumentSchema.safeParse(row.structuredContent);
        if (!parsed.success) {
          issues.push(`Invalid structured document: ${row.id}`);
          continue;
        }
        const doc = parsed.data;
        const set = covered.get(row.embeddingProvider) ?? new Set<string>();
        covered.set(row.embeddingProvider, set);
        for (let page = doc.source.pageStart; page <= doc.source.pageEnd; page++) {
          const key = doc.source.document + ":" + page;
          const wanted = expected.get(key);
          if (
            wanted &&
            wanted.sha256 === doc.source.sha256 &&
            wanted.unitCode === row.learningOutcome.studyUnit.code &&
            row._count.chunks > 0
          ) {
            set.add(key);
            if (doc.parser.profile === "verified-blank-page") blankPages.add(key);
          }
        }
        for (const b of doc.blocks)
          if (b.type === "figure") assets.add(b.asset);
          else if (b.type === "markdown")
            try {
              sourceMath += mathSpans(normalizeMath(b.markdown)).length;
            } catch {
              issues.push(`Invalid source math: ${row.id}`);
            }
      }
      for (const asset of assets) {
        try {
          const bytes = await readFile(
            join(process.env.MATH_ASSET_DIR || resolve("../work/math-parser/bulk/assets"), asset),
          );
          if (createHash("sha256").update(bytes).digest("hex") + ".png" !== asset) throw Error();
        } catch {
          issues.push(`Missing or corrupt figure: ${asset}`);
        }
      }
      const vectors = await db.$queryRaw<
        { provider: string; sourceMissing: number; lessonMissing: number; lessonChunks: number }[]
      >`SELECT i."embeddingProvider" AS provider,count(*) FILTER(WHERE i."structuredContent" IS NOT NULL AND (CASE WHEN i."embeddingDimensions"=768 THEN c.embedding768 IS NULL WHEN i."embeddingDimensions"=1536 THEN c.embedding IS NULL ELSE true END))::int AS "sourceMissing",count(*) FILTER(WHERE i."sourceName" LIKE 'Vela original / %' AND (CASE WHEN i."embeddingDimensions"=768 THEN c.embedding768 IS NULL WHEN i."embeddingDimensions"=1536 THEN c.embedding IS NULL ELSE true END))::int AS "lessonMissing",count(*) FILTER(WHERE i."sourceName" LIKE 'Vela original / %')::int AS "lessonChunks" FROM "ContentChunk" c JOIN "Ingestion" i ON i.id=c."ingestionId" JOIN "LearningOutcome" lo ON lo.id=c."learningOutcomeId" JOIN "StudyUnit" u ON u.id=lo."studyUnitId" WHERE u."moduleId"=${module.id} GROUP BY i."embeddingProvider"`;
      const providers = code === "MAT1512" ? ["cloudflare", "ollama"] : ["cloudflare"];
      const coverage = providers.map((provider) => ({
        provider,
        pages: covered.get(provider)?.size ?? 0,
        expected: expected.size,
        missing: [...expected.keys()].filter((k) => !covered.get(provider)?.has(k)),
      }));
      const units = module.studyUnits.map((u) => ({
        code: u.code,
        sessions: u.sessions.length,
        visualSessions: u.sessions.filter((s) => s.visual).length,
        expectedPages: [...expected.values()].filter((v) => v.unitCode === u.code).length,
      }));
      report.modules.push({
        code,
        units,
        publishedSessions: units.reduce((n, u) => n + u.sessions, 0),
        hiddenAnswerExercises: gates,
        validLessonMath: math,
        interactiveSessions: widgets,
        sourceMathExpressions: sourceMath,
        verifiedFigureAssets: assets.size,
        sourceCoverage: coverage,
        verifiedBlankPages: [...blankPages],
        instructionalSourcePages: expected.size - blankPages.size,
        vectors,
        issues,
        ready:
          coverage.every((c) => c.pages === c.expected) &&
          !issues.length &&
          vectors.every((v) => !v.sourceMissing && !v.lessonMissing),
      });
    }
    await mkdir(".vela/reports", { recursive: true });
    await writeFile(".vela/reports/module-readiness.json", JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        report.modules.map((m: any) => ({
          code: m.code,
          publishedSessions: m.publishedSessions,
          hiddenAnswerExercises: m.hiddenAnswerExercises,
          interactiveSessions: m.interactiveSessions,
          verifiedFigureAssets: m.verifiedFigureAssets,
          verifiedBlankPages: m.verifiedBlankPages,
          instructionalSourcePages: m.instructionalSourcePages,
          sourceCoverage: m.sourceCoverage.map(({ missing, ...rest }: any) => ({
            ...rest,
            missing: missing.length,
          })),
          vectors: m.vectors,
          issues: m.issues,
          ready: m.ready,
        })),
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Audit failed");
  process.exitCode = 1;
});
