import {dedupeLessonHeadings} from "./lesson-sections";
/** Narrow adapter for legacy generated chrome; never edits formulas or worked answers. */
export function readerLessonCopy(markdown:string) {
  let assessment=false,exercise=false,fence="";
  const cleaned=markdown.split("\n").map(line=>{
    const code=line.match(/^\s*(`{3,}|~{3,})/);
    if(code){if(!fence)fence=code[1];else if(code[1][0]===fence[0]&&code[1].length>=fence.length)fence="";return line;}
    if(fence)return line;
    if(/^:::exercise\s/.test(line))exercise=true;
    if(line.trim()===":::end"){exercise=false;return line;}
    if(exercise)return line;
    if(/^## Assessment\s*$/i.test(line))assessment=true;
    if(/^## (?:Application|Pause and Predict)\s*$/i.test(line))assessment=false;
    if(assessment&&/^#{2,3} Procedure\s*$/i.test(line))return "### Procedure check";
    if(line.startsWith("Independent interactive model: ")) {
      const description=line.slice("Independent interactive model: ".length).split(". Explore its parameters as a separate teaching model;")[0];
      return `Explore this pattern: ${description}. Change one value at a time and explain what changes. Then apply the method in the example that follows.`;
    }
    return line;
  }).join("\n");
  return dedupeLessonHeadings(cleaned);
}
