import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile,writeFile } from "node:fs/promises";
import { resolve,join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { structuredDocumentSchema } from "../lib/content/structured";
import { mathSpans,normalizeMath } from "../lib/content/math";
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
async function main(){try{
 const rows=await db.ingestion.findMany({where:{learningOutcome:{studyUnit:{module:{code:"MAT1512",institution:"UNISA"}}}},select:{id:true,structuredContent:true,embeddingProvider:true,_count:{select:{chunks:true}},learningOutcome:{select:{studyUnit:{select:{code:true}}}}}});
 const providerPages=new Map<string,Set<string>>(),units=new Map<string,Set<string>>(),assets=new Set<string>();let documents=0,mathFailures=0;
 for(const row of rows){if(!row.structuredContent)continue;const doc=structuredDocumentSchema.parse(row.structuredContent);documents++;assert.ok(row._count.chunks>0);const provider=providerPages.get(row.embeddingProvider)??new Set<string>();providerPages.set(row.embeddingProvider,provider);const unit=units.get(row.learningOutcome.studyUnit.code)??new Set<string>();units.set(row.learningOutcome.studyUnit.code,unit);for(let p=doc.source.pageStart;p<=doc.source.pageEnd;p++){const key=doc.source.document+":"+p;provider.add(key);unit.add(key);}for(const block of doc.blocks){if(block.type==="figure")assets.add(block.asset);if(block.type==="markdown")try{mathSpans(normalizeMath(block.markdown));}catch{mathFailures++;}}}
 for(const asset of assets){const bytes=await readFile(join(process.env.MATH_ASSET_DIR||resolve("../work/math-parser/bulk/assets"),asset));assert.equal(createHash("sha256").update(bytes).digest("hex")+".png",asset);}
 const expected=[168,70,114,86,109];for(let i=0;i<5;i++)assert.equal(units.get(`MAT1512-U${i+1}`)?.size,expected[i]);
 assert.equal(providerPages.get("ollama")?.size,547);assert.equal(providerPages.get("cloudflare")?.size,547);assert.equal(mathFailures,0);
 const vectors=await db.$queryRaw<{missing:number}[]>`SELECT count(*)::int AS missing FROM "ContentChunk" c JOIN "Ingestion" i ON i.id=c."ingestionId" JOIN "LearningOutcome" o ON o.id=c."learningOutcomeId" JOIN "StudyUnit" u ON u.id=o."studyUnitId" JOIN "Module" m ON m.id=u."moduleId" WHERE m.code='MAT1512' AND i."structuredContent" IS NOT NULL AND c.embedding768 IS NULL`;
 assert.equal(vectors[0].missing,0);
 const report={checkedAt:new Date().toISOString(),documents,pagesByProvider:Object.fromEntries([...providerPages].map(([p,s])=>[p,s.size])),units:Object.fromEntries([...units].map(([u,s])=>[u,s.size])),verifiedFigureAssets:assets.size,mathFailures,missingVectors:vectors[0].missing};await writeFile("conversion-audit.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await db.$disconnect();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
