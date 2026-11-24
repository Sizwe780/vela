import "dotenv/config";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {PrismaClient,Prisma} from "../generated/app-client";
import {PrismaPg} from "@prisma/adapter-pg";
import {curriculum} from "../content/mat1503/sessions";
import {loadModuleSpec,auditUnit} from "../lib/specs";
import {normalizeMath,mathSpans} from "../lib/content/math";
import {parseLearningBlocks} from "../lib/content/exercises";
import {visualPresetIds} from "../lib/content/visual-presets";
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
async function main(){try{
 const plan=JSON.parse(await readFile("content/mat1503/plan.json","utf8"));const spec=await loadModuleSpec({institution:plan.institution,moduleCode:plan.moduleCode});
 const diagnostic=new Map<string,Map<number,string>>();for(const [id,path]of Object.entries(plan.inspectionFiles)){const pages=JSON.parse(await readFile(path as string,"utf8"));diagnostic.set(id,new Map(pages.map((p:any)=>[p.page,p.text])));}
 const registered=await db.studyUnit.findMany({where:{module:{institution:plan.institution,code:plan.moduleCode}},include:{sessions:{select:{id:true,position:true}}}});
 const staged:any[]=[],reports:any[]=[];let formulas=0,exercises=0;
 for(const unit of curriculum){const row=registered.find(r=>r.code===unit.code),scope=plan.units.find((u:any)=>u.code===unit.code);if(!row||!scope)throw Error("Curriculum registration/scope mismatch");const sourceProse=scope.references.flatMap((ref:any)=>Array.from({length:ref.pageEnd-ref.pageStart+1},(_,i)=>diagnostic.get(ref.source)?.get(ref.pageStart+i)??""));
 const report=auditUnit(spec,unit,{sourceProse,allowedVisuals:visualPresetIds,requireSourceAudit:true});reports.push({...report,sourceComparison:"Full selected native-PDF prose used only for originality screening; not claimed math-aware OCR or independent semantic fact validation.",sourcePages:sourceProse.length});if(!report.passed)throw Error(`${unit.code}: ${JSON.stringify(report.issues)}`);
 for(const [index,s]of unit.sessions.entries()){const markdown=normalizeMath(s.markdown);formulas+=mathSpans(markdown).length;exercises+=parseLearningBlocks(markdown).blocks.filter(b=>b.type==="exercise").length;
 const id=row.sessions.find(s=>s.position===index+1)?.id??`${row.id}-S${index+1}`;
 staged.push({id,studyUnitId:row.id,position:index+1,title:s.title,markdown,visual:s.visual,version:1,concepts:{topics:s.concepts,authorship:"vela-original",specHash:spec.hash,specVersion:spec.version,specDocuments:spec.documents.map(d=>({file:d.file,hash:d.hash})),contentHash:createHash("sha256").update(markdown).digest("hex"),sourceReferences:scope.references,coverage:"Six structured sessions per supplied tutorial-resource topic, not an exhaustive transcription of every textbook chapter or exercise.",completionPolicy:"Reading/reveal are not assessed mastery."}});
 }
 }
 await mkdir(".vela/reports",{recursive:true});await writeFile(".vela/reports/MAT1503-preflight.json",JSON.stringify({specHash:spec.hash,sessions:staged.length,formulas,exercises,reports},null,2));
 if(staged.length!==78||curriculum.length!==13)throw Error("All13units/78sessions required before publication");
 if(process.argv.includes("--audit-only")){console.log(`MAT1503 full source-prose preflight passed:78sessions,${exercises}gates,${formulas}math expressions. No lessons changed.`);return;}
 await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('vela-masterclass-publish'))`;
 const existing=await tx.studySession.findMany({where:{OR:[{id:{in:staged.map(s=>s.id)}},{studyUnitId:{in:registered.map(u=>u.id)}}]},select:{id:true,studyUnitId:true}});if(existing.some(e=>!staged.some(s=>s.id===e.id&&s.studyUnitId===e.studyUnitId)))throw Error("Unexpected session ownership or stale session; explicit migration needed");
 await tx.$executeRaw(Prisma.sql`INSERT INTO "StudySession" (id,"studyUnitId",position,title,markdown,visual,concepts,version) SELECT id,"studyUnitId",position,title,markdown,visual,concepts,version FROM jsonb_to_recordset(${JSON.stringify(staged)}::jsonb) AS r(id text,"studyUnitId" text,position int,title text,markdown text,visual text,concepts jsonb,version int) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,markdown=EXCLUDED.markdown,visual=EXCLUDED.visual,concepts=EXCLUDED.concepts,version=EXCLUDED.version`);
 await tx.$executeRaw(Prisma.sql`UPDATE "Module" SET metadata=COALESCE(metadata,'{}'::jsonb)||${JSON.stringify({authoredStatus:"published",authoredSessions:78,specHash:spec.hash,authoredVersion:1})}::jsonb WHERE id=${registered[0].moduleId}`);
 },{maxWait:10000,timeout:120000});
 const actual=await db.studySession.findMany({where:{studyUnitId:{in:registered.map(u=>u.id)}},select:{id:true,markdown:true,visual:true,concepts:true}});if(actual.length!==78||actual.some(a=>{const s=staged.find(s=>s.id===a.id);return !s||s.markdown!==a.markdown||s.visual!==a.visual||(a.concepts as any).contentHash!==s.concepts.contentHash;}))throw Error("Published content verification mismatch");
 await writeFile(".vela/reports/MAT1503-publication.json",JSON.stringify({verifiedAt:new Date().toISOString(),moduleCode:plan.moduleCode,specHash:spec.hash,sessions:78,formulas,exercises,units:curriculum.map(u=>({code:u.code,title:u.title,sessions:u.sessions.length})),reports,sourceConversion:"Separate checkpointed math-aware source OCR; its progress is not lesson publication or semantic certification."},null,2));
 console.log(`Published and verified13 MAT1503 units,78sessions,${exercises}gated exercises,${formulas}KaTeX expressions. MAT1512 and learner notes/mastery untouched.`);
 }finally{await db.$disconnect();}}
main().catch(e=>{console.error(e instanceof Error?e.message:"Publication failed");process.exitCode=1});
