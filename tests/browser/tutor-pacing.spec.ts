import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestLearner, cleanupTestLearner } from "./helpers/learner";
import { enrollTestLearner } from "./helpers/enrollment";

test("pacing pills preserve drafts and send the selected pace on every turn", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let owner: string | undefined;
  const submissions: { pace: string; mode: string }[] = [];
  try {
    owner = await createTestLearner(page);
    const modules = await db.module.findMany({
      where: { institution: "UNISA", code: { in: ["MAT1503", "MAT1512"] } },
    });
    await enrollTestLearner(
      page.request,
      db,
      modules.map((m) => m.id),
    );
    await page.route("**/api/tutor", async (route) => {
      const body = route.request().postDataJSON();
      submissions.push(body);
      const id = `synthetic-${submissions.length}`;
      const frames = [
        { type: "start", messageId: id },
        { type: "text-start", id },
        {
          type: "text-delta",
          id,
          delta:
            body.pace === "transfer"
              ? "Which assumption needs checking?"
              : "Here is a direct explanation.",
        },
        { type: "text-end", id },
        { type: "finish", finishReason: "stop" },
      ];
      await route.fulfill({
        contentType: "text/event-stream",
        headers: { "x-vercel-ai-ui-message-stream": "v1" },
        body:
          frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("") + "data: [DONE]\n\n",
      });
    });
    await page.goto("/study/MAT1512-U1/sessions/MAT1512-U1-S1");
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    else await page.getByRole("button", { name: "Ask your companion", exact: true }).click();
    const group = page.getByRole("radiogroup", { name: "Tutor pacing" });
    const normal = group.getByRole("radio", { name: "Normal", exact: true });
    const deep = group.getByRole("radio", { name: "Deep transfer", exact: true });
    const input = page.getByLabel("Ask your learning companion");
    await expect(normal).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Tutor pacing" })).toHaveCount(0);
    await input.fill("Keep my draft");
    await deep.click();
    await expect(deep).toBeChecked();
    await expect(input).toHaveValue("Keep my draft");
    await deep.press("ArrowLeft");
    await expect(normal).toBeChecked();
    expect(submissions).toHaveLength(0);
    await input.fill("");
    await page.getByRole("button", { name: "Check my understanding", exact: true }).click();
    await expect(page.getByText("Here is a direct explanation.", { exact: true })).toBeVisible();
    expect(submissions[0].pace).toBe("normal");
    await expect(normal).toBeChecked();
    await deep.click();
    await input.fill("Guide me through the next step");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByText("Which assumption needs checking?", { exact: true })).toBeVisible();
    expect(submissions[1].pace).toBe("transfer");
    await expect(deep).toBeChecked();
    const a = (await normal.boundingBox())!,
      b = (await deep.boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    await page.screenshot({ path: info.outputPath("pacing-pills.png") });
    await normal.click();
    await input.fill("Now explain it directly");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect.poll(() => submissions.length).toBe(3);
    await expect(normal).toBeEnabled();
    expect(submissions[2]).toMatchObject({ pace: "normal", mode: "academic" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (owner) await cleanupTestLearner(db, owner);
    await db.$disconnect();
  }
});
