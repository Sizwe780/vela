export function syntheticQualification(q: {
  institution?: string;
  code: string;
  title?: string;
  stream?: string;
  streamTitle?: string;
}) {
  return /(?:^|[^a-z])qa(?:$|[^a-z])|synthetic|isolated.*(?:test|qa)/i.test(
    [q.institution, q.code, q.title, q.stream, q.streamTitle].join(" "),
  );
}
