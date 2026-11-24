export type LearningBlock={type:"text";text:string}|{type:"exercise";title:string;question:string;answer:string};
export function parseLearningBlocks(text:string):{blocks:LearningBlock[];errors:string[]}{
 const blocks:LearningBlock[]=[],errors:string[]=[];let prose:string[]=[],question:string[]=[],answer:string[]=[],title="",state:"text"|"question"|"answer"="text",fence="";
 const flush=()=>{if(prose.length)blocks.push({type:"text",text:prose.join("\n")});prose=[];};
 for(const line of text.split("\n")){
  const code=line.match(/^\s*(`{3,}|~{3,})/);const inCode=!!fence;
  if(code){if(!fence)fence=code[1];else if(code[1][0]===fence[0]&&code[1].length>=fence.length)fence="";}
  if(!inCode&&!code){
   const start=line.match(/^:::exercise\s+(.+)$/);
   if(/^:::(?:exercise|answer|end)\b/.test(line)&&!start&&![":::answer",":::end"].includes(line.trim())){errors.push("Malformed exercise delimiter");continue;}
   if(start){if(state!=="text"){errors.push("Nested exercise");continue;}flush();title=start[1];question=[];answer=[];state="question";continue;}
   if(line.trim()===":::answer"){if(state!=="question")errors.push("Unexpected answer delimiter");state="answer";continue;}
   if(line.trim()===":::end"){if(state!=="answer"||!title)errors.push("Incomplete exercise");else {if(!question.join("").trim()||!answer.join("").trim())errors.push("Empty exercise");blocks.push({type:"exercise",title,question:question.join("\n"),answer:answer.join("\n")});}title="";state="text";continue;}
  }
  if(state==="text")prose.push(line);else if(state==="question")question.push(line);else answer.push(line);
 }
 if(state!=="text"){errors.push("Unclosed exercise; solution withheld");if(title)blocks.push({type:"exercise",title,question:question.join("\n"),answer:"Solution unavailable: this exercise needs review."});}
 flush();return {blocks,errors};
}
