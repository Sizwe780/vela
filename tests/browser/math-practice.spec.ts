import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
async function enter(page: import("@playwright/test").Page, label: string, value: string) {
  const field = page.locator(`math-field[aria-label="${label}"]`);
  await expect(field).toBeVisible();
  await field.evaluate((el, value) => {
    (el as HTMLElement & { value: string }).value = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }, value);
}
test("visual math editor, bounded CAS worker, hidden answers and generated variations", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let id: string | undefined;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    id = await createTestLearner(page);
    await page.goto("/practice/math");
    await expect(page.getByRole("heading", { name: "Math scratchpad", exact: true })).toBeVisible();
    await enter(page, "Your next line", "x^2+2x+1");
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText("Step 1 · Verified", { exact: true })).toBeVisible();
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await enter(page, "Starting expression", String.raw`\int x\cos(x)\,dx`);
    await page
      .getByRole("combobox", { name: "Check type", exact: true })
      .selectOption("antiderivative");
    await enter(page, "Your next line", String.raw`x\sin(x)-\cos(x)`);
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText("Step 1 · Check this step", { exact: true })).toBeVisible();
    await expect(page.getByText(/derivative does not match/)).toBeVisible();
    await enter(page, "Your next line", String.raw`x\sin(x)+\cos(x)+C`);
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText("Step 2 · Verified", { exact: true })).toBeVisible();
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await page.getByRole("combobox", { name: "Practice topic", exact: true }).selectOption("limit");
    await page.getByRole("button", { name: "Try another variation", exact: true }).click();
    await expect(page.locator(".math-worked")).toHaveCount(0);
    const before = await page.locator(".math-current").textContent();
    await page.getByRole("button", { name: "Show practice answer", exact: true }).click();
    await expect(page.locator(".math-worked .katex")).toBeVisible();
    await page.getByRole("button", { name: "Try another variation", exact: true }).click();
    await expect(page.locator(".math-worked")).toHaveCount(0);
    expect(await page.locator(".math-current").textContent()).not.toBe(before);
    // Real keystrokes and palette insertion exercise the live editor, not just value assignment.
    await enter(page, "Your next line", "");
    const next = page.locator('math-field[aria-label="Your next line"]');
    await next.click();
    await expect(next.locator('[part="keyboard-sink"]')).toBeFocused();
    await page.keyboard.type("x^2+1");
    await expect
      .poll(() => next.evaluate((el) => (el as HTMLElement & { value: string }).value))
      .toBe("x^2+1");
    await expect(page.getByRole("button", { name: "Check step", exact: true })).toBeEnabled();
    await expect(
      page.locator('.math-preview[aria-label="Your next line preview"] .katex'),
    ).toHaveCount(0);
    const input = page.locator(".math-input").filter({ has: next });
    await input.getByRole("button", { name: "Fraction", exact: true }).click();
    expect(await next.evaluate((el) => (el as HTMLElement & { value: string }).value)).toContain(
      "\\frac",
    );
    await input.getByRole("button", { name: "Math keyboard", exact: true }).click();
    await expect(page.locator(".ML__keyboard")).toBeVisible();
    await expect(page.locator(".math-preview .katex-error")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Hide math keyboard", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const field = await next.boundingBox();
        const keyboardTop = await page.evaluate(() => window.mathVirtualKeyboard.boundingRect.top);
        return field!.y + field!.height <= keyboardTop;
      })
      .toBe(true);
    await page.screenshot({ path: `math-practice-${info.project.name}.png` });
    await page.getByRole("button", { name: "Hide math keyboard", exact: true }).click();
    await expect(page.locator(".ML__keyboard")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await enter(
      page,
      "Starting expression",
      String.raw`\begin{bmatrix}1&2&3\\2&5&7\\0&1&2\end{bmatrix}`,
    );
    await page.getByRole("combobox", { name: "Check type", exact: true }).selectOption("matrix");
    await enter(
      page,
      "Your next matrix",
      String.raw`\begin{bmatrix}1&2&3\\0&1&-1\\0&1&2\end{bmatrix}`,
    );
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText(/Check row 2, column 3/)).toBeVisible();
    await enter(
      page,
      "Your next matrix",
      String.raw`\begin{bmatrix}1&2&3\\0&1&1\\0&1&2\end{bmatrix}`,
    );
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText("Step 2 · Verified", { exact: true })).toBeVisible();
    const unit = await db.studyUnit.findFirstOrThrow({ where: { code: "MAT1512-U1" } });
    await enrollTestLearner(page.request, db, [unit.moduleId]);
    await page.goto(`/study/${unit.code}`);
    await page.getByRole("button", { name: "Try in math scratchpad", exact: true }).first().click();
    await expect(page.locator(".exercise-scratchpad .math-lab")).toBeVisible();
    await expect(page.locator(".worked-answer")).toHaveCount(0);
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    await page.getByRole("button", { name: "Tutor tools", exact: true }).click();
    await page.getByRole("button", { name: "Insert math", exact: true }).click();
    await enter(page, "Math to insert", String.raw`\frac{x^2-1}{x-1}`);
    await page.getByRole("button", { name: "Use expression", exact: true }).click();
    await expect(page.getByLabel("Ask your learning companion")).toHaveValue(/\$.*\\frac/);
    await expect(page.locator(".chat-message")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
