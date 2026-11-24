import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "../../generated/app-client";
import type { Database } from "../ingest/repository";
import { createIngestionRepository } from "../ingest/repository";
import { ingest } from "../ingest/service";
import { embedTokens, type Embedder } from "../ingest/embeddings";
import { normalizeMath } from "../content/math";
import { validateSessionMarkdown } from "../content/session-schema";
import { auditUnit, loadModuleSpec } from "../specs";
import { visualPresetIds } from "../content/visual-presets";
import { IngestError } from "../ingest/errors";
import type { TeachingAction } from "./input";
import {
  conflict,
  forbidden,
  missing,
  moduleLink,
  recordAudit,
  teachingRole,
  transactionLock,
  type Tx,
} from "./scope";

export async function saveLesson(tx: Tx, actor: string, input: TeachingAction<"saveLesson">) {
  const unit = await tx.studyUnit.findUnique({
    where: { id: input.studyUnitId },
    select: { moduleId: true },
  });
  if (!unit) return missing("Study unit not found.");
  await moduleLink(tx, input.qualificationId, unit.moduleId);
  if (input.draftId) {
    const updated = await tx.lessonDraft.updateMany({
      where: {
        id: input.draftId,
        studyUnitId: input.studyUnitId,
        qualificationId: input.qualificationId,
        authorId: actor,
        status: { in: ["draft", "rejected"] },
        updatedAt: input.expectedUpdatedAt ?? new Date(0),
      },
      data: { title: input.title, markdown: input.markdown, status: "draft" },
    });
    if (!updated.count)
      return conflict("The draft changed or cannot be edited. Reload the workspace.");
    await recordAudit(tx, input.qualificationId, actor, input.action, input.draftId);
    return { id: input.draftId };
  }
  const session = input.sessionId
    ? await tx.studySession.findFirst({
        where: { id: input.sessionId, studyUnitId: input.studyUnitId },
        select: { id: true, version: true },
      })
    : undefined;
  if (input.sessionId && !session) return missing("Session not found in the selected study unit.");
  if (session && input.baseVersion !== session.version)
    return conflict("The published lesson has changed. Load it again before starting a draft.");
  const draft = await tx.lessonDraft.create({
    data: {
      qualificationId: input.qualificationId,
      studyUnitId: input.studyUnitId,
      sessionId: session?.id,
      baseVersion: session?.version,
      title: input.title,
      markdown: input.markdown,
      authorId: actor,
    },
    select: { id: true },
  });
  await recordAudit(tx, input.qualificationId, actor, input.action, draft.id);
  return draft;
}

export async function submitLesson(tx: Tx, actor: string, input: TeachingAction<"submitLesson">) {
  const draft = await tx.lessonDraft.findFirst({
    where: {
      id: input.draftId,
      qualificationId: input.qualificationId,
      authorId: actor,
      status: "draft",
      updatedAt: input.expectedUpdatedAt,
    },
  });
  if (!draft) return conflict("Save your latest draft before submitting it.");
  try {
    validateSessionMarkdown(normalizeMath(draft.markdown));
  } catch {
    throw new IngestError(
      422,
      "LESSON_DRAFT_INVALID",
      "Fix broken math or exercise blocks before submitting.",
    );
  }
  const result = await tx.lessonDraft.updateMany({
    where: { id: draft.id, status: "draft", updatedAt: input.expectedUpdatedAt },
    data: { status: "submitted" },
  });
  if (!result.count) return conflict("This draft has changed. Reload before submitting.");
  await recordAudit(tx, input.qualificationId, actor, input.action, draft.id);
}

