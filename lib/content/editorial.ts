import { z } from "zod";
import { Prisma } from "../../generated/app-client";
import { IngestError } from "../ingest/errors";
import { loadModuleSpec } from "../specs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { registeredSource } from "../study/source-catalog";
import {
  conflict,
  forbidden,
  missing,
  recordAudit,
  teachingRole,
  type Tx,
} from "../teaching/scope";
import { artifactSchema, inventorySchema, type FactoryArtifact } from "./factory";
import { editableSections } from "./factory-sections";
import {
  acceptsEvidence,
  checkedUnit,
  evidenceRefSchema,
  exclusionSchema,
  validateEvidenceCoverage,
  hashSchema,
  hashValue,
  loadFactoryManifest,
  makeEvidence,
  type EvidenceRef,
} from "./factory-evidence";
import { runFactoryAudit } from "./factory-quality";
import { renderSession, validateSessionMarkdown } from "./session-schema";
import { documentSourceUrl, structuredDocumentSchema, structuredText } from "./structured";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const revision = { draftId: id, expectedUpdatedAt: z.string().datetime() };
const scoped = { qualificationId: id, studyUnitId: id };
export const editorialInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("import"), ...scoped, artifact: artifactSchema }).strict(),
  z
    .object({
      action: z.literal("edit"),
      ...scoped,
      ...revision,
      title: z.string().trim().min(1).max(160),
      markdown: z.string().trim().min(40).max(24000),
    })
    .strict(),
  z.object({ action: z.literal("stage"), ...scoped, ...revision }).strict(),
  z
    .object({
      action: z.literal("return"),
      ...scoped,
      ...revision,
      note: z.string().trim().min(25).max(2000),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      ...scoped,
      ...revision,
      sourceCompared: z.literal(true),
      verifiedExamples: z.literal(true),
      note: z.string().trim().min(25).max(2000),
    })
    .strict(),
  z
    .object({
      action: z.literal("regenerate"),
      ...scoped,
      ...revision,
      section: z.enum(editableSections),
      guidance: z.string().trim().min(5).max(500),
    })
    .strict(),
]);
export type EditorialCommand = z.infer<typeof editorialInput>;

export const provenanceSchema = z
  .object({
    manifestHash: hashSchema,
    specHash: hashSchema,
    artifactHash: hashSchema,
    evidence: z.array(evidenceRefSchema).min(1).max(600),
    exclusions: z.array(exclusionSchema).max(600),
    inventory: inventorySchema,
  })
  .strict();

export async function editorScope(
  db: Tx,
  actorId: string,
  qualificationId: string,
  unitId: string,
) {
  const role = await teachingRole(db, actorId, qualificationId);
  const unit = await db.studyUnit.findFirst({
    where: { id: unitId, module: { qualifications: { some: { qualificationId } } } },
    select: {
      id: true,
      code: true,
      title: true,
      module: { select: { code: true, institution: true } },
    },
  });
  if (!unit) return missing("Study unit not found in this qualification.");
  return { role, unit };
}

async function lockedSources(db: Tx, unitId: string, refs: EvidenceRef[]) {
  const sources = await db.ingestion.findMany({
    where: {
      learningOutcome: { studyUnitId: unitId },
      OR: refs.map((ref) => ({
        AND: [
          { structuredContent: { path: ["source", "document"], equals: ref.sourceId } },
          { structuredContent: { path: ["source", "sha256"], equals: ref.sha256 } },
          { structuredContent: { path: ["source", "pageStart"], equals: ref.first } },
          { structuredContent: { path: ["source", "pageEnd"], equals: ref.last } },
        ],
      })),
    },
    select: { structuredContent: true },
    orderBy: { id: "asc" },
  });
  const requested = new Set(refs.map((ref) => hashValue(ref)));
  const matched = new Map<
    string,
    { ref: EvidenceRef; document: z.infer<typeof structuredDocumentSchema> }
  >();
  for (const row of sources) {
    const result = structuredDocumentSchema.safeParse(row.structuredContent);
    if (
      !result.success ||
      result.data.parser.review !== "source-compared" ||
      result.data.parser.profile === "verified-blank-page"
    )
      continue;
    const ref = makeEvidence(result.data);
    if (requested.has(hashValue(ref)))
      matched.set(ref.evidenceHash, { ref, document: result.data });
  }
  return refs.flatMap((ref) => {
    const match = matched.get(ref.evidenceHash);
    return match ? [match] : [];
  });
}

