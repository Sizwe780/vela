import "dotenv/config";
import { dirname, resolve } from "node:path";
import { getAIConfig } from "../lib/ai/config";
import { loadFactoryManifest } from "../lib/content/factory-evidence";
import { factoryModel } from "../lib/content/factory-model";
import { options, readJSON, verifyPDFs } from "./content-factory-files";
import { runContentBatch } from "./content-factory-batch";

async function main() {
  const args = options();
  if (!args.plan) throw new Error("Provide --plan=<batch JSON>.");
  const provider = args.provider ?? "ollama";
  if (provider !== "ollama" && provider !== "cloudflare")
    throw new Error("Choose ollama or cloudflare.");
  const generate = args.generate ?? "false";
  if (generate !== "true" && generate !== "false")
    throw new Error("Use --generate=true to request AI-generated drafts.");
  const plan = resolve(args.plan);
  const mode =
    generate === "true"
      ? {
          provider,
          model: process.env.CONTENT_FACTORY_MODEL || getAIConfig(provider).chatModel,
          generate: factoryModel(provider),
        }
      : undefined;
  const report = await runContentBatch(
    await readJSON(plan),
    {
      root: dirname(plan),
      drafts: resolve("../work/content-factory/batch-drafts"),
      workers: Number(args.workers ?? 1),
      provider,
      mode,
    },
    {
      loadManifest: loadFactoryManifest,
      verifySources: (manifest, root) => verifyPDFs(manifest, root, false),
      report: (item) => console.log(JSON.stringify(item)),
    },
  );
  const failures = report.filter(
    ({ status }) =>
      status === "blocked" || status === "audit-failed" || status === "generation-failed",
  ).length;
  console.log(
    JSON.stringify({ units: report.length, blockedOrFailed: failures, generationEnabled: !!mode }),
  );
  if (failures) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Content batch failed.");
  process.exitCode = 1;
});