export async function reviewLesson(
  tx: Tx,
  actor: string,
  input: TeachingAction<"reviewLesson">,
  embed: Embedder = embedTokens,
) {
  const initial = await tx.lessonDraft.findFirst({
    where: { id: input.draftId, qualificationId: input.qualificationId },
    select: { studyUnitId: true },
  });
  if (!initial) return missing("Draft not found.");
  await transactionLock(tx, `vela:unit:${initial.studyUnitId}`);
  const draft = await tx.lessonDraft.findFirst({
    where: { id: input.draftId, qualificationId: input.qualificationId, status: "submitted" },
    include: {
      studyUnit: {
        include: {
          module: { include: { qualifications: true } },
          sessions: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  if (!draft) return conflict("This draft no longer awaits review.");
  if (draft.authorId === actor) forbidden("A second reviewer must review this lesson.");
  const review = { reviewerId: actor, reviewNote: input.note };
  if (input.decision === "reject") {
    await tx.lessonDraft.update({
      where: { id: draft.id },
      data: { ...review, status: "rejected" },
    });
    await recordAudit(tx, input.qualificationId, actor, "rejectLesson", draft.id);
    return;
  }
  if (draft.factoryProvenance)
    return conflict(
      "Factory drafts use the dedicated editorial approval and module release workflow.",
    );
  const unit = draft.studyUnit;
  await moduleLink(tx, input.qualificationId, unit.moduleId);
  // Publishing changes the shared learner copy. Every linked qualification must be in scope.
  for (const link of unit.module.qualifications)
    await teachingRole(tx, actor, link.qualificationId, true);
  const previous = unit.sessions.find((session) => session.id === draft.sessionId);
  if (draft.sessionId && (!previous || previous.version !== draft.baseVersion))
    return conflict(
      "The published session changed after this draft was opened. Start from the latest version.",
    );
  const position = previous?.position ?? (unit.sessions.at(-1)?.position ?? 0) + 1;
  const sessionId = previous?.id ?? randomUUID();
  const markdown = normalizeMath(draft.markdown);
  let spec;
  try {
    spec = await loadModuleSpec({
      institution: unit.module.institution,
      moduleCode: unit.module.code,
    });
  } catch {
    throw new IngestError(
      422,
      "SPEC_NOT_READY",
      "The module requires a registered publication specification.",
    );
  }
  const revised = { title: draft.title, markdown, visual: previous?.visual ?? null };
  const remaining = previous
    ? unit.sessions.map((session) => (session.id === previous.id ? revised : session))
    : [...unit.sessions, revised];
  const sources = await tx.ingestion.findMany({
    where: {
      learningOutcome: { studyUnitId: unit.id },
      OR: [{ sourceName: null }, { NOT: { sourceName: { startsWith: "Vela original / " } } }],
    },
    select: { sourceText: true },
    orderBy: { createdAt: "asc" },
  });
  const result = auditUnit(
    spec,
    { code: unit.code, sessions: remaining },
    {
      allowedVisuals: visualPresetIds,
      sourceProse: sources.map((source) => source.sourceText),
    },
  );
  const problem = result.issues.find((issue) => issue.severity === "error");
  if (problem) throw new IngestError(422, "LESSON_AUDIT_FAILED", problem.message);
  const outcome = await tx.learningOutcome.findFirst({
    where: {
      studyUnitId: unit.id,
      assessmentCriteria: { some: { qualificationId: input.qualificationId } },
    },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: {
      assessmentCriteria: {
        where: { qualificationId: input.qualificationId },
        orderBy: { code: "asc" },
        take: 1,
      },
    },
  });
  if (!outcome?.assessmentCriteria[0])
    return conflict("Map a learning outcome and criterion before publishing this lesson.");

  // Reuse the existing repository within this transaction. Live reading and its index
  // change together, and an embedding failure leaves the previous version available.
  const db: Database = {
    query: <T>(query: Parameters<Database["query"]>[0]) => tx.$queryRaw<T[]>(query),
    transaction: (callback) => callback(db),
  };
  const prefix = `Vela original / ${unit.code} / S${position}:`;
  const receipt = await ingest(
    {
      moduleCode: unit.module.code,
      studyUnitId: unit.id,
      learningOutcomeId: outcome.id,
      assessmentCriterionId: outcome.assessmentCriteria[0].id,
      sourceName: `${prefix} ${draft.title}`.slice(0, 255),
      text: markdown,
    },
    createIngestionRepository(db, unit.module.institution),
    embed,
  );
  await tx.contentChunk.updateMany({
    where: { ingestionId: receipt.ingestionId },
    data: { resourceUrl: `/study/${unit.id}/sessions/${sessionId}` },
  });
  await tx.ingestion.deleteMany({
    where: {
      id: { not: receipt.ingestionId },
      learningOutcome: { studyUnitId: unit.id },
      sourceName: { startsWith: prefix },
    },
  });

  const version = (previous?.version ?? 0) + 1;
  const concepts = {
    ...(previous?.concepts &&
    typeof previous.concepts === "object" &&
    !Array.isArray(previous.concepts)
      ? previous.concepts
      : {}),
    authorship: "vela-original",
    contentHash: createHash("sha256").update(markdown).digest("hex"),
    specHash: spec.hash,
    reviewStatus: "staff-reviewed",
  };
  await tx.studySession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, studyUnitId: unit.id, position, version, concepts, ...revised },
    update: { version, concepts, ...revised },
  });
  await tx.lessonDraft.update({
    where: { id: draft.id },
    data: {
      ...review,
      status: "published",
      sessionId,
      publishVersion: version,
      previous: previous
        ? {
            title: previous.title,
            markdown: previous.markdown,
            version: previous.version,
            visual: previous.visual,
          }
        : Prisma.DbNull,
    },
  });
  await recordAudit(tx, input.qualificationId, actor, "publishLesson", draft.id);
  return { sessionId, version };
}

export async function reviewSource(tx: Tx, actor: string, input: TeachingAction<"reviewSource">) {
  const source = await tx.ingestion.findFirst({
    where: {
      id: input.ingestionId,
      structuredContent: { not: Prisma.DbNull },
      learningOutcome: {
        studyUnit: {
          module: { qualifications: { some: { qualificationId: input.qualificationId } } },
        },
      },
    },
    select: { learningOutcome: { select: { studyUnitId: true } } },
  });
  if (!source) return missing("Structured source not found in this qualification.");
  const change = { status: input.status, reviewerId: actor, note: input.note };
  await tx.sourceReview.upsert({
    where: {
      qualificationId_ingestionId: {
        qualificationId: input.qualificationId,
        ingestionId: input.ingestionId,
      },
    },
    create: {
      studyUnitId: source.learningOutcome.studyUnitId,
      qualificationId: input.qualificationId,
      ingestionId: input.ingestionId,
      ...change,
    },
    update: change,
  });
  await recordAudit(tx, input.qualificationId, actor, input.action, input.ingestionId);
}
