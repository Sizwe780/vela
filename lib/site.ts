export const operatorName = "Vela Learning (Pty) Ltd";
export const supportEmail = "sizwe.ngwenya78@gmail.com";
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
