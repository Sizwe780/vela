import "dotenv/config";
import {createRealtime,rawSql} from "@neon/realtime/server";
import {createRealtimeClient} from "@neon/realtime/client";
import {roomCountQuery} from "../lib/social/room-query";
async function main(){
 const server=createRealtime({secret:process.env.NEON_REALTIME_SECRET!,db:decodeURIComponent(new URL(process.env.DATABASE_URL!).pathname.slice(1)),debugMode:true});
 const client=createRealtimeClient({url:process.env.NEON_REALTIME_URL!});
 try{
  for(const [name,query]of [["room",roomCountQuery("qa-no-such-student","qa-no-such-module")],["baseline",rawSql<{id:string}>("SELECT id FROM \"StudentMastery\" WHERE \"studentId\"=$1 LIMIT 1",["qa-no-such-student"])]] as const){
   const subscription=client.subscribe(await server.seal({query}));
   await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{subscription.unsubscribe();reject(Error("Live query timed out"));},25000);
    subscription.onChange(snapshot=>{
     if(snapshot.status==="live"||snapshot.status==="error"){
      console.log(JSON.stringify({query:name,status:snapshot.status,error:snapshot.status==="error"?{code:snapshot.error.code,sqlState:snapshot.error.sqlState,message:snapshot.error.message.replace(/https?:\S+/g,"[endpoint]").slice(0,500)}:undefined,rows:snapshot.data?.length}));
      clearTimeout(timer);subscription.unsubscribe();resolve();
     }
    });
   });
  }
 }finally{client.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Live verification failed");process.exitCode=1;});
