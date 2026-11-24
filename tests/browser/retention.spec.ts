import {enrollTestLearner} from "./helpers/enrollment";
import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
test("personal notes autosave, clip, isolate learners and handle stale revisions",async({page,browser},info)=>{
  test.skip(info.project.name!=="desktop","Persistence is shared across viewport layouts");
  test.setTimeout(180000);
  const url=new URL(process.env.DATABASE_URL!);url.searchParams.delete("sslmode");url.searchParams.delete("channel_binding");
  const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
  const students:string[]=[];const other=await browser.newContext({baseURL:info.project.use.baseURL});
  try {
    const units=await db.studyUnit.findMany({take:2,orderBy:{position:"asc"},select:{id:true}});expect(units.length).toBe(2);
    for(const p of [page,await other.newPage()]){
      await p.goto("/auth/sign-up");await p.getByLabel("Full name").fill("Retention Test");await p.getByLabel("Email",{exact:true}).fill(`retention-${randomUUID()}@example.invalid`);await p.getByLabel("Password",{exact:true}).fill(`Retention-${randomUUID()}!`);await p.getByRole("button",{name:"Create account",exact:true}).click();await expect(p.getByRole("button",{name:"Sign out",exact:true})).toBeVisible({timeout:60000});students.push((await(await p.request.get("/api/auth/get-session")).json()).user.id);await enrollTestLearner(p.request,db);
    }
    await page.goto(`/study/${units[0].id}`);
    await page.getByRole("button",{name:"My Notes",exact:true}).click();
    const notes=page.getByRole("dialog",{name:"My Notes",exact:true});
    const editor=notes.getByRole("textbox",{name:"Personal study notes"});await expect(editor).toBeEnabled();
    const draft=String.raw`My intuition: $$\lim_{x\to 2} x^2=4$$`;
    await editor.fill(draft);await expect(notes.getByRole("status")).toHaveText("Saved");
    await notes.getByRole("button",{name:"Close notes",exact:true}).click();await page.reload();
    await page.getByRole("button",{name:"My Notes",exact:true}).click();await expect(page.getByRole("textbox",{name:"Personal study notes"})).toHaveValue(draft);await page.getByRole("button",{name:"Close notes",exact:true}).click();
    const get=()=>page.request.get(`/api/notes?studyUnitId=${units[0].id}`);
    const saved=await(await get()).json();const origin=new URL(page.url()).origin;
    const stale=await page.request.put("/api/notes",{headers:{origin},data:{studyUnitId:units[0].id,body:"Stale overwrite",revision:saved.revision-1}});expect(stale.status()).toBe(409);expect((await(await get()).json()).body).toBe(draft);
    const isolated=await other.request.get(`${origin}/api/notes?studyUnitId=${units[0].id}`);expect((await isolated.json()).body).toBe("");
    const switched=await other.request.put(`${origin}/api/notes`,{headers:{origin},data:{studyUnitId:units[0].id,body:"Wrong session draft",revision:0,ownerId:saved.ownerId}});expect(switched.status()).toBe(409);
    expect((await(await page.request.get(`/api/notes?studyUnitId=${units[1].id}`)).json()).body).toBe("");
    const answer=String.raw`## Core Answer
Use intuition before symbols.
## Step-by-Step Derivation
$$
f'(x)=2x
$$`;
    const events=[{type:"start",messageId:"clip-test"},{type:"text-start",id:"text"},{type:"text-delta",id:"text",delta:answer},{type:"text-end",id:"text"},{type:"finish"}];
    await page.route("**/api/tutor",route=>route.fulfill({headers:{"content-type":"text/event-stream","x-vercel-ai-ui-message-stream":"v1"},body:events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join("")+"data: [DONE]\n\n"}));
    await page.getByLabel("Ask your learning companion").fill("Explain this derivation");await page.getByRole("button",{name:"Send message",exact:true}).click();
    const derivation=page.locator(".companion-card").filter({has:page.getByRole("heading",{name:"Step-by-Step Derivation",exact:true})});await derivation.getByRole("button",{name:"Clip to Notes",exact:true}).click();
    await expect(notes).toBeVisible();await expect(notes.locator(".katex").first()).toBeVisible();await expect(notes.getByRole("status")).toHaveText("Saved");
    const clipped=await(await get()).json();expect(clipped.body).toContain(draft);expect(clipped.body).toContain("f'(x)=2x");
    await notes.getByRole("button",{name:"Close notes",exact:true}).click();
    const dashboard=await page.context().newPage();await dashboard.goto("/");await expect(dashboard.getByRole("region",{name:"Course completion",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Practice active recall",exact:true}).click();const recall=page.getByRole("dialog",{name:"Active recall"});await expect(recall).toBeVisible();await expect(recall.getByRole("button",{name:"Reveal / hide answer"})).toBeVisible();await recall.getByRole("button",{name:"Reveal / hide answer"}).click();await recall.getByRole("button",{name:"Good",exact:true}).click();await expect(recall.getByRole("status")).toContainText("Next review");
    await expect(dashboard.getByText("70%",{exact:true}).first()).toBeVisible();
    const stats=await(await page.request.get("/api/progress")).json();expect(stats.courses.flatMap((c:any)=>c.modules.flatMap((m:any)=>m.units)).some((u:any)=>u.id===units[0].id&&u.mastery>0)).toBe(true);
    const mastery=await db.studentMastery.findMany({where:{studentId:students[0]}});expect(mastery.some(m=>m.score===.7 && !!m.nextReviewAt)).toBe(true);
    const milestone=await db.studySession.findFirstOrThrow({where:{studyUnitId:units[0].id}});
    for(let i=0;i<2;i++)expect((await page.request.post("/api/sessions",{headers:{origin},data:{sessionId:milestone.id,complete:true}})).status()).toBe(200);
    const retained=await db.studentMastery.findFirstOrThrow({where:{studentId:students[0],score:.7}});expect(retained.attempts).toBe(1);expect(retained.nextReviewAt).not.toBeNull();
    const isolatedStats=await(await other.request.get(`${origin}/api/progress`)).json();expect(isolatedStats.courses.every((c:any)=>c.completed===0)).toBe(true);
    await dashboard.close();
    const due=await page.request.post("/api/recall",{headers:{origin},data:{action:"queue",studyUnitId:units[0].id}});const data=await due.json();const scheduled=new Set(mastery.map(m=>m.learningOutcomeId));expect(data.cards.every((c:{outcomeId:string})=>!scheduled.has(c.outcomeId))).toBe(true);
  } finally {
    await other.close();
    for(const studentId of students){await db.studyBookmark.deleteMany({where:{studentId}});await db.studyPosition.deleteMany({where:{studentId}});await db.emailDelivery.deleteMany({where:{studentId}});await db.studentProfile.deleteMany({where:{studentId}});await db.quizAttempt.deleteMany({where:{studentId}});await db.enrollment.deleteMany({where:{studentId}});await db.sessionProgress.deleteMany({where:{studentId}});await db.studyNote.deleteMany({where:{studentId}});await db.studentMastery.deleteMany({where:{studentId}});if(!/^[a-zA-Z0-9-]+$/.test(studentId))throw Error("Unexpected test learner ID");const projectId=process.env.NEON_PROJECT_ID||"square-grass-82468951";if(!/^[a-z0-9-]+$/.test(projectId))throw Error("Invalid project");const cleanup=spawnSync("powershell.exe",["-NoProfile","-Command",`npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production --project-id ${projectId}`],{cwd:resolve(info.project.testDir,"../.."),encoding:"utf8",windowsHide:true});expect(cleanup.status).toBe(0);}
    await db.$disconnect();
  }
});
