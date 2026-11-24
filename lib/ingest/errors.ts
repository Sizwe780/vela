export class IngestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function publicError(error: unknown) {
  if (error instanceof IngestError) {
    return { status: error.status, error: { code: error.code, message: error.message } };
  }
  // Do not expose database queries, study text, credentials or provider responses.
  return {
    status: 500,
    error: { code: "INTERNAL_ERROR", message: "Ingestion failed. Retry the same request safely." },
  };
}
