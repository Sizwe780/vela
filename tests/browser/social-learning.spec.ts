import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("private evidence, opt-in live rooms, versioned discussions and scoped moderation", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(480000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const peerContext = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: info.project.use.viewport,
  });
  const guest = await browser.newContext({ baseURL: info.project.use.baseURL });
  const peer = await peerContext.newPage();
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  const tag = randomUUID(),
    q = `qa-qual-${tag}`,
    otherQ = `qa-other-${tag}`,
    m = `qa-module-${tag}`,
    locked = `qa-locked-${tag}`,
    u = `qa-unit-${tag}`,
    s = `qa-session-${tag}`,
    lo = `qa-outcome-${tag}`,
    chunk = `qa-chunk-${tag}`;
  const prose =
    "A steady process adds the same amount on every step. Explain the underlying assumption before applying a rule to a new situation.";
  const markdown = `## Learning goal\n\n${prose}\n\n:::exercise Predict first\nWhich assumption would you check before changing the context?\n:::answer\nSECRET_QA_ANSWER is deliberately hidden from paragraph discussions.\n:::end`;
  let a: string | undefined, b: string | undefined;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  peer.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const path of [
      "/api/insights",
      "/api/capabilities",
      "/api/rooms",
      "/api/discussions",
      "/api/discussions/moderation",
    ])
      expect((await guest.request.get(path)).status()).toBe(401);
    await db.qualification.create({
      data: {
        id: q,
        institution: `Isolated QA ${tag}`,
        code: "QA",
        stream: "QA",
        title: "Temporary isolated QA fixture",
        streamTitle: "Synthetic verification only",
        saqaId: "QA-not-a-qualification",
        nqfExitLevel: 7,
      },
    });
    await db.qualification.create({
      data: {
        id: otherQ,
        institution: `Other QA ${tag}`,
        code: "QA",
        stream: "QA",
        title: "Unrelated QA staff scope",
        streamTitle: "Synthetic verification only",
        saqaId: "QA-not-a-qualification",
        nqfExitLevel: 7,
      },
    });
    await db.module.createMany({
      data: [
        {
          id: m,
          institution: `Isolated QA ${tag}`,
          code: "QA-SOCIAL",
          title: "Temporary isolated social test",
        },
        {
          id: locked,
          institution: `Isolated QA ${tag}`,
          code: "QA-LOCKED",
          title: "Unenrolled QA module",
        },
      ],
    });
    await db.qualificationModule.createMany({
      data: [
        { qualificationId: q, moduleId: m, studyYear: 1, position: 1 },
        { qualificationId: q, moduleId: locked, studyYear: 1, position: 2 },
      ],
    });
    await db.studyUnit.create({
      data: {
        id: u,
        moduleId: m,
        code: "QA-U1",
        title: "Original synthetic reasoning",
        position: 1,
      },
    });
    await db.studySession.create({
      data: {
        id: s,
        studyUnitId: u,
        position: 1,
        title: "Reason from the assumption",
        markdown,
        concepts: ["assumptions"],
      },
    });
    await db.learningOutcome.create({
      data: {
        id: lo,
        studyUnitId: u,
        code: "QA-LO",
        description: "Explain the assumption before applying a rule",
        position: 1,
      },
    });
    await db.contentChunk.create({
      data: {
        id: chunk,
        learningOutcomeId: lo,
        title: "Synthetic source paragraph",
        body: prose,
        position: 1,
      },
    });
    a = await createTestLearner(page);
    b = await createTestLearner(peer);
    await enrollTestLearner(page.request, db, [m]);
    await enrollTestLearner(peer.request, db, [m]);
    expect(await db.enrollment.count({ where: { moduleId: m } })).toBe(2);
    expect((await page.request.get(`/api/rooms?moduleId=${locked}`)).status()).toBe(403);
    await page.goto(`/lounge/${m}`);
    await peer.goto(`/lounge/${m}`);
    expect(await db.studyRoomPresence.count({ where: { moduleId: m } })).toBe(0);
    const firstJoin = page.waitForRequest(
      (r) =>
        r.url().endsWith("/api/rooms") &&
        r.method() === "POST" &&
        r.postDataJSON()?.action === "join",
    );
    await page.getByRole("button", { name: "Join anonymous room", exact: true }).click();
    const leaseA = (await firstJoin).postDataJSON();
    await expect(page.getByText("Live · Neon Realtime", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId("room-count")).toHaveText("0 other learners active in this room");
    const peerJoin = peer.waitForRequest(
      (r) =>
        r.url().endsWith("/api/rooms") &&
        r.method() === "POST" &&
        r.postDataJSON()?.action === "join",
    );
    await peer.getByRole("button", { name: "Join anonymous room", exact: true }).click();
    const leaseB = (await peerJoin).postDataJSON();
    await expect(page.getByTestId("room-count")).toHaveText("1 other learner active in this room", {
      timeout: 12000,
    });
    await expect(peer.getByText("Live · Neon Realtime", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    expect(
      (
        await page.request.post("/api/rooms", { data: { ...leaseA, trackingId: randomUUID() } })
      ).status(),
    ).toBe(409);
    expect(
      (await page.request.post("/api/rooms", { data: { ...leaseA, ownerId: b } })).status(),
    ).toBe(409);
    const count = await (await page.request.get(`/api/rooms?moduleId=${m}`)).json();
    expect(Object.keys(count).sort()).toEqual(["live", "others", "ownerId", "serverTime"]);
    expect(JSON.stringify(count)).not.toContain(b);
    const parseTime = (t: string) =>
      t
        .split(":")
        .map(Number)
        .reduce((n, v) => n * 60 + v, 0);
    expect(
      Math.abs(
        parseTime(await page.getByTestId("pomodoro-time").innerText()) -
          parseTime(await peer.getByTestId("pomodoro-time").innerText()),
      ),
    ).toBeLessThanOrEqual(2);
    await db.studyRoomPresence.update({
      where: { studentId_moduleId: { studentId: b, moduleId: m } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (await peer.request.post("/api/rooms", { data: { ...leaseB, action: "pulse" } })).status(),
    ).toBe(409);
    // Expiry is time-driven: allow the next 25-second timestamp reseal.
    await expect(page.getByTestId("room-count")).toHaveText(
      "0 other learners active in this room",
      { timeout: 40000 },
    );
    if (await peer.getByRole("button", { name: "Leave room", exact: true }).isVisible())
      await peer.getByRole("button", { name: "Leave room", exact: true }).click();
    await peer.getByRole("button", { name: "Join anonymous room", exact: true }).click();
    await expect(page.getByTestId("room-count")).toHaveText("1 other learner active in this room", {
      timeout: 12000,
    });
    const enrollment = await db.enrollment.findFirstOrThrow({
      where: { studentId: b, moduleId: m },
    });
    expect(
      (
        await peer.request.post("/api/enrollments", {
          data: { action: "withdraw", enrollmentId: enrollment.id },
        })
      ).status(),
    ).toBe(200);
    await expect(page.getByTestId("room-count")).toHaveText(
      "0 other learners active in this room",
      { timeout: 12000 },
    );
    expect((await peer.request.get(`/api/rooms?moduleId=${m}&live=1`)).status()).toBe(403);
    await enrollTestLearner(peer.request, db, [m]);
    await page.goto(`/study/${u}`);
    await peer.goto(`/study/${u}`);
    await expect.poll(() => db.studyRoomPresence.count({ where: { moduleId: m } })).toBe(0);
    await expect(page.getByRole("button", { name: "Insert math", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "CAPS PCK", exact: true })).toHaveCount(0);
    await expect(page.locator(".exercise-scratchpad")).toHaveCount(0);
    let reads = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/discussions?") && r.method() === "GET") reads++;
    });
    expect(reads).toBe(0);
    await page.getByRole("button", { name: "Enable peer discussions", exact: true }).click();
    await peer.getByRole("button", { name: "Enable peer discussions", exact: true }).click();
    const sourcePath = `/api/discussions?studyUnitId=${u}&sourceType=session&sourceId=${s}`;
    const source = await (await page.request.get(sourcePath)).json();
    expect(JSON.stringify(source.paragraphs)).not.toContain("SECRET_QA_ANSWER");
    const anchor = source.paragraphs.find((p: { text: string }) => p.text === prose).anchor;
    for (const view of [page, peer]) {
      const loaded = view.waitForResponse(
        (r) =>
          r.url().includes("/api/discussions?") &&
          new URL(r.url()).searchParams.get("anchor") === anchor,
      );
      await view.getByLabel("Discussion paragraph", { exact: true }).selectOption(anchor);
      await loaded;
    }
    await expect(
      peer.getByText("Discussion counts live · replies refresh every 15 seconds", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    // Block ordinary refreshes: this badge must arrive over the actual live socket.
    await peer.route("**/api/discussions?**", (route) =>
      new URL(route.request().url()).searchParams.get("live") === "1"
        ? route.continue()
        : route.abort("failed"),
    );
    const posted = page.waitForRequest(
      (r) => r.url().endsWith("/api/discussions") && r.method() === "POST",
    );
    await page
      .getByLabel("Shared discussion draft")
      .fill("QA synthetic question: which assumption should I explain before applying the rule?");
    await page.getByRole("button", { name: "Post discussion", exact: true }).click();
    const post = (await posted).postDataJSON();
    await expect(page.locator(".peer-discussions").getByRole("status")).toContainText(
      "Posted to this paragraph",
    );
    await expect(peer.getByRole("button", { name: "1 discussion", exact: true })).toBeVisible({
      timeout: 12000,
    });
    await peer.unroute("**/api/discussions?**");
    await peer.getByRole("button", { name: "Refresh discussions", exact: true }).click();
    await expect(peer.locator(".discussion-thread")).toContainText("QA synthetic question");
    expect((await page.request.post("/api/discussions", { data: post })).status()).toBe(200);
    expect(await db.discussionPost.count({ where: { sourceId: s, parentId: null } })).toBe(1);
    expect(
      (
        await peer.request.patch("/api/discussions", {
          data: { id: post.id, ownerId: b, action: "remove" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/discussions", {
          data: { ...post, id: randomUUID(), ownerId: b },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/discussions", {
          data: { ...post, id: randomUUID(), studentId: b },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/discussions", {
          headers: { origin: "https://attacker.invalid" },
          data: { ...post, id: randomUUID() },
        })
      ).status(),
    ).toBe(403);
    const peerData = await (await peer.request.get(sourcePath + `&anchor=${anchor}`)).json();
    expect(JSON.stringify(peerData)).not.toContain(a);
    expect(peerData.threads[0].canRemove).toBe(false);
    expect(peerData.threads[0].alias).toMatch(/^Learner [a-f0-9]{6}$/);
    await peer.getByRole("button", { name: "Reply to this discussion", exact: true }).click();
    await peer
      .getByLabel("Shared discussion draft")
      .fill(
        "QA synthetic reply: name the assumption and test whether it holds in the changed context.",
      );
    await peer.getByRole("button", { name: "Post reply", exact: true }).click();
    await expect(peer.locator(".peer-discussions").getByRole("status")).toContainText(
      "Posted to this paragraph",
    );
    for (let i = 0; i < 2; i++)
      expect(
        (
          await peer.request.patch("/api/discussions", {
            data: { id: post.id, ownerId: b, action: "report" },
          })
        ).status(),
      ).toBe(200);
    expect(await db.discussionReport.count({ where: { postId: post.id } })).toBe(1);
    expect((await peer.request.get("/api/discussions/moderation")).status()).toBe(403);
    await db.studentProfile.upsert({
      where: { studentId: b },
      create: { studentId: b },
      update: {},
    });
    await db.staffMembership.create({
      data: { studentId: b, qualificationId: otherQ, role: "staff" },
    });
    expect(
      (
        await peer.request.patch("/api/discussions", {
          data: { id: post.id, ownerId: b, action: "remove" },
        })
      ).status(),
    ).toBe(403);
    await db.staffMembership.create({ data: { studentId: b, qualificationId: q, role: "staff" } });
    const reports = await (await peer.request.get("/api/discussions/moderation")).json();
    expect(reports.posts[0].id).toBe(post.id);
    expect(reports.posts[0].reports).toBe(1);
    const chunkSource = await page.request.get(
      `/api/discussions?studyUnitId=${u}&sourceType=chunk&sourceId=${chunk}`,
    );
    expect(chunkSource.status()).toBe(200);
    expect((await chunkSource.json()).paragraphs[0].text).toBe(prose);
    // Old-version posts cannot be silently attached to a revised source.
    await db.studySession.update({
      where: { id: s },
      data: {
        markdown: markdown + "\n\nA revised paragraph adds an independently checked explanation.",
        version: 2,
      },
    });
    expect(
      (
        await page.request.post("/api/discussions", { data: { ...post, id: randomUUID() } })
      ).status(),
    ).toBe(409);
    const changed = await (await page.request.get(sourcePath)).json();
    expect(changed.counts).toEqual([]);
    expect(changed.sourceHash).not.toBe(source.sourceHash);
    expect(
      (
        await peer.request.patch("/api/discussions", {
          data: { id: post.id, ownerId: b, action: "remove" },
        })
      ).status(),
    ).toBe(200);
    expect((await db.discussionPost.findUniqueOrThrow({ where: { id: post.id } })).body).toBe("");
    expect(await db.studentMastery.count({ where: { studentId: a } })).toBe(0);
    expect(await db.sessionProgress.count({ where: { studentId: a } })).toBe(0);
    expect(await db.studyActivityDay.count({ where: { studentId: a } })).toBe(0);
    // Known practice data is isolated from self-ratings and from other accounts.
    const now = Date.now();
    for (const [n, score] of [
      [2, 0.25],
      [1, 0.75],
    ])
      await db.quizAttempt.create({
        data: {
          studentId: a,
          studyUnitId: u,
          provider: "heuristic",
          expiresAt: new Date(now + 60000),
          submittedAt: new Date(now - n * 60000),
          result: { mastery: [{ learningOutcomeId: lo, score }] },
        },
      });
    await db.conceptAttempt.create({
      data: {
        id: randomUUID(),
        studentId: a,
        sessionId: s,
        learningOutcomeId: lo,
        sessionVersion: 2,
        contentHash: "qa",
        challenge: { qa: true },
        expiresAt: new Date(now + 60000),
        submittedAt: new Date(now),
        verified: true,
        score: 0.4,
      },
    });
    await db.studentMastery.create({
      data: {
        studentId: a,
        learningOutcomeId: lo,
        score: 1,
        attempts: 3,
        nextReviewAt: new Date(now - 60000),
      },
    });
    const insights = await (await page.request.get("/api/insights")).json();
    const outcome = insights.outcomes.find((o: { id: string }) => o.id === lo);
    expect(outcome.quiz.score).toBe(0.75);
    expect(outcome.quizChange).toBe(50);
    expect(outcome.concept.score).toBe(0.4);
    expect(outcome.mixedScore).toBe(1);
    expect(insights.recommendations[0].kind).toBe("review");
    const otherInsights = await (await peer.request.get("/api/insights")).json();
    expect(otherInsights.outcomes.find((o: { id: string }) => o.id === lo).quiz).toBeNull();
    await page.goto("/progress");
    await expect(
      page.getByRole("heading", { name: "Progress & outcomes", exact: true }),
    ).toBeVisible();
    await page.getByText("Latest quiz · 75%", { exact: true }).click();
    await expect(page.getByText("75% · 2 recent attempts", { exact: true })).toBeVisible();
    await expect(
      page.getByText("+50 percentage points from your previous quiz practice.", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `../work/outcome-insights-${info.project.name}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Verify real module tools are relevant without publishing test posts there.
    if (info.project.name === "desktop") {
      const modules = await db.module.findMany({
        where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
        select: { id: true },
      });
      await enrollTestLearner(
        page.request,
        db,
        modules.map((m) => m.id),
      );
      for (const code of ["MAT1503", "MAT1512"]) {
        await page.goto(`/study/${code}-U1`);
        await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
        const tools = page.getByRole("dialog", { name: "Tutor tools", exact: true });
        await tools.getByRole("button", { name: "Visual sandboxes", exact: true }).click();
        await expect(
          tools.getByRole("button", {
            name: code === "MAT1503" ? "Matrix transformations" : "Riemann sums",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          tools.getByRole("button", {
            name: code === "MAT1503" ? "Riemann sums" : "Matrix transformations",
            exact: true,
          }),
        ).toHaveCount(0);
        await tools.getByRole("button", { name: "Close tutor tools", exact: true }).click();
      }
    }
    await writeFile(
      `../work/social-proof-${info.project.name}.json`,
      JSON.stringify(
        {
          liveRoom: true,
          liveDiscussionCounts: true,
          expiredLeaseExcluded: true,
          withdrawalApplied: true,
          scopedModeration: true,
          separateEvidence: true,
          syntheticModuleOnly: true,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    if (a) await cleanupTestLearner(db, a);
    if (b) await cleanupTestLearner(db, b);
    if ((await db.enrollment.count({ where: { moduleId: { in: [m, locked] } } })) === 0) {
      await db.qualification.deleteMany({ where: { id: { in: [q, otherQ] } } });
      await db.module.deleteMany({ where: { id: { in: [m, locked] } } });
    }
    await peerContext.close();
    await guest.close();
    await db.$disconnect();
  }
});
