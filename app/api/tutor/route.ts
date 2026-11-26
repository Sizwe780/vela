import { createChatModelFromConfig } from "../../../lib/ai/chat-model";
import { embeddingProviderForChat } from "../../../lib/ai/config";
import { firstAvailableProvider } from "../../../lib/ai/fallback";
import { prisma } from "../../../lib/db";
import { embedTokens } from "../../../lib/ingest/embeddings";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { readJson } from "../../../lib/ingest/http";
import { parseTutorInput } from "../../../lib/tutor/input";
import { prepareTutor } from "../../../lib/tutor/service";
import { createTutorRepository, toCitations } from "../../../lib/tutor/retrieval";
import { tutorStreamResponse } from "../../../lib/tutor/stream";
import { demoAnswer, demoRetrieved } from "../../../lib/study/demo";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { requireLearner } from "../../../lib/auth/server";
import { requireUnitAccess } from "../../../lib/enrollment/access";
import { moduleCapabilities } from "../../../lib/capabilities";
import { personalizedTutorContext } from "../../../lib/learning/view";
import { compactTutorEvidence } from "../../../lib/tutor/local-evidence";
import { guidedReply } from "../../../lib/tutor/guided";
import { scaffoldInstructions } from "../../../lib/tutor/scaffolding";
import { logServerError } from "../../../lib/log-error";
import { conceptGraph } from "../../../lib/learning/graph";
import { needsGuidedReply } from "../../../lib/tutor/pacing";
export const runtime = "nodejs";
export const maxDuration = 300;
const repository = createTutorRepository({ query: (statement) => prisma.$queryRaw(statement) });
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const input = parseTutorInput(await readJson(request));
    if (input.studyUnitId === "demo") {
      if (input.hintTier !== undefined || input.strategy === "debate")
        throw new IngestError(
          400,
          "LIVE_TUTOR_REQUIRED",
          "Open an enrolled lesson for adaptive hints or debate.",
        );
      return tutorStreamResponse({
        mode: input.mode,
        preview: true,
        text: demoAnswer(input.mode),
        citations: toCitations(demoRetrieved, "demo"),
        signal: request.signal,
      });
    }
    const guided = needsGuidedReply(input);
    const learner = await requireLearner();
    const unitId = await requireUnitAccess(learner.id, input.studyUnitId);
    const unit = await prisma.studyUnit.findUnique({
      where: { id: unitId },
      select: {
        code: true,
        module: { select: { id: true, institution: true, code: true, metadata: true } },
      },
    });
    const capabilities = unit
      ? moduleCapabilities(unit.module.institution, unit.module.code, unit.module.metadata)
      : null;
    if (input.strategy === "debate" && !capabilities?.debate)
      throw new IngestError(
        400,
        "STRATEGY_UNAVAILABLE",
        "Socratic debate is not enabled for this module.",
      );
    if (input.mode === "pck" && !capabilities?.pck)
      throw new IngestError(
        400,
        "MODE_UNAVAILABLE",
        "PCK coaching is not enabled for this module.",
      );
    if (
      guided &&
      (input.provider === "ollama" || (!input.provider && process.env.AI_PROVIDER === "ollama")) &&
      !process.env.OLLAMA_GUIDED_MODEL
    )
      throw new IngestError(
        503,
        "LOCAL_GUIDED_NOT_READY",
        "Local guided tutoring needs a validated model. Choose Cloudflare for now; no provider was switched automatically.",
      );
    const config = firstAvailableProvider(input.provider),
      scaffolding = scaffoldInstructions(input);
    const common = {
      mode: input.mode,
      strategy: input.strategy === "debate" ? ("debate" as const) : undefined,
      hintTier: input.hintTier,
      model: createChatModelFromConfig(config),
      maxOutputTokens: config.tutorMaxOutputTokens,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(config.chatTimeoutMs)]),
    };
    const retrievalProvider = embeddingProviderForChat(input.provider);
    const selected = retrievalProvider
      ? createTutorRepository(
          { query: (statement) => prisma.$queryRaw(statement) },
          retrievalProvider,
        )
      : repository;
    const prepared = await prepareTutor(
      { ...input, studyUnitId: unitId },
      selected,
      embedTokens,
      common.signal,
      capabilities ?? undefined,
    );
    if (!prepared.chunks.length && !prepared.session) {
      if (guided)
        throw new IngestError(
          409,
          "EVIDENCE_UNAVAILABLE",
          "There is not enough current study evidence for this guided request. Open a published session or clarify your question.",
        );
      return tutorStreamResponse({
        mode: input.mode,
        citations: [],
        signal: request.signal,
        text: "I couldn’t find sufficiently relevant textbook passages in this study unit using the selected provider. Try a more focused question, or select the provider used to ingest this reading. Changing embedding providers requires re-ingesting the material. I won’t invent a textbook citation or assessment criterion.",
      });
    }
    const learnerContext = unit
      ? await personalizedTutorContext(learner.id, unit.module.id, input.sessionId)
      : "";
    const system =
      prepared.system +
      learnerContext +
      `\nAvailable subject tools: ${JSON.stringify(capabilities)}. Offer only enabled tools. Keep representations relevant to this module.` +
      scaffolding;
    const response = { ...common, citations: prepared.citations };
    if (!guided) return tutorStreamResponse({ ...response, system, messages: prepared.messages });

    const sameModule = (mapping: { moduleCode: string; institution: string }) =>
      mapping.moduleCode === unit?.module.code && mapping.institution === unit.module.institution;
    const prerequisiteIds =
      input.pace === "transfer" && prepared.session?.position !== undefined
        ? new Set(
            conceptGraph.nodes
              .filter((node) =>
                node.mappings.some(
                  (mapping) =>
                    sameModule(mapping) &&
                    mapping.unitCode === unit?.code &&
                    mapping.position === prepared.session?.position,
                ),
              )
              .flatMap((node) => node.prerequisites),
          )
        : new Set<string>();
    const prerequisites = conceptGraph.nodes
      .filter((node) => prerequisiteIds.has(node.id) && node.mappings.some(sameModule))
      .map(({ id, title }) => ({ id, title }));
    let refresher: { title: string; href: string } | undefined;
    const text = await guidedReply(input, system, {
      signal: common.signal,
      localEvidence:
        compactTutorEvidence(input.query, [
          ...(prepared.session
            ? [{ title: prepared.session.title, body: prepared.session.markdown }]
            : []),
          ...prepared.chunks.map((chunk) => ({ title: chunk.title, body: chunk.body })),
        ]) + learnerContext,
      prerequisites,
      onPrerequisite: (id) => {
        const node = prerequisites.find((candidate) => candidate.id === id);
        if (unit && node)
          refresher = {
            title: node.title,
            href: `/learning-map?moduleId=${encodeURIComponent(unit.module.id)}&concept=${encodeURIComponent(id)}`,
          };
      },
    });
    return tutorStreamResponse({ ...response, text, refresher });
  } catch (error) {
    if (!(error instanceof IngestError)) logServerError("tutor", error);
    const failure = publicError(
      error instanceof IngestError
        ? error
        : new IngestError(
            503,
            "TUTOR_UNAVAILABLE",
            "The tutor is temporarily unavailable. Please try again.",
          ),
    );
    return Response.json(
      { error: failure.error },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
