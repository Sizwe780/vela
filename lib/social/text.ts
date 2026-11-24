export const normalizeParagraph = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();
