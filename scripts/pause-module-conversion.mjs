import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const code=process.argv.find(a=>a.startsWith("--module="))?.split("=")[1]??"MAT1503";if(!/^[A-Z]{3}[0-9]{4}$/.test(code))throw Error("Invalid module code");const root=resolve(`../work/math-parser/modules/${code}`);await mkdir(root,{recursive:true});await writeFile(resolve(root,"pause.request"),"Finish and checkpoint the current page, then pause.\n");console.log(`${code}: pause requested after the current page.`);
