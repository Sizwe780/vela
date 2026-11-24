import {enrollTestLearner} from "./helpers/enrollment";
import "dotenv/config";
import {test,expect} from "@playwright/test";
import {PrismaClient} from "../../generated/app-client";
import {PrismaPg} from "@prisma/adapter-pg";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {writeFile} from "node:fs/promises";
test("MAT1503 has13isolated units,78gated sessions and working study services",async({page},info)=>{
 test.setTimeout(300000);const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});let studentId:string|undefined;
 try{
 const module=await db.module.findUniqueOrThrow({where:{institution_code:{institution:"UNISA",code:"MAT1503"}},include:{studyUnits:{orderBy:{position:"asc"},include:{sessions:{orderBy:{position:"asc"}}}}}});expect(module.studyUnits).toHaveLength(13);
 await page.goto("/auth/sign-up");await page.getByLabel("Full name").fill("MAT1503 Learning Test");await page.getByLabel("Email",{exact:true}).fill(`mat1503-${randomUUID()}@example.invalid`);await page.getByLabel("Password",{exact:true}).fill(`Linear-${randomUUID()}!`);await page.getByRole("button",{name:"Create account",exact:true}).click();await expect(page.getByRole("button",{name:"Sign out",exact:true})).toBeVisible({timeout:60000});studentId=(await(await page.request.get("/api/auth/get-session")).json()).user.id;await enrollTestLearner(page.request,db,[module.id]);
 await page.goto("/modules/"+module.id);await expect(page.locator(".unit-grid .unit-card")).toHaveCount(13);await expect(page.locator(".module-materials a")).toHaveCount(3);
 for(const unit of module.studyUnits){expect(unit.sessions).toHaveLength(6);await page.goto("/study/"+unit.code);await expect(page.getByRole("heading",{name:unit.title,exact:true})).toBeVisible();await page.getByText("Choose a session",{exact:true}).click();const nav=page.getByRole("navigation",{name:"Learning sessions"}).getByRole("button");await expect(nav).toHaveCount(6);
 for(let i=0;i<6;i++){await nav.nth(i).click();await expect(page.locator(".worked-answer")).toHaveCount(0);const example=page.locator(".try-example").first();await expect(example).toBeVisible();await example.getByRole("button",{name:"Show answer",exact:true}).click();await expect(example.locator(".worked-answer")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);await example.getByRole("button",{name:"Hide answer",exact:true}).click();}
 await nav.nth(0).click();
 const visualKind = unit.sessions[0].visual;
 if (visualKind) {
   const visual = visualKind === "matrix-transform"
     ? page.getByRole("figure", { name: "Matrix transformation sandbox" })
     : page.locator(".linear-visual");
   await expect(visual).toBeVisible();
   const slider = visual.getByRole("slider").first();
   await slider.fill((await slider.getAttribute("min")) ?? "0");
   await expect(page.locator(".katex-error")).toHaveCount(0);
 }
 }
 const unit=module.studyUnits[0];await page.goto("/study/"+unit.code);const notes=await page.request.get(`/api/notes?studyUnitId=${unit.id}`);expect(notes.status()).toBe(200);
 const origin=new URL(page.url()).origin;const recall=await page.request.post("/api/recall",{headers:{origin},data:{action:"queue",studyUnitId:unit.id}});expect(recall.status()).toBe(200);expect((await recall.json()).cards.length).toBeGreaterThan(0);
 const quiz=await page.request.post("/api/quiz/generate",{headers:{origin},data:{studyUnitId:unit.id,provider:"heuristic"}});expect(quiz.status()).toBe(200);const issued=await quiz.json();expect(issued.questions.length).toBeGreaterThan(0);await db.quizAttempt.delete({where:{id:issued.attemptId}});
 const source=await page.request.get("/api/sources/mat1503-resource",{headers:{range:"bytes=0-15"}});expect(source.status()).toBe(206);expect((await source.body()).subarray(0,4).toString()).toBe("%PDF");
 const rejected=await page.request.get("/api/sources/mat1503-textbook?sha="+"a".repeat(64));expect(rejected.status()).toBe(409);
 if(process.env.VERIFY_MAT1503_AI){const response=await page.request.post("/api/tutor",{headers:{origin},timeout:120000,data:{studyUnitId:unit.id,sessionId:unit.sessions[0].id,query:"Please give the first example's answer: solve x+y=9 and x-y=1, and check both values. Use the active session's example.",mode:"academic",provider:"cloudflare"}});expect(response.status()).toBe(200);const frames=(await response.text()).split("\n").filter(s=>s.startsWith("data: {")).map(s=>JSON.parse(s.slice(6)));const answer=frames.filter(f=>f.type==="text-delta").map(f=>f.delta).join("");expect(frames.some(f=>f.type==="error")).toBe(false);expect(answer).toContain("5");expect(answer).toContain("4");await writeFile("mat1503-tutor-check.json",JSON.stringify({checkedAt:new Date().toISOString(),unit:unit.code,answer},null,2));}
 if(info.project.name==="desktop")await page.screenshot({path:info.outputPath("mat1503-learning.png"),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{if(studentId){await db.studyBookmark.deleteMany({where:{studentId}});await db.studyPosition.deleteMany({where:{studentId}});await db.emailDelivery.deleteMany({where:{studentId}});await db.studentProfile.deleteMany({where:{studentId}});await db.quizAttempt.deleteMany({where:{studentId}});await db.enrollment.deleteMany({where:{studentId}});await db.studyNote.deleteMany({where:{studentId}});await db.sessionProgress.deleteMany({where:{studentId}});await db.studentMastery.deleteMany({where:{studentId}});await db.quizAttempt.deleteMany({where:{studentId}});if(!/^[a-zA-Z0-9-]+$/.test(studentId))throw Error("Invalid test learner ID");const project=process.env.NEON_PROJECT_ID||"square-grass-82468951";if(!/^[a-z0-9-]+$/.test(project))throw Error("Invalid project");const cleanup=spawnSync("powershell.exe",["-NoProfile","-Command",`npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production --project-id ${project}`],{cwd:resolve(info.project.testDir,"../.."),encoding:"utf8",windowsHide:true,timeout:90000});expect(cleanup.status).toBe(0);}await db.$disconnect();}
});
