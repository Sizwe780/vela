import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import {lessonSections} from "../lib/content/lesson-sections";
import {parseLearningBlocks} from "../lib/content/exercises";
import {checkPracticeQuantity,practiceCheck} from "../lib/content/practice-checks";
import {encryptLesson,decryptLesson} from "../lib/offline/vault";
test("section navigation preserves fenced code and gated answers without splitting exercise headings",()=>{
 const source=['## Intuition first','A useful hook.','```md','## Example code heading','```','## Assessment',':::exercise Transfer','Question?',':::answer','## Heading inside the answer','Reasoned answer.',':::end'].join('\n');
 const beats=lessonSections(source);assert.equal(beats.length,2);assert.equal(beats[1].kind,"checks");assert.equal(beats.map(b=>b.text).join('\n'),source);assert.deepEqual(parseLearningBlocks(beats[1].text).errors,[]);
});
test("reviewed practice checks validate prefixes, Unicode dimensions and rounded values without guessing unknown questions",()=>{
 const expected={value:4*Math.PI**2/3.98,unit:"m/s^2",tolerance:.01};
 assert.equal(checkPracticeQuantity("9.92","m/s²",expected).correct,true);
 assert.equal(checkPracticeQuantity("9920","mm/s^2",expected).correct,true);
 assert.equal(checkPracticeQuantity("9.92","s",expected).correct,false);
 assert.equal(checkPracticeQuantity("99.2","m/s^2",expected).correct,false);
 assert.equal(checkPracticeQuantity("Infinity","m/s^2",expected).correct,false);
 assert.equal(checkPracticeQuantity("9.92","",expected).correct,false);
 assert.equal(practiceCheck("An unreviewed AI question"),undefined);
});
test("offline packs encrypt all lesson text, reject a wrong passphrase and detect tampering",async()=>{
 const lesson={version:1 as const,id:"synthetic-unit",title:"Private title",moduleCode:"SYNTHETIC",markdown:"Private text with $$x^2$$",revision:2};
 const record=await encryptLesson(lesson,"a-test-only-secret","synthetic-student");assert.equal(JSON.stringify(record).includes("Private"),false);assert.deepEqual(await decryptLesson(record,"a-test-only-secret"),lesson);
 await assert.rejects(decryptLesson(record,"different-secret"));
 const bytes=Uint8Array.from(atob(record.cipher),c=>c.charCodeAt(0));bytes[0]^=1;
 await assert.rejects(decryptLesson({...record,cipher:btoa(String.fromCharCode(...bytes))},"a-test-only-secret"));
 await assert.rejects(encryptLesson(lesson,"short","synthetic-student"));
});
test("offline worker rejects private/API cache entries and never intercepts private API reads",async()=>{
 const handlers:Record<string,(event:any)=>void>={},added:string[]=[],fetched:string[]=[];let allowed=false;
 const cache={addAll:async(requests:any[])=>{added.push(...requests.map(r=>typeof r==="string"?r:r.url));},match:async()=>undefined};
 const context={self:{location:{origin:"https://vela.test"},addEventListener:(name:string,handler:any)=>{handlers[name]=handler;},skipWaiting:()=>{}},URL,Request,Response,caches:{open:async()=>cache},fetch:async(url:any)=>{fetched.push(String(url));return Response.json({assets:allowed?["/offline.html","/offline-assets/reader-test.js"]:["/api/notes"]});}};
 vm.runInNewContext(await readFile("public/sw.js","utf8"),context);
 let task:Promise<void>|undefined;let result:any;
 const message={data:{type:"PREPARE_OFFLINE"},ports:[{postMessage:(value:any)=>{result=value;}}],waitUntil:(promise:Promise<void>)=>{task=promise;}};
 handlers.message(message);await task;assert.equal(result.ok,false);assert.equal(added.length,0);assert.ok(fetched.every(u=>!u.includes("/api/")));
 allowed=true;handlers.message(message);await task;assert.equal(result.ok,true);assert.equal(added.length,2);
 let intercepted=false;handlers.fetch({request:{url:"https://vela.test/api/notes",method:"GET",mode:"navigate"},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
});
