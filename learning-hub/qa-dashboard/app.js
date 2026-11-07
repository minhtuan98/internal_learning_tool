'use strict';
const $ = id => document.getElementById(id);
const API = 'http://127.0.0.1:4318';
let report, activeView = 'overview', connected = false, wasBusy = false, polling = false;
let token = sessionStorage.getItem('lh_qa_token') || '';
function captureToken() {
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (/^[a-f0-9]{64}$/.test(fragment.get('token') || '')) {
    token = fragment.get('token'); sessionStorage.setItem('lh_qa_token', token);
  }
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}
captureToken();
window.addEventListener('hashchange', () => { captureToken(); void poll(); });

function node(tag, cls, text) { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; }
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = `notice${error ? ' error' : ''}`; $('notice').hidden = false; }
function date(value) { return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)); }
function changeView(view) {
  activeView = view;
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `${view}-view`; });
  document.querySelectorAll('.nav,.mobile-tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'tests') renderTests();
}
function chooseFeature(id) { $('feature-filter').value = id; $('status-filter').value = 'all'; $('search').value = ''; changeView('tests'); }
function renderTest(test) {
  const details = node('details', 'test');
  const summary = node('summary');
  summary.append(node('span', `test-mark ${test.status}`, test.status === 'passed' ? '✓' : test.status === 'failed' ? '×' : '–'));
  const text = node('div', 'test-title', test.title);
  text.append(node('span', 'test-meta', `${test.feature} · ${test.file}`));
  summary.append(text, node('span', 'test-time', `${Math.round(test.durationMs)} ms`));
  details.append(summary);
  const body = node('div', 'test-body');
  body.append(node('p', '', test.group));
  if (test.errors.length) body.append(node('pre', '', test.errors.join('\n\n')));
  else body.append(node('p', '', test.status === 'passed' ? 'Assertion thành công trong lần chạy này.' : 'Test chưa chạy hoặc bị bỏ qua.'));
  if (test.status === 'failed') {
    const fix = node('button', 'button secondary', '⌘  Sửa lỗi này bằng Claude Code');
    fix.addEventListener('click', () => fixWithClaude(test.id, fix)); body.append(fix);
  }
  details.append(body); return details;
}
function renderTests() {
  if (!report) return;
  const query = $('search').value.toLocaleLowerCase('vi');
  const status = $('status-filter').value, feature = $('feature-filter').value;
  const tests = report.tests.filter(t => (feature === 'all' || t.feature === feature) && (status === 'all' || (status === 'pending' ? !['passed', 'failed'].includes(t.status) : t.status === status)) && `${t.title} ${t.file} ${t.group}`.toLocaleLowerCase('vi').includes(query));
  $('test-heading').textContent = feature === 'all' ? 'Tất cả unit test' : report.features.find(f => f.id === feature)?.name || feature;
  $('result-count').textContent = `${tests.length} / ${report.tests.length} test`;
  $('all-tests').replaceChildren(...tests.map(renderTest));
  if (!tests.length) $('all-tests').append(node('div', 'empty-state', 'Không tìm thấy test phù hợp. Thử đổi bộ lọc hoặc từ khóa.'));
}
function render() {
  const s = report.summary, unhealthy = s.failed > 0 || s.suiteErrors > 0 || report.exitCode !== 0;
  $('loading').hidden = true; $('content').hidden = false;
  $('tested-at').textContent = `${date(report.finishedAt)} · GMT+7`;
  $('version').textContent = `sha256 ${report.sourceHash.slice(0, 12)}`;
  $('version').title = `Source SHA256: ${report.sourceHash}\nGit base: ${report.gitCommit}`;
  $('dirty').textContent = report.dirty ? 'Có thay đổi chưa commit' : `Git ${report.gitCommit.slice(0, 7)}`;
  $('total').textContent = s.total; $('passed').textContent = s.passed; $('failed').textContent = s.failed + s.suiteErrors;
  $('nav-count').textContent = s.total;
  $('file-count').textContent = `${s.files} file test · ${(s.durationMs / 1000).toFixed(2)} giây`;
  $('skip-count').textContent = `${s.skipped} bỏ qua · ${s.suiteErrors} lỗi tải suite`;
  $('coverage').textContent = report.coverage ? `${report.coverage.lines.pct}%` : 'Chưa đo';
  $('coverage-note').textContent = report.coverage ? `${report.coverage.lines.covered} / ${report.coverage.lines.total} dòng logic` : 'Không có dữ liệu coverage';
  $('health').classList.toggle('good', !unhealthy);
  $('health-symbol').textContent = unhealthy ? '!' : '✓';
  $('health-label').textContent = unhealthy ? 'CẦN XỬ LÝ' : 'ĐÃ VƯỢT QUA UNIT TEST';
  $('health-title').textContent = unhealthy ? `${s.failed + s.suiteErrors} kiểm tra cần được xử lý` : 'Toàn bộ unit test đã thành công';
  $('health-description').textContent = unhealthy ? 'Mở assertion bên dưới để xem lỗi và gửi đúng ngữ cảnh sang Claude Code.' : 'Kết quả phản ánh bộ unit test hiện có. Các tích hợp thực tế và giao diện cần kiểm thử riêng.';
  $('pass-rate').textContent = `${s.total ? Math.round(s.passed / s.total * 100) : 0}%`;
  $('fix-all').disabled = !s.failed;
  $('feature-grid').replaceChildren(); $('feature-nav').replaceChildren();
  const selectedFeature = $('feature-filter').value;
  $('feature-filter').replaceChildren(node('option', '', 'Mọi tính năng')); $('feature-filter').firstChild.value = 'all';
  report.features.forEach(f => {
    const option = node('option', '', `${f.id} · ${f.name}`); option.value = f.id; $('feature-filter').append(option);
    const card = node('button', 'feature-card');
    const top = node('div', 'feature-top'); top.append(node('span', 'feature-icon', f.id));
    const title = node('div'); title.append(node('h3', '', f.name), node('p', '', f.description)); top.append(title);
    const state = node('span', `feature-status${f.failed ? ' failed' : !f.total ? ' empty' : ''}`);
    state.append(node('span', `dot ${f.failed ? 'red' : f.total ? 'green' : ''}`), document.createTextNode(f.failed ? `${f.failed} lỗi` : f.total ? 'Đạt' : 'Chưa có test')); top.append(state);
    const bottom = node('div', 'feature-bottom'), bar = node('div', 'bar'), pass = node('div', 'pass'), fail = node('div', 'fail');
    pass.style.width = `${f.total ? f.passed / f.total * 100 : 0}%`; fail.style.width = `${f.total ? f.failed / f.total * 100 : 0}%`;
    bar.append(pass, fail); bottom.append(bar, node('span', '', `${f.passed}/${f.total}`)); card.append(top, bottom); card.addEventListener('click', () => chooseFeature(f.id)); $('feature-grid').append(card);
    const nav = node('button', 'feature-nav'); nav.append(node('span', 'feature-code', f.id), document.createTextNode(f.name), node('span', `dot ${f.failed ? 'red' : f.total ? 'green' : ''}`)); nav.addEventListener('click', () => chooseFeature(f.id)); $('feature-nav').append(nav);
  });
  $('feature-filter').value = selectedFeature || 'all';
  const failures = report.tests.filter(t => t.status === 'failed');
  $('failure-list').replaceChildren(...failures.map(renderTest));
  for (const error of report.suiteErrors) { const el = node('div', 'test-body'); el.append(node('h3', '', `Suite không tải được: ${error.file}`), node('pre', '', error.message)); $('failure-list').append(el); }
  if (!failures.length && !report.suiteErrors.length) $('failure-list').append(node('div', 'empty-state', '✓ Không có assertion thất bại trong lần chạy này.'));
  $('history-list').replaceChildren(...report.history.map(run => {
    const item = node('article', 'history-item'); item.append(node('span', `test-mark ${run.failed || run.suiteErrors ? 'failed' : ''}`, run.failed || run.suiteErrors ? '×' : '✓'));
    const label = node('div', '', date(run.finishedAt)); label.append(node('small', '', `${run.trigger} · source ${run.sourceHash.slice(0, 12)}`));
    const result = node('div', 'history-result'); result.append(node('strong', '', `${run.passed} đạt`), node('small', run.failed ? 'red-text' : '', `${run.failed} lỗi / ${run.total} test`)); item.append(label, result); return item;
  }));
  renderSources(); renderGeneration(report.generation); renderTests();
  if (report.sourceChangedDuringRun) notice('Code đã thay đổi trong lúc test chạy. Chạy lại để kiểm tra phiên bản hiện tại.', true);
}
function renderGeneration(g) {
  const labels = { not_requested: 'Chưa yêu cầu sinh test mới.', blocked: 'Chưa sinh được test mới', generated: 'Đã sinh test mới', reviewed_no_additions: 'Claude đã rà soát, không cần bổ sung', no_unit_logic_changes: 'Chỉ thay đổi UI/config: chạy unit suite hiện có', unchanged: 'Logic không đổi so với lần sinh test trước' };
  $('generation-status').textContent = `${labels[g?.status] || 'Chưa có trạng thái sinh test.'}${g?.error ? `: ${g.error}` : ''}${g?.files?.length ? ` · ${g.files.length} file` : ''}`;
}
function renderSources() {
  const data = [
    ['Source code', 'verified', 'Đọc code tại workspace. Báo cáo gắn SHA256 của các file nguồn, schema và dependency lock.', 'https://github.com/minhtuan98/internal_learning_tool'],
    ['Figma', report.sources.figma.status, 'Đã đọc Design System / Aurora AI. Unit test không kiểm tra độ khớp hình ảnh.', report.sources.figma.url],
    ['Notion', report.sources.notion.status, 'Chưa đọc được tài liệu gốc. Mã DEC hiện lấy từ README và comment trong code. Cần kết nối Notion để đối chiếu đầy đủ.', report.sources.notion.url],
  ];
  $('sources').replaceChildren(...data.map(([name, status, description, url]) => { const el = node('article', 'source-card'); el.append(node('h3', '', name), node('span', `source-status${status !== 'verified' ? ' pending' : ''}`, status === 'verified' ? '● Đã truy cập' : '● Chờ kết nối'), node('p', '', description)); const a = node('a', '', 'Mở nguồn ↗'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; el.append(a); return el; }));
}
async function api(route, method = 'GET', data) {
  const response = await fetch(API + route, { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(data || {}) } : {}), signal: AbortSignal.timeout(18000) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`); return body;
}
function needConnection() { changeView('connections'); notice('Chạy npm run qa:serve -- --open trong thư mục learning-hub để kết nối với máy và bật các nút thao tác.'); }
async function loadReport(local = false) {
  const data = local ? await api('/report') : await fetch(`./report.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Không đọc được report.json'); return r.json(); });
  if (!data?.summary || !Array.isArray(data.tests)) throw new Error('Chưa có báo cáo hợp lệ. Chạy npm run qa:run trước.');
  report = data; $('report-mode').textContent = local ? 'Kết quả trực tiếp từ máy' : 'Báo cáo đã xuất bản'; render();
}
function connectionState(ok) { const previous = connected; connected = ok; $('connection-label').textContent = ok ? 'Đã kết nối máy' : 'Chưa kết nối máy'; $('connect-top').querySelector('.dot').className = `dot${ok ? ' green' : ''}`; if (ok && !previous) notice('Đã kết nối máy. Bạn có thể chạy test và mở lỗi trong Claude Code từ trang này.'); }
async function poll() {
  if (!token || polling) return;
  polling = true;
  try {
    const s = await api('/status'); const newly = !connected; connectionState(true);
    const phases = { generating: '✦ Đang sinh test…', testing: '▶ Đang chạy test…', publishing: '↗ Đang cập nhật Vercel…' };
    $('run').disabled = s.busy; $('generate').disabled = s.busy;
    $('run').textContent = s.busy ? phases[s.phase] || 'Đang xử lý…' : '▶  Chạy unit test';
    if (newly || (s.runId && s.runId !== report?.runId) || (wasBusy && !s.busy) || (!s.busy && report?.sourceHash !== s.sourceHash)) await loadReport(true);
    if (!s.busy && s.reportStale) notice('Code hiện tại khác phiên bản đã test. Runner sẽ chạy lại khi nhận thay đổi; bạn cũng có thể bấm Chạy unit test.', true);
    if (s.lastError && !s.busy) notice(s.lastError, true);
    if (s.generation) renderGeneration(s.generation);
    wasBusy = s.busy;
  } catch { connectionState(false); $('run').disabled = false; $('generate').disabled = false; $('run').textContent = '▶  Chạy unit test'; }
  finally { polling = false; }
}
async function startRun(generate) {
  if (!connected) return needConnection();
  const button = generate ? $('generate') : $('run'); button.disabled = true;
  try { await api(generate ? '/update' : '/run', 'POST'); wasBusy = true; notice(generate ? 'Đã nhận yêu cầu sinh test, chạy suite và cập nhật báo cáo. Có thể mất vài phút.' : 'Đang chạy Vitest trên code ở máy của bạn. Trang sẽ tự cập nhật kết quả.'); await poll(); }
  catch (e) { notice(e.message, true); button.disabled = false; }
}
async function fixWithClaude(testId, button) {
  if (!connected) return needConnection();
  if (button) button.disabled = true;
  try { const r = await api('/fix', 'POST', { testId }); notice(r.note); location.href = r.url; }
  catch (e) { notice(e.message, true); }
  finally { if (button) button.disabled = false; }
}
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => changeView(el.dataset.view)));
$('show-all').addEventListener('click', () => changeView('tests'));
$('connect-top').addEventListener('click', async () => { changeView('connections'); if (token && !connected) { await poll(); if (!connected) notice('Kiểm tra runner đang mở. Nếu trình duyệt chặn, cho phép Loopback network trong cài đặt trang hoặc chọn Mở dashboard trên máy này.', true); } });
$('local-dashboard').addEventListener('click', event => { event.preventDefault(); location.href = `${API}/${token ? `#token=${token}` : ''}`; });
$('run').addEventListener('click', () => startRun(false));
$('generate').addEventListener('click', () => startRun(true));
$('fix-all').addEventListener('click', () => fixWithClaude(undefined, $('fix-all')));
$('refresh').addEventListener('click', () => loadReport(connected).catch(e => notice(e.message, true)));
['search', 'status-filter', 'feature-filter'].forEach(id => $(id).addEventListener('input', renderTests));
$('pair').addEventListener('click', async () => { const value = $('pair-token').value.trim() || token; if (!/^[a-f0-9]{64}$/.test(value)) return notice('Mã kết nối không hợp lệ. Dùng mã 64 ký tự từ link runner.', true); token = value; sessionStorage.setItem('lh_qa_token', token); $('pair-token').value = ''; await poll(); notice(connected ? 'Đã kết nối. Có thể chạy test và mở Claude Code từ trang này.' : 'Không kết nối được runner. Kiểm tra terminal và quyền Loopback network của trình duyệt, hoặc mở dashboard trên máy này.', !connected); });
$('disconnect').addEventListener('click', () => { token = ''; sessionStorage.removeItem('lh_qa_token'); connectionState(false); notice('Đã ngắt kết nối với máy.'); void loadReport().catch(e => notice(e.message, true)); });
loadReport().catch(e => { $('loading').textContent = e.message; });
poll(); setInterval(poll, 3000);
