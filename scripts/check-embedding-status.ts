import "dotenv/config";
import {configuredAI} from "../lib/ai/config";
import {providerCredential} from "../lib/ai/credentials";
async function main(){const c=configuredAI("cloudflare"),r=await fetch(`${c.baseUrl}/embeddings`,{method:"POST",headers:{Authorization:`Bearer ${await providerCredential(c)}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.embeddingSpace.model,input:["A derivative is a rate of change."],encoding_format:"float"}),signal:AbortSignal.timeout(30000)});let body:any;try{body=await r.json();}catch{body={};}console.log(JSON.stringify({status:r.status,errors:(body.errors??[body.error]).filter(Boolean).map((e:any)=>({code:e.code,message:typeof e.message==="string"?e.message.replace(/https?:\S+/g,"[endpoint]").slice(0,350):undefined})),retryAfter:r.headers.get("retry-after")}));}
main().catch(e=>{console.error(e instanceof Error?e.name:"AI check failed");process.exitCode=1;});
