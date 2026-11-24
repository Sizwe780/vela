import "dotenv/config";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { normalizeMarkerArtifacts } from "../lib/content/marker-normalize";
import { validatePage } from "../lib/content/bulk";
import { structuredDocumentSchema } from "../lib/content/structured";
async function main() {
  const root = resolve("../work/math-parser/modules/MAT1503"),
    assets = resolve("../work/math-parser/bulk/assets");
  const plan = JSON.parse(await readFile("content/mat1503/plan.json", "utf8"));
  const source = plan.sources.find((s: any) => s.id === "mat1503-textbook");
  if (
    createHash("sha256")
      .update(await readFile(resolve(source.directory, source.filename)))
      .digest("hex") !== source.sha256
  )
    throw Error("Source version changed");
  const rawPages = JSON.parse(
    await readFile(resolve(plan.inspectionFiles["mat1503-textbook"]), "utf8"),
  );
  const report: any[] = [];
  await mkdir(assets, { recursive: true });
  for (const page of [40, 43, 123, 130, 133, 149, 170, 734, 736]) {
    const folder = join(root, source.sha256.slice(0, 16), String(page));
    const raw = JSON.parse(await readFile(join(folder, "192/result.json"), "utf8"));
    if (raw.page !== page || raw.dpi !== 192) throw Error("OCR identity mismatch");
    let markdown = normalizeMarkerArtifacts(raw.markdown);
    const notes = [
      "Compared page layout and visible equations with the supplied PDF on 17 November 2026.",
      "Removed only unsupported OCR aliases for the printed end-of-example triangle; retained equation values.",
      "Display equations normalized onto separate lines, preserving equation tags.",
    ];
    if (page === 736) {
      const incorrect = String.raw`\overline{z_1\bar{z}_2}`;
      if (!markdown.includes(incorrect)) throw Error("Conjugate repair precondition changed");
      markdown = markdown.replace(incorrect, String.raw`\overline{z_1z_2}`);
      markdown +=
        "\n\nReview clarification: identities involving division require nonzero denominators.\n";
      notes.push(
        "Corrected the spurious inner conjugation in Theorem 1(c), checked against the source; division conditions made explicit.",
      );
    }
    if (page === 40) {
      markdown += String.raw`

The entry at row $i$ and column $j$ is denoted $a_{ij}$. A general $3\times4$ array has the form

$$
\begin{bmatrix}a_{11}&a_{12}&a_{13}&a_{14}\\a_{21}&a_{22}&a_{23}&a_{24}\\a_{31}&a_{32}&a_{33}&a_{34}\end{bmatrix}.
$$
`;
      notes.push("Restored the bottom-of-page entry notation and general array omitted by OCR.");
    }
    const blocks: any[] = [];
    const references = new Map<string, string>();
    for (const image of raw.images) {
      if (!/^figure-\d+\.png$/.test(image.file)) throw Error("Invalid asset path");
      const bytes = await readFile(join(folder, "192", image.file));
      const asset = createHash("sha256").update(bytes).digest("hex") + ".png";
      await copyFile(join(folder, "192", image.file), join(assets, asset));
      references.set(image.reference, asset);
    }
    markdown = markdown.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_, ref) => {
      if (!references.has(ref)) throw Error("Missing source image");
      return "";
    });
    const checked = validatePage(
      markdown,
      rawPages.find((p: any) => p.page === page)?.text ?? "",
      references.size,
    );
    blocks.push({ id: "text", type: "markdown", markdown: checked.markdown });
    for (const asset of references.values())
      blocks.push({
        id: `figure-${blocks.length}`,
        type: "figure",
        asset,
        caption: `Source illustration, PDF page ${page}`,
        sourcePage: page,
      });
    const doc = structuredDocumentSchema.parse({
      version: 1,
      parser: {
        name: "reviewed-transcription",
        version: "2026-11-17",
        review: "source-compared",
        reviewNotes: notes,
        profile: "MAT1503 held-page repair; Marker 192dpi + source comparison",
      },
      source: { document: source.id, sha256: source.sha256, pageStart: page, pageEnd: page },
      blocks,
    });
    await writeFile(join(folder, "structured.json"), JSON.stringify(doc, null, 2));
    report.push({ page, formulas: checked.formulas, figures: references.size, notes });
  }
  await writeFile("../work/mat1503/review-20261117/report.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      reviewedPages: report.length,
      formulas: report.reduce((n, p) => n + p.formulas, 0),
      figures: report.reduce((n, p) => n + p.figures, 0),
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Review failed");
  process.exitCode = 1;
});
