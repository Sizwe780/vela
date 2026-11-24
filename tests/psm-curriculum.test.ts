import assert from "node:assert/strict";
import { test } from "node:test";
import {
  psmCompulsory,
  psmFirstLevel,
  psmLanguageOptions,
  psmQualification,
} from "../lib/curriculum/psm-first-level";
import {
  checkPsmSelection,
  currentStudyPeriod,
  psmCreditLoad,
  psmWithdrawalConflict,
} from "../lib/curriculum/psm-enrollment";
import { assertCurriculumScope } from "../lib/content/curriculum-scope";
import { checkedUnit, loadFactoryManifest } from "../lib/content/factory-evidence";
import { loadModuleSpec } from "../lib/specs";
import { chemistrySource } from "../content/che1501/source-map";

test("PSM first level records both practicals, mechanics and one of eleven language choices", () => {
  assert.equal(psmQualification.credits, 132);
  assert.equal(psmQualification.languageChoicesRequired, 1);
  assert.equal(psmCompulsory.length, 10);
  assert.equal(psmLanguageOptions.length, 11);
  assert.equal(new Set(psmFirstLevel.map((entry) => entry.code)).size, 21);
  assert.deepEqual(psmCompulsory.find((row) => row.code === "PHY1503")?.coRequisites, [
    "PHY1505",
    "PHY1506",
  ]);
  assert.deepEqual(psmCompulsory.find((row) => row.code === "CHE1503")?.coRequisites, [
    "CHE1501",
    "CHE1502",
  ]);
  assert.ok(
    psmFirstLevel.every((entry) => !["PHY1501", "PYC1511", "PYC1512"].includes(entry.code)),
  );
  assert.equal(psmLanguageOptions.find((row) => row.code === "TSO1507")?.language, "Xitsonga");
});

test("every first-level code resolves an explicit authoring profile", async () => {
  const profiles = await Promise.all(
    psmFirstLevel.map(({ code }) => loadModuleSpec({ institution: "UNISA", moduleCode: code })),
  );
  assert.ok(
    profiles
      .find((profile) => profile.moduleCode === "CHE1502")
      ?.domains.includes("organic-chemistry"),
  );
  assert.ok(
    profiles
      .find((profile) => profile.moduleCode === "PHY1503")
      ?.domains.includes("laboratory-practical"),
  );
  assert.ok(
    profiles
      .find((profile) => profile.moduleCode === "TPS2601")
      ?.domains.includes("teaching-practice"),
  );
  for (const { code } of psmLanguageOptions)
    assert.deepEqual(profiles.find((profile) => profile.moduleCode === code)?.domains, [
      "communicative-language",
    ]);
});

test("CHE1501 scope blocks excluded codes and positions without rejecting Unit 8 or other modules", async () => {
  const manifest = await loadFactoryManifest("CHE1501");
  assert.deepEqual(chemistrySource.excludedUnits, [
    "CHE1501-U9 acid-base equilibria",
    "CHE1501-U10 thermochemistry",
  ]);
  for (const excluded of chemistrySource.excludedUnits) {
    const code = excluded.split(" ")[0];
    assert.throws(() => assertCurriculumScope("UNISA", "CHE1501", code), {
      code: "UNIT_EXCLUDED_FROM_SYLLABUS",
    });
  }
  assert.doesNotThrow(() => checkedUnit(manifest, "CHE1501-U7"));
  assert.doesNotThrow(() => checkedUnit(manifest, "CHE1501-U8"));
  assert.doesNotThrow(() => assertCurriculumScope("UNISA", "CHE1502", "CHE1502-U7", 7));
});

test("PSM planning enforces the annual limit, permits deferral and isolates the language choice", () => {
  const compulsory = psmCompulsory.map(({ code }) => code);
  const year = 2026;
  const base = { existing: [], year, semester: 1, languageConfirmed: true };
  assert.equal(checkPsmSelection({ ...base, codes: compulsory }), null);
  assert.match(checkPsmSelection({ ...base, codes: [...compulsory, "NSO1507"] })!, /120 credits/);
  assert.match(checkPsmSelection({ ...base, codes: ["NSO1507", "ZUL1507"] })!, /only one/);
  assert.match(
    checkPsmSelection({ ...base, codes: ["NSO1507"], languageConfirmed: false })!,
    /Confirm/,
  );
  const existing = compulsory.map((code) => ({
    code,
    year,
    semester: 1,
    status: "active" as const,
  }));
  assert.deepEqual(psmCreditLoad(existing, year), { annual: 120, first: 12, second: 0 });
  assert.equal(checkPsmSelection({ ...base, existing, year: year + 1, codes: ["NSO1507"] }), null);
  const language = { code: "NSO1507", year, semester: 1, status: "completed" as const };
  assert.match(
    checkPsmSelection({ ...base, existing: [language], codes: ["ZUL1507"], year: year + 1 })!,
    /only one/,
  );
  assert.deepEqual(currentStudyPeriod(new Date("2026-12-31T22:00:00Z")), {
    year: 2027,
    semester: 1,
  });
});

test("same-year co-requisites must be on the plan or recorded as completed", () => {
  const year = 2026;
  const base = { year, semester: 1, languageConfirmed: false };
  const core = { code: "CHE1501", year, semester: 2, status: "active" as const };
  const dependent = { code: "CHE1502", year, semester: 1, status: "active" as const };
  assert.match(
    checkPsmSelection({ ...base, existing: [], codes: ["CHE1503"] })!,
    /CHE1501 and CHE1502/,
  );
  assert.equal(
    checkPsmSelection({ ...base, existing: [core], codes: ["CHE1502", "CHE1503"] }),
    null,
  );
  assert.match(
    checkPsmSelection({ ...base, year: 2027, existing: [core], codes: ["CHE1502"] })!,
    /CHE1501/,
  );
  assert.equal(
    checkPsmSelection({
      ...base,
      year: 2027,
      existing: [{ ...core, status: "completed" }],
      codes: ["CHE1502"],
    }),
    null,
  );
  assert.equal(psmWithdrawalConflict("CHE1501", year, [core, dependent]), "CHE1502");
  assert.equal(psmWithdrawalConflict("CHE1501", year + 1, [core, dependent]), undefined);
});
