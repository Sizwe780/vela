import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3200';
const prisma = new PrismaClient();
const browser = await chromium.launch({ channel: 'chrome' });
const contexts = [];
const users = [];
let fixture;
const run = randomUUID();
const password = `Neon-${randomUUID()}!`;
try {
  const anonymous = await browser.newContext({ baseURL }); contexts.push(anonymous);
  for (const path of ['/api/catalog', '/api/progress/live']) assert.equal((await anonymous.request.get(path)).status(), 401);
  assert.equal((await anonymous.request.get(process.env.NEON_FUNCTION_HELLO_BASE_URL)).status(), 401);
  console.log('PASS protected APIs and deployed Function reject anonymous requests (401).');
  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext({ baseURL }); contexts.push(context);
    const page = await context.newPage();
    const email = `vela-e2e-${run}-${index}@example.invalid`;
    await page.goto('/auth/sign-up');
    await page.getByLabel('Full name').fill(`Neon Test ${index}`);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible({ timeout: 45000 });
    const session = await (await context.request.get('/api/auth/get-session')).json();
    assert.ok(session.user?.id); users.push({ id: session.user.id, email, page, context });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    const catalog = await context.request.get('/api/catalog');
    assert.equal(catalog.status(), 200);
    const body = await catalog.json(); assert.equal(body.service, 'neon-functions'); assert.equal(body.userId, session.user.id); assert.equal(body.catalog.modules, 5);
    await expect(page.locator('.live-progress')).toHaveText('0 assessed outcomes · live', { timeout: 45000 });
  }
  console.log('PASS two real Neon Auth sign-ups, reload session restoration, authenticated Function JWT + Postgres catalog (200, 5 modules).');
  const module = await prisma.module.findFirstOrThrow({ where: { code: 'MAT1512', institution: 'UNISA' } });
  fixture = await prisma.studyUnit.create({ data: { moduleId: module.id, code: `E2E-${run}`, title: 'Temporary Neon verification', position: 99999, learningOutcomes: { create: { code: 'E2E', description: 'Temporary verification', position: 1 } } }, include: { learningOutcomes: true } });
  const row = await prisma.studentMastery.create({ data: { studentId: users[0].id, learningOutcomeId: fixture.learningOutcomes[0].id, attempts: 1, score: 0.8 } });
  await expect(users[0].page.locator('.live-progress')).toHaveAttribute('data-assessed-count', '1', { timeout: 45000 });
  await expect(users[1].page.locator('.live-progress')).toHaveAttribute('data-assessed-count', '0');
  assert.equal((await users[1].context.request.get(`/api/progress/live?expectedUserId=${users[0].id}`)).status(), 409);
  await prisma.studentMastery.update({ where: { id: row.id }, data: { attempts: 0 } });
  await expect(users[0].page.locator('.live-progress')).toHaveAttribute('data-assessed-count', '0', { timeout: 45000 });
  console.log('PASS committed Postgres insert/update reach browser through Realtime without reload; second learner remains isolated; account mismatch rejected (409).');
  const first = users[0];
  await first.page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(first.page.getByRole('link', { name: 'Sign in →' })).toBeVisible();
  assert.equal((await first.context.request.get('/api/catalog')).status(), 401);
  await first.page.goto('/auth/sign-in');
  await first.page.getByLabel('Email', { exact: true }).fill(first.email);
  await first.page.getByLabel('Password', { exact: true }).fill('incorrect-password-123');
  await first.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(first.page.getByRole('alert')).toBeVisible();
  await first.page.getByLabel('Password', { exact: true }).fill(password);
  await first.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(first.page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await first.page.goto('/auth/reset-password');
  await expect(first.page.getByRole('button', { name: 'Send reset instructions' })).toBeVisible();
  console.log('PASS sign-out revokes app access, wrong password displays error, sign-in succeeds, reset form renders. Email delivery was not exercised.');
} finally {
  if (fixture) await prisma.studyUnit.delete({ where: { id: fixture.id } });
  // Only remove synthetic accounts owned by this verification run.
  for (const user of users) {
    assert.match(user.id, /^[a-zA-Z0-9-]+$/);
    const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-Command', `npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli neon-auth user delete ${user.id} --branch production`], { encoding: 'utf8' });
    if (cleanup.status !== 0) throw new Error('Synthetic Auth account cleanup failed; run the Neon CLI user delete command.');
  }
  await Promise.all(contexts.map(context => context.close()));
  await browser.close(); await prisma.$disconnect();
  console.log('Verification fixtures and synthetic accounts cleaned up.');
}
