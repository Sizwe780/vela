import { z } from "zod";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const title = z.string().trim().min(1).max(160);
const note = z.string().trim().min(1).max(2000);
const markdown = z.string().trim().min(1).max(24000);
const scope = { qualificationId: id };
const rubric = z
  .array(
    z
      .object({
        label: title,
        max: z.number().int().min(1).max(100),
      })
      .strict(),
  )
  .min(1)
  .max(12)
  .refine((items) => new Set(items.map((item) => item.label.toLowerCase())).size === items.length);

export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("saveLesson"),
      ...scope,
      studyUnitId: id,
      draftId: id.optional(),
      sessionId: id.optional(),
      baseVersion: z.number().int().min(1).optional(),
      expectedUpdatedAt: z.string().datetime().optional(),
      title,
      markdown,
    })
    .strict(),
  z
    .object({
      action: z.literal("submitLesson"),
      ...scope,
      draftId: id,
      expectedUpdatedAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reviewLesson"),
      ...scope,
      draftId: id,
      decision: z.enum(["publish", "reject"]),
      note,
    })
    .strict(),
  z
    .object({
      action: z.literal("reviewSource"),
      ...scope,
      ingestionId: id,
      status: z.enum(["held", "compared"]),
      note,
    })
    .strict(),
  z.object({ action: z.literal("createCohort"), ...scope, name: title }).strict(),
  z
    .object({
      action: z.literal("cohortMember"),
      ...scope,
      cohortId: id,
      studentId: id,
      member: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("createAssignment"),
      ...scope,
      moduleId: id,
      cohortId: id.optional(),
      title,
      instructions: markdown,
      rubric,
      dueAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      action: z.literal("grade"),
      ...scope,
      assignmentId: id,
      studentId: id,
      expectedSubmittedAt: z.string().datetime(),
      scores: z.array(z.number().int().min(0).max(100)).min(1).max(12),
      feedback: note,
    })
    .strict(),
  z
    .object({
      action: z.literal("announce"),
      ...scope,
      cohortId: id.optional(),
      title,
      body: markdown,
    })
    .strict(),
  z
    .object({
      action: z.literal("settings"),
      ...scope,
      displayName: title,
      supportEmail: z.string().trim().email().max(254),
      allowSelfEnrollment: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("moduleAccess"),
      ...scope,
      moduleId: id,
      acceptingEnrollments: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("enrollmentStatus"),
      ...scope,
      enrollmentId: id,
      status: z.enum(["active", "completed", "withdrawn"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("invite"),
      ...scope,
      email: z.string().trim().email().max(254),
      role: z.enum(["student", "staff"]),
      moduleId: id.optional(),
    })
    .strict(),
  z.object({ action: z.literal("revokeInvite"), ...scope, inviteId: id }).strict(),
  z
    .object({
      action: z.literal("membership"),
      ...scope,
      studentId: id,
      role: z.enum(["staff", "admin", "remove"]),
    })
    .strict(),
]);

export const learnerCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("submit"),
      assignmentId: id,
      body: markdown,
      expectedSubmittedAt: z.string().datetime().optional(),
    })
    .strict(),
  z.object({ action: z.literal("claim"), token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);

export type TeachingCommand = z.infer<typeof commandSchema>;
export type TeachingAction<T extends TeachingCommand["action"]> = Extract<
  TeachingCommand,
  { action: T }
>;
export type Rubric = z.infer<typeof rubric>;

export function rubricPoints(value: unknown, scores: number[]) {
  const items = rubric.parse(value);
  if (
    items.length !== scores.length ||
    items.some((item, i) => !Number.isInteger(scores[i]) || scores[i] < 0 || scores[i] > item.max)
  ) {
    return null;
  }
  return {
    points: scores.reduce((sum, score) => sum + score, 0),
    total: items.reduce((sum, item) => sum + item.max, 0),
  };
}
