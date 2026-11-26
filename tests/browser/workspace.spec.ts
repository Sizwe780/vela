import { test, expect } from "@playwright/test";

test("reader, maths, outcomes and responsive layout", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/study/demo");
  await expect(page.getByRole("heading", { name: "Understanding the derivative", exact: true })).toBeVisible();
  await expect(page.locator(".study-document .katex").first()).toBeVisible();
  expect(await page.locator(".katex-error").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === "desktop") await page.screenshot({ path: "learning-workspace.png", fullPage: true });
  await page.getByRole("button", { name: "Learning outcomes 2" }).click();
  await expect(page.getByRole("heading", { name: "What you’ll work towards" })).toBeVisible();
  await page.getByRole("button", { name: "Study text", exact: true }).click();
  await page.getByRole("slider").focus();
  await page.getByRole("slider").press("End");
  await expect(page.locator(".graph-readout strong")).toHaveText("10.0");
  await page.getByRole("button", { name: "Increase text size" }).click();
  expect(await page.locator(".reader-scroll").getAttribute("style")).toContain("18px");
  expect(errors).toEqual([]);
});

test("mode switching, streaming chat, source citations and new conversation", async ({ page }, testInfo) => {
  await page.goto("/study/demo");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByRole("button", { name: "CAPS PCK", exact: true }).click();
  await expect(page.getByRole("button", {name: "CAPS PCK", exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button", { name: "How would I teach this concept?", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop response" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make the idea visible" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(0);
  await expect(page.getByText("2 retrieved sources", { exact: false })).toBeVisible();
  await page.getByRole("link", {name: "C1", exact:true}).first().scrollIntoViewIfNeeded();
  const scrollBefore = await page.locator(".chat-scroll").evaluate(el => el.scrollTop);
  await page.getByRole("link", { name: "C1", exact: true }).first().click();
  expect(await page.locator(".chat-scroll").evaluate(el => el.scrollTop)).toBe(scrollBefore);
  await expect(page.locator("#chunk-demo-rates")).toBeVisible();
  await expect(page.getByRole("dialog",{name:"Source preview"})).toBeVisible();
  await expect(page.locator(".criterion-detail")).toContainText("DEMO-AC-1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog",{name:"Source preview"})).toHaveCount(0);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByRole("button", { name: "Start a new conversation" }).click();
  await page.getByRole("alertdialog", { name: "Start a new chat?" }).getByRole("button", { name: "Start new chat", exact: true }).click();
  await expect(page.locator(".chat-message")).toHaveCount(0);
  await page.getByRole("button", { name: "Academic Master", exact: true }).click();
  await expect(page.getByRole("button",{name:"Academic Master",exact:true})).toHaveAttribute("aria-pressed","true");
});

test("provider errors are visible and a failed response can be retried", async ({ page }, testInfo) => {
  await page.route("**/api/tutor", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "The tutor is temporarily unavailable." } }) }));
  await page.goto("/study/demo");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByLabel("Ask your learning companion").fill("Explain the derivative");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".chat-error")).toContainText("The tutor is temporarily unavailable.");
  await page.unroute("**/api/tutor");
  await page.getByRole("button", { name: "Try again", exact: false }).click();
  await expect(page.getByRole("heading", { name: "A derivative is a local rate of change" })).toBeVisible();
});
