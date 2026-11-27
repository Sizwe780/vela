import { test, expect } from "@playwright/test";
import { build } from "esbuild";

test("clearing device drafts cancels a pending retry without restoring private working", async ({
  page,
}) => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LessonAttemptProvider,clearLessonDrafts,useLessonAttempts} from './components/lesson-attempt-store';
 function Working(){const s=useLessonAttempts();return <p>{Object.keys(s.records).length} saved drafts</p>};
 window.clearDrafts=clearLessonDrafts;
 createRoot(document.getElementById('cache-fixture')).render(<LessonAttemptProvider session={{ownerId:'cache-owner',studyUnitId:'unit',sessionId:'session',version:1}}><Working/></LessonAttemptProvider>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  let calls = 0;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/practice/attempts?*", async (route) => {
    calls++;
    if (calls === 1) {
      await route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });
      return;
    }
    await held;
    await route
      .fulfill({
        json: {
          ownerId: "cache-owner",
          attempts: [
            {
              id: "old",
              title: "Check",
              question: "Question",
              userAnswer: { text: "Private saved answer" },
              status: "tried",
              revision: 1,
              submitted: true,
            },
          ],
        },
      })
      .catch(() => {});
  });
  await page.goto("/privacy");
  await page.setContent('<div id="cache-fixture"></div>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole("button", { name: "Retry sync", exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await page.evaluate(() => {
    (window as any).clearDrafts();
  });
  release();
  await expect(page.getByText("0 saved drafts", { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("vela:lesson-attempts:v1:")),
    ),
  ).toEqual([]);
});
