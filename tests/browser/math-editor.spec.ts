import { test, expect } from "@playwright/test";
test("visual composer accepts real keyboard input without auto-submitting", async ({
  page,
}, info) => {
  await page.goto("/study/demo");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
  await page.getByRole("button", { name: "Insert math", exact: true }).click();
  const mf = page.locator('math-field[aria-label="Math to insert"]');
  await mf.click();
  await expect(mf.locator('[part="keyboard-sink"]')).toBeFocused();
  await page.keyboard.type("x^2+1");
  await expect
    .poll(() => mf.evaluate((el) => (el as HTMLElement & { value: string }).value))
    .toBe("x^2+1");
  await expect(page.getByRole("button", { name: "Use expression", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Math keyboard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide math keyboard", exact: true })).toBeVisible();
  await expect
    .poll(async () => {
      const field = await mf.boundingBox();
      const top = await page.evaluate(() => window.mathVirtualKeyboard.boundingRect.top);
      return field!.y + field!.height <= top;
    })
    .toBe(true);
  await page.getByRole("button", { name: "Hide math keyboard", exact: true }).click();
  await page.getByRole("button", { name: "Use expression", exact: true }).click();
  await expect(page.getByLabel("Ask your learning companion")).toHaveValue(/x/);
  await expect(page.locator(".chat-message")).toHaveCount(0);
});
