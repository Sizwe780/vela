import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,cp,readFile,writeFile,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {loadModuleSpec,auditUnit} from "../lib/specs";
const markdown=`## Learning goal
Explain a method by connecting its assumptions to each justified reasoning step.
## Prerequisites
Recognize basic notation and distinguish an input from its corresponding output.
## Intuition first
Build a clear mental model before introducing formal notation. An everyday comparison motivates why a rule must respect its assumptions. Explain the operation in words and invite the learner to distinguish a general claim from one observed example.
## Why this works / conditions
The conclusion follows because each allowed operation preserves the stated relationship under its assumptions. Checking the domain first prevents an unjustified step, so the method connects known information to a result rather than guessing from a diagram.
## Visual exploration
An original schematic represents quantities and their changing relationship without claiming to prove the general statement.
## Procedure
Explain the rule and its conditions visibly before asking for an independent calculation.
### Original worked example
:::exercise Apply the justified method
Which assumption must be checked before the operation is allowed?
:::answer
Worked solution: check that the required domain condition holds before applying the operation, then justify the resulting relationship.
:::end
## Interpretation
Interpret the result in context and state where the method stops applying.
## Common mistakes
Diagnose a plausible misconception and repair the incorrect reasoning without revealing the answer to a particular assessment question.
## Assessment
### Recognition
:::exercise Recognition
Identify the kind of condition required for this method.
:::answer
Answer: a condition restricting the valid inputs must be checked before applying the rule.
:::end
### Procedure
:::exercise Procedure
Describe the order of checks and justified transformations.
:::answer
Answer: inspect the domain first, apply valid transformations and interpret the resulting claim within its stated assumptions.
:::end
### Error correction
:::exercise Error correction
What is wrong with applying the operation to every possible input?
:::answer
Answer: inputs outside the allowed domain invalidate the rule; restrict the claim and explain the failed assumption.
:::end
### Transfer
:::exercise Transfer
How would you adapt the method when the input contract changes?
:::answer
Answer: recheck every assumption against the new contract before reusing any transformation from the original method.
:::end
## Application
PCK teaching suggestions include a formative check and a fictional classroom decision. Explain a teaching principle, then use an independent task to observe reasoning.
## Pause and Predict
:::exercise Pause and Predict
Will the conclusion remain justified if a required condition fails?
:::answer
Answer: it is no longer established by this rule; investigate a different valid method or explain why the claim fails.
:::end`;
const unit={code:"MAT1512-U1",sessions:Array.from({length:6},(_,i)=>({title:`Concept ${i+1}`,markdown,visual:i===0?"limit":null}))};
test("profiles retain core and keep programming independent of mathematics",async()=>{
 const math=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"}),program=await loadModuleSpec({institution:"UNISA",moduleCode:"COS1511"});
 assert.equal(math.documents.length,6);assert.deepEqual(math.domains,["mathematics","education-pck"]);assert.deepEqual(program.domains,["programming"]);assert.equal(program.requirements.minSessions,1);assert.equal(program.documents.some(d=>d.file==="mathematics-content-spec.md"),false);assert.equal((await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"})).hash,math.hash);
 await assert.rejects(loadModuleSpec({institution:"UNISA",moduleCode:"MAT9999"}),/Register exactly one/);
 const audit=auditUnit(math,unit,{allowedVisuals:["limit"],sourceProse:["A separate reference inventory records scientific facts without narrative."]});assert.equal(audit.passed,true,JSON.stringify(audit.issues));
});
test("QA rejects shallow content, broken math, unsafe hooks, privacy leaks and source copying",async()=>{
 const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});const shallow=auditUnit(spec,{code:"X",sessions:[{title:"Incomplete",markdown:"## Intuition first\nOnly a heading remains here."}]},{requireSourceAudit:true});assert.equal(shallow.passed,false);assert.ok(shallow.issues.some(i=>i.code==="SOURCE_AUDIT_UNAVAILABLE"));assert.ok(shallow.issues.some(i=>i.code==="SESSION_DEPTH"));
 const broken={...unit,sessions:unit.sessions.map((s,i)=>i?s:{...s,visual:"untrusted-code",markdown:s.markdown+"\n$$unclosed\nContact pupil@example.invalid"})};const result=auditUnit(spec,broken,{allowedVisuals:["limit"],sourceProse:[markdown]});for(const code of ["MATH_SYNTAX","UNKNOWN_VISUAL","PRIVACY_REVIEW","SOURCE_PROSE_OVERLAP"])assert.ok(result.issues.some(i=>i.code===code),code);
 assert.equal(auditUnit(spec,unit).issues.some(i=>i.code==="SOURCE_AUDIT_UNAVAILABLE"&&i.severity==="warning"),true);
});
test("core omissions and unsafe paths fail closed; policy edits change effective hashes",async()=>{
 const temp=await mkdtemp(join(tmpdir(),"vela-specs-"));try{const root=join(temp,"specs");await cp(resolve(".vela/specs"),root,{recursive:true});const input={institution:"UNISA",moduleCode:"MAT1512"};const before=await loadModuleSpec(input,{root});await writeFile(join(root,"mathematics-content-spec.md"),(await readFile(join(root,"mathematics-content-spec.md"),"utf8"))+"\nEditorial revision.\n");assert.notEqual((await loadModuleSpec(input,{root})).hash,before.hash);
 const manifest=JSON.parse(await readFile(join(root,"manifest.json"),"utf8"));const saved=[...manifest.core];manifest.core.pop();await writeFile(join(root,"manifest.json"),JSON.stringify(manifest));await assert.rejects(loadModuleSpec(input,{root}),/Universal Core/);manifest.core=saved;manifest.domains.mathematics.file="../outside.md";await writeFile(join(root,"manifest.json"),JSON.stringify(manifest));await assert.rejects(loadModuleSpec(input,{root}));
 }finally{await rm(temp,{recursive:true,force:true});}
});

