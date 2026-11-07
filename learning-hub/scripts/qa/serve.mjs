import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs, watch } from 'node:fs';
import path from 'node:path';
import { ROOT, STATE, DASHBOARD, readJSON, writeJSON, runTests, withLock, fingerprint, command, publishReport } from './core.mjs';
import { generateTests } from './generate.mjs';

const PORT = 4318;
const existing = await readJSON(path.join(STATE, 'connection.json'));
if (existing?.port === PORT && existing.token) {
  try {
    const alive = await fetch(`http://127.0.0.1:${PORT}/status`, { headers: { Authorization: `Bearer ${existing.token}` }, signal: AbortSignal.timeout(1500) });
    if (alive.ok) {
      const deployed = await readJSON(path.join(STATE, 'deployment.json'));
      const url = `${deployed?.origin || `http://127.0.0.1:${PORT}`}/#token=${existing.token}`;
      console.log(`QA runner is already running on 127.0.0.1:${PORT}.`);
      if (!process.argv.includes('--quiet')) console.log(`Private connection link (do not share): ${url}`);
      if (process.argv.includes('--open')) {
        const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? null : 'xdg-open';
        if (opener) await command(opener, [url]);
      }
      process.exit(0);
    }
  } catch { /* No live runner for this checkout; create a fresh token. */ }
}
const token = randomBytes(32).toString('hex');
let busy = false, phase = 'idle', lastError = null, queued = false, closing = false;
let updatePending = false;
let timer;
const deployment = await readJSON(path.join(STATE, 'deployment.json'), {});
const origins = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`, ...(deployment.origin ? [deployment.origin] : [])]);
const status = () => ({ busy, phase, lastError, autoRun: true, autoGenerateOnClaudeStop: true, autoPublish: !!deployment.origin });

async function cycle({ generate = false, publish = false, trigger = 'dashboard' } = {}) {
  if (busy) { if (generate) updatePending = true; else queued = true; return; }
  busy = true; lastError = null;
  try {
    await withLock(async () => {
      if (generate) { phase = 'generating'; await generateTests(); }
      phase = 'testing';
      const report = await runTests(trigger);
      console.log(`QA ${report.summary.passed}/${report.summary.total} passed (${trigger})`);
      if (publish && deployment.origin) { phase = 'publishing'; await publishReport(); }
    });
  } catch (e) { lastError = e.message; console.error(e.message); }
  finally {
    busy = false; phase = 'idle';
    if (updatePending && !closing) { updatePending = false; void cycle({ generate: true, publish: true, trigger: 'claude-stop' }); }
    else if (queued && !closing) { queued = false; schedule(); }
  }
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const latest = await readJSON(path.join(STATE, 'latest.json'));
    const current = await fingerprint();
    if (latest?.sourceHash !== current.hash || latest.sourceChangedDuringRun) await cycle({ trigger: 'source-change' });
  }, 1800);
}
function authorized(req) {
  const supplied = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  return supplied.length === token.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}
async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 4096) throw new Error('Request too large'); }
  return text ? JSON.parse(text) : {};
}
function send(res, code, data) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); }

const server = http.createServer(async (req, res) => {
  try {
    if (![ `127.0.0.1:${PORT}`, `localhost:${PORT}` ].includes(req.headers.host)) return send(res, 403, { error: 'Invalid host' });
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) return send(res, 403, { error: 'Origin not allowed. Start the runner with the configured dashboard deployment.' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (req.method === 'GET' && ['/', '/index.html', '/app.js', '/style.css', '/report.json'].includes(url.pathname)) {
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const content = await fs.readFile(path.join(DASHBOARD, file));
      res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); return res.end(content);
    }
    if (!authorized(req)) return send(res, 401, { error: 'Connect using the private link printed by npm run qa:serve.' });
    if (req.method === 'GET' && url.pathname === '/status') {
      const latest = await readJSON(path.join(STATE, 'latest.json'));
      const current = await fingerprint();
      return send(res, 200, { ...status(), runId: latest?.runId, sourceHash: current.hash, reportStale: latest?.sourceHash !== current.hash, generation: await readJSON(path.join(STATE, 'generation.json')) });
    }
    if (req.method === 'GET' && url.pathname === '/report') return send(res, 200, await readJSON(path.join(STATE, 'latest.json')));
    if (req.method === 'POST' && ['/run', '/update'].includes(url.pathname)) {
      await body(req);
      if (busy && url.pathname === '/update') { updatePending = true; return send(res, 202, { accepted: true, queued: true }); }
      if (busy) return send(res, 409, { error: 'QA đang chạy. Vui lòng chờ.' });
      void cycle({ generate: url.pathname === '/update', publish: true, trigger: url.pathname === '/update' ? 'claude-stop' : 'dashboard' });
      return send(res, 202, { accepted: true });
    }
    if (req.method === 'POST' && url.pathname === '/fix') {
      const { testId } = await body(req);
      const report = await readJSON(path.join(STATE, 'latest.json'));
      const failed = report?.tests.filter(t => t.status === 'failed' && (!testId || t.id === testId)) ?? [];
      if (!failed.length) return send(res, 400, { error: 'Không có test thất bại được chọn.' });
      if ((await fingerprint()).hash !== report.sourceHash || report.sourceChangedDuringRun) return send(res, 409, { error: 'Code đã thay đổi sau lần test. Chạy lại test trước khi gửi lỗi.' });
      const prompt = `Fix the Learning Hub regressions in the workspace ${ROOT}. Read .qa/fix-request.md for failing assertions. Preserve all unrelated user changes. Fix production logic; do not delete, skip or weaken tests. Run npm run qa:run afterwards. Do not commit, push or deploy the application without instruction.`;
      const request = `# QA regression request\n\nSource SHA256: ${report.sourceHash}\nRun: ${report.runId}\n\n${failed.map(t => `## ${t.group} / ${t.title}\nFile: ${t.file}\n\n\`\`\`text\n${t.errors.join('\n')}\n\`\`\``).join('\n\n')}\n\n${prompt}\n`;
      await fs.writeFile(path.join(STATE, 'fix-request.md'), request);
      const opened = await command('code', ['--reuse-window', ROOT, '--goto', path.join(STATE, 'fix-request.md')], { timeout: 15000 });
      if (opened.code !== 0) return send(res, 503, { error: 'Không mở được VS Code. Mở thư mục learning-hub và .qa/fix-request.md thủ công.' });
      return send(res, 200, { url: `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`, note: 'VS Code đã mở yêu cầu sửa lỗi; Claude có thể yêu cầu đăng nhập.' });
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) { if (!res.headersSent) send(res, 400, { error: error.message }); else res.end(); }
});

await fs.mkdir(STATE, { recursive: true });
await fs.chmod(STATE, 0o700);
server.listen(PORT, '127.0.0.1', async () => {
  const local = `http://127.0.0.1:${PORT}/#token=${token}`;
  const hosted = deployment.origin ? `${deployment.origin}/#token=${token}` : local;
  await writeJSON(path.join(STATE, 'connection.json'), { port: PORT, token, pid: process.pid });
  await fs.chmod(path.join(STATE, 'connection.json'), 0o600);
  console.log(`QA runner is listening only on 127.0.0.1:${PORT}.`);
  if (!process.argv.includes('--quiet')) console.log(`Private connection link (do not share): ${hosted}`);
  if (process.argv.includes('--open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? null : 'xdg-open';
    if (opener) await command(opener, [hosted]);
  }
});
server.on('error', error => { console.error(error.message); watchers.forEach(w => w.close()); process.exitCode = 1; });
const watchers = [watch(path.join(ROOT, 'src'), { recursive: true }, schedule), watch(path.join(ROOT, 'prisma'), (_, name) => { if (name === 'schema.prisma') schedule(); })];
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { closing = true; clearTimeout(timer); watchers.forEach(w => w.close()); server.close(); });
