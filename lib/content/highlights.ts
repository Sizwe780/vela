import type {Plugin} from "unified";
type Node={type:string;value?:string;children?:Node[];data?:{hName:string;hProperties?:Record<string,unknown>}};
/** Trusted markup around exact saved text; selections never become HTML or regex. */
export function savedHighlightPlugin(selections:readonly string[]):Plugin{
 const quotes=[...new Set(selections.map(s=>s.trim()).filter(s=>s.length>=3&&s.length<=2000))].sort((a,b)=>b.length-a.length);
 return ()=>tree=>{const visit=(node:Node)=>{if(!node.children||["code","inlineCode","math","inlineMath","velaHighlight"].includes(node.type))return;node.children=node.children.flatMap(child=>{if(child.type!=="text"||!child.value){visit(child);return [child];}const value=child.value;const parts:Node[]=[];let offset=0;while(offset<value.length){let start=-1,found="";for(const quote of quotes){const i=value.indexOf(quote,offset);if(i>=0&&(start<0||i<start)){start=i;found=quote;}}if(start<0){parts.push({type:"text",value:value.slice(offset)});break;}if(start>offset)parts.push({type:"text",value:value.slice(offset,start)});parts.push({type:"velaHighlight",data:{hName:"mark",hProperties:{className:["saved-highlight"]}},children:[{type:"text",value:found}]});offset=start+found.length;}return parts.length?parts:[child];});};visit(tree as Node);};
}