async function checkedContext(
  db: Tx,
  actorId: string,
  scope: { qualificationId: string; studyUnitId: string },
  provenance: z.infer<typeof provenanceSchema>,
) {
  const { unit, role } = await editorScope(db, actorId, scope.qualificationId, scope.studyUnitId);
  const manifest = await loadFactoryManifest(unit.module.code);
  const spec = await loadModuleSpec({
    institution: unit.module.institution,
    moduleCode: unit.module.code,
  });
  const unitMap = checkedUnit(manifest, unit.code);
  if (
    manifest.institution !== unit.module.institution ||
    provenance.inventory.unitCode !== unit.code ||
    hashValue(manifest) !== provenance.manifestHash ||
    spec.hash !== provenance.specHash ||
    provenance.evidence.some((ref) => !acceptsEvidence(manifest, unit.code, ref))
  )
    return conflict(
      "The source map, reviewed evidence or specifications changed. Regenerate from the current inputs.",
    );
  validateEvidenceCoverage(manifest, unit.code, [...provenance.evidence, ...provenance.exclusions]);
  const sources = await lockedSources(db, unit.id, provenance.evidence);
  if (sources.length !== provenance.evidence.length)
    return conflict(
      "Import the exact source-compared evidence records for this unit before using this draft.",
    );
  return { unit, role, unitMap, manifest, spec, sources };
}

export async function editorImport(
  db: Tx,
  actor: string,
  input: Extract<EditorialCommand, { action: "import" }>,
) {
  const artifact: FactoryArtifact = input.artifact;
  const provenance = provenanceSchema.parse({
    manifestHash: artifact.manifestHash,
    specHash: artifact.specHash,
    artifactHash: hashValue(artifact),
    evidence: artifact.evidence,
    exclusions: artifact.exclusions,
    inventory: artifact.inventory,
  });
  const context = await checkedContext(db, actor, input, provenance);
  if (
    artifact.moduleCode !== context.unit.module.code ||
    artifact.institution !== context.unit.module.institution ||
    artifact.sessions.length !== context.unitMap.sessions.length
  )
    return conflict("The artifact belongs to a different module or session plan.");
  const exists = await db.lessonDraft.count({
    where: {
      qualificationId: input.qualificationId,
      studyUnitId: input.studyUnitId,
      factoryProvenance: { path: ["artifactHash"], equals: provenance.artifactHash },
    },
  });
  if (exists) return conflict("This artifact is already in the review queue.");
  const sessions = artifact.sessions.map((session) => ({
    title: session.title,
    markdown: renderSession(session),
  }));
  const audit = runFactoryAudit(
    context.spec,
    { code: context.unit.code, sessions },
    context.sources.map((item) => structuredText(item.document)),
  );
  if (!audit.passed)
    throw new IngestError(
      422,
      "FACTORY_QA_FAILED",
      audit.issues.find((item) => item.severity === "error")!.message,
    );
  const existing = await db.studySession.findMany({
    where: { studyUnitId: input.studyUnitId },
    select: { id: true, title: true, version: true },
  });
  const ids: string[] = [];
  for (const session of sessions) {
    const predecessor = existing.filter((item) => item.title === session.title);
    if (predecessor.length > 1)
      return conflict(
        "More than one existing session has this title. Resolve the session mapping first.",
      );
    const { id } = await db.lessonDraft.create({
      data: {
        qualificationId: input.qualificationId,
        studyUnitId: input.studyUnitId,
        authorId: actor,
        status: "draft",
        factoryProvenance: provenance,
        sessionId: predecessor[0]?.id,
        baseVersion: predecessor[0]?.version,
        ...session,
      },
      select: { id: true },
    });
    ids.push(id);
    await recordAudit(db, input.qualificationId, actor, "importFactoryDraft", id);
  }
  return { ids };
}

export async function factoryDraft(
  db: Tx,
  actor: string,
  input: Exclude<EditorialCommand, { action: "import" }>,
) {
  const { role } = await editorScope(db, actor, input.qualificationId, input.studyUnitId);
  const draft = await db.lessonDraft.findFirst({
    where: {
      id: input.draftId,
      qualificationId: input.qualificationId,
      studyUnitId: input.studyUnitId,
      factoryProvenance: { not: Prisma.DbNull },
    },
  });
  if (!draft) return missing("Editorial draft not found.");
  if (draft.updatedAt.toISOString() !== input.expectedUpdatedAt)
    return conflict("The draft changed. Reload it before continuing.");
  if (input.action === "approve" || input.action === "return") {
    if (role !== "admin" || draft.authorId === actor)
      forbidden("Review requires a different qualification administrator.");
    if (draft.status !== "submitted")
      return conflict("Only a staged draft can receive a review decision.");
  } else if (
    draft.authorId !== actor ||
    (draft.status !== "draft" && draft.status !== "rejected")
  ) {
    return forbidden("Only the author can edit, regenerate or stage an open draft.");
  }
  return { draft, provenance: provenanceSchema.parse(draft.factoryProvenance) };
}

