/** Log diagnostic identifiers without connection strings, tokens or learner data. */
export function logServerError(operation: string, error: unknown) {
  console.error("[vela]", {
    operation,
    name: error instanceof Error ? error.name : "UnknownError",
    code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
  });
}
