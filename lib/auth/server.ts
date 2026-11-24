import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
import { IngestError } from "../ingest/errors";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

export async function requireLearner() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user)
    throw new IngestError(401, "UNAUTHORIZED", "Sign in to access your learning workspace.");
  return data.user;
}
