import { z } from "zod";
import { sourceId } from "../student/input";

export const institutionPermissions = [
  "curriculum",
  "directory",
  "reports",
  "access",
  "integrations",
] as const;
export const ssoProviders = ["google", "microsoft"] as const;
const scope = { institution: z.string().trim().min(1).max(80) };
const code = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,32}$/)
  .transform((value) => value.toUpperCase());
const name = z.string().trim().min(2).max(160);
export const institutionInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("createQualification"),
      ...scope,
      code,
      stream: code,
      title: name,
      streamTitle: name,
      saqaId: z
        .string()
        .trim()
        .regex(/^\d{1,15}$/),
      nqfExitLevel: z.number().int().min(1).max(10),
    })
    .strict(),
  z
    .object({
      action: z.literal("archiveQualification"),
      ...scope,
      qualificationId: sourceId,
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("addModule"),
      ...scope,
      qualificationId: sourceId,
      code,
      title: name,
      studyYear: z.number().int().min(1).max(15),
    })
    .strict(),
  z
    .object({
      action: z.literal("archiveModule"),
      ...scope,
      qualificationId: sourceId,
      moduleId: sourceId,
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("setPermissions"),
      ...scope,
      studentId: sourceId,
      permissions: z
        .array(z.enum(institutionPermissions))
        .max(5)
        .refine((items) => items.length === new Set(items).size),
    })
    .strict(),
  z
    .object({
      action: z.literal("setSso"),
      ...scope,
      provider: z.enum(ssoProviders),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("setEnrollment"),
      ...scope,
      enrollmentId: sourceId,
      status: z.enum(["active", "completed", "withdrawn"]),
    })
    .strict(),
]);
export type InstitutionCommand = z.infer<typeof institutionInput>;
export type SsoProvider = (typeof ssoProviders)[number];
