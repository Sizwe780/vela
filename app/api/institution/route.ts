import { revalidateTag } from "next/cache";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { IngestError } from "../../../lib/ingest/errors";
import { readJson } from "../../../lib/ingest/http";
import { institutionScopes, requireInstitution } from "../../../lib/institution/access";
import { institutionInput } from "../../../lib/institution/input";
import { institutionCommand, institutionWorkspace } from "../../../lib/institution/workspace";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";

export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const query = new URL(request.url).searchParams;
    const institution = query.get("institution");
    const scopes = await institutionScopes(prisma, user);
    if (!scopes.length)
      throw new IngestError(
        403,
        "INSTITUTION_SCOPE_REQUIRED",
        "Institution access has not been assigned.",
      );
    if (!institution)
      return Response.json({ ownerId: user.id, scopes }, { headers: privateHeaders });
    if (query.get("export") === "report") {
      await requireInstitution(prisma, user, institution, "reports");
      const { reports } = await institutionWorkspace(prisma, user, institution, "");
      const rows = [
        [
          "Qualification",
          "Title",
          "Modules",
          "Active enrolments",
          "Completed enrolments",
          "Withdrawn enrolments",
        ],
        ...reports.map((r) => [
          r.qualification,
          r.title,
          r.modules,
          r.active,
          r.completed,
          r.withdrawn,
        ]),
      ];
      const csv = rows
        .map((row) =>
          row
            .map((value) => {
              const text = String(value);
              return (
                '"' +
                (/^\s*[=+@-]|^[\t\r\n]/.test(text) ? "'" : "") +
                text.replaceAll('"', '""') +
                '"'
              );
            })
            .join(","),
        )
        .join("\r\n");
      return new Response(csv, {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="vela-institution.csv"',
        },
      });
    }
    const workspace = await institutionWorkspace(
      prisma,
      user,
      institution,
      (query.get("q") ?? "").trim().slice(0, 80).toLowerCase(),
    );
    return Response.json({ ownerId: user.id, scopes, workspace }, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = institutionInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(400, "INVALID_INSTITUTION_COMMAND", "Check the required fields.");
    const result = await prisma.$transaction((tx) => institutionCommand(tx, user, parsed.data), {
      maxWait: 10000,
      timeout: 25000,
    });
    if (
      ["createQualification", "archiveQualification", "addModule", "archiveModule"].includes(
        parsed.data.action,
      )
    )
      revalidateTag("curriculum", "max");
    return Response.json({ ok: true, ...result }, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}
