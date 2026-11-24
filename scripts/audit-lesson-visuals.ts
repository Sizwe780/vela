import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { parseLearningBlocks } from "../lib/content/exercises";
import { lessonFigure } from "../lib/content/lesson-figures";
import { hasInstitutionalTeachingFraming } from "../lib/content/lesson-voice";
import { visualPresetIds } from "../lib/content/visual-presets";
import { parseWidgetBlocks, widgetCapability } from "../lib/content/widget-registry";
import { inlineSessionVisual } from "../lib/content/inline-visual";
import { moduleCapabilities } from "../lib/capabilities";
import { publishedStudyUnit } from "../lib/study/published-units";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true },
    }),
  });
  try {
    const modules = await db.module.findMany({
      where: { studyUnits: { some: { ...publishedStudyUnit, sessions: { some: {} } } } },
      orderBy: [{ institution: "asc" }, { code: "asc" }],
      select: {
        institution: true,
        code: true,
        metadata: true,
        studyUnits: {
          where: publishedStudyUnit,
          select: { sessions: { select: { id: true, visual: true, markdown: true } } },
        },
      },
    });
    let invalid = 0;
    for (const item of modules) {
      const capabilities = moduleCapabilities(item.institution, item.code, item.metadata);
      const sessions = item.studyUnits.flatMap((unit) => unit.sessions);
      const gaps: string[] = [];
      const issues: { session: string; message: string }[] = [];
      const sourcedFigures = new Set<string>();
      const photographs = new Set<string>();
      for (const session of sessions) {
        if (hasInstitutionalTeachingFraming(session.markdown)) {
          issues.push({ session: session.id, message: "Institutional framing in teaching prose" });
        }
        let visual = false;
        if (session.visual && !visualPresetIds.some((id) => id === session.visual))
          issues.push({ session: session.id, message: "Unknown session visual preset" });
        const lesson = parseLearningBlocks(inlineSessionVisual(session.markdown, session.visual));
        for (const message of lesson.errors) issues.push({ session: session.id, message });
        for (const segment of lesson.blocks) {
          const imageText =
            segment.type === "text" ? segment.text : `${segment.question}\n${segment.answer}`;
          for (const [, src] of imageText.matchAll(/!\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
            const figure = lessonFigure(src);
            if (figure) {
              visual = true;
              if (figure.sourceUrl) sourcedFigures.add(src);
              if (figure.sourceUrl && figure.variants && src.endsWith(".webp"))
                photographs.add(src);
            } else
              issues.push({
                session: session.id,
                message: "Figure is absent from the approved lesson registry",
              });
          }
          if (segment.type !== "text") continue;
          const parsed = parseWidgetBlocks(segment.text);
          for (const message of parsed.errors) issues.push({ session: session.id, message });
          for (const block of parsed.blocks) {
            if (block.type !== "widget") continue;
            if (capabilities[widgetCapability(block.widget)]) visual = true;
            else
              issues.push({ session: session.id, message: "Widget is disabled for this module" });
          }
        }
        if (!visual) gaps.push(session.id);
      }
      invalid += issues.length;
      console.log(
        JSON.stringify({
          institution: item.institution,
          module: item.code,
          sessions: sessions.length,
          withVisual: sessions.length - gaps.length,
          sourcedFigures: sourcedFigures.size,
          photographs: photographs.size,
          gaps,
          issues,
        }),
      );
    }
    if (invalid) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Visual audit failed.");
  process.exitCode = 1;
});
