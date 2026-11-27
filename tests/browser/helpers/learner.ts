import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import type { PrismaClient } from "../../../generated/app-client";
export async function createTestLearner(page: Page) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Full name").fill("Workspace QA");
  await page.getByLabel("Email", { exact: true }).fill(`workspace-${randomUUID()}@example.invalid`);
  await page.getByLabel("Password", { exact: true }).fill(`Workspace-${randomUUID()}!`);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/, { timeout: 60000 });
  return (await (await page.request.get("/api/auth/get-session")).json()).user.id as string;
}
export async function cleanupTestLearner(
  db: PrismaClient,
  studentId: string,
  authBranch = "production",
) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(studentId)) throw Error("Invalid disposable learner");
  await db.conceptCheck.deleteMany({ where: { studentId } });
  await db.learningConceptState.deleteMany({ where: { studentId } });
  await db.learningPreference.deleteMany({ where: { studentId } });
  await db.emailDelivery.deleteMany({ where: { studentId } });
  await db.$executeRaw`DELETE FROM "LessonAttempt" WHERE "studentId"=${studentId}`;
  await db.practiceNotebook.deleteMany({ where: { studentId } });
  await db.discussionReport.deleteMany({ where: { studentId } });
  await db.discussionPost.deleteMany({ where: { studentId } });
  await db.studyRoomPresence.deleteMany({ where: { studentId } });
  await db.conceptAttempt.deleteMany({ where: { studentId } });
  await db.studyPresence.deleteMany({ where: { studentId } });
  await db.studyActivityDay.deleteMany({ where: { studentId } });
  await db.studyBookmark.deleteMany({ where: { studentId } });
  await db.studyPosition.deleteMany({ where: { studentId } });
  await db.quizAttempt.deleteMany({ where: { studentId } });
  await db.studyNote.deleteMany({ where: { studentId } });
  await db.sessionProgress.deleteMany({ where: { studentId } });
  await db.studentMastery.deleteMany({ where: { studentId } });
  await db.studentProfile.deleteMany({ where: { studentId } });
  await db.enrollment.deleteMany({ where: { studentId } });
  const project = process.env.NEON_PROJECT_ID || "square-grass-82468951";
  if (!/^[a-z0-9-]+$/.test(project)) throw Error("Invalid test project");
  if (!/^[a-z0-9-]+$/.test(authBranch)) throw Error("Invalid test auth branch");
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${studentId} --branch ${authBranch} --project-id ${project}`,
    ],
    { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
  expect(result.status).toBe(0);
}
