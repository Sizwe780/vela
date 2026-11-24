import { test } from "node:test";
import assert from "node:assert/strict";
import { nextRecall } from "../lib/recall/schedule";
import { clipNote, noteInput } from "../lib/notes/input";
import { buildTutorPrompt } from "../lib/tutor/prompt";
test("notes reject identity overrides, oversized drafts and invalid revisions",()=>{
  const valid={studyUnitId:"unit",body:"My own notes",revision:0};
  assert.ok(noteInput.safeParse(valid).success);
  for(const data of [{...valid,studentId:"another-user"},{...valid,revision:-1},{...valid,revision:.5},{...valid,body:"x".repeat(16001)}])assert.equal(noteInput.safeParse(data).success,false);
  const math=String.raw`$$\lim_{x\to2}\frac{x^2-4}{x-2}=4$$`;
  assert.equal(clipNote("Existing","Derivation",math),`Existing\n\n## Derivation\n\n${math}`);
});
test("Again resets to ten minutes; Good and Easy expand bounded review intervals",()=>{
  const now=new Date("2026-11-07T12:00:00Z");
  assert.equal(nextRecall(0,null,now).getTime()-now.getTime(),600000);
  assert.equal(nextRecall(.7,null,now).getTime()-now.getTime(),86400000);
  const previous={lastAssessedAt:now,nextReviewAt:new Date(now.getTime()+3*86400000)};
  assert.equal(nextRecall(1,previous,now).getTime()-now.getTime(),7.5*86400000);
  assert.equal(nextRecall(0,previous,now).getTime()-now.getTime(),600000);
  assert.throws(()=>nextRecall(NaN,null,now));assert.throws(()=>nextRecall(1.1,null,now));
});
test("both tutor modes use Vela scaffolding without weakening evidence rules",()=>{
  for(const mode of ["academic","pck"] as const){const prompt=buildTutorPrompt(mode,[],"unit");for(const rule of ["Intuition First","Multi-Layered Scaffolding","Pause and Predict","Do not echo long","Never invent"])assert.ok(prompt.includes(rule));}
});
