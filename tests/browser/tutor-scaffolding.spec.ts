import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("tiered hints and conceptual debate preserve current context without mastery", async ({
  page,
}, info) => {
  test.setTimeout(720000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const tag = randomUUID(),
    q = `qa-scaffold-q-${tag}`,
    m = `qa-scaffold-m-${tag}`,
    u = `qa-scaffold-u-${tag}`,
    s = `qa-scaffold-s-${tag}`;
  let owner: string | undefined;
  try {
    await db.qualification.create({
      data: {
        id: q,
        institution: `QA ${tag}`,
        code: "QA",
        stream: "QA",
        title: "Isolated scaffold QA",
        streamTitle: "Synthetic only",
        saqaId: "QA",
        nqfExitLevel: 7,
      },
    });
    await db.module.create({
      data: {
        id: m,
        institution: `QA ${tag}`,
        code: "QA-CONCEPT",
        title: "Conceptual QA",
        metadata: { runtimeCapabilities: { version: 1, tools: ["pck", "debate"] } },
      },
    });
    await db.qualificationModule.create({
      data: { qualificationId: q, moduleId: m, studyYear: 1, position: 1 },
    });
    await db.studyUnit.create({
      data: {
        id: u,
        moduleId: m,
        code: "QA-C-U1",
        title: "Reasoning about classroom feedback",
        position: 1,
      },
    });
    await db.studySession.create({
      data: {
        id: s,
        studyUnitId: u,
        position: 1,
        title: "Feedback and evidence",
        concepts: ["feedback"],
        markdown:
          "## Learning goal\n\nDistinguish evidence about a learning need from judgments about a learner. Timely feedback can identify one specific action a learner can take. The effect depends on context and evidence; a score alone does not describe the next learning step.",
      },
    });
    owner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [m]);
    await page.goto(`/study/${u}`);
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    const tools = page.getByRole("button", { name: "Tutor tools", exact: true });
    const sent: any[] = [];
    await page.route("**/api/tutor", async (route) => {
      const input = route.request().postDataJSON();
      sent.push(input);
      const id = randomUUID();
      const frames = [
        { type: "start", messageId: id },
        {
          type: "data-citations",
          id: "retrieved-sources",
          data: {
            sources: [],
            mode: input.mode,
            preview: false,
            ...(input.hintTier ? { hintTier: input.hintTier } : {}),
            ...(input.strategy === "debate" ? { strategy: "debate" } : {}),
          },
        },
        { type: "text-start", id },
        {
          type: "text-delta",
          id,
          delta:
            input.strategy === "debate"
              ? "## Core Answer\nHypothetical challenge: could the same feedback have different effects in different classrooms?"
              : input.hintTier === 3
                ? "## Core Answer\n:::exercise Different classroom\nHow might feedback differ for two learning needs?\n:::answer\nPARALLEL_QA_SOLUTION describes a different classroom case.\n:::end\nWhat changes in your own case?"
                : "## Core Answer\nConsider the evidence that would support the claim. What assumption needs checking?",
        },
        { type: "text-end", id },
        { type: "finish", finishReason: "stop" },
      ];
      await route.fulfill({
        headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("") + "data: [DONE]\n\n",
      });
    });
    await page.locator("#tutor-query").fill("How should I justify feedback in this example?");
    for (const [tier, label] of [
      [1, "1 · Nudge"],
      [2, "2 · Structural guide"],
      [3, "3 · Parallel example"],
    ] as const) {
      await tools.click();
      await expect(page.getByRole("button", { name: "Insert math", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByText(`Hint ${tier}`, { exact: true })).toBeVisible();
      if (tier === 3) {
        const card = page.locator(".companion-card").last();
        await expect(card.getByText("PARALLEL_QA_SOLUTION", { exact: false })).not.toBeVisible();
        await card.getByRole("button", { name: "Show answer", exact: true }).click();
        await expect(card.getByText("PARALLEL_QA_SOLUTION", { exact: false })).toBeVisible();
      }
      expect(sent.at(-1)).toMatchObject({
        studyUnitId: u,
        sessionId: s,
        strategy: "coach",
        hintTier: tier,
      });
    }
    await tools.click();
    await page.getByLabel("Learning approach", { exact: true }).selectOption("debate");
    await page.getByRole("button", { name: "Close tutor tools", exact: true }).click();
    await page
      .locator("#tutor-query")
      .fill("Every learner benefits from identical feedback because fairness means sameness.");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(
      page.locator(".teaching-tag").getByText("Socratic debate", { exact: true }),
    ).toBeVisible();
    expect(sent.at(-1).strategy).toBe("debate");
    expect(sent.at(-1).hintTier).toBeUndefined();
    await page.unroute("**/api/tutor");
    const real = await db.studyUnit.findFirstOrThrow({
      where: { code: "MAT1503-U1" },
      include: { sessions: { orderBy: { position: "asc" }, take: 1 } },
    });
    await enrollTestLearner(page.request, db, [m, real.moduleId]);
    const origin = new URL(info.project.use.baseURL!).origin;
    const rejected = await page.request.post("/api/tutor", {
      headers: { origin },
      data: {
        studyUnitId: real.id,
        sessionId: real.sessions[0].id,
        query: "Debate this",
        mode: "academic",
        strategy: "debate",
      },
    });
    expect(rejected.status()).toBe(400);
    expect((await rejected.json()).error.code).toBe("STRATEGY_UNAVAILABLE");
    const sample = await page.request.post("/api/tutor", {
      headers: { origin },
      data: { studyUnitId: "demo", query: "A hint", mode: "academic", hintTier: 1 },
    });
    expect(sample.status()).toBe(400);
    if (process.env.SCAFFOLD_PROVIDER === "ollama" && !process.env.OLLAMA_GUIDED_MODEL) {
      const unavailable = await page.request.post("/api/tutor", {
        headers: { origin },
        data: {
          studyUnitId: real.id,
          sessionId: real.sessions[0].id,
          query: "A nudge",
          mode: "academic",
          hintTier: 1,
          provider: "ollama",
        },
      });
      expect(unavailable.status()).toBe(503);
      expect((await unavailable.json()).error.code).toBe("LOCAL_GUIDED_NOT_READY");
      return;
    }
    if (process.env.VERIFY_SCAFFOLD_AI && info.project.name === "desktop") {
      for (const hintTier of [1, 2, 3]) {
        const response = await page.request.post("/api/tutor", {
          timeout: 210000,
          headers: { origin },
          data: {
            studyUnitId: real.id,
            sessionId: real.sessions[0].id,
            query:
              "I need to solve 2x + 5 = 19. Give the requested hint only, without the answer to this actual task.",
            mode: "academic",
            provider: process.env.SCAFFOLD_PROVIDER === "ollama" ? "ollama" : "cloudflare",
            hintTier,
          },
        });
        expect(
          response.status(),
          response.ok() ? "Live tutor response" : JSON.stringify((await response.json()).error),
        ).toBe(200);
        const frames = (await response.text())
          .split("\n")
          .filter((l) => l.startsWith("data: {"))
          .map((l) => JSON.parse(l.slice(6)));
        expect(frames.some((f) => f.type === "error")).toBe(false);
        const answer = frames
          .filter((f) => f.type === "text-delta")
          .map((f) => f.delta)
          .join("");
        await writeFile(
          `../work/${process.env.SCAFFOLD_PROVIDER ?? "cloudflare"}-hint-${hintTier}.md`,
          answer,
        );
        expect(answer.length).toBeGreaterThan(20);
        expect(answer).not.toMatch(/x\s*=\s*7/);
        if (hintTier === 3) {
          expect(answer).toContain(":::exercise");
          expect(answer).toContain(":::answer");
          expect(answer).toContain(":::end");
          expect(answer).not.toMatch(/[a-z]\s*=\s*7(?:\b|\$)/);
        }
      }
      const response = await page.request.post("/api/tutor", {
        timeout: 210000,
        headers: { origin },
        data: {
          studyUnitId: u,
          sessionId: s,
          query: "Every learner benefits from identical feedback because fairness means sameness.",
          mode: "academic",
          strategy: "debate",
          provider: process.env.SCAFFOLD_PROVIDER === "ollama" ? "ollama" : "cloudflare",
        },
      });
      expect(response.status()).toBe(200);
      const frames = (await response.text())
        .split("\n")
        .filter((l) => l.startsWith("data: {"))
        .map((l) => JSON.parse(l.slice(6)));
      expect(frames.some((f) => f.type === "error")).toBe(false);
      const answer = frames
        .filter((f) => f.type === "text-delta")
        .map((f) => f.delta)
        .join("");
      await writeFile(`../work/${process.env.SCAFFOLD_PROVIDER ?? "cloudflare"}-debate.md`, answer);
      expect(answer).toContain("?");
      expect(answer).not.toContain("<render_widget");
    }
    expect(await db.studentMastery.count({ where: { studentId: owner } })).toBe(0);
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.qualification.deleteMany({ where: { id: q } });
    await db.module.deleteMany({ where: { id: m } });
    await db.$disconnect();
  }
});
