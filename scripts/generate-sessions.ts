import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadFactoryManifest, reviewedEvidence } from "../lib/content/factory-evidence";
import { factoryModel } from "../lib/content/factory-model";
import { manufacture } from "../lib/content/factory";
import { options, readJSON, verifyPDFs } from "./content-factory-files";

async function generate() {
  const args = options();
  if (!args.module || !args.unit || !args.evidence || !args["source-root"])
    throw new Error("Provide --module, --unit, --source-root and --evidence.");
  const manifest = await loadFactoryManifest(args.module.toUpperCase());
  if (manifest.scope === "provisional" && args["allow-provisional"] !== "true")
    throw new Error(
      "The scope is provisional. Use --allow-provisional=true for private draft work.",
    );
  await verifyPDFs(manifest, args["source-root"], false);
  const { included, skipped } = reviewedEvidence(
    manifest,
    args.unit,
    await readJSON(args.evidence),
  );
  const provider = args.provider ?? "ollama";
  if (provider !== "ollama" && provider !== "cloudflare")
    throw new Error("Choose ollama or cloudflare.");
  if (provider === "cloudflare" && included.some((item) => !item.remoteProcessing))
    throw new Error("The manifest does not permit remote processing for the selected evidence.");
  const result = await manufacture(manifest, args.unit, included, factoryModel(provider), skipped);
  const directory = resolve("../work/content-factory/drafts");
  await mkdir(directory, { recursive: true });
  const base = resolve(directory, result.artifact.inventory.unitCode + "-" + Date.now());
  await writeFile(base + ".json", JSON.stringify(result.artifact, null, 2), { flag: "wx" });
  await writeFile(base + ".audit.json", JSON.stringify(result.audit, null, 2), { flag: "wx" });
  console.log(
    JSON.stringify(
      {
        unit: args.unit,
        artifact: base + ".json",
        auditPassed: result.audit.passed,
        issues: result.audit.issues,
      },
      null,
      2,
    ),
  );
  if (!result.audit.passed) process.exitCode = 1;
}
generate().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
