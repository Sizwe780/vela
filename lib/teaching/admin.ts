import { createHash, randomBytes } from "node:crypto";
import { IngestError } from "../ingest/errors";
import type { TeachingCommand } from "./input";
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

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function adminCommand(
  tx: Tx,
  actor: string,
  input: Extract<
    TeachingCommand,
    {
      action:
        "settings" | "moduleAccess" | "enrollmentStatus" | "invite" | "revokeInvite" | "membership";
    }
  >,
) {
  const { qualificationId } = input;
  let targetId;
  let inviteToken: string | undefined;
  switch (input.action) {
    case "settings": {
      const data = {
        displayName: input.displayName,
        supportEmail: input.supportEmail,
        allowSelfEnrollment: input.allowSelfEnrollment,
      };
      await tx.teachingSettings.upsert({
        where: { qualificationId },
        create: { qualificationId, ...data },
        update: data,
      });
      targetId = qualificationId;
      break;
    }
    case "moduleAccess": {
      await moduleLink(tx, qualificationId, input.moduleId);
      await tx.qualificationModule.update({
        where: { qualificationId_moduleId: { qualificationId, moduleId: input.moduleId } },
        data: { acceptingEnrollments: input.acceptingEnrollments },
      });
      targetId = input.moduleId;
      break;
    }
    case "enrollmentStatus": {
      const result = await tx.enrollment.updateMany({
        where: { id: input.enrollmentId, qualificationId },
        data: { status: input.status },
      });
      if (!result.count) return missing("Enrollment not found in this qualification.");
      targetId = input.enrollmentId;
      break;
    }
    case "invite": {
      if ((input.role === "student") !== Boolean(input.moduleId))
        throw new IngestError(
          422,
          "INVALID_INVITATION",
          "Student invitations require a module. Staff invitations apply to the qualification.",
        );
      if (input.moduleId) {
        const link = await moduleLink(tx, qualificationId, input.moduleId);
        const qualification = await tx.qualification.findUniqueOrThrow({
          where: { id: qualificationId },
        });
        if (link.archivedAt || qualification.archivedAt)
          return conflict("Restore the module and qualification before inviting new learners.");
      }
      inviteToken = randomBytes(32).toString("hex");
      const invitation = await tx.teachingInvite.create({
        data: {
          qualificationId,
          email: input.email.toLowerCase(),
          moduleId: input.moduleId,
          tokenHash: hashToken(inviteToken),
          role: input.role,
          createdBy: actor,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      });
      targetId = invitation.id;
      break;
    }
    case "revokeInvite": {
      const revoked = await tx.teachingInvite.updateMany({
        where: { qualificationId, id: input.inviteId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (!revoked.count) return conflict("The invitation is no longer pending.");
      targetId = input.inviteId;
      break;
    }
    case "membership": {
      const key = { studentId: input.studentId, qualificationId };
      const member = await tx.staffMembership.findUnique({
        where: { studentId_qualificationId: key },
      });
      if (!member)
        return missing("Staff access must first be accepted through a qualification invitation.");
      if (
        member.role === "admin" &&
        input.role !== "admin" &&
        (await tx.staffMembership.count({ where: { qualificationId, role: "admin" } })) <= 1
      )
        return conflict("Keep at least one qualification administrator.");
      if (input.role === "remove") {
        await tx.staffMembership.delete({ where: { studentId_qualificationId: key } });
      } else {
        await tx.staffMembership.update({
          where: { studentId_qualificationId: key },
          data: { role: input.role },
        });
      }
      targetId = input.studentId;
      break;
    }
  }
  await recordAudit(tx, qualificationId, actor, input.action, targetId);
  return { id: targetId, ...(inviteToken ? { inviteToken } : {}) };
}

export async function claimInvite(
  tx: Tx,
  user: { id: string; email: string; emailVerified: boolean },
  token: string,
) {
  if (!user.emailVerified)
    return forbidden("Verify your sign-in email before accepting an invitation.");
  const invitation = await tx.teachingInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invitation || invitation.email !== user.email.toLowerCase())
    return missing("Invitation not found for your verified account.");
  await transactionLock(tx, `vela:qualification:${invitation.qualificationId}`);
  await teachingRole(tx, invitation.createdBy, invitation.qualificationId, true);
  const claimed = await tx.teachingInvite.updateMany({
    where: { id: invitation.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (!claimed.count) return conflict("This invitation has expired or is no longer pending.");
  if (invitation.role === "student" && invitation.moduleId) {
    const key = {
      qualificationId: invitation.qualificationId,
      moduleId: invitation.moduleId,
      studentId: user.id,
    };
    const link = await moduleLink(tx, key.qualificationId, key.moduleId);
    const qualification = await tx.qualification.findUniqueOrThrow({
      where: { id: key.qualificationId },
    });
    if (link.archivedAt || qualification.archivedAt)
      return conflict("This module is archived. Contact your qualification administrator.");
    await tx.enrollment.createMany({ data: key, skipDuplicates: true });
    await tx.enrollment.updateMany({
      where: { ...key, status: "withdrawn" },
      data: { status: "active" },
    });
  } else if (invitation.role === "staff") {
    await tx.studentProfile.upsert({
      where: { studentId: user.id },
      create: { studentId: user.id },
      update: {},
    });
    const key = { studentId: user.id, qualificationId: invitation.qualificationId };
    await tx.staffMembership.upsert({
      where: { studentId_qualificationId: key },
      create: { ...key, role: "staff" },
      update: {},
    });
  } else {
    return conflict("The invitation has an invalid role or module.");
  }
  await recordAudit(tx, invitation.qualificationId, user.id, "claimInvite", invitation.id);
  return { destination: invitation.role === "staff" ? "/staff" : "/classroom" };
}
