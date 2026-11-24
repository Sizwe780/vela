export const psmQualification = {
  institution: "UNISA",
  code: "90104",
  stream: "PSM",
  sourceUrl:
    "https://m.unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Undergraduate-%26-honours-qualifications/Find-your-qualification-%26-choose-your-modules/All-qualifications/Bachelor-of-Education-in-Senior-Phase-and-Further-Education-and-Training-Teaching-School-subject-combination%3A-Physical-Science-and-Mathematics-%2890104-%E2%80%93-PSM%29",
  verifiedOn: "2026-11-20",
  credits: 132,
  moduleCredits: 12,
  languageChoicesRequired: 1,
} as const;

type ModuleEntry = { code: string; title: string; note?: string; coRequisites?: readonly string[] };
export const psmCompulsory = [
  { code: "BPT1501", title: "Being a Professional Teacher" },
  {
    code: "CHE1501",
    title: "General Chemistry IA",
    note: "CHE1501 excludes Units 7, 9 and 10. Basic acid–base reactions and general chemical equilibrium remain within scope.",
  },
  {
    code: "CHE1502",
    title: "General Chemistry IB",
    coRequisites: ["CHE1501"],
    note: "Introductory organic chemistry and bonding.",
  },
  {
    code: "CHE1503",
    title: "General Chemistry I (Practical)",
    coRequisites: ["CHE1501", "CHE1502"],
  },
  { code: "MAT1503", title: "Linear Algebra I" },
  { code: "MAT1512", title: "Calculus A" },
  {
    code: "PHY1503",
    title: "Physics I Practical",
    note: "Listed by UNISA as Physics Practical Work I.",
    coRequisites: ["PHY1505", "PHY1506"],
  },
  {
    code: "PHY1505",
    title: "Mechanics",
    note: "Listed by UNISA as Mechanics (Physics), a year module.",
  },
  {
    code: "PHY1506",
    title: "Electromagnetism and Heat",
    note: "UNISA lists this as a year module.",
  },
  {
    code: "TPS2601",
    title: "Teaching Practice for Senior Phase I",
    note: "First-level placement module at NQF Level 6. Follow UNISA’s school placement and teaching-methodology instructions.",
  },
] as const satisfies readonly ModuleEntry[];

export const psmLanguageOptions = [
  {
    code: "AFK1505",
    title: "Afrikaans vir beginners (Afrikaans for Beginners)",
    language: "Afrikaans",
  },
  { code: "NDE1507", language: "isiNdebele" },
  { code: "NSO1507", language: "Sepedi" },
  { code: "SNL1507", title: "Basic Sign Language", language: "South African Sign Language" },
  { code: "SSO1507", language: "Sesotho" },
  { code: "SWA1507", language: "SiSwati" },
  { code: "TSO1507", language: "Xitsonga" },
  { code: "TSW1507", language: "Setswana" },
  { code: "VEN1507", language: "Tshivenda" },
  { code: "XHO1507", language: "isiXhosa" },
  { code: "ZUL1507", language: "isiZulu" },
].map(({ code, title, language }) => ({
  code,
  language,
  title:
    title ??
    "Applied African Language Communicative Competence for Second Additional Language - " +
      language,
}));

export const psmFirstLevel: readonly ModuleEntry[] = [...psmCompulsory, ...psmLanguageOptions];

export function isPsmQualification(input: { institution: string; code: string; stream: string }) {
  return (
    input.institution === psmQualification.institution &&
    input.code === psmQualification.code &&
    input.stream === psmQualification.stream
  );
}
