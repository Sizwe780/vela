import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
test("scratchpad editing and published progress agree", async ({ page }, info) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(30000);
  const u = new URL(process.env.DATABASE_URL!);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: u.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let id: string | undefined;
  const enter = async (label: string, value: string) => {
    const f = page.locator(`math-field[aria-label="${label}"]`);
    await expect(f).toBeVisible();
    await f.evaluate((el, v) => {
      (el as HTMLElement & { value: string }).value = v;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }, value);
  };
  try {
    id = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: { code: { in: ["MAT1503", "MAT1512", "BPT1501"] }, institution: "UNISA" },
      select: { id: true },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    const insights = await (await page.request.get("/api/insights")).json();
    const mastery = await (await page.request.get("/api/mastery")).json();
    const progress = await (await page.request.get("/api/progress")).json();
    expect(insights.outcomes.length).toBe(mastery.outcomes.length);
    expect(insights.totalSessions).toBe(
      progress.courses.reduce((n: number, c: { total: number }) => n + c.total, 0),
    );
    console.log("Consistent counts", insights.totalSessions, insights.outcomes.length);
    await page.goto("/practice/math");
    await expect(page.locator('math-field[aria-label="Starting expression"]')).toHaveCount(0);
    await expect(page.locator(".math-input").filter({has:page.locator('math-field[aria-label="Your next line"]')}).getByRole("button", {name:"Integral",exact:true})).toHaveCount(0);
    await enter("Your next line", "x^2+1");
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    const result = page.locator(".math-result").first();
    await expect(result.getByText(/At x = -3/)).toBeVisible();
    await expect(result).toContainText("expected value 4, proposed value 10");
    const difference = result.locator("details");
    await expect(difference).not.toHaveAttribute("open", "");
    await difference.getByText("Show difference").click();
    await expect(difference).toHaveAttribute("open", "");
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await enter("Starting expression", String.raw`\lim_{x\to -1}(x^2+1)`);
    await enter("Your next line", "x^2+1");
    await page.getByRole("button", { name: "Check step", exact: true }).click();
    await expect(page.getByText(/Did you drop the limit operator/)).toBeVisible();
    const matrix = String.raw`\begin{bmatrix}1&2&3\\2&5&7\\0&1&2\end{bmatrix}`;
    await enter("Starting expression", matrix);
    await page.getByRole("combobox", { name: "Check type", exact: true }).selectOption("matrix");
    await expect
      .poll(() =>
        page
          .locator('math-field[aria-label="Your next matrix"]')
          .evaluate((el) => (el as HTMLElement & { value: string }).value),
      )
      .toBe(matrix);
    const scalar = page
      .locator(".math-input")
      .filter({ has: page.locator('math-field[aria-label="Row factor"]') });
    await expect(scalar.getByRole("button", { name: "Integral", exact: true })).toHaveCount(0);
    await page.getByRole("combobox", {name:"Row operation",exact:true}).selectOption("scale");
    await enter("Row factor", "1");
    for (const step of [1,2]) {
      await page.getByRole("button", {name:"Check step",exact:true}).click();
      await expect(page.getByText(`Step ${step} · Verified`, {exact:true})).toBeVisible();
      await expect.poll(()=>page.locator('math-field[aria-label="Your next matrix"]').evaluate(el=>(el as HTMLElement & {value:string}).value)).toBe(matrix);
    }

    await page.getByText("Set your own starting expression", { exact: true }).click();
    await expect(page.locator('math-field[aria-label="Starting expression"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("scratchpad.png"), fullPage: true });
  } finally {
    if (id) await cleanupTestLearner(db, id);
    await db.$disconnect();
  }
});
