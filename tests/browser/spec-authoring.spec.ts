import "dotenv/config";
import {test,expect} from "@playwright/test";
test("authoring policy endpoint is protected and composes the correct domain",async({request})=>{
 const base={institution:"UNISA",moduleCode:"MAT1512",action:"spec"};
 expect((await request.post("/api/generate",{data:base})).status()).toBe(401);
 for(const moduleCode of ["MAT1512","COS1511"]){const r=await request.post("/api/generate",{headers:{Authorization:`Bearer ${process.env.INGEST_API_TOKEN}`},data:{...base,moduleCode}});expect(r.status()).toBe(200);const {spec}=await r.json();expect(spec.hash).toMatch(/^[a-f0-9]{64}$/);expect(spec.documents.filter((d:{file:string})=>["learning-design-spec.md","mastery-spec.md","assessment-spec.md","quality-audit-spec.md"].includes(d.file))).toHaveLength(4);expect(spec.domains).toEqual(moduleCode==="MAT1512"?["mathematics","education-pck"]:["programming"]);}
});