test("source audit cannot be satisfied by an empty or non-prose corpus",async()=>{
 const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});
 for(const sourceProse of [[],[""],["  \n  "],["$x^2$"],["Only three words"]]){
  const report=auditUnit(spec,unit,{sourceProse,requireSourceAudit:true,allowedVisuals:["limit"]});
  assert.equal(report.passed,false,JSON.stringify(sourceProse));assert.ok(report.issues.some(i=>i.code==="SOURCE_AUDIT_UNAVAILABLE"&&i.severity==="error"));assert.equal(report.checks.includes("eight-word-source-prose-screen"),false);
  const offline=auditUnit(spec,unit,{sourceProse,allowedVisuals:["limit"]});assert.ok(offline.issues.some(i=>i.code==="SOURCE_AUDIT_UNAVAILABLE"&&i.severity==="warning"));
 }
 const valid=auditUnit(spec,unit,{sourceProse:["", "An independent reference contains enough substantive prose for this overlap comparison."],requireSourceAudit:true,allowedVisuals:["limit"]});assert.equal(valid.passed,true,JSON.stringify(valid.issues));assert.ok(valid.checks.includes("eight-word-source-prose-screen"));
 assert.equal(auditUnit(spec,unit).checks.includes("registered-visuals"),false);
});

test("the current content policy requires visible teaching before hidden exercise feedback",async()=>{
 const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});assert.equal(spec.version,"1.4.0");
 const cases:[string,string][]=[
 [markdown.replace(":::answer",":::end"),"EXERCISE_PROTOCOL"],
 [markdown.replace("Which assumption must be checked before the operation is allowed?","Which condition applies? Answer: the correct condition is already supplied."),"QUESTION_ANSWER_LEAK"],
 [markdown+"\nWorked solution: this exposed calculation must be hidden.","VISIBLE_ANSWER"],
 [markdown.replace(/:::exercise Recognition[\s\S]*?:::end/,"Identify the condition before reading the answer."),"UNGATED_ASSESSMENT"],
 [markdown.replace("Explain a method by connecting its assumptions to each justified reasoning step.","Goal."),"SUBSTANTIVE_TEACHING"],
 [":::exercise Start too soon\nCan you solve this independently before being taught?\n:::answer\nAnswer: no prior teaching was supplied before this exercise.\n:::end\n"+markdown,"TEACH_BEFORE_ATTEMPT"],
 [markdown.replace(/:::exercise Apply the justified method[\s\S]*?:::end/,"Attempt this original example without a hidden solution."),"UNGATED_WORKED_EXAMPLE"],
 [markdown+"\nThis example follows the supplied 2026 scope.","INSTITUTIONAL_TEACHING_FRAMING"],
 [markdown.replace("Worked solution:","Worked solution: review the MAT1512 study guide, then"),"INSTITUTIONAL_TEACHING_FRAMING"],
 ];
 for(const [text,code] of cases){const report=auditUnit(spec,{...unit,sessions:unit.sessions.map((s,i)=>i?s:{...s,markdown:text})},{allowedVisuals:["limit"]});assert.ok(report.issues.some(i=>i.code===code),code+JSON.stringify(report.issues));}
});

test("validated hidden feedback does not require legacy answer labels",async()=>{
 const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});
 const noLabels=markdown.replace(/(?:Worked solution|Answer): /g,"");
 const result=auditUnit(spec,{...unit,sessions:unit.sessions.map(s=>({...s,markdown:noLabels}))},{allowedVisuals:["limit"]});assert.equal(result.passed,true,JSON.stringify(result.issues));
 const malformed=noLabels.replace(":::answer",":::answerbroken");const invalid=auditUnit(spec,{...unit,sessions:unit.sessions.map(s=>({...s,markdown:malformed}))},{allowedVisuals:["limit"]});assert.ok(invalid.issues.some(i=>i.code==="ASSESSMENT_FEEDBACK"));assert.equal(invalid.passed,false);
});
