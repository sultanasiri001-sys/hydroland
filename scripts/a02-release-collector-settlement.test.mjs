import assert from 'node:assert/strict';
import {test} from 'node:test';
import {waitForPushRunsToSettle, collectReleaseEvidence} from './a02-release-collector.mjs';

const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40), REPO = 'sultanasiri001-sys/hydroland';
const BASE = `/repos/${REPO}`, NOW = Date.parse('2026-11-01T12:00:00Z');
const repo = {id: 1366555943, full_name: REPO};
const policy = {schemaVersion: 1, repository: REPO, repositoryId: repo.id, branch: 'main', event: 'push',
  maxSnapshotAgeMs: 300000, maxRunAgeMs: 86400000,
  required: [{workflowId: 11, path: '.github/workflows/api.yml', jobs: ['build']}]};
const run = (id, overrides = {}) => ({id, workflow_id: 11, path: '.github/workflows/api.yml',
  head_sha: SHA, head_branch: 'main', event: 'push', run_attempt: 1, run_number: id,
  repository: {...repo}, head_repository: {...repo}, status: 'completed', conclusion: 'success',
  created_at: new Date(NOW - 120000).toISOString(), updated_at: new Date(NOW - 60000).toISOString(), ...overrides});
const observer = () => run(99, {workflow_id: 399738953, path: '.github/workflows/a02-release-collector.yml',
  status: 'in_progress', conclusion: null});
function fixture(sets = [[run(1), observer()]], hook = () => {}) {
  let time = NOW, cycles = 0;
  const calls = [], waits = [];
  const read = async path => {
    calls.push(path);
    const url = new URL(path, 'https://api.github.com');
    let body;
    if (path === BASE) body = {...repo};
    else if (path === `${BASE}/git/ref/heads/main`) body = {ref: 'refs/heads/main', object: {type: 'commit', sha: SHA}};
    else {
      assert.equal(url.pathname, `${BASE}/actions/runs`);
      assert.equal(url.searchParams.get('head_sha'), SHA);
      assert.equal(url.searchParams.get('branch'), 'main');
      assert.equal(url.searchParams.get('event'), 'push');
      assert.equal(url.searchParams.get('status'), null);
      assert.equal(url.searchParams.get('per_page'), '100');
      const rows = sets[Math.min(cycles, sets.length - 1)];
      const page = Number(url.searchParams.get('page'));
      body = {total_count: rows.length, workflow_runs: structuredClone(rows.slice((page - 1) * 100, page * 100))};
      if (page === Math.floor(rows.length / 100) + 2 || (rows.length % 100 === 0 && page === rows.length / 100 + 1)) cycles++;
    }
    return await hook({path, url, body, cycles, calls}) ?? body;
  };
  const options = {read, observerRunId: 99, now: () => time,
    wait: async ms => {waits.push(ms); time += ms;}, pollIntervalMs: 10, maxWaitMs: 100};
  return {calls, waits, options};
}

