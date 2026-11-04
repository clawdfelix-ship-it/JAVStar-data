const { spawnSync, execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const outputDir = mkdtempSync(join(tmpdir(), 'jching-date-tests-'));
const entries = ['tests/event-date.test.tsx', 'tests/events-where.test.tsx'];
let totalTests = 0;
let totalPass = 0;
let totalFail = 0;
try {
  for (const entry of entries) {
    const bundle = join(outputDir, `${entry.replace(/[/.]/g, '-')}.cjs`);
    const build = spawnSync(resolve(root, 'node_modules/.bin/esbuild'), [
      resolve(root, entry),
      '--bundle', '--platform=node', '--format=cjs', '--jsx=automatic',
      `--outfile=${bundle}`,
    ], { cwd: root, encoding: 'utf8' });
    process.stdout.write(build.stdout || '');
    process.stderr.write(build.stderr || '');
    if (build.error) throw build.error;
    assert.equal(build.status, 0, `Test bundle build failed: ${entry}`);

    // This is a standalone runner, not a nested node:test runner. Child TAP is
    // therefore emitted normally and all individual cases remain visible.
    const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', bundle], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: '0' },
      encoding: 'utf8',
    });
    process.stdout.write(output);
    totalTests += Number(output.match(/^# tests (\d+)$/m)?.[1] || 0);
    totalPass += Number(output.match(/^# pass (\d+)$/m)?.[1] || 0);
    totalFail += Number(output.match(/^# fail (\d+)$/m)?.[1] || 0);
  }
  // The date suite alone has >= 9 regression cases; the combined run must cover
  // them plus the events-where SQL-injection regression cases.
  assert.ok(totalTests >= 9, `Expected all regression cases to run; got ${totalTests}`);
  assert.equal(totalPass, totalTests, 'Every regression case must pass');
  assert.equal(totalFail, 0, 'No regression failures allowed');
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
