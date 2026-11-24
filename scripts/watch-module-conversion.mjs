import {readFile} from "node:fs/promises";
const code=process.argv.find(a=>a.startsWith("--module="))?.split("=")[1]??"MAT1503";
if(!/^[A-Z]{3}[0-9]{4}$/.test(code))throw Error("Invalid module code");
async function show(){try{const s=JSON.parse(await readFile(`module-conversion-${code}.json`,"utf8"));console.clear();console.log(`${code} source conversion: ${s.status}\nPublished ${s.converted}/${s.total} (${(100*s.converted/s.total).toFixed(1)}%) | Pending ${s.remaining} | Held ${s.needsReview}\nCheckpoint ${new Date(s.updatedAt).toLocaleString()} (${Math.round((Date.now()-Date.parse(s.updatedAt))/1000)}s ago)`);for(const [unit,n]of Object.entries(s.units))console.log(`${unit}: ${n.converted}/${n.total}`);console.log("A stale checkpoint may mean the runner stopped. Ctrl+C closes this monitor only.");}catch{console.log("No source checkpoint yet.");}}
await show();if(!process.argv.includes("--once"))setInterval(show,15000);
