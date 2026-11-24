import { test, expect } from "@playwright/test";
test("workspace layout controls and source-backed recall drawer", async ({ page }, info) => {
  await page.goto("/study/demo");
  if (info.project.name === "desktop")
    for (const value of ["reader", "split", "theater"]) {
      await page.getByLabel("Workspace layout").selectOption(value);
      await expect(page.locator("main.split-layout")).toHaveClass(new RegExp(`layout-${value}`));
      const readerWidth = (await page.locator("#workspace-reader").boundingBox())!.width;
      const companionWidth = (await page.locator("#workspace-companion").boundingBox())!.width;
      expect(readerWidth / (readerWidth + companionWidth)).toBeCloseTo(
        value === "reader" ? 0.7 : value === "split" ? 0.5 : 0.3,
        1,
      );
    }
  const more = page.getByRole("button", { name: "More tools", exact: true });
  await page.route("**/api/recall", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        cards: [{ id: "sample-source", prompt: "Recall the derivative", answer: "$f'(x)=2x$" }],
      }),
    }),
  );
  await page.getByRole("button", { name: "Recall queue", exact: true }).click();
  await expect(page.getByLabel("Active recall")).toBeVisible();
  await page.getByRole("button", { name: "Reveal / hide answer" }).click();
  await expect(page.locator(".recall-drawer .katex")).toBeVisible();
  await page.getByRole("button", { name: "Close recall", exact: true }).click();
  await expect(page.getByLabel("Active recall")).toHaveCount(0);
  await page.route("**/api/notes**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().method() === "GET"
          ? { body: "", revision: 0, ownerId: "fixture-user" }
          : { revision: 1 },
      ),
    }),
  );
  if (await more.isVisible()) await more.click();
  await page.getByRole("button", { name: "My Notes", exact: true }).click();
  const notebook = page.getByRole("dialog", { name: "My Notes", exact: true });
  await notebook
    .getByRole("textbox", { name: "Personal study notes" })
    .fill("A clear explanation in my own words.");
  await notebook.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(notebook.getByRole("status")).toHaveText("Saved");
  await notebook.getByRole("button", { name: "Close notes", exact: true }).click();
  if (await more.isVisible()) await more.click();
  await page.getByRole("button", { name: "Practice active recall", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Active recall" })).toBeVisible();
  await page.getByRole("button", { name: "Close recall", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("chat widgets respond to live slider parameters", async ({ page }) => {
  await page.goto("/study/demo");
  const answer = `## Core Answer\nTry this secant model.\n<widget type="secant" data='{ "coefficients":[2,-1,0] }' />`;
  const events = [
    { type: "start", messageId: "widget-test" },
    { type: "text-start", id: "text" },
    { type: "text-delta", id: "text", delta: answer },
    { type: "text-end", id: "text" },
    { type: "finish" },
  ];
  await page.route("**/api/tutor", (route) =>
    route.fulfill({
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n",
    }),
  );
  const panel = page.getByRole("button", { name: "Learning companion", exact: true });
  if (await panel.isVisible()) await panel.click();
  await page.getByLabel("Ask your learning companion").fill("Plot this quadratic");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const graph = page.locator(".chat-widget");
  await expect(graph).toBeVisible();
  const before = await graph.locator("p").textContent();
  await graph.getByRole("slider").last().fill("0.2");
  await expect(graph.locator("p")).not.toHaveText(before!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
