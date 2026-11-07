import { command, ROOT, STATE, readJSON, fingerprint } from './qa/core.mjs';
import path from 'node:path';

if (process.env.QA_NESTED === '1') process.exit(0);
let input = ''; for await (const chunk of process.stdin) input += chunk;
const event = input ? JSON.parse(input) : {};
if (event.stop_hook_active) process.exit(0);
const latest = await readJSON(path.join(STATE, 'latest.json'));
const generation = await readJSON(path.join(STATE, 'generation.json'));
const current = await fingerprint();
if (latest?.sourceHash === current.hash && generation?.sourceHash === current.hash && !['blocked', 'not_requested'].includes(generation.status)) process.exit(0);
const connection = await readJSON(path.join(STATE, 'connection.json'));
if (connection) {
  try {
    const response = await fetch(`http://127.0.0.1:${connection.port}/update`, { method: 'POST', headers: { Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(3000) });
    if (response.ok || response.status === 409) process.exit(0);
  } catch { /* Runner stopped; fall back to a standalone run. */ }
}
const deployment = await readJSON(path.join(STATE, 'deployment.json'));
const result = await command(process.execPath, [path.join(ROOT, 'scripts/qa/run.mjs'), '--generate', '--hook', ...(deployment?.origin ? ['--publish'] : [])], { timeout: 540_000 });
console.log(result.stdout || result.stderr);
// Async Stop hooks record test failures in the dashboard without trapping Claude in a stop loop.
