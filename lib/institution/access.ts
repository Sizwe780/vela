import { IngestError } from "../ingest/errors";
import type { InstitutionPermission } from "../../generated/app-client";
import type { Tx } from "../teaching/scope";
import type { SsoProvider } from "./input";

type Actor = { id: string; emailVerified: boolean };
export async function institutionScopes(db: Tx, user: Actor) {
  if (!user.emailVerified) return [];
  return db.institutionMembership.findMany({
    where: { studentId: user.id, OR: [{ owner: true }, { permissions: { isEmpty: false } }] },
    select: { institution: true, owner: true, permissions: true },
    orderBy: { institution: "asc" },
  });
}
export function allows(
  scope: { owner: boolean; permissions: InstitutionPermission[] },
  permission: InstitutionPermission,
) {
  return scope.owner || scope.permissions.includes(permission);
}
export async function requireInstitution(
  db: Tx,
  user: Actor,
  institution: string,
  permission?: InstitutionPermission,
) {
  const scope = (await institutionScopes(db, user)).find(
    (entry) => entry.institution === institution,
  );
  if (!scope || (permission && !allows(scope, permission)))
    throw new IngestError(
      403,
      "INSTITUTION_SCOPE_REQUIRED",
      "You do not have this permission in the selected institution.",
    );
  return scope;
}
export function ssoAvailable(provider: SsoProvider) {
  return (process.env.VELA_SSO_PROVIDERS ?? "")
    .split(",")
    .map((item) => item.trim())
    .includes(provider);
}
