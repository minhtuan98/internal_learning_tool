import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3001';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, 'Browser QA must target a local preview');
const artifacts = resolve('.qa/review');
await mkdir(artifacts, { recursive: true });
// Fixtures only touch the preview copy, never the app's primary database.
const db = new PrismaClient({ datasourceUrl: `file:${resolve(artifacts, 'preview.db')}` });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = [], errors = [];
let fixtureId;
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(20000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
const check = async (name, fn) => { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); };
async function visit(route) {
  const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
  assert(response === null || response.status() < 400, `HTTP error on ${route}`);
  assert.equal(new URL(page.url()).pathname, route.split('?')[0], `Unexpected redirect on ${route}`);
  await page.locator('h1, h2, h3, h4, h5').first().waitFor();
}
async function logout() { await context.request.post(`${origin}/api/auth/logout`); }
async function login(email) {
  await page.goto(`${origin}/login`);
  await page.getByRole('button').filter({ hasText: email }).click();
  await page.waitForURL((u) => u.pathname !== '/login');
  await page.waitForLoadState('networkidle');
}
async function noOverflow(route) {
  await visit(route);
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(dimensions.content <= dimensions.viewport + 1, `${route}: ${JSON.stringify(dimensions)}`);
}
try {
  await check('Anonymous users cannot open admin/member pages or files', async () => {
    await page.goto(`${origin}/admin/dashboard`); assert.equal(new URL(page.url()).pathname, '/login');
    await page.goto(`${origin}/learn`); assert.equal(new URL(page.url()).pathname, '/login');
    assert.equal((await context.request.get(`${origin}/api/files/missing.png`)).status(), 401);
  });
  await check('Locked account is denied through real local login', async () => {
    await login('ha@acme.vn'); assert.equal(new URL(page.url()).pathname, '/denied'); assert.match(page.url(), /LOCKED/);
  });
  await check('Unknown account is denied through real local login', async () => {
    await page.goto(`${origin}/login`); await page.getByPlaceholder('email@gmail.com').fill('unknown-qa@example.test');
    await page.getByRole('button', { name: /Thử$/ }).click();
    await page.waitForURL(/denied/); assert.match(page.url(), /NOT_ALLOWED/);
  });
  await check('Admin login, eight admin routes, and admin/member role boundary', async () => {
    await login('minhanh@acme.vn');
    for (const route of ['/admin/dashboard', '/admin/courses', '/admin/assignments', '/admin/users', '/admin/groups', '/admin/categories', '/admin/results', '/admin/certificates']) await noOverflow(route);
    await page.goto(`${origin}/learn`, { waitUntil: 'networkidle' }); assert.match(new URL(page.url()).pathname, /^\/admin/);
  });
  await check('Admin course, lesson editor, quiz and assignment detail routes render', async () => {
    const course = await db.course.findFirstOrThrow({ where: { lessons: { some: {} }, quizzes: { some: {} } }, include: { lessons: true, quizzes: true } });
    const assignment = await db.assignment.findFirstOrThrow();
    const routes = [`/admin/courses/${course.id}`, `/admin/courses/${course.id}/lessons/${course.lessons[0].id}`, `/admin/courses/${course.id}/quizzes/${course.quizzes[0].id}`, `/admin/assignments/${assignment.id}`];
    for (const route of routes) await noOverflow(route);
  });
  await check('Dashboard filters affect the URL and can be cleared', async () => {
    await visit('/admin/dashboard');
    await page.getByRole('combobox', { name: 'Khoảng thời gian' }).click();
    await page.getByText('7 ngày qua', { exact: true }).click();
    await page.waitForURL(/days=7/);
    await page.getByRole('button', { name: /Xóa bộ lọc/ }).click();
    await page.waitForURL((u) => u.pathname === '/admin/dashboard' && !u.search);
  });
  await check('Desktop dashboard screenshots in dark and light modes', async () => {
    await page.screenshot({ path: resolve(artifacts, 'after-dashboard-dark.png'), fullPage: true });
    await page.getByRole('button', { name: /Tối$/ }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    const containerColor = await page.locator('.lh-filterbar .ant-select').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--ant-color-bg-container').trim());
    assert.match(containerColor, /^#fff(?:fff)?$/i, 'Select controls must switch to the light palette without reloading');
    await page.screenshot({ path: resolve(artifacts, 'after-dashboard-light.png'), fullPage: true });
    await page.reload(); assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  });
  await check('390px admin pages fit the viewport and mobile navigation works', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/admin/dashboard', '/admin/courses', '/admin/assignments', '/admin/users', '/admin/groups', '/admin/categories', '/admin/results', '/admin/certificates']) await noOverflow(route);
    await visit('/admin/dashboard');
    await page.screenshot({ path: resolve(artifacts, 'after-dashboard-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mở điều hướng' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Khóa học', exact: true }).click();
    await page.waitForURL('**/admin/courses');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await check('Member login, work, course and certificate pages, and role boundary', async () => {
    await logout(); await login('lananh@acme.vn');
    for (const route of ['/learn', '/learn/courses', '/learn/certificates']) await noOverflow(route);
    await page.goto(`${origin}/admin/dashboard`); assert.match(new URL(page.url()).pathname, /^\/learn/);
    await visit('/learn'); await page.screenshot({ path: resolve(artifacts, 'after-member-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await visit('/learn'); await page.screenshot({ path: resolve(artifacts, 'after-member-desktop.png'), fullPage: true });
  });
  await check('Real quiz autosaves the final choice under latency, then scores it once', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: 'lananh@acme.vn' } });
    const category = await db.category.findFirstOrThrow();
    const c = await db.course.create({ data: { title: `Browser QA ${Date.now()}`, description: 'Isolated browser acceptance fixture', coverImage: 'qa.png', categoryId: category.id, status: 'PUBLISHED', access: { create: { userId: user.id } }, lessons: { create: { title: 'Browser lesson', type: 'ARTICLE', articleBody: '<p>Read the lesson then answer the quiz.</p>', position: 1 } }, quizzes: { create: { title: 'Browser acceptance quiz', status: 'PUBLISHED', passScore: 100, maxAttempts: 2, timeLimitMinutes: 10, questions: { create: { position: 1, text: 'Choose the correct option for browser QA.', options: '["Correct answer","Wrong B","Wrong C","Wrong D"]', correctIndex: 0, reviewStatus: 'APPROVED' } } } } }, include: { quizzes: true, lessons: true } });
    fixtureId = c.id;
    await visit(`/learn/courses/${c.id}/lessons/${c.lessons[0].id}`);
    await page.getByRole('button', { name: /Đánh dấu.*học xong/ }).click();
    await page.getByRole('button', { name: /Đã học xong$/ }).waitFor();
    await visit(`/learn/quizzes/${c.quizzes[0].id}`);
    await page.getByRole('button', { name: /Bắt đầu làm bài$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Bắt đầu làm bài$/ }).click();
    await page.waitForURL(/\/learn\/attempts\/[^/]+$/);
    const attemptId = new URL(page.url()).pathname.split('/').pop();
    // Delay every action request. A quick change + submit must still store the last radio choice.
    await page.route('**/learn/attempts/**', async (route) => {
      if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });
    await page.getByRole('radio', { name: /Wrong B/ }).check();
    await page.getByRole('radio', { name: /Correct answer/ }).check();
    await page.getByRole('button', { name: /Nộp bài$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Nộp bài$/ }).click();
    await page.waitForURL(/\/result$/, { timeout: 30000 });
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId }, include: { answers: true } });
    assert.equal(attempt.status, 'SUBMITTED'); assert.equal(attempt.score, 100); assert.equal(attempt.passed, true);
    assert.equal(attempt.answers.length, 1); assert.equal(attempt.answers[0].selectedIndex, 0);
    assert.equal(await db.certificate.count({ where: { userId: user.id, courseId: c.id } }), 1);
    await page.unroute('**/learn/attempts/**');
  });
  assert.deepEqual(errors, [], 'Browser/runtime or HTTP 500 errors were observed');
} catch (error) {
  results.push({ name: 'Browser suite', passed: false, error: error.message });
  await page.screenshot({ path: resolve(artifacts, 'browser-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1; console.error(error);
} finally {
  if (fixtureId) await db.course.delete({ where: { id: fixtureId } });
  await writeFile(resolve(artifacts, 'browser-results.json'), JSON.stringify({ at: new Date().toISOString(), origin, results, errors }, null, 2));
  await db.$disconnect(); await browser.close();
}
