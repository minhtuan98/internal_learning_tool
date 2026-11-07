import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import os from 'node:os';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const STATE = path.join(ROOT, '.qa');
export const DASHBOARD = path.join(ROOT, 'qa-dashboard');
export const FEATURES = [
  ['F1', 'Đăng nhập & phân quyền', 'Allowlist, session, vai trò, welcome'],
  ['F2', 'Người dùng & nhóm', 'Hồ sơ, khóa tài khoản, chuyển nhóm'],
  ['F3', 'Khóa học & quyền truy cập', 'Xuất bản, bản nháp, danh sách truy cập'],
  ['F4', 'Bài học & nội dung', 'Bài viết, video, upload, XSS'],
  ['F5', 'Quiz & câu hỏi AI', 'Sinh câu hỏi, schema, duyệt, cài đặt'],
  ['F6', 'Học tập & tiến độ', 'Hoàn thành bài, trạng thái khóa học'],
  ['F7', 'Giao bài & hạn chót', 'Đối tượng, hạn chót, khóa quá hạn'],
  ['F8', 'Làm bài & chấm điểm', 'Lượt làm, autosave, timer, chấm điểm'],
  ['F9', 'Báo cáo & danh mục', 'KPI, kết quả, bộ lọc, danh mục'],
  ['F10', 'Chứng chỉ', 'Cấp một lần, snapshot, số chứng chỉ'],
];

export async function readJSON(file, fallback = null) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
export async function writeJSON(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n'); await fs.rename(tmp, file); }
export function command(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    const { input, onOutput, ...spawnOptions } = options;
    const child = spawn(bin, args, { cwd: ROOT, env: { ...process.env, QA_NESTED: '1' }, ...spawnOptions, killSignal: 'SIGKILL', shell: false });
    const timer = options.timeout ? setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${path.basename(bin)} timed out after ${options.timeout / 1000}s`)); }, options.timeout + 100) : null;
    child.stdin?.on('error', () => {});
    child.stdin?.end(input);
    child.stdout?.on('data', b => { stdout += b; onOutput?.(b.toString()); if (stdout.length > 4_000_000) { child.kill(); reject(new Error('Command output limit exceeded')); } });
    child.stderr?.on('data', b => { stderr = (stderr + b).slice(-20000); onOutput?.(b.toString()); });
    child.on('error', error => { if (timer) clearTimeout(timer); reject(error); });
    child.on('close', code => { if (timer) clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
  });
}

export async function sourceFiles(dir = 'src') {
  const files = [];
  for (const item of await fs.readdir(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${item.name}`;
    if (item.isDirectory()) files.push(...await sourceFiles(rel));
    else if (item.isFile() && /\.(ts|tsx|css|svg|json)$/.test(item.name)) files.push(rel);
  }
  return files.sort();
}
export async function fingerprint() {
  const names = [...await sourceFiles(), 'prisma/schema.prisma', 'package.json', 'package-lock.json'];
  const hashes = {};
  const hash = createHash('sha256');
  for (const name of names) {
    const bytes = await fs.readFile(path.join(ROOT, name));
    hashes[name] = createHash('sha256').update(bytes).digest('hex');
    hash.update(name).update('\0').update(bytes).update('\0');
  }
  return { hash: hash.digest('hex'), files: hashes };
}

