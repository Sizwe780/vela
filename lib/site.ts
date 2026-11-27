export const operatorName = "Vela Learning (Pty) Ltd";
const configuredSupportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const supportEmail =
  process.env.SUPPORT_EMAIL_VERIFIED === "true" &&
  /^[^\s@]+@velastudy\.app$/i.test(configuredSupportEmail)
    ? configuredSupportEmail
    : "";
export const informationOfficerName = "Sizwe Ngwenya";
export const operatorContactAddress = "12449 Tsipinoto Street, Benoni, 1520";
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(configured ?? "http://localhost:3200");
    return url.origin;
  } catch {
    return "http://localhost:3200";
  }
}
export const policiesApproved = process.env.POLICIES_APPROVED === "true";
