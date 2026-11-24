import {test} from "node:test";
import assert from "node:assert/strict";
import {synthesizeUnit} from "../lib/generation/draft";
test("closed-book synthesis receives validated facts without source narrative",async()=>{
 const calls:{system:string;prompt:string}[]=[];
 const source="A unique source narrative that must not enter synthesis.";
 const result=await synthesizeUnit({code:"ANY-U1",specPrompt:"Universal core + domain rules",sources:[{id:"c1",body:source}]},async(system,prompt)=>{calls.push({system,prompt});return calls.length===1?JSON.stringify({facts:[{statement:"Rates compare changes",sourceChunkIds:["c1"]}]}):JSON.stringify({code:"ANY-U1",sessions:[{title:"Rates",markdown:"Original explanation. ".repeat(10),visual:null,concepts:["rates"]}]});});
 assert.ok(calls[0].prompt.includes(source));assert.ok(!calls[1].prompt.includes(source));assert.ok(calls[1].prompt.includes("Rates compare changes"));assert.equal(result.draft.code,"ANY-U1");
});
test("fabricated source provenance is rejected before synthesis",async()=>{let calls=0;await assert.rejects(synthesizeUnit({code:"X",specPrompt:"rules",sources:[{id:"c1",body:"evidence"}]},async()=>{calls++;return JSON.stringify({facts:[{statement:"fact",sourceChunkIds:["invented"]}]});}));assert.equal(calls,1);});