export function normalizeReport(raw, metadata = {}) {
  const tests = [], suiteErrors = [];
  for (const suite of raw.testResults ?? []) {
    const file = path.relative(ROOT, suite.name).replaceAll('\\', '/');
    if (!(suite.assertionResults?.length) && suite.status === 'failed') suiteErrors.push({ file, message: String(suite.message || 'Suite failed to load').split(ROOT).join('<project>') });
    for (const test of suite.assertionResults ?? []) {
      const group = (test.ancestorTitles ?? []).join(' › ');
      const feature = group.match(/\bF(?:10|[1-9])\b/)?.[0] ?? 'QA';
      tests.push({ id: createHash('sha256').update(`${file}:${test.fullName}`).digest('hex').slice(0, 16), file, feature, group, title: test.title, status: test.status, durationMs: test.duration ?? 0, errors: (test.failureMessages ?? []).map(s => s.split(ROOT).join('<project>').replace(/\u001b\[[0-9;]*m/g, '').slice(0, 8000)) });
    }
  }
  const count = status => tests.filter(t => t.status === status).length;
  return {
    schemaVersion: 1, ...metadata,
    summary: { total: tests.length, passed: count('passed'), failed: count('failed'), skipped: tests.filter(t => !['passed', 'failed'].includes(t.status)).length, suiteErrors: suiteErrors.length, files: raw.testResults?.length ?? 0, durationMs: Math.max(0, Math.max(0, ...((raw.testResults ?? []).map(s => s.endTime ?? 0))) - (raw.startTime ?? 0)) },
    features: FEATURES.map(([id, name, description]) => ({ id, name, description, total: tests.filter(t => t.feature === id).length, passed: tests.filter(t => t.feature === id && t.status === 'passed').length, failed: tests.filter(t => t.feature === id && t.status === 'failed').length })),
    tests, suiteErrors,
    scope: 'Unit tests: business logic and server actions with mocked database, cookies and AI. UI rendering, visual comparison, real database, OAuth and live AI are not covered.',
    sources: { code: 'verified', figma: { status: 'verified', url: 'https://www.figma.com/design/2DXccwpK15yRxR5dBHCajq/Untitled?node-id=23-2', note: 'Design System / Aurora AI read on 2026-11-06; unit tests do not verify pixels.' }, notion: { status: 'connection_required', url: 'https://app.notion.com/p/Internal-Learning-Platform-Product-Docs-40fef4e082f5816e8861e28c5e9edd10', note: 'Not yet read. Decision references come from repository documentation and source comments.' } },
  };
}

export async function runTests(trigger = 'manual') {
  await fs.mkdir(STATE, { recursive: true });
  const before = await fingerprint();
  const startedAt = new Date().toISOString();
  const rawFile = path.join(STATE, 'vitest.json');
  await fs.rm(rawFile, { force: true });
  // Only the local, pinned executable runs; no npx download and no user-supplied shell.
  const result = await command(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--coverage', '--reporter=default', '--reporter=json', `--outputFile=${rawFile}`], { timeout: 180_000 });
  const raw = await readJSON(rawFile);
  if (!raw) throw new Error(`Vitest did not produce a report: ${result.stderr.slice(-2000)}`);
  const after = await fingerprint();
  const git = await command('git', ['rev-parse', 'HEAD']);
  const dirty = await command('git', ['status', '--porcelain']);
  const coverage = await readJSON(path.join(STATE, 'coverage/coverage-summary.json'));
  const report = normalizeReport(raw, { runId: `${Date.now()}-${before.hash.slice(0, 8)}`, startedAt, finishedAt: new Date().toISOString(), trigger, exitCode: result.code, sourceHash: before.hash, sourceChangedDuringRun: before.hash !== after.hash, gitCommit: git.stdout.trim(), dirty: !!dirty.stdout.trim(), coverage: coverage?.total ?? null, generation: await readJSON(path.join(STATE, 'generation.json'), { status: 'not_requested' }) });
  const previous = await readJSON(path.join(STATE, 'history.json'), []);
  const history = [{ runId: report.runId, finishedAt: report.finishedAt, sourceHash: report.sourceHash, trigger, ...report.summary }, ...previous].slice(0, 20);
  report.history = history;
  await writeJSON(path.join(STATE, 'history.json'), history);
  await writeJSON(path.join(STATE, 'latest.json'), report);
  await writeJSON(path.join(DASHBOARD, 'report.json'), report);
  return report;
}

export async function withLock(fn) {
  await fs.mkdir(STATE, { recursive: true });
  const file = path.join(STATE, 'run.lock');
  try { const fd = await fs.open(file, 'wx'); await fd.writeFile(String(process.pid)); await fd.close(); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await fs.readFile(file, 'utf8'));
    let alive = false; try { process.kill(pid, 0); alive = true; } catch (e) { if (e.code === 'EPERM') alive = true; }
    if (alive) throw new Error('Another QA run is active. Please wait.');
    await fs.rm(file, { force: true }); return withLock(fn);
  }
  try { return await fn(); } finally { await fs.rm(file, { force: true }); }
}

export async function publishReport() {
  // This is a separate public report project, published by its authenticated owner.
  // Package an explicit allowlist outside the application Git repository so unrelated
  // application commit attribution and private files cannot enter this deployment.
  const linked = await readJSON(path.join(DASHBOARD, '.vercel/project.json'));
  if (!linked?.projectId || !linked?.orgId) throw new Error('Link qa-dashboard to its own Vercel project first.');
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'learning-hub-qa-'));
  try {
    for (const name of ['index.html', 'app.js', 'style.css', 'report.json', 'vercel.json', 'package.json']) await fs.copyFile(path.join(DASHBOARD, name), path.join(staging, name));
    await writeJSON(path.join(staging, '.vercel/project.json'), { projectId: linked.projectId, orgId: linked.orgId, projectName: linked.projectName });
    const result = await command('vercel', ['deploy', '--prod', '--yes', '--cwd', staging], { cwd: staging, timeout: 120_000, onOutput: text => process.stdout.write(text) });
    if (result.code !== 0) throw new Error(`Vercel publish failed: ${result.stderr.slice(-1500)}`);
    const deployment = await readJSON(path.join(STATE, 'deployment.json'));
    const url = deployment?.origin || result.stdout.match(/https:\/\/[\w.-]+\.vercel\.app/g)?.at(-1);
    await writeJSON(path.join(STATE, 'publication.json'), { status: 'published', url, publishedAt: new Date().toISOString() });
    return url;
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}
