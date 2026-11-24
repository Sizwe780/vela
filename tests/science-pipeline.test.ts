import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../components/markdown";
import { foundations } from "../content/che1501/foundations";
import { chemicalBonding } from "../content/che1501/chemical-bonding";
import { molecules, projectBond } from "../lib/sandboxes/molecules";
import { selectRecallExercise } from "../lib/recall/authored";
import { auditReactionEquations, equationBalance } from "../lib/content/reaction-check";
import { reactionClasses, reactionSkeletons } from "../content/che1501/reaction-classes";
import { mathSpans, normalizeMath } from "../lib/content/math";
import { checkMathStep } from "../lib/math-practice/checker";
import { structuredDocumentSchema } from "../lib/content/structured";
import {
  reactionExtent,
  dilution,
  equilibriumModel,
  gasVolume,
  pOrbitalOccupancy,
} from "../lib/sandboxes/chemistry-models";
import { chemistrySource } from "../content/che1501/source-map";
import { loadModuleSpec } from "../lib/specs";
import { canonicalChemistryUnitCode } from "../lib/study/chemistry-numbering";

test("CHE1501 excluded units and CHE1502 organic scope are explicit", async () => {
  assert.equal(chemistrySource.excludedUnits.includes("CHE1501-U9 acid-base equilibria"), true);
  assert.equal(chemistrySource.excludedUnits.includes("CHE1501-U10 thermochemistry"), true);
  const che1502 = await loadModuleSpec({ institution: "UNISA", moduleCode: "CHE1502" });
  assert.equal(che1502.domains.includes("organic-chemistry"), true);
  assert.equal(canonicalChemistryUnitCode("CHE1501-U11"), "CHE1501-U8");
  assert.equal(canonicalChemistryUnitCode("CHE1501-U8"), "CHE1501-U8");
});

test("chemistry tools use conserved amounts, rates and absolute gas variables", () => {
  assert.deepEqual(reactionExtent(4, 3), {
    extent: 1,
    limiting: "B",
    remainingA: 2,
    remainingB: 0,
    product: 1,
  });
  assert.deepEqual(reactionExtent(2, 3), {
    extent: 1,
    limiting: null,
    remainingA: 0,
    remainingB: 0,
    product: 1,
  });
  assert.equal(dilution(0.25).amount, dilution(2).amount);
  assert.equal(dilution(2).concentration, 0.05);
  const atEquilibrium = equilibriumModel(1);
  assert.equal(atEquilibrium.forward, atEquilibrium.reverse);
  assert.notEqual(atEquilibrium.fractionA, atEquilibrium.fractionB);
  assert.ok(equilibriumModel(0.5).forward > equilibriumModel(0.5).reverse);
  assert.ok(equilibriumModel(2).forward < equilibriumModel(2).reverse);
  assert.equal(gasVolume(2, 300), gasVolume(1, 300) / 2);
  assert.equal(gasVolume(1, 600), gasVolume(1, 300) * 2);
  assert.deepEqual(pOrbitalOccupancy(4), [2, 1, 1]);
  assert.throws(() => pOrbitalOccupancy(7), /six electrons/);
});

test("Unit 4 conserves elements and charge for all presented balanced equations", () => {
  const report = auditReactionEquations(
    reactionClasses.sessions.map((session) => session.markdown).join("\n"),
    reactionSkeletons,
  );
  assert.ok(report.balanced >= 20);
  assert.equal(report.intentionalImbalances, 7);
  assert.equal(equationBalance("4H2 + 2O2 -> 4H2O").balanced, true);
  assert.equal(equationBalance("2Fe^{3+} + Sn^{2+} -> 2Fe^{2+} + Sn^{3+}").balanced, false);
  assert.deepEqual(
    equationBalance("2MnO4^- + 3SO3^{2-} + H2O -> 2MnO2 + 3SO4^{2-} + 2OH^-").charge,
    [-8, -8],
  );
});

