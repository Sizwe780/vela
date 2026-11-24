import "dotenv/config";
import {PrismaClient} from "../generated/app-client";
import {PrismaPg} from "@prisma/adapter-pg";
import {Prisma} from "@prisma/client";
import {BulkDatabase} from "./bulk-database";
import {createIngestionRepository} from "../lib/ingest/repository";
import {ingest} from "../lib/ingest/service";
import {embedTokens,type Embedder,assertVectors} from "../lib/ingest/embeddings";
import {getAIConfig} from "../lib/ai/config";
import {writeFile,readFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
const code=process.argv.find(a=>a.startsWith("--module="))?.split("=")[1]??"MAT1503";if(!/^[A-Z]{3}[0-9]{4}$/.test(code))throw Error("Invalid module code");
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})}),sql=new BulkDatabase();
async function main(){try{await mkdir(`../work/${code.toLowerCase()}/embedding-cache`,{recursive:true});const units=await db.studyUnit.findMany({where:{module:{institution:"UNISA",code}},include:{sessions:{orderBy:{position:"asc"}},learningOutcomes:{orderBy:{position:"asc"},include:{assessmentCriteria:true}}},orderBy:{position:"asc"}});const repo=createIngestionRepository(sql),receipts=[];
 const cached:Embedder=async(inputs,context)=>{const space=getAIConfig().embeddingSpace;const result:number[][]=[],missing:number[]=[],keys=inputs.map((_,i)=>createHash("sha256").update(JSON.stringify({space,text:context!.texts[i]})).digest("hex"));const file=(key:string)=>`../work/${code.toLowerCase()}/embedding-cache/${key}.json`;for(let i=0;i<inputs.length;i++)try{result[i]=JSON.parse(await readFile(file(keys[i]),"utf8"));assertVectors([result[i]],1,space.dimensions);}catch{missing.push(i);}if(missing.length){const vs=await embedTokens(missing.map(i=>inputs[i]),{...context,purpose:"document",texts:missing.map(i=>context!.texts[i])});for(const [j,i]of missing.entries()){result[i]=vs[j];await writeFile(file(keys[i]),JSON.stringify(vs[j]));}}return result;};
 for(const provider of ["cloudflare","ollama"]){process.env.AI_PROVIDER=provider;if(provider==="ollama"){process.env.OPENAI_BASE_URL=process.env.OLLAMA_BASE_URL||"http://localhost:11434/v1";process.env.EMBEDDING_MODEL="nomic-embed-text";process.env.EMBEDDING_DIMENSIONS="768";}for(const unit of units){const outcome=unit.learningOutcomes[0],criterion=outcome?.assessmentCriteria[0];if(!outcome||!criterion)throw Error("Missing curriculum mapping");for(const session of unit.sessions){const receipt=await ingest({moduleCode:code,studyUnitId:unit.id,learningOutcomeId:outcome.id,assessmentCriterionId:criterion.id,sourceName:`Vela original / ${unit.code} / S${session.position}: ${session.title}`.slice(0,255),text:session.markdown},repo,cached);await sql.repairLinks(receipt.ingestionId,`/study/${unit.id}#session-${session.id}`);receipts.push({provider,unit:unit.code,session:session.id,...receipt});console.log(`${provider} ${unit.code} S${session.position}: ${receipt.chunkCount}chunks${receipt.reused?" reused":""}`);await writeFile(`module-lessons-${code}.json`,JSON.stringify({updatedAt:new Date().toISOString(),moduleCode:code,receipts},null,2));}}}
 console.log(`Indexed${receipts.length}provider/session records as explicitly Vela-authored teaching, not textbook OCR.`);
 }finally{await db.$disconnect();await sql.disconnect();}}
main().catch(e=>{console.error(e instanceof Error?e.message:"Indexing failed");process.exitCode=1});
