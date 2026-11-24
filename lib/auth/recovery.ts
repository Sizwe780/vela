type AuthError = { code?: string; status?: number };

export function authRecovery(
  error: AuthError,
  action: "signin" | "signup" | "reset" | "password" | "email" | "session",
) {
  if (error.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  if (error.status && error.status >= 500)
    return "Sign-in services are temporarily unavailable. Try again in a moment.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "Check the email and password, or request a password reset.";
    case "EMAIL_NOT_VERIFIED":
      return "Verify your email before continuing. Use Help if you can’t access your inbox.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least eight characters for your new password.";
    case "PASSWORD_TOO_LONG":
      return "Use no more than 128 characters for your new password.";
    case "INVALID_TOKEN":
    case "VERIFICATION_EXPIRED":
      return "This link has expired or was already used. Request a fresh link.";
    case "SESSION_NOT_FRESH":
      return "Sign out, then sign in again before making this security change.";
    case "USER_ALREADY_EXISTS":
    case "EMAIL_ALREADY_IN_USE":
      return "This address can’t be used here. Try signing in or resetting your password.";
  }
  const messages = {
    signin: "Could not sign you in. Check your details or use password reset.",
    signup: "Could not create your account. Check your details or try signing in.",
    reset: "Could not reset the password. Request a new link or contact support.",
    password: "Could not change your password. Check your current password or request a reset.",
    email:
      "Could not start the email change. Verify your current address and contact support if it still fails.",
    session: "Could not update sign-ins. Refresh this page and try again.",
  };
  return messages[action];
}