test("shared Markdown renders atomic mass units, ionic charges, reaction and equilibrium arrows", () => {
  const reaction = "\\ce{2Fe^{3+} + Sn^{2+} -> 2Fe^{2+} + Sn^{4+}}";
  const equilibrium = "\\ce{N2O4(g) <=> 2NO2(g)}";
  const text = `\\(${reaction}\\)\n\n$${equilibrium}$\n\n$64.0\\,\\mathrm{u}$`;
  assert.equal(mathSpans(normalizeMath(text)).length, 3);
  const html = renderToStaticMarkup(createElement(Markdown, { text }));
  assert.doesNotMatch(html, /katex-error|Undefined control sequence/);
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3);
  assert.match(html, /<mi mathvariant="normal">u<\/mi>/);
  assert.match(html, /→/);
  assert.match(html, /⇌/);
  for (const session of foundations.sessions) assert.ok(mathSpans(session.markdown).length);
  assert.throws(() => mathSpans("$64.0,mathrm{u}$"), /missing its LaTeX backslash/);
  assert.throws(() => mathSpans("$ce{Fe^{3+}}$"), /missing its LaTeX backslash/);
  assert.throws(() => mathSpans("$3.20\times10^2$".replace("\\t", "\t")), /control character/);
  assert.throws(() => mathSpans("$\rho=m/V$".replace("\\r", "\r")), /control character/);
});

test("molecular models encode the displayed bond angles and preserve their projected bounds", () => {
  for (const [model, angle] of [
    [molecules.carbonDioxide, 180],
    [molecules.boronTrifluoride, 120],
    [molecules.methane, 109.4712],
    [molecules.ammonia, 107],
    [molecules.water, 104.5],
  ] as const) {
    const [a, b] = model.bonds;
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    assert.ok(Math.abs((Math.acos(dot) * 180) / Math.PI - angle) < 0.001);
    for (const rotation of [0, 90, 180, 270, 360]) {
      const point = projectBond(a, rotation);
      assert.ok(point.x > 0 && point.x < 240 && point.y > 0 && point.y < 170);
    }
  }
  assert.match(
    selectRecallExercise(chemicalBonding.sessions[2].markdown)?.question ?? "",
    /beryllium fluoride/,
  );
  assert.match(
    selectRecallExercise(chemicalBonding.sessions[4].markdown)?.question ?? "",
    /both have formula/,
  );
});

test("the shared tutor Markdown retains fractions and matrix rows", () => {
  const text =
    String.raw`Apply $` + String.raw`\frac{1}{2}$ to $\begin{bmatrix}2&4\\6&8\end{bmatrix}$.`;
  const html = renderToStaticMarkup(createElement(Markdown, { text, citations: [] }));
  assert.match(html, /<mfrac>/);
  assert.equal((html.match(/<mtr>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /katex-error/);
});

test("quantity CAS checks dimensions before comparing SI magnitudes", async () => {
  const check = (value: string, unit: string, otherValue: string, otherUnit: string) =>
    checkMathStep({
      kind: "quantity",
      reference: { value, unit },
      next: { value: otherValue, unit: otherUnit },
    });
  assert.equal((await check("2.5", "kJ", "2500", "J")).status, "equivalent");
  assert.equal((await check("18", "g/\\text{mol}", "0.018", "kg/mol")).status, "equivalent");
  assert.equal((await check("4", "N \\cdot m", "4", "kg*m^2/s^2")).status, "equivalent");
  assert.equal((await check("1", "g/cm^{3}", "1000", "kg/m^3")).status, "equivalent");
  assert.match((await check("4", "N*m", "4", "N")).message, /different SI dimensions/);
  assert.match((await check("2.5", "kJ", "2.5", "J")).message, /magnitudes differ/);
  assert.equal((await check("1", "", "1", "m")).status, "unsupported");
  assert.equal((await check("1", "m/", "1", "m")).status, "unsupported");
  assert.equal((await check("1", "constructor", "1", "m")).status, "unsupported");
});

test("structured source figure retains an optional hashed vector PDF beside the PNG", () => {
  const document = {
    version: 1,
    parser: { name: "marker", version: "2.1", review: "source-compared" },
    source: { document: "science-guide", sha256: "a".repeat(64), pageStart: 3, pageEnd: 3 },
    blocks: [
      {
        id: "diagram",
        type: "figure",
        asset: `${"b".repeat(64)}.png`,
        vectorAsset: `${"c".repeat(64)}.pdf`,
        caption: "Circuit",
        sourcePage: 3,
      },
    ],
  };
  assert.equal(structuredDocumentSchema.safeParse(document).success, true);
  assert.equal(
    structuredDocumentSchema.safeParse({
      ...document,
      blocks: [{ ...document.blocks[0], vectorAsset: "../../figure.pdf" }],
    }).success,
    false,
  );
});
