export function safeReturnPath(value?: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://vela.invalid");
    if (url.origin !== "https://vela.invalid" || /^\/(auth|onboarding)(\/|$)/.test(url.pathname))
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
