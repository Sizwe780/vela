import type { InstitutionPermission } from "../../generated/app-client";
import { IngestError } from "../ingest/errors";
import { conflict, missing, transactionLock, type Tx } from "../teaching/scope";
import { allows, requireInstitution, ssoAvailable } from "./access";
import { ssoProviders, type InstitutionCommand } from "./input";
import { supportEmail } from "../site";
import { getAIConfig } from "../ai/config";
import { emailDeliveryStatus } from "../email/config";

type Actor = { id: string; emailVerified: boolean };
const requiredPermission: Record<InstitutionCommand["action"], InstitutionPermission> = {
  createQualification: "curriculum",
  archiveQualification: "curriculum",
  addModule: "curriculum",
  archiveModule: "curriculum",
  setPermissions: "access",
  setSso: "integrations",
  setEnrollment: "directory",
};

async function institutionQualification(db: Tx, institution: string, id: string) {
  const qualification = await db.qualification.findFirst({ where: { id, institution } });
  return qualification ?? missing("Qualification not found in this institution.");
}
async function inDirectory(db: Tx, institution: string, studentId: string) {
  return !!(
    (await db.enrollment.findFirst({
      where: { studentId, qualificationModule: { qualification: { institution } } },
      select: { id: true },
    })) ||
    (await db.staffMembership.findFirst({
      where: { studentId, qualification: { institution } },
      select: { studentId: true },
    }))
  );
}
export async function institutionCommand(tx: Tx, user: Actor, input: InstitutionCommand) {
  const { institution } = input;
  await transactionLock(tx, "vela:institution:" + institution);
  const scope = await requireInstitution(tx, user, institution, requiredPermission[input.action]);
  let targetId: string;
  switch (input.action) {
    case "createQualification": {
      const { code, stream, title, streamTitle, saqaId, nqfExitLevel } = input;
      if (
        await tx.qualification.findUnique({
          where: { institution_code_stream: { institution, code, stream } },
        })
      )
        return conflict("A qualification with this code and stream already exists.");
      const qualification = await tx.qualification.create({
        data: {
          institution,
          code,
          stream,
          title,
          streamTitle,
          saqaId,
          nqfExitLevel,
          // New qualifications are prepared privately before administrators open enrolment.
          teachingSettings: {
            create: { allowSelfEnrollment: false, displayName: title, supportEmail },
          },
        },
        select: { id: true },
      });
      const owners = await tx.institutionMembership.findMany({
        where: { institution, owner: true },
        select: { studentId: true },
      });
      for (const { studentId } of owners) {
        await tx.studentProfile.upsert({ where: { studentId }, create: { studentId }, update: {} });
        await tx.staffMembership.create({
          data: { studentId, qualificationId: qualification.id, role: "admin" },
        });
      }
      targetId = qualification.id;
      break;
    }
    case "archiveQualification": {
      const qualification = await institutionQualification(tx, institution, input.qualificationId);
      await transactionLock(tx, "vela:qualification:" + qualification.id);
      await tx.qualification.update({
        where: { id: qualification.id },
        data: { archivedAt: input.archived ? new Date() : null },
      });
      targetId = qualification.id;
      break;
    }
    case "addModule": {
      const qualification = await institutionQualification(tx, institution, input.qualificationId);
      await transactionLock(tx, "vela:qualification:" + qualification.id);
      if (qualification.archivedAt)
        return conflict("Restore the qualification before adding modules.");
      const { code, title, studyYear } = input;
      const module = await tx.module.upsert({
        where: { institution_code: { institution, code } },
        create: { institution, code, title },
        update: {},
      });
      if (
        await tx.qualificationModule.findUnique({
          where: {
            qualificationId_moduleId: { qualificationId: qualification.id, moduleId: module.id },
          },
        })
      )
        return conflict(
          "This module is already in the qualification. Use its existing lifecycle controls.",
        );
      const prior = await tx.qualificationModule.aggregate({
        where: { qualificationId: qualification.id, studyYear },
        _max: { position: true },
      });
      await tx.qualificationModule.create({
        data: {
          qualificationId: qualification.id,
          moduleId: module.id,
          studyYear,
          position: (prior._max.position ?? 0) + 1,
          acceptingEnrollments: false,
        },
      });
      targetId = module.id;
      break;
    }
    case "archiveModule": {
      const qualification = await institutionQualification(tx, institution, input.qualificationId);
      await transactionLock(tx, "vela:qualification:" + qualification.id);
      const changed = await tx.qualificationModule.updateMany({
        where: { qualificationId: qualification.id, moduleId: input.moduleId },
        data: { archivedAt: input.archived ? new Date() : null },
      });
      if (!changed.count) return missing("Module not found in this qualification.");
      targetId = input.moduleId;
      break;
    }
    case "setPermissions": {
      // Only an institution owner can delegate permissions. An 'access' delegate can audit them.
      if (!scope.owner)
        throw new IngestError(
          403,
          "INSTITUTION_OWNER_REQUIRED",
          "Only an institution owner can delegate permissions.",
        );
      const key = { institution, studentId: input.studentId };
      const prior = await tx.institutionMembership.findUnique({
        where: { institution_studentId: key },
      });
      if (prior?.owner) return conflict("Owner access is managed by the platform operator.");
      if (input.permissions.length && !(await inDirectory(tx, institution, input.studentId)))
        return missing("Choose an existing learner or member of this institution.");
      if (input.permissions.length)
        await tx.institutionMembership.upsert({
          where: { institution_studentId: key },
          create: { ...key, permissions: input.permissions },
          update: { permissions: input.permissions },
        });
      else await tx.institutionMembership.deleteMany({ where: key });
      targetId = input.studentId;
      break;
    }
    case "setEnrollment": {
      const enrollment = await tx.enrollment.findFirst({
        where: { id: input.enrollmentId, qualificationModule: { qualification: { institution } } },
        select: { id: true, qualificationId: true, moduleId: true, studentId: true },
      });
      if (!enrollment) return missing("Enrolment not found in this institution.");
      await transactionLock(tx, "vela:qualification:" + enrollment.qualificationId);
      await transactionLock(tx, enrollment.studentId + ":" + enrollment.moduleId);
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: input.status } });
      targetId = enrollment.id;
      break;
    }
    case "setSso": {
      if (input.enabled && !ssoAvailable(input.provider))
        return conflict("This provider has not been configured in Neon Auth for this deployment.");
      const data = { ssoProvider: input.provider, ssoEnabled: input.enabled };
      await tx.institutionIntegration.upsert({
        where: { institution },
        create: { institution, ...data },
        update: data,
      });
      targetId = institution;
      break;
    }
  }
  await tx.institutionAudit.create({
    data: { institution, actorId: user.id, action: input.action, targetId },
  });
  return { id: targetId };
}

