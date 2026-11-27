import { test, expect } from "@playwright/test";
import { build } from "esbuild";

test("lesson timer starts automatically, pauses at ten seconds and resumes for all lesson input", async ({
  page,
}) => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {StudyTimer} from './components/study-timer';
 window.timerOwner='timer-owner';const root=createRoot(document.getElementById('timer-fixture'));
 window.openTimer=(sessionId)=>root.render(<StudyTimer sessionId={sessionId}/>);window.openTimer('lesson-one');`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "fixture-auth",
        setup(b) {
          b.onResolve({ filter: /auth\/client$/ }, () => ({
            path: "auth",
            namespace: "fixture-auth",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture-auth" }, () => ({
            contents: `export const authClient={useSession:()=>({data:{user:{id:window.timerOwner}}})};`,
            loader: "js",
          }));
        },
      },
    ],
  });
  const calls: { action: string; trackingId: string; sessionId: string }[] = [];
  let denyNextStart = false;
  await page.route("**/__timer-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body></body></html>" }),
  );
  await page.route("**/api/activity", async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    if (body.action === "start" && denyNextStart) {
      denyNextStart = false;
      await route.fulfill({ status: 409, json: { error: { code: "TIMER_ACTIVE_ELSEWHERE" } } });
      return;
    }
    expect(Object.keys(body).sort()).toEqual(["action", "sessionId", "trackingId"]);
    await route.fulfill({
      json: {
        state: body.action === "stop" ? "paused" : "tracking",
        secondsAdded: body.action === "pulse" ? 5 : 0,
      },
    });
  });
  await page.goto("/__timer-fixture");
  await page.setContent(
    '<div id="timer-fixture"></div><textarea aria-label="Answer"></textarea><div id="scroll-fixture"></div>',
  );
  const start = new Date("2026-11-28T10:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const status = page.locator(".study-timer > span[role=status]");
  const pause = page.getByRole("button", { name: /^Pause study timer/ });
  await expect(status).toHaveText("Recording focused time");
  expect(calls[0].action).toBe("start");
  await page.clock.runFor(9000);
  await expect(pause).toHaveAttribute("aria-label", "Pause study timer · 0:09");
  for (const event of [
    "pointermove",
    "pointerdown",
    "touchstart",
    "touchmove",
    "keydown",
    "input",
    "wheel",
    "scroll",
  ]) {
    await page.evaluate(
      (type) =>
        document
          .getElementById("scroll-fixture")!
          .dispatchEvent(new Event(type, { bubbles: type !== "scroll" })),
      event,
    );
    await page.clock.runFor(9000);
    await expect(status).toHaveText("Recording focused time");
  }
  await page.clock.runFor(1000);
  await expect(status).toHaveText("Paused while away or idle");
  await expect.poll(() => calls.filter((c) => c.action === "stop").length).toBe(1);
  const idleLabel = await pause.getAttribute("aria-label"),
    idleCalls = calls.length;
  await page.clock.runFor(30000);
  await expect(pause).toHaveAttribute("aria-label", idleLabel!);
  expect(calls.length).toBe(idleCalls);
  await page.mouse.move(30, 100);
  await expect(status).toHaveText("Recording focused time");
  await expect.poll(() => calls.filter((c) => c.action === "start").length).toBe(2);
  await pause.click();
  await expect(status).toHaveText("Manually paused");
  await page.getByRole("textbox", { name: "Answer" }).fill("My working");
  await expect(status).toHaveText("Manually paused");
  const firstId = calls[0].trackingId;
  denyNextStart = true;
  await page.evaluate(() => (window as any).openTimer("lesson-two"));
  await expect(status).toHaveText("Timer active in another tab");
  await page.clock.runFor(5000);
  await expect(status).toHaveText("Recording focused time");
  await expect(pause).toHaveAttribute("aria-label", "Pause study timer · 0:00");
  expect(calls.filter((c) => c.action === "start").at(-1)?.trackingId).toBe(firstId);
  await page.evaluate(() => {
    (window as any).timerOwner = "second-owner";
    (window as any).openTimer("lesson-two");
  });
  await expect
    .poll(() => calls.filter((c) => c.action === "start").at(-1)?.trackingId)
    .not.toBe(firstId);
  await expect(pause).toHaveAttribute("aria-label", "Pause study timer · 0:00");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(status).toHaveText("Paused while away or idle");
  await page.clock.runFor(30000);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(status).toHaveText("Recording focused time");
  await expect(pause).toHaveAttribute("aria-label", "Pause study timer · 0:00");
});
