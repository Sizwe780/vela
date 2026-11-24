import "dotenv/config";
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir,rename,open,unlink} from "node:fs/promises";
import {resolve,join} from "node:path";
import {Prisma} from "@prisma/client";
import {BulkDatabase} from "./bulk-database";
import {MathWorker} from "./math-worker";
import {storeMarkerFigure} from "./store-marker-figure";
import {normalizeMarkerArtifacts} from "../lib/content/marker-normalize";
import {validatePage} from "../lib/content/bulk";
import {structuredDocumentSchema,documentSourceUrl,type StructuredDocument} from "../lib/content/structured";
import {createIngestionRepository} from "../lib/ingest/repository";
import {ingest} from "../lib/ingest/service";
import {embedTokens,assertVectors,type Embedder} from "../lib/ingest/embeddings";
import {getAIConfig} from "../lib/ai/config";
const code=process.argv.find(a=>a.startsWith("--module="))?.split("=")[1]??"MAT1503";
if(!/^[A-Z]{3}[0-9]{4}$/.test(code))throw Error("Invalid module code");
const root=resolve(`../work/math-parser/modules/${code}`),assets=resolve(process.env.MATH_ASSET_DIR||"../work/math-parser/bulk/assets"),lockPath=join(root,"runner.lock");
const db=new BulkDatabase(),worker=new MathWorker();let stop=false;
process.on("SIGINT",()=>{stop=true;});process.on("SIGTERM",()=>{stop=true;});
async function atomic(path:string,data:unknown){await writeFile(path+".tmp",JSON.stringify(data,null,2),{flush:true});await rename(path+".tmp",path);}
async function exists(path:string){try{await readFile(path);return true;}catch{return false;}}
type Entry={status:"pending"|"converted"|"needs-review";error?:string;ingestionId?:string;figures?:number;formulas?:number;seconds?:number};
async function main(){let locked=false;try{
 await mkdir(root,{recursive:true});await mkdir(assets,{recursive:true});
 if(process.argv.includes("--status")){console.log(await readFile(`module-conversion-${code}.json`,"utf8"));return;}
 if(process.argv.includes("--resume"))await unlink(join(root,"pause.request")).catch(()=>{});
 const plan=JSON.parse(await readFile(`content/${code.toLowerCase()}/plan.json`,"utf8"));if(plan.moduleCode!==code)throw Error("Module scope mismatch");
 if(process.argv.includes("--resume")&&await exists(lockPath)){const previous=JSON.parse(await readFile(lockPath,"utf8"));let alive=true;try{process.kill(previous.pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==="ESRCH")alive=false;}if(alive)throw Error("A module converter is already running");await unlink(lockPath);}
 const lock=await open(lockPath,"wx");locked=true;await lock.writeFile(JSON.stringify({pid:process.pid,moduleCode:code,startedAt:new Date().toISOString()}));await lock.close();
 const rawPages=new Map<string,string>();for(const [source,file]of Object.entries(plan.inspectionFiles??{})){for(const page of JSON.parse(await readFile(resolve(file as string),"utf8")))rawPages.set(`${source}:${page.page}`,page.text);}
 const lookup=new Map<string,any>();for(const source of plan.sources){const path=resolve(source.directory,source.filename);if(createHash("sha256").update(await readFile(path)).digest("hex")!==source.sha256)throw Error("Source hash changed");lookup.set(source.id,{...source,path});}
 const jobs:{key:string;source:string;page:number;unitCode:string}[]=[];
 for(const source of plan.sources){const groups=plan.units.map((u:any)=>({unit:u.code,pages:u.references.filter((r:any)=>r.source===source.id).flatMap((r:any)=>Array.from({length:r.pageEnd-r.pageStart+1},(_,i)=>r.pageStart+i))}));for(let i=0;groups.some((g:any)=>i<g.pages.length);i++)for(const group of groups)if(group.pages[i])jobs.push({key:`${source.id}:${group.pages[i]}`,source:source.id,page:group.pages[i],unitCode:group.unit});}
 if(new Set(jobs.map(j=>j.key)).size!==jobs.length)throw Error("Conflicting or repeated source-page mapping");
 const scope=createHash("sha256").update(JSON.stringify({jobs,sources:plan.sources.map((s:any)=>s.sha256)})).digest("hex");
 let state:{scope:string;jobs:Record<string,Entry>};try{state=JSON.parse(await readFile(join(root,"state.json"),"utf8"));}catch{state={scope,jobs:{}};}if(state.scope!==scope)throw Error("Changed scope requires a separate checkpoint workspace");for(const j of jobs)state.jobs[j.key]??={status:"pending"};
 const rows=await db.query<{id:string;code:string;moduleId:string;learningOutcomeId:string;assessmentCriterionId:string}>(Prisma.sql`SELECT u.id,u.code,u."moduleId",lo.id AS "learningOutcomeId",ac.id AS "assessmentCriterionId" FROM "StudyUnit" u JOIN "Module" m ON m.id=u."moduleId" JOIN "LearningOutcome" lo ON lo."studyUnitId"=u.id JOIN "_OutcomeCriteria" oc ON oc."B"=lo.id JOIN "AssessmentCriterion" ac ON ac.id=oc."A" WHERE m.code=${code} AND m.institution=${plan.institution} ORDER BY u.position,lo.position`);
 const mappings=new Map(rows.map(r=>[r.code,r]));if(plan.units.some((u:any)=>!mappings.has(u.code)))throw Error("Register all module units before conversion");
 const prior=await db.query<{id:string;doc:unknown}>(Prisma.sql`SELECT i.id,i."structuredContent" AS doc FROM "Ingestion" i JOIN "LearningOutcome" lo ON lo.id=i."learningOutcomeId" JOIN "StudyUnit" u ON u.id=lo."studyUnitId" WHERE u."moduleId"=${rows[0].moduleId} AND i."embeddingProvider"='cloudflare' AND i."structuredContent" IS NOT NULL`);
 for(const row of prior){const p=structuredDocumentSchema.safeParse(row.doc);if(p.success){const key=`${p.data.source.document}:${p.data.source.pageStart}`;if(state.jobs[key]&&lookup.get(p.data.source.document)?.sha256===p.data.source.sha256&&p.data.source.pageStart===p.data.source.pageEnd)state.jobs[key]={...state.jobs[key],status:"converted",ingestionId:row.id};}}
 const report=async(status:string)=>{const converted=jobs.filter(j=>state.jobs[j.key].status==="converted").length;const held=jobs.filter(j=>state.jobs[j.key].status==="needs-review");const summary={moduleCode:code,updatedAt:new Date().toISOString(),status,total:jobs.length,converted,needsReview:held.length,remaining:jobs.length-converted-held.length,providers:{cloudflare:converted},units:Object.fromEntries(plan.units.map((u:any)=>[u.code,{total:jobs.filter(j=>j.unitCode===u.code).length,converted:jobs.filter(j=>j.unitCode===u.code&&state.jobs[j.key].status==="converted").length}])),reviewPages:held.map(j=>({...j,reason:state.jobs[j.key].error}))};await atomic(join(root,"state.json"),state);await atomic(`module-conversion-${code}.json`,summary);try{await db.query(Prisma.sql`UPDATE "Module" SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{conversion}',${JSON.stringify(summary)}::jsonb) WHERE id=${rows[0].moduleId}`);}catch{console.log("Server progress update unavailable; local checkpoint retained.");}console.log(`${code}: ${converted}/${jobs.length}, held${held.length} · ${status}`);};
 if(process.argv.includes("--status")){await report("checkpoint");return;}
 process.env.AI_PROVIDER="cloudflare";
 await mkdir(join(root,"embeddings"),{recursive:true});
 const cachedEmbed:Embedder=async(inputs,context)=>{const space=getAIConfig().embeddingSpace;const result:number[][]=[];const missing:number[]=[];const keys=inputs.map((_,i)=>createHash("sha256").update(JSON.stringify({space,text:context!.texts[i]})).digest("hex"));for(let i=0;i<inputs.length;i++)try{result[i]=JSON.parse(await readFile(join(root,"embeddings",keys[i]+".json"),"utf8"));assertVectors([result[i]],1,space.dimensions);}catch{missing.push(i);}if(missing.length){const vectors=await embedTokens(missing.map(i=>inputs[i]),{...context,purpose:context?.purpose??"document",texts:missing.map(i=>context!.texts[i])});for(const [offset,i]of missing.entries()){result[i]=vectors[offset];await atomic(join(root,"embeddings",keys[i]+".json"),vectors[offset]);}}return result;};
 const repository=createIngestionRepository(db);
 await report("running");const limit=Number(process.argv.find(a=>a.startsWith("--limit="))?.split("=")[1]??Infinity);let count=0;
 for(const job of jobs){if(stop||count>=limit||await exists(join(root,"pause.request")))break;const entry=state.jobs[job.key];if(process.argv.includes("--review-only")&&entry.status!=="needs-review")continue;if(entry.status==="converted"||entry.status==="needs-review"&&!process.argv.includes("--retry-review"))continue;count++;
 const source=lookup.get(job.source);const folder=join(root,source.sha256.slice(0,16),String(job.page));await mkdir(folder,{recursive:true});
 try{let document:StructuredDocument|undefined;try{document=structuredDocumentSchema.parse(JSON.parse(await readFile(join(folder,"structured.json"),"utf8")));if(document.source.sha256!==source.sha256||document.source.document!==job.source||document.source.pageStart!==job.page||document.source.pageEnd!==job.page)document=undefined;}catch{}
 if(!document){let last:unknown;for(const dpi of [144,192])try{const output=join(folder,String(dpi));await mkdir(output,{recursive:true});if(!await exists(join(output,"result.json")))await worker.run({pdf:source.path,page:job.page,dpi,output});const raw=JSON.parse(await readFile(join(output,"result.json"),"utf8"));if(raw.page!==job.page||raw.dpi!==dpi)throw Error("OCR result identity mismatch");
 const checked=validatePage(normalizeMarkerArtifacts(raw.markdown),rawPages.get(job.key)??"",raw.images.length);const refs=new Map();for(const image of raw.images)refs.set(image.reference,await storeMarkerFigure(output,assets,image));
 let text=checked.markdown;const blocks:StructuredDocument["blocks"]=[];text=text.replace(/!\[[^\]]*\]\(([^)]+)\)/g,(_m:string,ref:string)=>{if(!refs.has(ref))throw Error("Missing referenced figure");return "";});if(text.trim())blocks.push({id:"text",type:"markdown",markdown:text});for(const asset of refs.values())blocks.push({id:`figure-${blocks.length}`,type:"figure",...asset,caption:`Source illustration, PDF page ${job.page}`,sourcePage:job.page});
 document=structuredDocumentSchema.parse({version:1,parser:{name:"marker",version:"2.1.0",review:"machine",profile:`module-v1;dpi=${dpi};surya=0.23.0`},source:{document:job.source,sha256:source.sha256,pageStart:job.page,pageEnd:job.page},blocks});entry.figures=refs.size;entry.formulas=checked.formulas;entry.seconds=raw.seconds;await atomic(join(folder,"structured.json"),document);break;
 }catch(error){last=error;}if(!document)throw last;}
 const map=mappings.get(job.unitCode)!;let saved=false;for(let attempt=0;attempt<3;attempt++)try{const receipt=await ingest({moduleCode:code,studyUnitId:map.id,learningOutcomeId:map.learningOutcomeId,assessmentCriterionId:map.assessmentCriterionId,sourceName:`Marker OCR ${job.source} · PDF${job.page}`,structuredContent:document},repository,cachedEmbed);await db.repairLinks(receipt.ingestionId,documentSourceUrl(document));entry.status="converted";entry.ingestionId=receipt.ingestionId;entry.error=undefined;saved=true;break;}catch(e){if(attempt===2||!(e instanceof Error)||!/fetch|timeout|timed out|unavailable|embedding|connection/i.test(e.message))throw e;console.log(`RETRY persistence ${job.key} attempt${attempt+1}`);await new Promise(r=>setTimeout(r,2000*(attempt+1)));}if(!saved)throw Error("Persistence incomplete");
 }catch(e){const transient=e instanceof Error&&/fetch|timeout|timed out|quota|unavailable|embedding|connection|exceeded 15 minutes/i.test(e.message);entry.status=transient?"pending":"needs-review";if(transient)stop=true;entry.error=e instanceof Error?e.message.slice(0,600):"Conversion failed";console.log(`HOLD ${job.key}: ${entry.error}`);}
 await report("running");}
 await report(jobs.every(j=>state.jobs[j.key].status==="converted")?"complete":"paused-or-needs-review");
 }finally{worker.stop();if(locked)await unlink(lockPath).catch(()=>{});await db.disconnect();}}
main().catch(e=>{console.error(e instanceof Error?e.message:"Module conversion failed");process.exitCode=1;});
