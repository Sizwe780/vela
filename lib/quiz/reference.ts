/** Only current-unit local reading links are allowed in issued practice. */
export function quizReference(raw: string | null | undefined, unitId: string, chunkId: string) {
  const base = `/study/${encodeURIComponent(unitId)}`;
  if (raw?.startsWith(base + "#session-")) {
    const id = raw.slice((base + "#session-").length);
    if (/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return `${base}/sessions/${id}`;
  }
  if (
    raw?.startsWith(base + "/sessions/") &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(raw.slice((base + "/sessions/").length))
  )
    return raw;
  return `${base}#chunk-${encodeURIComponent(chunkId)}`;
}
