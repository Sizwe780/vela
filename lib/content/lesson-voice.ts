const institutionalFraming = /\b(?:myunisa|unisa|[A-Z]{3}\d{4}(?:-U\d+)?|tutorial letters?|study guides?|this module|syllabus mapping|(?:from|in) units? \d+|(?:supplied|provided)\s+(?:20\d{2}\s+)?(?:course\s+|lesson\s+)?(?:scope|outline|guide)|(?:not|without) (?:a )?(?:verified |official )?CAPS (?:requirement|policy|guidance|alignment))\b|\bPCK status\s*:/i;

export function hasInstitutionalTeachingFraming(markdown: string) {
  return institutionalFraming.test(markdown.replace(/\]\([^\n]*?\)/g, "]"));
}
