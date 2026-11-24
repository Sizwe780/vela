import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
const studentId=`progress-probe-${Date.now()}`;
async function main(){try{const session=await db.studySession.findFirstOrThrow();for(const timeout of [5000,20000]){const start=Date.now();try{await db.$transaction(async tx=>{await tx.sessionProgress.upsert({where:{studentId_sessionId:{studentId,sessionId:session.id}},create:{studentId,sessionId:session.id},update:{},include:{session:{select:{studyUnitId:true}}}});const outcomes=await tx.learningOutcome.findMany({where:{studyUnitId:session.studyUnitId},select:{id:true}});await tx.studentMastery.createMany({data:outcomes.map(o=>({studentId,learningOutcomeId:o.id,score:0})),skipDuplicates:true});},{timeout,maxWait:10000});console.log({timeout,ms:Date.now()-start,saved:true});}catch(e:any){console.log({timeout,ms:Date.now()-start,code:e.code,detail:e.meta?.error});}}}finally{await db.sessionProgress.deleteMany({where:{studentId}});await db.studentMastery.deleteMany({where:{studentId}});await db.$disconnect();}}
main().catch(()=>{process.exitCode=1});
