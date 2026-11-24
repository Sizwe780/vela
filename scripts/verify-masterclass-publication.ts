import "dotenv/config";
import {PrismaClient} from "../generated/app-client";
import {PrismaPg} from "@prisma/adapter-pg";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {loadModuleSpec} from "../lib/specs";
import {curriculum} from "../content/mat1512/sessions";
import {normalizeMath} from "../lib/content/math";
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
async function main(){try{const spec=await loadModuleSpec({institution:"UNISA",moduleCode:"MAT1512"});const audits=JSON.parse(await readFile("../work/session-audit/publish-preflight.json","utf8"));assert.equal(audits.length,5);assert.ok(audits.every((a:any)=>a.passed&&a.specHash===spec.hash&&a.checks.includes("eight-word-source-prose-screen")));
 const units=await db.studyUnit.findMany({where:{code:{in:curriculum.map(u=>u.code)},module:{institution:"UNISA",code:"MAT1512"}},select:{code:true,sessions:{orderBy:{position:"asc"},select:{id:true,title:true,position:true,version:true,markdown:true,visual:true,concepts:true}}}});assert.equal(units.length,5);
 for(const unit of units){const expected=curriculum.find(u=>u.code===unit.code)!;assert.equal(unit.sessions.length,6);for(const [i,s]of unit.sessions.entries()){const meta=s.concepts as any;assert.equal(s.version,3);assert.equal(s.title,expected.sessions[i].title);assert.equal(s.markdown,normalizeMath(expected.sessions[i].markdown));assert.equal(s.visual,expected.sessions[i].visual);assert.equal(meta.specHash,spec.hash);assert.equal(meta.contentHash,createHash("sha256").update(s.markdown).digest("hex"));}}
 const report={verifiedAt:new Date().toISOString(),specHash:spec.hash,specVersion:spec.version,contentVersion:3,totalSessions:30,units:units.map(u=>({code:u.code,sessions:u.sessions.length,visualHooks:u.sessions.flatMap(s=>s.visual?[s.visual]:[])})),audits,limitations:"Source screening and syntax checks are heuristics; not a legal or mathematical certification."};await mkdir(".vela/reports",{recursive:true});await writeFile(".vela/reports/publication.json",JSON.stringify(report,null,2));console.log("Verified 30 published sessions: text, visual hooks, revision, specification and content hashes match the authored curriculum; full source-screen receipts passed.");
}finally{await db.$disconnect();}}
main().catch(e=>{console.error(e instanceof Error?e.message:"Verification failed");process.exitCode=1;});
