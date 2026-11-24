import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { curriculum } from "../content/mat1512/sessions";
import { loadModuleSpec, auditUnit } from "../lib/specs/index";
import { mathSpans, normalizeMath } from "../lib/content/math";
import { visualPresetIds } from "../lib/content/visual-presets";
import { parseLearningBlocks } from "../lib/content/exercises";

function expressionCount(markdown: string): number | null {
  try { return mathSpans(normalizeMath(markdown)).length; }
  catch { return null; } // auditUnit records the diagnostic; still write the report.
}

function cognitiveChecks(markdown: string) {
  const assessment = markdown.match(/^## Assessment\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/mi)?.[1] ?? "";
  const parsed = parseLearningBlocks(assessment);
  if (parsed.errors.length) return [];
  return ["Recognition", "Procedure", "Error correction", "Transfer"].filter(label => parsed.blocks.some(block => block.type === "exercise" && block.title.trim().toLowerCase().startsWith(label.toLowerCase()) && block.question.trim().length >= 8 && block.answer.replace(/\*\*Worked solution:\*\*/gi, "").trim().length >= 8));
}

async function main() {
  const spec = await loadModuleSpec({ institution: "UNISA", moduleCode: "MAT1512" });
  const units = curriculum.map(unit => {
    const audit = auditUnit(spec, unit, { allowedVisuals: visualPresetIds });
    return {
      ...audit,
      sessions: unit.sessions.map((session, index) => ({
        // Offline logical code, never an assumption about database/tenant IDs.
        logicalSessionCode: `${unit.code}-S${index + 1}`,
        title: session.title,
        words: session.markdown.split(/\s+/).filter(Boolean).length,
        mathematicalExpressions: expressionCount(session.markdown),
        interactivePreset: session.visual,
        cognitiveChecks: cognitiveChecks(session.markdown),
        questionFirstExercises: parseLearningBlocks(session.markdown).blocks.filter(block => block.type === "exercise").length,
      })),
    };
  });
  const report = {
    checkedAt: new Date().toISOString(),
    purpose: "Offline structural preflight; not a publication approval or a mathematical, originality, legal or curriculum certification.",
    requiresPublishSourceAudit: true,
    passed: units.every(unit => unit.passed),
    totalSessions: units.reduce((count, unit) => count + unit.sessions.length, 0),
    units,
  };
  const reportPath = fileURLToPath(new URL("../.vela/reports/masterclass-preflight.json", import.meta.url));
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  for (const unit of units) console.log(`${unit.unitCode}: ${unit.sessions.length} sessions; ${unit.passed ? "PASS" : "FAIL"}; ${unit.issues.length} findings`);
  console.log(`Offline preflight: ${report.totalSessions} sessions; report ${reportPath}. Source comparison remains a separate publishing gate.`);
  if (!report.passed) {
    for (const unit of units) for (const issue of unit.issues) if (issue.severity === "error") console.error(`${unit.unitCode}: ${issue.code}: ${issue.message}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Masterclass preflight failed");
  process.exitCode = 1;
});
