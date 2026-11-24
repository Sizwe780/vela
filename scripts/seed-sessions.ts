import "dotenv/config";
import { PrismaClient, Prisma } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { writeFile,mkdir } from "node:fs/promises";
import { curriculum } from "../content/mat1512/sessions";
import { visualPresetIds } from "../lib/content/visual-presets";
import { loadModuleSpec,auditUnit } from "../lib/specs";
import { normalizeMath,mathSpans } from "../lib/content/math";
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
const words=(s:string)=>s.toLowerCase().match(/[a-z]+/g)??[];
async function main(){ try {
 await mkdir("../work/session-audit",{recursive:true});
 const staged:{id:string;data:{studyUnitId:string;position:number;title:string;markdown:string;visual:string|null;concepts:Prisma.InputJsonValue;version:number}}[]=[];
 const reports:unknown[]=[];
 const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});
 for(const unit of curriculum){
  const row=await db.studyUnit.findFirstOrThrow({where:{code:unit.code,module:{code:"MAT1512",institution:"UNISA"}}});
  const existing=await db.studySession.findMany({where:{studyUnitId:row.id},select:{id:true,position:true}});
  // Pass 1 exports mathematical expressions only, never source narrative, for
  // the fact inventory. This artifact is not imported by the synthesis module.
  if(await db.contentChunk.count({where:{learningOutcome:{studyUnitId:row.id}}})>5000)throw Error("Increase the explicit audit corpus bound before seeding this unit");
  const sources=await db.contentChunk.findMany({where:{learningOutcome:{studyUnitId:row.id}},select:{id:true,body:true},take:5000});
  const facts:{id:string;chunkId:string;formula:string}[]=[];const seen=new Set<string>(),ngrams=new Set<string>();
  for(const source of sources){if(!source.body||seen.has(source.body))continue;seen.add(source.body);const text=normalizeMath(source.body);try{for(const span of mathSpans(text)){const formula=text.slice(span.start,span.end);facts.push({id:createHash("sha256").update(formula).digest("hex").slice(0,16),chunkId:source.id,formula});}}catch{/* Held source expressions are not approved facts. */}const w=words(source.body.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g,""));for(let i=0;i<w.length-7;i++)ngrams.add(w.slice(i,i+8).join(" "));}
  await writeFile(`../work/session-audit/${unit.code}-facts.json`,JSON.stringify(facts,null,2));
  const formulaKey=(s:string)=>s.replace(/\s|\$/g,"");const sourceFormulas=new Set(facts.map(f=>formulaKey(f.formula)));
  const audit=auditUnit(spec,unit,{sourceProse:sources.flatMap(s=>s.body?[s.body]:[]),allowedVisuals:visualPresetIds,requireSourceAudit:true});
  reports.push(audit);
  if(!audit.passed){await writeFile("../work/session-audit/publish-preflight.json",JSON.stringify(reports,null,2));throw Error(`${unit.code}: specification gate rejected publication: ${JSON.stringify(audit.issues)}`);}
  for(const [index,session] of unit.sessions.entries()){
   const markdown=normalizeMath(session.markdown);mathSpans(markdown);
   const headings=[...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)];
   const examples=headings.flatMap((h,i)=>{if(!/^(?:original worked|original example|worked example)/i.test(h[2]))return [];const next=headings.slice(i+1).find(n=>n[1].length<=h[1].length);return [markdown.slice(h.index,next?.index??markdown.length)];});
   for(const example of examples)for(const span of mathSpans(example)){const formula=example.slice(span.start,span.end);if(formula.length>30 && /\d/.test(formula) && sourceFormulas.has(formulaKey(formula)))throw Error(`${unit.code}: choose different example parameters; an exact numerical formula matches the source corpus`);}
   const prose=words(markdown.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g,""));const overlap:string[]=[];for(let i=0;i<prose.length-7;i++){const phrase=prose.slice(i,i+8).join(" ");if(ngrams.has(phrase))overlap.push(phrase);}
   if(overlap.length)throw Error(`${unit.code} ${session.title}: narrative overlap requires rewrite: ${overlap.join("; ")}`);
   const id=existing.find(s=>s.position===index+1)?.id??`${row.id}-S${index+1}`;
   const data={studyUnitId:row.id,position:index+1,title:session.title,markdown,visual:session.visual,concepts:{topics:session.concepts,factCount:facts.length,sourceChunkIds:[...new Set(facts.map(f=>f.chunkId))],audit:"No matching eight-word prose sequence in the checked source corpus. This is a heuristic, not a plagiarism guarantee.",authorship:"vela-original",coverage:"Seven-layer conceptual masterclass with answered cognitive checks; source reference corpus remains separate.",specHash:spec.hash,specVersion:spec.version,specDocuments:spec.documents.map(d=>({file:d.file,hash:d.hash})),contentHash:createHash("sha256").update(markdown).digest("hex"),completionPolicy:"Preserve personal completion when revising; completion does not certify assessed mastery."},version:3};
   staged.push({id,data});
  }
  console.log(`${unit.code}: ${unit.sessions.length} sessions, ${facts.length} source facts; math and prose-overlap checks passed`);
 }
 await writeFile("../work/session-audit/publish-preflight.json",JSON.stringify(reports,null,2));
 if(process.argv.includes("--audit-only")){console.log(`Preflight passed for ${staged.length} sessions; no lessons changed.`);return;}
 // All units and the complete source-corpus checks must pass before any lesson changes.
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('vela-masterclass-publish'))`;
  const ownership=await tx.studySession.findMany({where:{id:{in:staged.map(s=>s.id)}},select:{id:true,studyUnitId:true}});
  if(ownership.some(s=>staged.find(item=>item.id===s.id)?.data.studyUnitId!==s.studyUnitId))throw Error("Session identity belongs to a different unit; publication refused");
  const stale=await tx.studySession.count({where:{studyUnitId:{in:staged.map(s=>s.data.studyUnitId)},id:{notIn:staged.map(s=>s.id)}}});
  if(stale)throw Error("Unexpected existing sessions need an explicit content migration before publication");
  for(const {id,data} of staged)await tx.studySession.upsert({where:{id},create:{id,...data},update:data});
 },{maxWait:10000,timeout:120000});
 await mkdir(".vela/reports",{recursive:true});
 await writeFile(".vela/reports/publication.json",JSON.stringify({publishedAt:new Date().toISOString(),specHash:spec.hash,specVersion:spec.version,contentVersion:3,sessionCount:staged.length,units:curriculum.map(u=>({code:u.code,sessions:u.sessions.length})),audits:reports,completionPolicy:"Preserved personal completion; not assessed mastery",limitations:"Structural, syntax and heuristic source screening passed. This does not certify all semantic, copyright, regulatory or CAPS claims."},null,2));
 console.log(`Published ${staged.length} version-3 sessions atomically; spec ${spec.hash}. Existing notes, mastery and personal completion retained.`);
}finally{await db.$disconnect();}

}
main().catch(e=>{console.error(e);process.exitCode=1});
