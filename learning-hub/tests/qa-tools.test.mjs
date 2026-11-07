import { describe, it, expect } from 'vitest';
import { normalizeReport, command, ROOT } from '../scripts/qa/core.mjs';
import { validateGeneratedFiles } from '../scripts/qa/generate.mjs';

describe('QA · Report and test generation safeguards', () => {
  it('reports suite import errors even when no assertion can run', () => {
    const report = normalizeReport({ startTime: 100, testResults: [{ name: `${ROOT}tests/broken.test.ts`, status: 'failed', assertionResults: [], message: `Import error in ${ROOT}`, endTime: 150 }] });
    expect(report.summary).toMatchObject({ total: 0, suiteErrors: 1 });
    expect(report.suiteErrors[0].message).not.toContain(ROOT);
  });
  it('keeps pending tests separate from passed tests', () => {
    const report = normalizeReport({ testResults: [{ name: `${ROOT}tests/a.test.ts`, assertionResults: [{ fullName: 'F8 scoring > answer', ancestorTitles: ['F8 scoring'], title: 'answer', status: 'pending' }] }] });
    expect(report.summary).toMatchObject({ passed: 0, skipped: 1 }); expect(report.tests[0].feature).toBe('F8');
  });
  it('matches F10 as certificates rather than F1', () => {
    const report = normalizeReport({ testResults: [{ name: `${ROOT}tests/a.test.ts`, assertionResults: [{ fullName: 'cert', ancestorTitles: ['F10 certificates'], title: 'certificate', status: 'passed' }] }] });
    expect(report.features.find(f => f.id === 'F10').passed).toBe(1);
  });
  it.each(['../escape.test.ts', '/tmp/x.test.ts', 'a.ts', 'x.test.ts/../../a', 'UPPER.test.ts'])('rejects generated path %s', name => {
    expect(() => validateGeneratedFiles({ reason: 'test', files: [{ name, content: 'it("test", () => expect(true).toBe(true));' }] })).toThrow();
  });
  it.each(['it.skip', 'test.only', 'describe.todo'])('rejects generated %s', method => {
    expect(() => validateGeneratedFiles({ reason: 'test', files: [{ name: 'safe.test.ts', content: `${method}("bad", () => {});` }] })).toThrow();
  });
  it('rejects duplicate generated names before any write', () => {
    const file = { name: 'safe.test.ts', content: 'test("ok", () => {});' };
    expect(() => validateGeneratedFiles({ reason: 'test', files: [file, file] })).toThrow();
  });
  it('allows a structured no-additions review', () => expect(validateGeneratedFiles({ reason: 'Already covered', files: [] })).toEqual([]));
  it('passes prompt input through stdin with no shell evaluation', async () => {
    const input = 'literal `echo secret` $(echo secret)\nsecond line';
    const result = await command(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], { input });
    expect(result.code).toBe(0); expect(result.stdout).toBe(input);
  });
});
