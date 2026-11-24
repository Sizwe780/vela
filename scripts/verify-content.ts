import "dotenv/config";
import { loadFactoryManifest, reviewedEvidence, hashValue } from "../lib/content/factory-evidence";
import { artifactSchema } from "../lib/content/factory";
import { renderSession } from "../lib/content/session-schema";
import { runFactoryAudit } from "../lib/content/factory-quality";
import { loadModuleSpec } from "../lib/specs";
import { options, readJSON, verifyPDFs } from "./content-factory-files";

async function verify() {
  const args = options();
  const moduleCode = args.module ?? process.env.npm_config_module;
  if (!moduleCode || !args["source-root"])
    throw new Error(
      "Provide --module and --source-root. Add --unit and --evidence to validate reviewed page coverage.",
    );
  const manifest = await loadFactoryManifest(moduleCode.toUpperCase());
  await verifyPDFs(manifest, args["source-root"], args.capture === "true");
  const report: Record<string, unknown> = {
    module: manifest.moduleCode,
    scope: manifest.scope,
    sourceHashesVerified: manifest.sources.length,
    unitsWithoutPhysicalPageMapping: manifest.unitMapping
      .filter((unit) => unit.status === "working" && !unit.pages.length)
      .map((unit) => unit.unitCode),
  };
  if (args.unit || args.evidence || args.artifact) {
    if (!args.unit || !args.evidence) throw new Error("Provide --unit and --evidence together.");
    const evidence = reviewedEvidence(manifest, args.unit, await readJSON(args.evidence));
    report.instructionalRanges = evidence.included.length;
    report.excludedRanges = evidence.skipped.length;
    if (args.artifact) {
      const artifact = artifactSchema.parse(await readJSON(args.artifact));
      const spec = await loadModuleSpec(manifest);
      const matched = new Set(evidence.included.map((item) => item.ref.evidenceHash));
      if (
        artifact.inventory.unitCode !== args.unit ||
        artifact.institution !== manifest.institution ||
        artifact.moduleCode !== manifest.moduleCode ||
        artifact.manifestHash !== hashValue(manifest) ||
        artifact.specHash !== spec.hash ||
        hashValue(artifact.exclusions) !== hashValue(evidence.skipped) ||
        artifact.evidence.length !== matched.size ||
        artifact.evidence.some((item) => !matched.has(item.evidenceHash))
      )
        throw new Error(
          "Artifact provenance differs from the current scope, spec or reviewed evidence.",
        );
      const audit = runFactoryAudit(
        spec,
        {
          code: args.unit,
          sessions: artifact.sessions.map((session) => ({
            title: session.title,
            markdown: renderSession(session),
          })),
        },
        evidence.included.map((item) => item.body),
      );
      report.audit = audit;
      if (!audit.passed) process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
verify().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
