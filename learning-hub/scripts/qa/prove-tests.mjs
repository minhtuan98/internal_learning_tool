import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Change only an isolated copy of production code. A known security regression
// must make the existing test exit nonzero. Application sources remain untouched.
const dir = resolve('.qa/review/mutation');
await mkdir(dir, { recursive: true });
const source = await readFile('src/lib/video.ts', 'utf8');
const broken = source.replace('host === "youtube.com"', 'host.endsWith("youtube.com")');
assert.notEqual(source, broken, 'Mutation no longer applies; update this proof for the current source');
const mutant = resolve(dir, 'video.ts');
await writeFile(mutant, broken);
const config = resolve(dir, 'vitest.config.mts');
await writeFile(config, `import { defineConfig } from 'vitest/config';\nexport default defineConfig(${JSON.stringify({
  resolve: { alias: [{ find: '@/lib/video', replacement: mutant }, { find: '@', replacement: resolve('src') }] },
  test: { environment: 'node', include: ['tests/regressions.test.ts'], setupFiles: [resolve('tests/setup.ts')] },
})});\n`);
const report = resolve(dir, 'results.json');
const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', config, '--testNamePattern', 'hostname giả mạo YouTube', '--reporter=json', `--outputFile=${report}`], { encoding: 'utf8' });
await writeFile(resolve(dir, 'output.log'), run.stdout + run.stderr);
assert.equal(run.status, 1, `The intentionally broken implementation must fail: ${run.stderr}`);
const result = JSON.parse(await readFile(report, 'utf8'));
assert.equal(result.numFailedTests, 1);
const rejected = result.testResults.flatMap((r) => r.assertionResults).find((r) => r.status === 'failed');
assert.match(rejected?.fullName || '', /hostname giả mạo YouTube/);
console.log('PASS: deliberately allowing spoofed YouTube hosts made the existing regression test fail (exit 1).');
console.log('Original production sources were never modified. Evidence:', report);
