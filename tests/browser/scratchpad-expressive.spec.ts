import "dotenv/config";
import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";
async function enter(page: Page, label: string, value: string) {
  const field = page.locator(`math-field[aria-label="${label}"]`);
  await expect(field).toBeVisible();
  await field.evaluate((el, v) => {
    (el as HTMLElement & { value: string }).value = v;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }, value);
}
async function checkStep(page: Page) {
  const button = page.getByRole("button", { name: "Check step", exact: true });
  // Finish the long-page scroll before tapping; repeated automatic smooth scrolls
  // otherwise move the target while mobile pointer hit-testing is in progress.
  await button.evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "center" }));
  await button.click();
}
test("real enrolled lab verifies mixed methods, preserves valid baseline and separates notes and row declarations", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(20000);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let owner: string | undefined;
  try {
    const capture = page
      .waitForResponse((r) => r.url().includes("/api/auth/sign-up/email") && r.status() === 200, {
        timeout: 60000,
      })
      .then(async (r) => {
        const email = r.request().postDataJSON()?.email;
        if (typeof email !== "string" || !/^workspace-[0-9a-f-]{36}@example\.invalid$/.test(email))
          throw Error("Unexpected fixture");
        const ids = await db.$queryRaw<
          { id: string }[]
        >`SELECT id::text FROM neon_auth."user" WHERE email=${email}`;
        owner = ids[0]?.id;
      });
    const [id] = await Promise.all([createTestLearner(page), capture]);
    owner = id;
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
      select: { id: true },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    await page.goto("/practice/lab");
    await expect(page.getByRole("heading", { name: "Math scratchpad", exact: true })).toBeVisible();
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await enter(page, "Starting expression", "(x+1)(2x-3)^3-(x^2+4x-1)^2");
    await enter(page, "Your next line", "(x+1)(8x^3-36x^2+54x-27)-(x^4+8x^3+14x^2-8x+1)");
    await checkStep(page);
    await expect(page.getByText("Step 1 · Verified", { exact: true })).toBeVisible();
    for (const [i, line] of [
      [2, "(8x^4-28x^3-18x^2+27x-27)-(x^4+8x^3+14x^2-8x+1)"],
      [3, "7x^4-36x^3-32x^2+35x-28"],
    ] as const) {
      await enter(page, "Your next line", line);
      await checkStep(page);
      const card = page.locator(".math-result").nth(i - 1);
      await expect(card).toContainText(`Step ${i} · Check this step`);
      await expect(card).toContainText("expected value 1442, proposed value 1118");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await enter(
      page,
      "Starting expression",
      String.raw`\int \left(\frac{3x^2+2x}{x^3+x^2+1}+xe^{-2x}\right)\,dx`,
    );
    await page
      .getByRole("combobox", { name: "Check type", exact: true })
      .selectOption("antiderivative");
    await enter(
      page,
      "Your next line",
      String.raw`\ln\left|x^3+x^2+1\right|-\frac{2x+1}{4}e^{-2x}+C`,
    );
    await checkStep(page);
    await expect(
      page.getByText("Step 1 · Verified with conditions", { exact: true }),
    ).toBeVisible();
    await page.getByText("Working notes & substitutions", { exact: true }).click();
    await page
      .getByRole("textbox", { name: "Private scratch notes", exact: true })
      .fill("u = x³ + x² + 1; du = (3x² + 2x) dx");
    await page.getByRole("button", { name: "Scientific calculator", exact: true }).click();
    await page.getByRole("button", { name: "Mathematical scratchpad", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Private scratch notes", exact: true }),
    ).toHaveValue("u = x³ + x² + 1; du = (3x² + 2x) dx");
    await expect(
      page.getByText("Step 1 · Verified with conditions", { exact: true }),
    ).toBeVisible();
    await page.locator(".notebook-side-drawer > summary").click();
    await page.locator(".practice-notebook > summary").click();
    await page
      .getByRole("textbox", { name: "Notebook entry title", exact: true })
      .fill("Expressive scratchpad QA");
    await page.getByRole("button", { name: "Save copy to notebook", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Expressive scratchpad QA", exact: true }),
    ).toBeVisible();
    const notebook = await (await page.request.get("/api/practice-notebook")).json();
    expect(notebook.entries[0].snapshot.notes).toBe("u = x³ + x² + 1; du = (3x² + 2x) dx");
    const exported = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export current draft", exact: true }).click();
    const exportPath = await (await exported).path();
    expect(await readFile(exportPath!, "utf8")).toContain(
      "Working notes: u = x³ + x² + 1; du = (3x² + 2x) dx",
    );
    await page.locator(".notebook-side-drawer > summary").click();
    await enter(
      page,
      "Starting expression",
      String.raw`\lim_{x\to 2}\left(\frac{\sqrt{x+2}-2}{x-2}\right)`,
    );
    await page
      .getByRole("combobox", { name: "Check type", exact: true })
      .selectOption("expression");
    await enter(
      page,
      "Your next line",
      String.raw`\lim_{x\to 2}\left(\frac{1}{\sqrt{x+2}+2}\right)`,
    );
    await checkStep(page);
    await expect(page.getByText("Step 1 · Verified", { exact: true })).toBeVisible();
    await enter(page, "Your next line", String.raw`\frac14`);
    await checkStep(page);
    await expect(page.getByText(/^Step 2 · Verified(?: with conditions)?$/)).toBeVisible();
    await enter(
      page,
      "Starting expression",
      String.raw`\begin{bmatrix}-2&1&4&13\\2&-1&-3&-10\\1&-1&-3&-10\end{bmatrix}`,
    );
    await page.getByRole("combobox", { name: "Check type", exact: true }).selectOption("matrix");
    await enter(
      page,
      "Your next matrix",
      String.raw`\begin{bmatrix}-2&1&4&13\\0&0&1&3\\1&-1&-3&-10\end{bmatrix}`,
    );
    await checkStep(page);
    await expect(
      page.getByText(/Your matrices are row-equivalent, but the declared operation/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Use detected operation and review before checking" })
      .click();
    await checkStep(page);
    await expect(page.getByText(/^Step 2 · Verified(?: with conditions)?$/)).toBeVisible();
    await page.getByText("Set your own starting expression", { exact: true }).click();
    await expect(page.locator(".math-result .katex-error")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("scratchpad.png"), fullPage: true });
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});
