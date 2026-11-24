"use server";

import { headers } from "next/headers";
import { authorizeIngestion } from "../../lib/ingest/auth";
import { publicError } from "../../lib/ingest/errors";
import { ingestStudyText } from "../../lib/ingest/runtime";

export async function ingestStudyUnit(input: unknown) {
  try {
    authorizeIngestion((await headers()).get("authorization"));
    return { ok: true as const, data: await ingestStudyText(input) };
  } catch (error) {
    const failure = publicError(error);
    return { ok: false as const, status: failure.status, error: failure.error };
  }
}
