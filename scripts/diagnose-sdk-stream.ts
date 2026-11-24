import "dotenv/config";
import {streamText} from "ai";
import {createChatModel} from "../lib/ai/chat-model";
import {curriculum} from "../content/mat1503/sessions";
async function main(){const result=streamText({model:createChatModel("cloudflare"),system:"You are a precise subject tutor. Current lesson data: "+curriculum[0].sessions[0].markdown,prompt:"Please give the first example answer. Solve x+y=9 and x-y=1 and explain the linearity checks as true or false.",maxOutputTokens:600,maxRetries:0,abortSignal:AbortSignal.timeout(60000)});let text="";for await(const part of result.fullStream){if(part.type==="text-delta")text+=part.text;if(part.type==="error"){const e=part.error as any;console.log(JSON.stringify({name:e.name,value:e.value,causeName:e.cause?.name,issues:e.cause?.issues,causeValue:e.cause?.value}));}}console.log("Output characters",text.length);}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
