import {test} from "node:test";
import assert from "node:assert/strict";
import {curriculum} from "../content/mat1512/sessions";
import {mathSpans,normalizeMath} from "../lib/content/math";
test("all five units have coherent authored sessions and valid complete math",()=>{
 assert.equal(curriculum.length,5);
 for(const unit of curriculum){assert.ok(unit.sessions.length>=3);for(const session of unit.sessions){assert.ok(session.markdown.includes("Intuition first"));assert.ok(/pause and predict/i.test(session.markdown));assert.ok(mathSpans(normalizeMath(session.markdown)).length);// Inline SVG figures (![alt](/lesson-figures/...)) are permitted; block external images are not.
assert.ok(!/!\[.*?\]\(https?:/.test(session.markdown), "session must not embed external images");}}
});
test("hyperbolic reciprocal names preserve meaning using standard KaTeX operators",()=>{
 const text=normalizeMath(String.raw`$$\csch x = \frac{1}{\sinh x},\quad \sech x=\frac1{\cosh x}$$`);
 assert.ok(text.includes(String.raw`\operatorname{csch}`));assert.equal(mathSpans(text).length,1);assert.equal(normalizeMath(text),text);
});
