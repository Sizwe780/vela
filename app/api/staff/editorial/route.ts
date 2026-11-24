import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { IngestError } from "../../../../lib/ingest/errors";
import { readJson } from "../../../../lib/ingest/http";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import {
  editorDetails,
  editorialInput,
  editorImport,
  factoryDraft,
  editorialCommand,
} from "../../../../lib/content/editorial";
import { regenerateSection } from "../../../../lib/content/factory";
import { factoryModel } from "../../../../lib/content/factory-model";
import { loadModuleSpec } from "../../../../lib/specs";
import { transactionLock } from "../../../../lib/teaching/scope";
import { moduleCapabilities } from "../../../../lib/capabilities";

export const maxDuration = 180;
export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const query = new URL(request.url).searchParams;
    const qualificationId = query.get("qualificationId");
    const unitId = query.get("studyUnitId");
    if (!qualificationId || !unitId) {
      const scopes = await prisma.staffMembership.findMany({
        where: { studentId: user.id, role: { in: ["staff", "admin"] } },
        select: {
          qualificationId: true,
          qualification: {
            select: {
              institution: true,
              title: true,
              code: true,
              modules: {
                select: {
                  module: {
                    select: {
                      code: true,
                      title: true,
                      studyUnits: {
                        select: { id: true, code: true, title: true },
                        orderBy: { position: "asc" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!scopes.length)
        throw new IngestError(403, "STAFF_REQUIRED", "Editorial access has not been assigned.");
      return Response.json({ ownerId: user.id, scopes }, { headers: privateHeaders });
    }
    const result = await editorDetails(
      prisma,
      user.id,
      qualificationId,
      unitId,
      query.get("draftId") ?? undefined,
    );
    const module = await prisma.module.findUnique({
      where: {
        institution_code: {
          institution: result.unit.module.institution,
          code: result.unit.module.code,
        },
      },
      select: { metadata: true },
    });
    const capabilities = moduleCapabilities(
      result.unit.module.institution,
      result.unit.module.code,
      module?.metadata,
    );
    return Response.json(
      { ownerId: user.id, ...result, capabilities },
      { headers: privateHeaders },
    );
  } catch (error) {
    return studentFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = editorialInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_EDITORIAL_INPUT",
        "Check the artifact, review checks and selected revision.",
      );
    const input = parsed.data;
    if (input.action === "regenerate") {
      const { draft, provenance } = await factoryDraft(prisma, user.id, input);
      const { module } = await prisma.studyUnit.findUniqueOrThrow({
        where: { id: draft.studyUnitId },
        select: { module: { select: { institution: true, code: true } } },
      });
      const spec = await loadModuleSpec({
        institution: module.institution,
        moduleCode: module.code,
      });
      if (spec.hash !== provenance.specHash)
        throw new IngestError(
          409,
          "SPEC_CHANGED",
          "Rebuild the artifact against the current lesson specification.",
        );
      const provider =
        process.env.CONTENT_FACTORY_REGEN_PROVIDER === "cloudflare" ? "cloudflare" : "ollama";
      const markdown = await regenerateSection(
        {
          markdown: draft.markdown,
          section: input.section,
          guidance: input.guidance,
          effectivePrompt: spec.generationPrompt,
          facts: provenance.inventory,
        },
        factoryModel(provider, request.signal),
      );
      return Response.json({ markdown }, { headers: privateHeaders });
    }
    const result = await prisma.$transaction(
      async (db) => {
        await transactionLock(db, "vela:qualification:" + input.qualificationId);
        await transactionLock(db, "vela:unit:" + input.studyUnitId);
        return input.action === "import"
          ? editorImport(db, user.id, input)
          : editorialCommand(db, user.id, input);
      },
      { maxWait: 10000, timeout: 45000 },
    );
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}
