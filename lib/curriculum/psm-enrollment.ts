import { psmFirstLevel, psmLanguageOptions, psmQualification } from "./psm-first-level";

const entries = new Map(psmFirstLevel.map((entry) => [entry.code, entry]));
const languages = new Set(psmLanguageOptions.map(({ code }) => code));
export const psmLimits = { annual: 120, semester: 60 } as const;

export function isPsmLanguage(code: string) {
  return languages.has(code);
}

export function psmStudyPeriod(code: string): "year" | "semester" {
  return code === "BPT1501" || (isPsmLanguage(code) && code !== "AFK1505" && code !== "SNL1507")
    ? "semester"
    : "year";
}

export function currentStudyPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, semester: month <= 6 ? 1 : 2 };
}

export type PlannedEnrollment = {
  code: string;
  status: "active" | "completed";
  year: number;
  semester: number;
};

export function psmCreditLoad(rows: readonly PlannedEnrollment[], year: number) {
  const load = { annual: 0, first: 0, second: 0 };
  for (const row of rows) {
    if (row.year !== year || !entries.has(row.code)) continue;
    load.annual += psmQualification.moduleCredits;
    if (psmStudyPeriod(row.code) === "semester") {
      if (row.semester === 1) load.first += psmQualification.moduleCredits;
      else load.second += psmQualification.moduleCredits;
    }
  }
  return load;
}

export function checkPsmSelection({
  codes,
  existing,
  year,
  semester,
  languageConfirmed,
}: {
  codes: readonly string[];
  existing: readonly PlannedEnrollment[];
  year: number;
  semester: number;
  languageConfirmed: boolean;
}) {
  const existingCodes = new Set(existing.map(({ code }) => code));
  const additions = codes.filter((code) => entries.has(code) && !existingCodes.has(code));
  if (!additions.length) return null;
  const plan = [
    ...existing,
    ...additions.map((code) => ({ code, status: "active" as const, year, semester })),
  ];
  if (
    plan.filter(({ code }) => languages.has(code)).length > psmQualification.languageChoicesRequired
  )
    return "Choose only one Group B language across your first-level plan.";
  if (additions.some(isPsmLanguage) && !languageConfirmed)
    return "Confirm that your Group B choice differs from your Home and First Additional Languages.";
  const credits = psmCreditLoad(plan, year);
  if (credits.annual > psmLimits.annual)
    return "This plan exceeds 120 credits in the academic year. Move at least one module to another year.";
  if (credits.first > psmLimits.semester || credits.second > psmLimits.semester)
    return "This plan exceeds 60 semester-module credits in one semester.";
  for (const code of additions) {
    const missing = entries
      .get(code)
      ?.coRequisites?.filter(
        (required) =>
          !plan.some(
            (row) =>
              row.code === required &&
              (row.status === "completed" ||
                (row.year === year &&
                  (psmStudyPeriod(required) === "year" || semester === row.semester))),
          ),
      );
    if (missing?.length)
      return `${code} requires ${missing.join(" and ")} in the same study period or already completed.`;
  }
  return null;
}

export function psmWithdrawalConflict(
  code: string,
  year: number,
  rows: readonly PlannedEnrollment[],
  wasCompleted = false,
) {
  return rows.find(
    (row) =>
      row.status === "active" &&
      (wasCompleted || row.year === year) &&
      entries.get(row.code)?.coRequisites?.includes(code),
  )?.code;
}
