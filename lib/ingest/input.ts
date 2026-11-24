import { z } from "zod";
import { structuredDocumentSchema, structuredText } from "../content/structured";
import { normalizeMath, mathSpans } from "../content/math";
import { IngestError } from "./errors";

export const MAX_TEXT_BYTES = 1_000_000;
export const MAX_REQUEST_BYTES = 2_000_000;

const inputSchema = z
  .object({
    moduleCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}[0-9]{4}$/),
    studyUnitId: z.string().trim().min(1).max(100),
    learningOutcomeId: z.string().trim().min(1).max(100),
    assessmentCriterionId: z.string().trim().min(1).max(100),
    sourceName: z.string().trim().min(1).max(255).optional(),
    text: z.string().min(1).max(MAX_TEXT_BYTES).optional(),
    structuredContent: structuredDocumentSchema.optional(),
    // Legacy plain extraction remains readable; new PDF jobs use structuredContent.
    // Accept pdf-parse's { text, ...metadata } output; ignore extra PDF metadata.
    parsedPdf: z
      .object({ text: z.string().min(1).max(MAX_TEXT_BYTES) })
      .strip()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.text, value.parsedPdf, value.structuredContent].filter((value) => value !== undefined)
        .length === 1,
    {
      message: "Provide exactly one of text, parsedPdf.text or structuredContent.",
    },
  );

export type IngestInput = z.infer<typeof inputSchema>;
export type ParsedInput = IngestInput & { sourceText: string; sourceKind: "TEXT" | "PARSED_PDF" };

export function parseInput(input: unknown): ParsedInput {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    throw new IngestError(
      400,
      "INVALID_INPUT",
      "Provide moduleCode, studyUnitId, learningOutcomeId, assessmentCriterionId, and exactly one of text, parsedPdf.text or structuredContent.",
    );
  // Keep the original extracted text (including whitespace) for source offsets.
  if (parsed.data.structuredContent) {
    try {
      for (const block of parsed.data.structuredContent.blocks)
        if (block.type === "markdown") {
          block.markdown = normalizeMath(block.markdown);
          mathSpans(block.markdown);
        }
    } catch {
      throw new IngestError(
        422,
        "INVALID_MATH",
        "Structured Markdown contains malformed, unsupported or unclosed LaTeX.",
      );
    }
  }
  const sourceText = parsed.data.structuredContent
    ? structuredText(parsed.data.structuredContent)
    : (parsed.data.text ?? parsed.data.parsedPdf!.text);
  if (parsed.data.structuredContent) {
    try {
      mathSpans(sourceText);
    } catch {
      throw new IngestError(
        422,
        "INVALID_MATH",
        "Structured document text contains invalid math delimiters or LaTeX.",
      );
    }
  }
  if (
    !sourceText.trim() ||
    sourceText.includes("\u0000") ||
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(sourceText)
  ) {
    throw new IngestError(
      400,
      "INVALID_TEXT",
      "Text must be nonblank, valid Unicode without NUL characters.",
    );
  }
  if (Buffer.byteLength(sourceText, "utf8") > MAX_TEXT_BYTES)
    throw new IngestError(413, "TEXT_TOO_LARGE", "Study text exceeds 1 MB.");
  return {
    ...parsed.data,
    sourceText,
    sourceKind: parsed.data.parsedPdf || parsed.data.structuredContent ? "PARSED_PDF" : "TEXT",
  };
}
