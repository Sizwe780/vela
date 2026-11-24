export function transformVector(x:number,y:number,inverse=false){return inverse?[(x-2*y)/3,(x+y)/3]:[x+2*y,-x+y];}
export function replaceSecondRow(k:number){return [[1,2,7],[3+k,1+2*k,8+7*k]];}
export function determinantModel(s:number){return 4-s;}
export function combineVectors(a:number,b:number){return [2*a-b,a+2*b];}
export function nonzeroComplexRoots(radius:number,degrees:number,n:number){if(radius<=0||!Number.isInteger(n)||n<1)throw Error("Use positive modulus and a positive integer degree");return Array.from({length:n},(_,k)=>{const angle=(degrees*Math.PI/180+2*Math.PI*k)/n;return [radius**(1/n)*Math.cos(angle),radius**(1/n)*Math.sin(angle)];});}
