import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareTutor} from "../lib/tutor/service";
test("tutor loads authored session from server and can answer without matching textbook chunks",async()=>{
 const result=await prepareTutor({studyUnitId:"unit",sessionId:"session",query:"Explain this example",mode:"academic",provider:"ollama"},{unitExists:async()=>true,getSession:async(unit,id)=>unit==="unit"&&id==="session"?{id,title:"Current lesson",markdown:"Exact authored parameters: 84 metres, width21, area882.",version:3}:null,search:async()=>[]},async()=>[Array(768).fill(.1)]);
 assert.match(result.system,/84 metres/);assert.match(result.system,/hints first/i);assert.equal(result.session?.version,3);
});
test("cross-unit session is rejected before any embedding request",async()=>{let embedded=false;await assert.rejects(prepareTutor({studyUnitId:"unit",sessionId:"foreign",query:"Explain",mode:"academic",provider:"ollama"},{unitExists:async()=>true,getSession:async()=>null,search:async()=>[]},async()=>{embedded=true;return [];}),/does not belong/);assert.equal(embedded,false);});
