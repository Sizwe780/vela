export type LessonSection={id:string; title:string; text:string; kind:"reading"|"lab"|"warning"|"checks"};
/** Split only top-level authored headings, never exercise answers or fenced code. */
export function lessonSections(markdown:string):LessonSection[]{
 const sections:LessonSection[]=[];let lines:string[]=[],title="Learning goal",exercise=false,fence="";
 function flush(){if(!lines.join("").trim())return;const kind=/mistake|pitfall|caution|error/i.test(title)?"warning":/visual|lab|explor/i.test(title)?"lab":/assessment|check|practice/i.test(title)?"checks":"reading";sections.push({id:`lesson-beat-${sections.length}`,title,text:lines.join("\n"),kind});lines=[];}
 for(const line of markdown.split("\n")){
  const code=line.match(/^\s*(`{3,}|~{3,})/);
  if(code){if(!fence)fence=code[1];else if(code[1][0]===fence[0]&&code[1].length>=fence.length)fence="";lines.push(line);continue;}
  if(!fence){if(/^:::exercise\s/.test(line))exercise=true;if(line.trim()===":::end")exercise=false;const h=!exercise&&line.match(/^##\s+(.+)/);if(h){flush();title=h[1];}}
  lines.push(line);
 }
 flush();return sections;
}

export function dedupeLessonHeadings(markdown:string) { let previous="",fence="",exercise=false; return markdown.split("\n").filter(line=>{const code=line.match(/^\s*(`{3,}|~{3,})/);if(code){if(!fence)fence=code[1];else if(code[1][0]===fence[0]&&code[1].length>=fence.length)fence="";previous="";return true;}if(fence)return true;if(/^:::exercise\b/.test(line))exercise=true;if(line.trim()===":::end")exercise=false;if(exercise){previous="";return true;}const heading=line.match(/^#{2,6}\s+(.+)/)?.[1].trim().toLowerCase();if(heading){if(heading===previous)return false;previous=heading;}else if(line.trim())previous="";return true;}).join("\n");}
