import nextEnv from '@next/env';
import { existsSync, mkdirSync } from 'node:fs';
import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

nextEnv.loadEnvConfig(process.cwd());
const port = Number(process.env.PREVIEW_PORT || 3001);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PREVIEW_PORT');
const localDir = resolve('.qa/review');
mkdirSync(localDir, { recursive: true });
const target = resolve(localDir, 'preview.db');
if (!existsSync(target)) {
  const sourceUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (!sourceUrl.startsWith('file:')) throw new Error('The local preview requires a SQLite database');
  const source = new DatabaseSync(resolve('prisma', sourceUrl.slice(5)), { readOnly: true });
  try { await backup(source, target); } finally { source.close(); }
}
const origin = `http://127.0.0.1:${port}`;
console.log(`Local review: ${origin}\nIsolated database: ${target}`);
const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: `file:${target}`, APP_URL: origin, VERCEL: '', AUTH_DEV_LOGIN: 'true' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => { process.exitCode = code ?? 0; });
