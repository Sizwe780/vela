import "dotenv/config";
import {Prisma} from "@prisma/client";
import {BulkDatabase} from "./bulk-database";
import {prepareTutor} from "../lib/tutor/service";
import {createTutorRepository} from "../lib/tutor/retrieval";
import {embedTokens} from "../lib/ingest/embeddings";
import {createChatModel} from "../lib/ai/chat-model";
import {streamText} from "ai";
async function main(){const db=new BulkDatabase();try{const [row]=await db.query<{id:string;sessionId:string}>(Prisma.sql`SELECT u.id,s.id AS "sessionId" FROM "StudyUnit" u JOIN "StudySession" s ON s."studyUnitId"=u.id WHERE u.code='MAT1503-U1' AND s.position=1`);const p=await prepareTutor({studyUnitId:row.id,sessionId:row.sessionId,query:"Please give the first example's answer: solve x+y=9 and x-y=1, and check both values. Use the active session's example.",mode:"academic",provider:"cloudflare"},createTutorRepository(db,"cloudflare"),embedTokens);const result=streamText({model:createChatModel("cloudflare"),system:p.system,messages:p.messages,maxOutputTokens:1600,maxRetries:0,temperature:.3,abortSignal:AbortSignal.timeout(60000)});let answer="";for await(const part of result.fullStream){if(part.type==="text-delta")answer+=part.text;if(part.type==="error"){const e=part.error as any;console.log(JSON.stringify({name:e.name,value:e.value,causeName:e.cause?.name,issues:e.cause?.issues,causeValue:e.cause?.value}));}}console.log("Answer characters",answer.length);console.log(answer.slice(0,500));}finally{await db.disconnect();}}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
