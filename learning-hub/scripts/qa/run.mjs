import { runTests, withLock, publishReport } from './core.mjs';
import { generateTests } from './generate.mjs';

try {
  const report = await withLock(async () => {
    if (process.argv.includes('--generate')) console.log('Test generation:', (await generateTests()).status);
    const report = await runTests(process.argv.includes('--hook') ? 'claude-stop' : process.argv.includes('--ci') ? 'github' : 'manual');
    console.log(`${report.summary.passed}/${report.summary.total} passed; ${report.summary.failed} failed; source ${report.sourceHash.slice(0, 12)}`);
    if (process.argv.includes('--publish')) console.log('Published:', await publishReport());
    return report;
  });
  process.exitCode = report.exitCode;
} catch (error) { console.error(error.message); process.exitCode = 2; }
