import {enrollTestLearner} from "./helpers/enrollment";
import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

test("all five session routes render verified math and persist milestones", async ({ page }, testInfo) => {
  test.setTimeout(process.env.VERIFY_LIVE_AI ? 300_000 : 240_000);
  const url = new URL(process.env.DATABASE_URL!); url.searchParams.delete("sslmode"); url.searchParams.delete("channel_binding");
  const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:{rejectUnauthorized:true}})});
  let studentId: string | undefined;
  try {
    const unit = await prisma.studyUnit.findFirstOrThrow({ where: { code: "MAT1512-U1", module: { institution: "UNISA" } } });
    const row = await prisma.ingestion.findFirstOrThrow({ where: { learningOutcome: { studyUnitId: unit.id }, AND: [ { structuredContent: { path: ["parser", "review"], equals: "source-compared" } }, { structuredContent: { path: ["parser", "name"], equals: "reviewed-transcription" } } ] }, include: { chunks: true } });
    expect(row.chunks.some(chunk => chunk.body?.includes(String.raw`\lim_{x\to 2}\frac{x^2-4}{x-2}=4`))).toBe(true);
    const payload = { moduleCode: "MAT1512", studyUnitId: unit.id, learningOutcomeId: row.learningOutcomeId, assessmentCriterionId: row.assessmentCriterionId, sourceName: row.sourceName, structuredContent: row.structuredContent };
    const replay = await page.request.post("/api/ingest", { headers: { Authorization: `Bearer ${process.env.INGEST_API_TOKEN}` }, data: payload });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).reused).toBe(true);
    const invalid = await page.request.post("/api/ingest", { headers: { Authorization: `Bearer ${process.env.INGEST_API_TOKEN}` }, data: { ...payload, structuredContent: { ...(row.structuredContent as object), blocks: [{ id: "bad", type: "markdown", markdown: "$$unclosed" }] } } });
    expect(invalid.status()).toBe(422);
    await page.goto(`/study/${unit.id}`);
    await expect(page).toHaveURL(/auth\/sign-in.*redirectTo=/);
    await page.goto("/auth/sign-up");
    await page.getByLabel("Full name").fill("Math Rendering Test");
    await page.getByLabel("Email", { exact: true }).fill(`math-${randomUUID()}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill(`Math-${randomUUID()}!`);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible({ timeout: 60_000 });
    studentId = (await (await page.request.get("/api/auth/get-session")).json()).user.id;
    await enrollTestLearner(page.request,prisma);
    await page.goto(`/study/${unit.id}`);
    await page.goto("/");
    const catalogModule=await prisma.module.findUniqueOrThrow({where:{id:unit.moduleId}});
    await page.getByRole("region", { name: "My enrolled modules" }).getByRole("link", { name: `Open ${catalogModule.code}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/modules/${catalogModule.id}$`));
    await expect(page).toHaveTitle(`${catalogModule.code} · ${catalogModule.title} · Vela`);
    await expect(page.locator(".unit-grid .unit-card")).toHaveCount(5);
    const units=await prisma.studyUnit.findMany({where:{module:{code:"MAT1512",institution:"UNISA"}},select:{id:true,code:true,title:true,_count:{select:{sessions:true}}},orderBy:{position:"asc"}});
    for(const lesson of units){
      const response=await page.goto("/study/"+lesson.code);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${catalogModule.code} · ${lesson.title} · Vela`);
      expect((await response!.body()).length).toBeLessThan(200000);
      await expect(page.getByRole("heading",{name:lesson.title,exact:true})).toBeVisible();
      await page.getByText("Choose a session", { exact: true }).click();
      await expect(page.getByRole("navigation",{name:"Learning sessions"}).getByRole("button")).toHaveCount(lesson._count.sessions);
      await expect(page.locator(".session-reader .katex").first()).toBeVisible();
      await expect(page.locator(".katex-error")).toHaveCount(0);
      await expect(page.locator(".source-figure img")).toHaveCount(0);
      const milestones=page.getByRole("navigation",{name:"Learning sessions"}).getByRole("button");
      for(let i=0;i<lesson._count.sessions;i++){
        await milestones.nth(i).click();await expect(page.locator(".worked-answer")).toHaveCount(0);
        const example=page.locator(".try-example").first();await expect(example).toBeVisible();
        await example.getByRole("button",{name:"Show answer",exact:true}).click();await expect(example.locator(".worked-answer")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
        await example.getByRole("button",{name:"Hide answer",exact:true}).click();await expect(example.locator(".worked-answer")).toHaveCount(0);
      }
      if(lesson.code.endsWith("U3")){await milestones.nth(0).click();await expect(page.locator(".session-visual")).toContainText("Compose two rates");await page.locator(".session-visual input").fill("0.25");await expect(page.locator(".session-visual output")).toContainText("Inner rate");}
      if(lesson.code.endsWith("U4")){await milestones.nth(2).click();await expect(page.locator(".session-visual")).toContainText("three-sided enclosure");}
    }
    if(process.env.VERIFY_LIVE_AI){
      const checks=[];
      for(const provider of ["ollama","cloudflare"]){
        const started=Date.now();const response=await page.request.post("/api/tutor",{timeout:180000,headers:{origin:new URL(page.url()).origin},data:{studyUnitId:unit.id,query:"In at most two sentences, explain the meaning of the limit of a function using the relevant source.",mode:"academic",provider}});
        expect(response.status()).toBe(200);const body=await response.text();
        const frames=body.split("\n").filter(l=>l.startsWith("data: {")).map(l=>JSON.parse(l.slice(6)));
        const sources=frames.filter(f=>f.type==="data-citations").flatMap(f=>f.data.sources);
        expect(sources.length).toBeGreaterThan(0);expect(frames.some(f=>f.type==="text-delta"&&f.delta.trim())).toBe(true);expect(frames.some(f=>f.type==="error")).toBe(false);
        checks.push({provider,durationMs:Date.now()-started,citations:sources.length,streamingResponse:true});
      }
      await writeFile("live-tutor-check.json",JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
    }
    await page.goto("/study/"+unit.code+"#chunk-"+row.chunks[0].id);
    await expect(page.getByRole("dialog",{name:"Source preview"})).toBeVisible();
    await page.keyboard.press("Escape");
    let requested:any;
    await page.route("**/api/tutor",route=>{requested=route.request().postDataJSON();const events=[{type:"start",messageId:"session-check"},{type:"text-start",id:"t"},{type:"text-delta",id:"t",delta:"Session context confirmed."},{type:"text-end",id:"t"},{type:"finish"}];return route.fulfill({headers:{"content-type":"text/event-stream","x-vercel-ai-ui-message-stream":"v1"},body:events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join("")+"data: [DONE]\n\n"});});
    const firstSession=(await page.locator(".session-reader").getAttribute("id"))!.replace(/^session-/,"");
    await page.locator(".try-example").first().getByRole("button",{name:"Ask tutor for a hint"}).click();
    await page.getByRole("button",{name:"Send message",exact:true}).click();
    await expect(page.getByText("Session context confirmed.",{exact:true})).toBeVisible();expect(requested.sessionId).toBe(firstSession);
    if(testInfo.project.name==="mobile")await page.getByRole("button",{name:"Study material",exact:true}).click();
    await page.getByText("Choose a session", { exact: true }).click();
    await page.getByRole("navigation",{name:"Learning sessions"}).getByRole("button").nth(1).click();
    await expect(page.getByText("Session context confirmed.",{exact:true})).toHaveCount(0);
    await expect(page.locator(".worked-answer")).toHaveCount(0);
    await page.getByRole("navigation",{name:"Learning sessions"}).getByRole("button").nth(0).click();
    await page.unroute("**/api/tutor");
    if(process.env.VERIFY_SESSION_TUTOR){
      const live=await page.request.post("/api/tutor",{timeout:120000,headers:{origin:new URL(page.url()).origin},data:{studyUnitId:unit.id,sessionId:firstSession,query:"Please give the answer: in this session's first original worked example, what is the excluded input and what is the limiting value? Distinguish the hole from its limit. Use this lesson's numbers, not another textbook example.",mode:"academic",provider:"cloudflare"}});
      expect(live.status()).toBe(200);const frames=(await live.text()).split("\n").filter(l=>l.startsWith("data: {")).map(l=>JSON.parse(l.slice(6)));const answer=frames.filter(f=>f.type==="text-delta").map(f=>f.delta).join("");expect(frames.some(f=>f.type==="error")).toBe(false);expect(answer).toContain("13");expect(answer).toContain("26");
      await writeFile("session-tutor-check.json",JSON.stringify({checkedAt:new Date().toISOString(),provider:"cloudflare",sessionId:firstSession,expectedExcludedInput:13,expectedLimit:26,answer},null,2));
    }
    const foreignSession=await prisma.studySession.findFirstOrThrow({where:{studyUnitId:{not:unit.id}}});
    const denied=await page.request.post("/api/tutor",{headers:{origin:new URL(page.url()).origin},data:{studyUnitId:unit.id,sessionId:foreignSession.id,query:"Explain",mode:"academic"}});expect(denied.status()).toBe(404);
    await page.getByRole("button",{name:"Mark milestone complete",exact:true}).click();
    await expect(page.getByRole("status").filter({hasText:"Milestone saved"})).toBeVisible();
    await page.reload();await expect(page.getByRole("button",{name:"Milestone complete ✓",exact:true})).toBeDisabled();
    await expect(page.locator(".session-progress progress")).toHaveAttribute("value","1");
    await expect(page.locator(".unit-progress-ring")).toContainText(`${Math.round(100/units.find(u=>u.id===unit.id)!._count.sessions)}%`);
    const stats=await(await page.request.get("/api/progress")).json();
    expect(stats.courses.flatMap((c:any)=>c.modules.flatMap((m:any)=>m.units)).find((u:any)=>u.id===unit.id).completed).toBe(1);
    const tracked=await prisma.studentMastery.findMany({where:{studentId}});expect(tracked.length).toBeGreaterThan(0);expect(tracked.every(m=>m.score===0&&m.attempts===0)).toBe(true);
    if(testInfo.project.name==="mobile")await page.getByRole("button",{name:"More tools",exact:true}).click();
    await page.getByRole("button",{name:"Source library",exact:true}).click();
    const library=page.getByRole("dialog",{name:"Source library",exact:true});
    await expect(library.getByRole("heading",{name:/Source library/})).toContainText("168 pages");
    await library.getByLabel("Reference page").selectOption({index:1});
    await expect(library.locator(".structured-reading")).toBeVisible();
    await expect(library.locator(".katex-error")).toHaveCount(0);
    await page.keyboard.press("Escape");
    const index=await(await page.request.get(`/api/reading?unit=${unit.id}`)).json();
    const reference=await(await page.request.get(`/api/reading?unit=${unit.id}&id=${index.pages[0].id}`)).json();
    const pdf=await page.request.get(`/api/sources/${reference.document.source.document}?sha=${reference.document.source.sha256}`,{headers:{range:"bytes=0-15"}});expect(pdf.status()).toBe(206);expect((await pdf.body()).subarray(0,4).toString()).toBe("%PDF");
    const figure=await prisma.$queryRaw<{asset:string}[]>`SELECT b->>'asset' AS asset FROM "Ingestion" i CROSS JOIN LATERAL jsonb_array_elements(i."structuredContent"->'blocks') b JOIN "LearningOutcome" o ON o.id=i."learningOutcomeId" WHERE o."studyUnitId"=${unit.id} AND b->>'type'='figure' LIMIT 1`;
    expect(figure.length).toBe(1);const image=await page.request.get(`/api/figures/${figure[0].asset}`);expect(image.status()).toBe(200);expect(image.headers()["content-type"]).toBe("image/png");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(testInfo.project.name==="desktop")await page.screenshot({path:"session-learning.png",fullPage:true});
  } finally {
    if (studentId) {
      await prisma.studyBookmark.deleteMany({where:{studentId}});await prisma.studyPosition.deleteMany({where:{studentId}});await prisma.emailDelivery.deleteMany({where:{studentId}});await prisma.studentProfile.deleteMany({where:{studentId}});await prisma.quizAttempt.deleteMany({where:{studentId}});await prisma.enrollment.deleteMany({where:{studentId}});
      await prisma.sessionProgress.deleteMany({where:{studentId}});
      await prisma.studentMastery.deleteMany({where:{studentId}});
      if (!/^[a-zA-Z0-9-]+$/.test(studentId)) throw new Error("Unexpected temporary learner ID");
      const projectId = process.env.NEON_PROJECT_ID || "square-grass-82468951";
      if (!/^[a-z0-9-]+$/.test(projectId)) throw new Error("Invalid Neon test project ID");
      const cleanup = spawnSync("powershell.exe", ["-NoProfile", "-Command", `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch production --project-id ${projectId}`], { cwd: resolve(testInfo.project.testDir, "../.."), encoding: "utf8", windowsHide: true });
      if (cleanup.status !== 0) throw new Error(`Temporary math test learner cleanup failed (exit ${cleanup.status}, ${cleanup.error?.message ?? "CLI error"})`);
    }
    await prisma.$disconnect();
  }
});
