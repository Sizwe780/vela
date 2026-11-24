import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareTutor } from "../lib/tutor/service";
import { demoRetrieved } from "../lib/study/demo";
import { getAIConfig } from "../lib/ai/config";
test("local tutor bounds whole source chunks and history without changing citation IDs",async()=>{
 const rows=Array.from({length:6},(_,i)=>({...demoRetrieved[0],chunkId:`source-${i}`}));
 const result=await prepareTutor({studyUnitId:"unit",query:"Explain limits",mode:"academic",provider:"ollama",history:Array.from({length:6},()=>({role:"user",content:"Previous question"}))},{unitExists:async()=>true,search:async()=>rows},async()=>[Array(768).fill(.1)]);
 assert.deepEqual(result.chunks,rows.slice(0,1));assert.deepEqual(result.citations.map(c=>c.chunkId),["source-0"]);assert.equal(result.messages.length,3);assert.match(result.system,/at most 60 words/);assert.equal(getAIConfig("ollama").tutorMaxOutputTokens,192);
});
