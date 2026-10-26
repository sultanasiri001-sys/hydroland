import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const publicOrigin = 'https://hydroland-web.onrender.com';

// A narrow regression guard for this template's literal env rows, not a YAML
// parser or Render schema/platform validation. Reject ambiguous/duplicate rows.
function assertBlueprintOrigins(source) {
  for (const key of ['WEB_ORIGIN', 'HYDROLAND_PUBLIC_WEB_ORIGIN']) {
    const keys = [...source.matchAll(new RegExp(`^\\s*- key: ${key}\\s*$`, 'gm'))];
    assert.equal(keys.length, 1, `Expected one ${key} declaration`);
    const row = source.match(new RegExp(`^      - key: ${key}\\r?\\n        value: ([^\\r\\n]+)$`, 'm'));
    assert.equal(row?.[1], publicOrigin, `${key} must use the verified public web origin`);
  }
}

test('Blueprint origins target the public Render UI, not the historical Pages preview', () => {
  assertBlueprintOrigins(read('render.yaml'));
});

test('origin guard rejects stale, wildcard, missing, and duplicate CORS declarations', () => {
  const source = read('render.yaml');
  const row = `      - key: WEB_ORIGIN\n        value: ${publicOrigin}`;
  for (const origin of ['https://sultanasiri001-sys.github.io', '*', `${publicOrigin},https://untrusted.example`]) {
    assert.throws(() => assertBlueprintOrigins(source.replace(row, row.replace(publicOrigin, origin))));
  }
  assert.throws(() => assertBlueprintOrigins(source.replace(row, '')));
  assert.throws(() => assertBlueprintOrigins(`${source}\n${row}\n`));
});

test('Blueprint keeps database readiness as intent, not liveness-only health', () => {
  assert.match(read('render.yaml'), /^    healthCheckPath: \/api\/v1\/health\/ready$/m);
  const controller = read('apps/api/src/health/health.controller.ts');
  assert.match(controller, /@Get\('ready'\)/);
  assert.match(controller, /await this\.db\.\$queryRaw`SELECT 1`/);
  assert.match(controller, /throw new ServiceUnavailableException/);
});

const apiSteps = [
  ['npm', 'ci', '--workspace=@hydroland/api', '--include-workspace-root=false', '--include=dev', '--ignore-scripts'],
  ['npm', 'run', 'db:generate', '--workspace=@hydroland/api'],
  ['npm', 'run', 'build', '--workspace=@hydroland/api'],
  ['npm', 'prune', '--workspace=@hydroland/api', '--include-workspace-root=false', '--omit=dev', '--ignore-scripts'],
  ['node', 'apps/api/scripts/runtime-dependency-boundary.mjs'],
  ['node', 'scripts/release-dependency-audit.mjs', 'web-api', 'api-release-audit.json'],
];
const webSteps = [
  ['npm', 'ci', '--workspace=@hydroland/web', '--include-workspace-root=true', '--ignore-scripts'],
  ['npm', 'run', 'test', '--workspace=@hydroland/web'],
  ['npm', 'run', 'build', '--workspace=@hydroland/web'],
  ['node', 'scripts/release-dependency-audit.mjs', 'web-api', 'web-release-audit.json'],
];

// Execute the real entrypoints in an isolated copied tree with recording child
// executables. No install, build, network call, migration or deploy is performed.
function recordBuild(channel, failAt = 0, unrelatedCwd = false) {
  const fixture = mkdtempSync(join(tmpdir(), 'hydroland-render-contract-'));
  try {
    const script = `build-${channel}-release.mjs`;
    for (const dir of ['scripts', 'apps/api', 'bin', 'unrelated']) mkdirSync(join(fixture, dir), {recursive: true});
    copyFileSync(join(root, 'scripts', script), join(fixture, 'scripts', script));
    const trace = join(fixture, 'trace.jsonl');
    writeFileSync(trace, '');
    for (const command of ['npm', 'node']) {
      writeFileSync(join(fixture, 'bin', command), `#!${process.execPath}
const fs = require('node:fs');
const trace = process.env.CONTRACT_TRACE;
fs.appendFileSync(trace, JSON.stringify({command: ${JSON.stringify(command)}, args: process.argv.slice(2), cwd: process.cwd()}) + '\\n');
const count = fs.readFileSync(trace, 'utf8').trim().split('\\n').length;
if (count === Number(process.env.CONTRACT_FAIL_AT)) process.exit(17);
`, {mode: 0o755});
    }
    const result = spawnSync(process.execPath, [join(fixture, 'scripts', script)], {
      cwd: join(fixture, unrelatedCwd ? 'unrelated' : channel === 'api' ? 'apps/api' : '.'),
      env: {...process.env, PATH: join(fixture, 'bin'), CONTRACT_TRACE: trace, CONTRACT_FAIL_AT: String(failAt)},
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.ifError(result.error);
    const rows = readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    for (const row of rows) assert.equal(row.cwd, fixture, 'Every command must resolve the repository root');
    return {status: result.status, stderr: result.stderr, steps: rows.map(({command, args}) => [command, ...args])};
  } finally {
    rmSync(fixture, {recursive: true, force: true});
  }
}

for (const [channel, steps] of [['api', apiSteps], ['web', webSteps]]) {
  test(`native ${channel} build entrypoint preserves scoped commands and root resolution`, () => {
    for (const unrelatedCwd of [false, true]) {
      const result = recordBuild(channel, 0, unrelatedCwd);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.steps, steps);
    }
  });
  test(`native ${channel} build stops after any failed child command`, () => {
    for (let failAt = 1; failAt <= steps.length; failAt += 1) {
      const result = recordBuild(channel, failAt);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /failed \(17\)/);
      assert.deepEqual(result.steps, steps.slice(0, failAt));
    }
  });
}
