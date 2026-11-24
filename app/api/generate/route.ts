import { z } from "zod";
import { generateText } from "ai";
import { authorizeIngestion } from "../../../lib/ingest/auth";
import { readJson } from "../../../lib/ingest/http";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { Prisma } from "../../../generated/app-client";
import { prisma } from "../../../lib/db";
import { createChatModel } from "../../../lib/ai/chat-model";
import { assertCurriculumScope } from "../../../lib/content/curriculum-scope";
import { loadModuleSpec, auditUnit } from "../../../lib/specs";
import { visualPresets, visualPresetIds } from "../../../lib/content/visual-presets";
import { synthesizeUnit, lessonDraftSchema } from "../../../lib/generation/draft";
export const runtime = "nodejs";
export const maxDuration = 300;
const inputSchema = z
  .object({
    institution: z.string().min(1).max(100),
    moduleCode: z.string().min(1).max(40),
    studyUnitId: z.string().max(100).optional(),
    action: z.enum(["spec", "audit", "generate"]),
    draft: lessonDraftSchema.optional(),
    provider: z.enum(["cloudflare", "ollama", "openai", "groq", "gemini", "openrouter"]).optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    authorizeIngestion(request.headers.get("authorization"));
    const input = inputSchema.parse(await readJson(request));
    const spec = await loadModuleSpec({
      institution: input.institution,
      moduleCode: input.moduleCode,
    });
    if (input.action === "spec")
      return Response.json({ spec }, { headers: { "Cache-Control": "no-store" } });
    const unit = await prisma.studyUnit.findFirst({
      where: {
        id: input.studyUnitId ?? "",
        module: { institution: input.institution, code: input.moduleCode },
      },
      select: { id: true, code: true, position: true },
    });
    if (!unit)
      throw new IngestError(
        404,
        "UNIT_NOT_FOUND",
        "Select a registered study unit in this institution and module.",
      );
    assertCurriculumScope(input.institution, input.moduleCode, unit.code, unit.position);
    const sources = await prisma.contentChunk.findMany({
      where: {
        learningOutcome: { studyUnitId: unit.id },
        NOT: {
          ingestion: {
            is: {
              structuredContent: { path: ["parser", "profile"], equals: "verified-blank-page" },
            },
          },
        },
        body: { not: null },
        ingestion: {
          OR: [
            { structuredContent: { not: Prisma.DbNull } },
            { sourceName: { startsWith: "Vela original / " } },
          ],
        },
      },
      select: { id: true, body: true },
      orderBy: { position: "asc" },
      take: 60,
    });
    const unique = [
      ...new Map(
        sources.filter((s) => s.body).map((s) => [s.body!, { id: s.id, body: s.body! }]),
      ).values(),
    ].slice(0, 12);
    let draft = input.draft;
    let facts: unknown;
    if (input.action === "generate") {
      if (!unique.length)
        throw new IngestError(422, "NO_EVIDENCE", "Ingest source evidence before generation.");
      const generationSignal = AbortSignal.any([request.signal, AbortSignal.timeout(240000)]);
      const generated = await synthesizeUnit(
        {
          code: unit.code,
          specPrompt: spec.generationPrompt,
          sources: unique,
          visuals: spec.domains.includes("mathematics") ? visualPresets : [],
        },
        async (system, prompt, maxOutputTokens) =>
          (
            await generateText({
              model: createChatModel(input.provider),
              system,
              prompt,
              maxOutputTokens,
              maxRetries: 0,
              abortSignal: generationSignal,
            })
          ).text,
      );
      draft = generated.draft;
      facts = generated.facts;
    }
    if (!draft || draft.code !== unit.code)
      throw new IngestError(422, "INVALID_DRAFT", "Supply a draft for the selected unit.");
    const audit = auditUnit(spec, draft, {
      sourceProse: unique.map((s) => s.body),
      allowedVisuals: visualPresetIds,
    });
    return Response.json(
      {
        draft,
        facts,
        audit,
        specHash: spec.hash,
        status: "draft",
        publication:
          "Not published. Full source-corpus QA and editorial review are required before the seed/publish pipeline.",
        evidenceScope: { sampledSourceChunks: unique.length, exhaustive: false },
      },
      { status: audit.passed ? 200 : 422, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const failure = publicError(
      error instanceof IngestError
        ? error
        : new IngestError(
            error instanceof z.ZodError ? 422 : 503,
            "GENERATION_FAILED",
            "Specification, evidence or draft validation failed; inspect the authoring audit and retry.",
          ),
    );
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
