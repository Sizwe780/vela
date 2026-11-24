import "dotenv/config";
import {PrismaClient} from "../generated/app-client";
import {PrismaPg} from "@prisma/adapter-pg";
async function main(){const u=new URL(process.env.DATABASE_URL!);u.searchParams.delete("sslmode");u.searchParams.delete("channel_binding");const db=new PrismaClient({adapter:new PrismaPg({connectionString:u.toString(),ssl:{rejectUnauthorized:true}})});try{for(const code of ["MAT1503-U1","MAT1512-U1"]){const unit=await db.studyUnit.findFirstOrThrow({where:{code},include:{sessions:{orderBy:{position:"asc"},take:1}}});console.log(JSON.stringify({code,title:unit.sessions[0].title,body:unit.sessions[0].markdown.slice(0,4800)}));}console.log("VISUALS",await db.studySession.groupBy({by:["visual"],_count:true}));}finally{await db.$disconnect();}}main();
