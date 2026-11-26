import { quantitySI } from "../math-practice/quantity";
import { physicsPracticeChecks } from "../../content/physics/practice-checks";
export type { PracticeCheck } from "./practice-schema";
const checks=physicsPracticeChecks;
const normalize=(s:string)=>s.trim().replace(/\s+/g," ");
export function practiceCheck(question:string){return Object.entries(checks).find(([q])=>normalize(q)===normalize(question))?.[1];}
export function checkPracticeQuantity(value:string,unit:string,expected:{value:number;unit:string;tolerance:number}){
 try {
 const v=Number(value);if(!value.trim()||!Number.isFinite(v))return {correct:false,message:"Enter a finite value and its unit."};
 const actual=quantitySI({value,unit}),target=quantitySI({value:String(expected.value),unit:expected.unit}),tolerance=quantitySI({value:String(expected.tolerance),unit:expected.unit}).value;
 if(actual.dimensions.some((d,i)=>d!==target.dimensions[i]))return {correct:false,message:"Check the SI unit dimensions before the arithmetic."};
 const correct=Math.abs(actual.value-target.value)<=Math.abs(tolerance)+1e-12;
 return {correct,message:correct?"Value and SI dimensions agree within the stated rounding tolerance.":"Check your conversion and arithmetic, then try again."};
 } catch(error){return {correct:false,message:error instanceof Error?error.message:"Use a supported SI unit."};}
}
