import { learnerHasClassroom } from "../../../lib/teaching/read";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { IngestError } from "../../../lib/ingest/errors";
import { profileInput } from "../../../lib/student/input";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import {
  EMAIL_CONSENT_VERSION,
  emailConfig,
  emailDeliveryStatus,
  mayEmail,
} from "../../../lib/email/config";
import { enqueueWelcome } from "../../../lib/email/service";
export async function GET() {
  try {
    const user = await requireLearner();
    const profile = await prisma.studentProfile.findUnique({
      where: { studentId: user.id },
      select: {
        displayName: true,
        role: true,
        weeklyGoalMinutes: true,
        emailReminders: true,
        classroomAlerts: true,
        emailConsentAt: true,
        staffMemberships: { select: { qualificationId: true, role: true } },
      },
    });
    return Response.json(
      {
        studentId: user.id,
        email: user.email,
        emailVerified: !!user.emailVerified,
        displayName: profile?.displayName ?? user.name ?? "Learner",
        ownerId: user.id,
        hasClassroom: await learnerHasClassroom(user.id),
        role: profile?.staffMemberships.some((item) => item.role === "admin")
          ? "admin"
          : profile?.staffMemberships.some((item) => item.role === "staff")
            ? "staff"
            : "student",
        weeklyGoalMinutes: profile?.weeklyGoalMinutes ?? 120,
        emailReminders: profile?.emailReminders ?? false,
        classroomAlerts: profile?.classroomAlerts ?? true,
        staffScopes: profile?.staffMemberships ?? [],
        emailDelivery: emailDeliveryStatus(),
        emailProvider: emailConfig()?.provider ?? null,
        emailRemindersAvailable:
          !!user.emailVerified && !!emailConfig() && mayEmail(emailConfig()!, user.email),
        emailConsentAt: profile?.emailConsentAt ?? null,
        emailTestAllowed:
          !!user.emailVerified &&
          !!emailConfig()?.testRecipient &&
          user.email.toLowerCase() === emailConfig()?.testRecipient,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}
export async function PUT(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const p = profileInput.safeParse(await readJson(request));
    if (!p.success)
      throw new IngestError(
        400,
        "INVALID_PROFILE",
        "Use a name up to 80 characters and a weekly goal from 15 to 1,200 minutes. Role and identity fields cannot be edited here.",
      );
    const config = emailConfig();
    if (p.data.emailReminders && (!config || !mayEmail(config, user.email)))
      throw new IngestError(
        409,
        "EMAIL_NOT_CONNECTED",
        "Email delivery is not connected for this account. Your review queue is available in the app.",
      );
    if (p.data.emailReminders && !user.emailVerified)
      throw new IngestError(
        409,
        "EMAIL_UNVERIFIED",
        "Verify your email before enabling reminders.",
      );
    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.upsert({
        where: { studentId: user.id },
        create: { studentId: user.id },
        update: {},
      });
      await tx.$queryRaw`SELECT "studentId" FROM "StudentProfile" WHERE "studentId"=${user.id} FOR UPDATE`;
      const prior = await tx.studentProfile.findUniqueOrThrow({ where: { studentId: user.id } });
      const newConsent =
        p.data.emailReminders &&
        (!prior.emailReminders ||
          !prior.emailConsentAt ||
          prior.emailConsentVersion !== EMAIL_CONSENT_VERSION);
      await tx.studentProfile.update({
        where: { studentId: user.id },
        data: {
          ...p.data,
          ...(newConsent
            ? { emailConsentAt: new Date(), emailConsentVersion: EMAIL_CONSENT_VERSION }
            : {}),
        },
      });
      if (!p.data.emailReminders)
        await tx.emailDelivery.updateMany({
          where: { studentId: user.id, kind: "recall", status: "queued" },
          data: { status: "suppressed", errorCode: "UNSUBSCRIBED" },
        });
      await enqueueWelcome(tx, user.id);
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