type DirectoryAccount = { id: string; name: string; email: string; verified: boolean };
export async function institutionWorkspace(
  db: Tx,
  user: Actor,
  institution: string,
  filter: string,
) {
  const scope = await requireInstitution(db, user, institution);
  const where = { institution };
  const hasDirectory = allows(scope, "directory");
  const hasAccess = allows(scope, "access");
  const [curriculum, directory, enrollments, members, integrations, audit, reports] =
    await Promise.all([
      allows(scope, "curriculum")
        ? db.qualification.findMany({
            where,
            select: {
              id: true,
              code: true,
              stream: true,
              title: true,
              archivedAt: true,
              modules: {
                select: {
                  module: { select: { id: true, code: true, title: true } },
                  studyYear: true,
                  archivedAt: true,
                },
                orderBy: [{ studyYear: "asc" }, { position: "asc" }],
              },
            },
            orderBy: [{ code: "asc" }, { stream: "asc" }],
          })
        : [],
      hasDirectory || hasAccess
        ? db.$queryRaw<DirectoryAccount[]>`
      SELECT u.id::text AS id, u.name, u.email, u."emailVerified" AS verified
      FROM neon_auth."user" u
      WHERE (strpos(lower(u.email), ${filter}) > 0 OR strpos(lower(u.name), ${filter}) > 0)
        AND (
          EXISTS (SELECT 1 FROM "InstitutionMembership" i WHERE i."studentId"=u.id::text AND i.institution=${institution})
          OR (${hasDirectory} AND (
          EXISTS (SELECT 1 FROM "Enrollment" e JOIN "Qualification" q ON q.id=e."qualificationId"
            WHERE e."studentId"=u.id::text AND q.institution=${institution})
          OR EXISTS (SELECT 1 FROM "StaffMembership" m JOIN "Qualification" q ON q.id=m."qualificationId"
            WHERE m."studentId"=u.id::text AND q.institution=${institution})
          ))
        )
      ORDER BY lower(u.name),u.id LIMIT 100
    `
        : [],
      hasDirectory
        ? db.enrollment.findMany({
            where: { qualificationModule: { qualification: where } },
            orderBy: [{ enrolledAt: "desc" }, { id: "asc" }],
            take: 200,
            select: {
              id: true,
              studentId: true,
              status: true,
              qualificationModule: {
                select: {
                  qualification: { select: { code: true, stream: true } },
                  module: { select: { code: true } },
                },
              },
            },
          })
        : [],
      hasAccess
        ? db.institutionMembership.findMany({
            where,
            select: { studentId: true, owner: true, permissions: true },
          })
        : [],
      allows(scope, "integrations") ? db.institutionIntegration.findUnique({ where }) : null,
      hasAccess
        ? db.institutionAudit.findMany({ where, orderBy: { createdAt: "desc" }, take: 60 })
        : [],
      allows(scope, "reports")
        ? db.$queryRaw<
            {
              qualification: string;
              title: string;
              modules: number;
              active: number;
              completed: number;
              withdrawn: number;
            }[]
          >`
      SELECT q.code || ' / ' || q.stream AS qualification, q.title,
        count(DISTINCT qm."moduleId")::int AS modules,
        count(e.id) FILTER(WHERE e.status='active')::int AS active,
        count(e.id) FILTER(WHERE e.status='completed')::int AS completed,
        count(e.id) FILTER(WHERE e.status='withdrawn')::int AS withdrawn
      FROM "Qualification" q LEFT JOIN "QualificationModule" qm ON qm."qualificationId"=q.id
      LEFT JOIN "Enrollment" e ON e."qualificationId"=qm."qualificationId" AND e."moduleId"=qm."moduleId"
      WHERE q.institution=${institution} GROUP BY q.id ORDER BY q.code,q.stream
    `
        : [],
    ]);
  return {
    scope,
    curriculum,
    directory,
    enrollments,
    members,
    integrations,
    audit,
    reports,
    providerOptions: allows(scope, "integrations")
      ? ssoProviders.map((provider) => ({ provider, available: ssoAvailable(provider) }))
      : [],
    emailDelivery: allows(scope, "integrations") ? emailDeliveryStatus() : null,
    aiProvider: allows(scope, "integrations")
      ? (() => {
          try {
            return getAIConfig().provider;
          } catch {
            return null;
          }
        })()
      : null,
  };
}
