import { test, expect } from "@playwright/test";
test("short-screen welcome can scroll freely and mode changes reveal its heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 540 });
  await page.goto("/study/demo");
  await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  const pane = page.locator(".chat-scroll");
  await expect(pane).toBeVisible();
  expect(await pane.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
  await pane.evaluate((el) => {
    el.scrollTop = 10;
  });
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await pane.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "CAPS PCK", exact: true }).click();
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBe(0);
  expect(
    await pane.evaluate(
      (el) => el.querySelector("h3")!.getBoundingClientRect().top >= el.getBoundingClientRect().top,
    ),
  ).toBe(true);
});
