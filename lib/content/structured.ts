import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const structuredDocumentSchema = z.object({
  version: z.literal(1),
  parser: z.object({ name: z.enum(["marker", "reviewed-transcription"]), version: z.string().min(1).max(100), review: z.enum(["machine", "source-compared"]), reviewNotes: z.array(z.string().min(1).max(1000)).max(20).optional(), profile: z.string().max(200).optional() }).strict(),
  source: z.object({ document: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), pageStart: z.number().int().positive(), pageEnd: z.number().int().positive() }).strict(),
  blocks: z.array(z.discriminatedUnion("type", [
    z.object({ id, type: z.literal("markdown"), markdown: z.string().min(1).max(200_000) }).strict(),
    z.object({ id, type: z.literal("figure"), asset: z.string().regex(/^[a-f0-9]{64}\.png$/), vectorAsset: z.string().regex(/^[a-f0-9]{64}\.pdf$/).optional(), caption: z.string().min(1).max(1000), sourcePage: z.number().int().positive() }).strict(),
    z.object({ id, type: z.literal("interactive"), kind: z.enum(["tangent", "limit", "integral"]), title: z.string().min(1).max(200), caption: z.string().min(1).max(1000), initialX: z.number().min(0).max(5).default(2), sourcePage: z.number().int().positive() }).strict(),
  ])).min(1).max(300),
}).strict().superRefine((value, context) => {
  if (value.source.pageEnd < value.source.pageStart) context.addIssue({ code: "custom", message: "Invalid source page range" });
  if (new Set(value.blocks.map(block => block.id)).size !== value.blocks.length) context.addIssue({ code: "custom", message: "Block IDs must be unique" });
  if (!value.blocks.some(block => block.type === "markdown" || block.type === "figure")) context.addIssue({ code: "custom", message: "A document needs study text or a source figure" });
  for (const block of value.blocks) if (block.type !== "markdown" && (block.sourcePage < value.source.pageStart || block.sourcePage > value.source.pageEnd)) context.addIssue({ code: "custom", message: "Diagram page must belong to source range" });
});
export type StructuredDocument = z.infer<typeof structuredDocumentSchema>;
export type VisualBlock = Extract<StructuredDocument["blocks"][number], { type: "interactive" }>;
export function structuredText(document: StructuredDocument): string {
  return document.blocks.map(block => block.type === "markdown" ? block.markdown : block.type === "figure" ? `Source figure: ${block.caption}` : `Interactive teaching adaptation: ${block.title}. ${block.caption}`).join("\n\n");
}
export function documentSourceUrl(document: StructuredDocument, page = document.source.pageStart): string {
  return `/api/sources/${document.source.document}?sha=${document.source.sha256}#page=${page}`;
}
