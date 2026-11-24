import { test } from "node:test";
import assert from "node:assert/strict";
import { enrollmentInput } from "../lib/enrollment/input";
import { safeReturnPath } from "../lib/enrollment/return-path";
import { normalizeMarkerArtifacts } from "../lib/content/marker-normalize";
import { normalizeMath, mathSpans } from "../lib/content/math";
test("enrollment rejects identity injection, duplicate modules and unbounded batches", () => {
  const valid = { action: "enroll", qualificationId: "qualification-1", moduleIds: ["module-1"] };
  assert.equal(enrollmentInput.safeParse(valid).success, true);
  for (const value of [
    { ...valid, studentId: "another-student" },
    { ...valid, moduleIds: ["m", "m"] },
    { ...valid, moduleIds: [] },
    { ...valid, moduleIds: Array.from({ length: 41 }, (_, i) => `m-${i}`) },
    { action: "withdraw", enrollmentId: "e", studentId: "victim" },
  ])
    assert.equal(enrollmentInput.safeParse(value).success, false);
});
test("onboarding redirects stay local and do not re-enter authentication", () => {
  for (const value of [
    "//evil.invalid",
    "https://evil.invalid",
    "/\\evil.invalid",
    "/auth/sign-in",
    "/onboarding?next=/",
  ])
    assert.equal(safeReturnPath(value), "/");
  assert.equal(safeReturnPath("/study/MAT1512-U1?view=text"), "/study/MAT1512-U1?view=text");
});
test("OCR proof-decoration repair is bounded and tagged display equations remain valid", () => {
  const input = String.raw`$$a=b \quad \blast$$`;
  const fixed = normalizeMarkerArtifacts(input);
  assert.ok(!fixed.includes("\\blast"));
  assert.equal(mathSpans(normalizeMath(fixed)).length, 1);
  assert.equal(normalizeMarkerArtifacts(String.raw`$\blast x$`), String.raw`$\blast x$`);
  assert.equal(mathSpans(normalizeMath(String.raw`$$a=b \tag{1}$$`)).length, 1);
  assert.throws(() => mathSpans(normalizeMath(String.raw`$$a=b \unknowncommand$$`)));
});
