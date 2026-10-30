const { spawnSync, execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const outputDir = mkdtempSync(join(tmpdir(), 'jching-date-tests-'));
const bundle = join(outputDir, 'event-date.test.cjs');
try {
  const build = spawnSync(resolve(root, 'node_modules/.bin/esbuild'), [
    resolve(root, 'tests/event-date.test.tsx'),
    '--bundle', '--platform=node', '--format=cjs', '--jsx=automatic',
    `--outfile=${bundle}`,
  ], { cwd: root, encoding: 'utf8' });
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  if (build.error) throw build.error;
  assert.equal(build.status, 0, 'Test bundle build failed');

  // This is a standalone runner, not a nested node:test runner. Child TAP is
  // therefore emitted normally and all individual cases remain visible.
  const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', bundle], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '0' },
    encoding: 'utf8',
  });
  process.stdout.write(output);
  const tests = output.match(/^# tests (\d+)$/m)?.[1];
  const passes = output.match(/^# pass (\d+)$/m)?.[1];
  const failures = output.match(/^# fail (\d+)$/m)?.[1];
  assert.ok(Number(tests) >= 9, `Expected all regression cases to run; got ${tests}`);
  assert.equal(passes, tests, 'Every regression case must pass');
  assert.equal(failures, '0', 'No regression failures allowed');
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