test('waits for unrelated browser work, then requires two identical completed observations', async () => {
  const browser = run(2, {workflow_id: 12, path: '.github/workflows/web.yml', status: 'in_progress', conclusion: null});
  const done = {...browser, status: 'completed', conclusion: 'success'};
  const f = fixture([[run(1), observer(), browser], [run(1), observer(), done]]);
  const result = await waitForPushRunsToSettle(policy, SHA, f.options);
  assert.equal(result.status, 'SETTLED'); assert.equal(result.observedRunCount, 3);
  assert.deepEqual(f.waits, [10, 10]);
  assert(!JSON.stringify(result).includes('workflow_runs'));
});
test('completed failures settle for collection but the unchanged evaluator still blocks them', async () => {
  const failed = run(1, {conclusion: 'failure'}), f = fixture([[failed, observer()]]);
  assert.equal((await waitForPushRunsToSettle(policy, SHA, f.options)).status, 'SETTLED');
  const read = async path => {
    if (path.includes('/attempts/1/jobs')) return {total_count: 0, jobs: []};
    if (path.includes('/actions/runs/1')) return failed;
    return f.options.read(path);
  };
  const evidence = await collectReleaseEvidence(policy, SHA, {read, now: () => NOW});
  assert.equal(evidence.collection.status, 'COMPLETE');
  assert.equal(evidence.evaluation.status, 'BLOCKED');
  assert.equal(evidence.evaluation.productionAuthorized, false);
});
test('no other in-progress observer is excluded', async () => {
  const another = {...observer(), id: 98};
  const f = fixture([[run(1), observer(), another]]);
  assert.deepEqual((await waitForPushRunsToSettle(policy, SHA, f.options)).reasons, ['RUN_SETTLEMENT_TIMEOUT']);
});
test('missing required workflow cannot become settled evidence', async () => {
  const f = fixture([[observer()]]);
  assert.deepEqual((await waitForPushRunsToSettle(policy, SHA, f.options)).reasons, ['RUN_SETTLEMENT_TIMEOUT']);
});
test('a late rerun resets the quiet observation rather than accepting the earlier success', async () => {
  const first = run(1), pending = run(1, {run_attempt: 2, status: 'queued', conclusion: null});
  const second = {...pending, status: 'completed', conclusion: 'failure'};
  const f = fixture([[first, observer()], [pending, observer()], [second, observer()]]);
  const result = await waitForPushRunsToSettle(policy, SHA, f.options);
  assert.equal(result.status, 'SETTLED'); assert.deepEqual(f.waits, [10, 10, 10]);
});
for (const [name, hook, reason] of [
  ['head moves while waiting', ({path, body, calls}) => {
    if (path.endsWith('/git/ref/heads/main') && calls.filter(p => p.endsWith('/git/ref/heads/main')).length > 2) body.object.sha = OTHER;
  }, 'HEAD_CHANGED'],
  ['foreign repository', ({path, body}) => {if (path === BASE) body.id++;}, 'REPOSITORY_MISMATCH'],
  ['foreign run provenance', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].head_repository.id++;}, 'RUN_PROVENANCE_MISMATCH'],
  ['forged current observer', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs.find(r => r.id === 99).path = '.github/workflows/api.yml';}, 'RUN_PROVENANCE_MISMATCH'],
  ['duplicate run', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[1].id = body.workflow_runs[0].id;}, 'PAGE_DUPLICATE'],
  ['truncated listing', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs.pop();}, 'PAGE_TRUNCATED'],
  ['extra terminal row', ({body}) => {if (body.workflow_runs?.length === 0) body.workflow_runs.push(run(1));}, 'PAGE_TRUNCATED'],
]) test(`preflight blocks ${name} without retrying a collection`, async () => {
  const f = fixture(undefined, hook), result = await waitForPushRunsToSettle(policy, SHA, f.options);
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.reasons, [reason]);
  assert(!f.calls.some(p => /\/attempts\//.test(p)));
});
test('API access failure is not polled or printed with its sensitive message', async () => {
  const f = fixture(undefined, () => {throw new Error('DO_NOT_RETAIN_TOKEN_OR_RESPONSE');});
  const result = await waitForPushRunsToSettle(policy, SHA, f.options);
  assert.deepEqual(result.reasons, ['COLLECTION_FAILED']); assert.equal(f.calls.length, 1);
  assert(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
});
test('backwards clock fails instead of extending a wait indefinitely', async () => {
  const f = fixture(); let n = 0;
  const result = await waitForPushRunsToSettle(policy, SHA, {...f.options, now: () => NOW - n++});
  assert.deepEqual(result.reasons, ['CLOCK_INVALID']);
});
test('zero runs remain missing rather than a quiet successful set', async () => {
  const f = fixture([[]]);
  assert.deepEqual((await waitForPushRunsToSettle(policy, SHA, f.options)).reasons, ['RUN_SETTLEMENT_TIMEOUT']);
});
test('more than one page of runs is observed, including its terminal empty page', async () => {
  const rows = [run(1), observer(), ...Array.from({length: 101}, (_, i) => run(i + 100))];
  const f = fixture([rows]), result = await waitForPushRunsToSettle(policy, SHA, f.options);
  assert.equal(result.status, 'SETTLED'); assert.equal(result.observedRunCount, 103);
  assert.equal(f.calls.filter(p => p.endsWith('&page=3')).length, 2);
});
for (const [name, overrides] of [
  ['invalid clock function', {now: null}], ['invalid wait function', {wait: null}],
  ['unbounded timeout', {maxWaitMs: 36 * 60000}], ['unbounded interval', {pollIntervalMs: 30001}],
  ['invalid observer', {observerRunId: -1}],
]) test(`invalid scheduling input blocks: ${name}`, async () => {
  const f = fixture(), result = await waitForPushRunsToSettle(policy, SHA, {...f.options, ...overrides});
  assert.deepEqual(result.reasons, ['INVALID_INPUT']); assert.equal(f.calls.length, 0);
});