export async function editorialCommand(
  db: Tx,
  actor: string,
  input: Exclude<EditorialCommand, { action: "import" | "regenerate" }>,
) {
  const { draft, provenance } = await factoryDraft(db, actor, input);
  const data: Prisma.LessonDraftUpdateManyMutationInput = {};
  if (input.action === "edit") {
    try {
      validateSessionMarkdown(input.markdown);
    } catch (error) {
      throw new IngestError(422, "INVALID_SESSION", (error as Error).message);
    }
    Object.assign(data, {
      title: input.title,
      markdown: input.markdown,
      status: "draft",
      factoryApproval: Prisma.DbNull,
    });
  } else if (input.action === "return") {
    Object.assign(data, {
      status: "rejected",
      reviewerId: actor,
      reviewNote: input.note,
      factoryApproval: Prisma.DbNull,
    });
  } else {
    const context = await checkedContext(db, actor, input, provenance);
    if (input.action === "approve" && context.manifest.scope !== "verified")
      return conflict(
        "Approval requires verified current curriculum scope. Provisional drafts can be staged for feedback.",
      );
    const spec = {
      ...context.spec,
      requirements: {
        ...context.spec.requirements,
        minSessions: 1,
        unitPatterns: ["Recognition", "Procedure", "Error correction", "Transfer"],
      },
    };
    const audit = runFactoryAudit(
      spec,
      { code: context.unit.code, sessions: [draft] },
      context.sources.map((item) => structuredText(item.document)),
    );
    if (!audit.passed)
      throw new IngestError(
        422,
        "FACTORY_QA_FAILED",
        audit.issues.find((item) => item.severity === "error")!.message,
      );
    if (input.action === "stage") data.status = "submitted";
    else {
      data.status = "approved";
      data.reviewerId = actor;
      data.reviewNote = input.note;
      data.factoryApproval = {
        reviewerId: actor,
        signedAt: new Date().toISOString(),
        sourceComparisonVerified: true,
        examplesVerified: true,
        contentHash: hashValue([draft.title, draft.markdown]),
        manifestHash: provenance.manifestHash,
        evidenceHashes: provenance.evidence.map((ref) => ref.evidenceHash),
      };
    }
  }
  const updated = await db.lessonDraft.updateMany({
    where: { id: draft.id, updatedAt: draft.updatedAt },
    data,
  });
  if (!updated.count) return conflict("The draft changed during this request.");
  await recordAudit(db, input.qualificationId, actor, input.action + "FactoryDraft", draft.id);
  return { id: draft.id };
}

export function privateSourcePath(sha256: string) {
  return resolve(
    process.env.CONTENT_FACTORY_EVIDENCE_DIR || "../work/content-factory/evidence",
    hashSchema.parse(sha256) + ".pdf",
  );
}

export async function editorDetails(
  db: Tx,
  actor: string,
  qualificationId: string,
  unitId: string,
  draftId?: string,
) {
  const { role, unit } = await editorScope(db, actor, qualificationId, unitId);
  const drafts = await db.lessonDraft.findMany({
    where: { qualificationId, studyUnitId: unitId, factoryProvenance: { not: Prisma.DbNull } },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      updatedAt: true,
      reviewNote: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  if (!draftId) return { role, unit, drafts, draft: null, sources: [] };
  const draft = await db.lessonDraft.findFirst({
    where: {
      id: draftId,
      qualificationId,
      studyUnitId: unitId,
      factoryProvenance: { not: Prisma.DbNull },
    },
    select: {
      id: true,
      title: true,
      markdown: true,
      authorId: true,
      status: true,
      updatedAt: true,
      reviewNote: true,
      factoryProvenance: true,
    },
  });
  if (!draft) return missing("Editorial draft not found.");
  const { evidence, exclusions } = provenanceSchema.parse(draft.factoryProvenance);
  const matched = await lockedSources(db, unitId, evidence);
  const sources = await Promise.all(
    matched.map(async ({ ref, document }) => {
      const query = new URLSearchParams({ qualificationId, studyUnitId: unitId, draftId });
      let url: string | null;
      try {
        await access(privateSourcePath(ref.sha256));
        url =
          "/api/staff/editorial/source/" + ref.evidenceHash + "?" + query + "#page=" + ref.first;
      } catch {
        const entry = await registeredSource(ref.sourceId);
        url =
          entry?.sha256 === ref.sha256 &&
          entry.institution === unit.module.institution &&
          entry.moduleCode === unit.module.code
            ? documentSourceUrl(document)
            : null;
      }
      return { ...ref, url, reading: structuredText(document) };
    }),
  );
  const { factoryProvenance: _private, ...visible } = draft;
  if (sources.length !== evidence.length)
    return {
      role,
      unit,
      drafts,
      draft: visible,
      sources,
      exclusions,
      missingEvidence: evidence.length - sources.length,
    };
  return { role, unit, drafts, draft: visible, sources, exclusions, missingEvidence: 0 };
}
