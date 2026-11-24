import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/app-client";
import { enrollTestLearner } from "./helpers/enrollment";
import { cleanupTestLearner, createTestLearner } from "./helpers/learner";

test("chemistry readers load the authored lessons and decode the inline photographs", async ({
  page,
}, info) => {
  test.skip(process.env.VELA_BPT_STAGING_TEST !== "1", "Requires disposable staging accounts.");
  test.setTimeout(180_000);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech") {
    throw new Error("Expected dedicated staging.");
  }
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  let learner: string | undefined;
  try {
    const module = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "CHE1501" } },
      select: {
        id: true,
        studyUnits: { select: { code: true, sessions: { select: { id: true, markdown: true } } } },
      },
    });
    const lessons = module.studyUnits.flatMap(({ code, sessions }) =>
      sessions.flatMap(({ id, markdown }) => {
        const photos = Array.from(
          markdown.matchAll(/!\[[^\]]*\]\((\/lesson-figures\/[^)]+\.webp)\)/g),
          (match) => match[1],
        );
        return photos.length ? [{ code, id, photos }] : [];
      }),
    );
    expect(lessons.flatMap(({ photos }) => photos)).toHaveLength(5);
    learner = await createTestLearner(page);
    await enrollTestLearner(page.request, db, [module.id]);
    for (const { code, id, photos } of lessons) {
      await page.goto(`/study/${code}/sessions/${id}`);
      await expect(
        page.getByRole("heading", { name: "Why this works", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Assessment", exact: true })).toBeVisible();
      await expect(page.getByText("An interactive visual is unavailable.")).toHaveCount(0);
      await expect(page.locator(".try-example").first()).toBeVisible();
      for (const src of photos) {
        const photo = page.locator(`.approved-lesson-figure img[src="${src}"]`);
        await photo.scrollIntoViewIfNeeded();
        await expect(photo).toBeVisible();
        await expect
          .poll(() => photo.evaluate((node) => (node as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0);
      }
    }
  } finally {
    if (learner) await cleanupTestLearner(db, learner, "che1501-staging");
    await db.$disconnect();
  }
});
