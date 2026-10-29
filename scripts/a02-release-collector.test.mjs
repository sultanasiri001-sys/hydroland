import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, symlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectReleaseEvidence, createGitHubReader, summarizeCollection} from './a02-release-collector.mjs';

const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40), NOW = Date.parse('2026-10-28T18:00:00Z');
const REPO = 'sultanasiri001-sys/hydroland', BASE = `/repos/${REPO}`;
const repo = {id: 1366555943, full_name: REPO};
const iso = value => new Date(value).toISOString();
const clone = value => structuredClone(value);
function fixture() {
  const policy = {schemaVersion: 1, repository: REPO, repositoryId: repo.id, branch: 'main', event: 'push',
    maxSnapshotAgeMs: 300000, maxRunAgeMs: 86400000,
    required: [{workflowId: 11, path: '.github/workflows/api.yml', jobs: ['build']},
      {workflowId: 12, path: '.github/workflows/gate.yml', jobs: ['gate']}]};
  const runs = policy.required.map((rule, index) => ({id: 101 + index, workflow_id: rule.workflowId, path: rule.path,
    head_sha: SHA, head_branch: 'main', event: 'push', run_number: 2, run_attempt: 2,
    repository: clone(repo), head_repository: clone(repo), status: 'completed', conclusion: 'success',
    created_at: iso(NOW - 120000), updated_at: iso(NOW - 60000), display_title: 'SECRET_NOT_RETAINED'}));
  const older = clone(runs[0]); older.id = 90; older.run_number = 1; older.run_attempt = 1; older.conclusion = 'failure'; runs.push(older);
  const jobs = {};
  for (const run of runs) jobs[run.id] = [0, 1, 2].map(index => ({id: run.id * 10 + index, run_id: run.id,
    run_attempt: run.run_attempt, head_sha: SHA, name: index === 0 ? policy.required[run.workflow_id - 11].jobs[0] : `extra-${index}`,
    status: 'completed', conclusion: 'success', started_at: iso(NOW - 110000), completed_at: iso(NOW - 61000),
    runner_name: 'SECRET_NOT_RETAINED'}));
  return {policy, runs, jobs};
}
function fake(input = fixture(), hook = () => {}) {
  const calls = [], counts = new Map();
  async function read(path) {
    const url = new URL(path, 'https://api.github.com'), tail = url.pathname.slice(BASE.length);
    const count = (counts.get(path) || 0) + 1; counts.set(path, count); calls.push(path);
    let body;
    if (tail === '') body = clone(repo);
    else if (tail === '/git/ref/heads/main') body = {ref: 'refs/heads/main', object: {type: 'commit', sha: SHA}};
    else if (tail === '/actions/runs') {
      assert.equal(url.searchParams.get('head_sha'), SHA); assert.equal(url.searchParams.get('branch'), 'main');
      assert.equal(url.searchParams.get('event'), 'push'); assert.equal(url.searchParams.get('status'), null);
      const start = (Number(url.searchParams.get('page')) - 1) * Number(url.searchParams.get('per_page'));
      body = {total_count: input.runs.length, workflow_runs: clone(input.runs.slice(start, start + Number(url.searchParams.get('per_page'))))};
    } else {
      const match = tail.match(/^\/actions\/runs\/(\d+)(?:\/attempts\/(\d+)(\/jobs)?)?$/);
      assert(match, `Unexpected GET: ${tail}`);
      const id = Number(match[1]), attempt = Number(match[2]);
      if (match[3]) {
        assert.equal(attempt, input.runs.find(run => run.id === id).run_attempt);
        const start = (Number(url.searchParams.get('page')) - 1) * Number(url.searchParams.get('per_page'));
        body = {total_count: input.jobs[id].length, jobs: clone(input.jobs[id].slice(start, start + Number(url.searchParams.get('per_page'))))};
      } else body = clone(input.runs.find(run => run.id === id));
    }
    return await hook({path, tail, url, body, count, input, calls}) ?? body;
  }
  return {read, calls, input};
}
async function run(input = fixture(), hook, options = {}) {
  const service = fake(input, hook);
  const result = await collectReleaseEvidence(input.policy, SHA, {read: service.read, now: () => NOW, pageSize: 2, ...options});
  return {result, service};
}
function blocked(result, reason) {
  assert.equal(result.collection.status, 'BLOCKED'); assert.equal(result.snapshot, null);
  assert.equal(result.evaluation.productionAuthorized, false); assert.deepEqual(result.collection.reasons, [reason]);
}

test('collects every run and attempt-pinned job page, then evaluates exact SHA', async () => {
  const {result, service} = await run();
  assert.equal(result.collection.status, 'COMPLETE'); assert.equal(result.evaluation.status, 'PASS');
  assert.equal(result.snapshot.total_count, 3); assert.equal(result.snapshot.jobs[101].total_count, 3);
  assert.equal(result.snapshot.jobs[101].runAttempt, 2); assert.equal(result.evaluation.productionAuthorized, false);
  assert(service.calls.filter(path => path.includes('/jobs')).every(path => path.includes('/attempts/2/jobs')));
  assert.equal(service.calls.filter(path => path.includes('/actions/runs?') && path.endsWith('page=3')).length, 2);
  assert.equal(service.calls.filter(path => path.endsWith('/git/ref/heads/main')).length, 2);
  assert(!JSON.stringify(result).includes('SECRET_NOT_RETAINED'));
  assert(!JSON.stringify(summarizeCollection(result)).includes('workflow_runs'));
});
test('pagination beyond 100 jobs is collected and terminal page is observed', async () => {
  const input = fixture(), template = input.jobs[101][0];
  input.jobs[101] = Array.from({length: 101}, (_, i) => ({...template, id: 10000 + i, name: i ? `extra-${i}` : 'build'}));
  const {result, service} = await run(input, undefined, {pageSize: 100});
  assert.equal(result.evaluation.status, 'PASS'); assert.equal(result.snapshot.jobs[101].jobs.length, 101);
  assert(service.calls.some(path => path.includes('/101/attempts/2/jobs?per_page=100&page=3')));
});
test('missing required run remains a collected BLOCKED evaluation', async () => {
  const input = fixture(); input.runs = input.runs.filter(run => run.workflow_id !== 11);
  const {result} = await run(input); assert.equal(result.collection.status, 'COMPLETE');
  assert.equal(result.evaluation.gates[0].reasons[0], 'MISSING_DEPLOYMENT_RUN');
});
test('zero runs is complete evidence of absence, never success', async () => {
  const input = fixture(); input.runs = [];
  const {result} = await run(input); assert.equal(result.collection.status, 'COMPLETE'); assert.equal(result.evaluation.status, 'BLOCKED');
});
for (const conclusion of ['failure', 'neutral', 'skipped', 'cancelled', null]) test(`integrated evaluator refuses ${conclusion}`, async () => {
  const input = fixture(); input.runs[0].conclusion = conclusion;
  const {result} = await run(input); assert.equal(result.collection.status, 'COMPLETE'); assert.equal(result.evaluation.status, 'BLOCKED');
});
test('old successful run cannot hide a newer failure', async () => {
  const input = fixture(); input.runs[2].conclusion = 'success'; input.runs[0].conclusion = 'failure';
  const {result} = await run(input); assert.equal(result.evaluation.gates[0].runId, 101); assert.equal(result.evaluation.status, 'BLOCKED');
});
test('input policy is cloned before asynchronous collection', async () => {
  const input = fixture(), before = clone(input.policy);
  const {result} = await run(input, ({tail}) => {if (!tail) input.policy.required.length = 0;});
  assert.equal(result.evaluation.status, 'PASS'); assert.equal(result.evaluation.gates.length, before.required.length);
});

const mutations = [
  ['wrong repository ID', ({tail, body}) => {if (!tail) body.id++;}, 'REPOSITORY_MISMATCH'],
  ['wrong repository name', ({tail, body}) => {if (!tail) body.full_name = 'foreign/repo';}, 'REPOSITORY_MISMATCH'],
  ['wrong initial SHA', ({tail, body}) => {if (tail.includes('/git/ref/')) body.object.sha = OTHER;}, 'HEAD_CHANGED'],
  ['head changed at final check', ({tail, count, body}) => {if (tail.includes('/git/ref/') && count === 2) body.object.sha = OTHER;}, 'HEAD_CHANGED'],
  ['wrong ref type', ({tail, body}) => {if (tail.includes('/git/ref/')) body.object.type = 'tag';}, 'HEAD_CHANGED'],
  ['wrong ref name', ({tail, body}) => {if (tail.includes('/git/ref/')) body.ref = 'refs/heads/other';}, 'HEAD_CHANGED'],
  ['missing total count', ({body}) => {if (body.workflow_runs) delete body.total_count;}, 'PAGE_INVALID'],
  ['non-array page', ({body}) => {if (body.workflow_runs) body.workflow_runs = {};}, 'PAGE_INVALID'],
  ['1000-run API ceiling', ({body}) => {if (body.workflow_runs) body.total_count = 1000;}, 'PAGE_LIMIT'],
  ['changed count between run pages', ({url, body}) => {if (body.workflow_runs && url.searchParams.get('page') === '2') body.total_count++;}, 'PAGE_COUNT_CHANGED'],
  ['premature empty run page', ({url, body}) => {if (body.workflow_runs && url.searchParams.get('page') === '2') body.workflow_runs = [];}, 'PAGE_TRUNCATED'],
  ['extra row on terminal page', ({body, input}) => {if (body.workflow_runs?.length === 0) body.workflow_runs.push(clone(input.runs[0]));}, 'PAGE_TRUNCATED'],
  ['duplicate run across pages', ({url, body, input}) => {if (body.workflow_runs && url.searchParams.get('page') === '2') body.workflow_runs[0] = clone(input.runs[0]);}, 'PAGE_DUPLICATE'],
  ['missing run ID', ({body}) => {if (body.workflow_runs?.length) delete body.workflow_runs[0].id;}, 'PAGE_INVALID'],
  ['PR instead of push', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].event = 'pull_request';}, 'RUN_PROVENANCE_MISMATCH'],
  ['wrong run SHA', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].head_sha = OTHER;}, 'RUN_PROVENANCE_MISMATCH'],
  ['foreign head repo', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].head_repository.id++;}, 'RUN_PROVENANCE_MISMATCH'],
  ['wrong run branch', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].head_branch = 'other';}, 'RUN_PROVENANCE_MISMATCH'],
  ['zero attempt', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].run_attempt = 0;}, 'RUN_PROVENANCE_MISMATCH'],
  ['wrong workflow path', ({body}) => {if (body.workflow_runs?.length) body.workflow_runs[0].path = '.github/workflows/forged.yml';}, 'RUN_PROVENANCE_MISMATCH'],
  ['run rerun before jobs', ({tail, body}) => {if (tail === '/actions/runs/101') body.run_attempt++;}, 'RUN_CHANGED'],
  ['wrong attempt metadata', ({tail, body}) => {if (tail === '/actions/runs/101/attempts/2') body.run_attempt++;}, 'RUN_CHANGED'],
  ['run changed after jobs', ({tail, count, body}) => {if (tail === '/actions/runs/101' && count === 2) body.status = 'queued';}, 'RUN_CHANGED'],
  ['rerun after complete run re-list', ({tail, count, body}) => {if (tail === '/actions/runs/101' && count === 3) body.run_attempt++;}, 'RUN_CHANGED'],
  ['new run state on second listing', ({tail, count, body}) => {if (tail === '/actions/runs' && count === 2 && body.workflow_runs.length) body.workflow_runs[0].conclusion = 'failure';}, 'RUN_SET_CHANGED'],
  ['job from wrong attempt', ({body}) => {if (body.jobs?.length) body.jobs[0].run_attempt++;}, 'JOB_PROVENANCE_MISMATCH'],
  ['job from wrong SHA', ({body}) => {if (body.jobs?.length) body.jobs[0].head_sha = OTHER;}, 'JOB_PROVENANCE_MISMATCH'],
  ['job from wrong run', ({body}) => {if (body.jobs?.length) body.jobs[0].run_id++;}, 'JOB_PROVENANCE_MISMATCH'],
  ['truncated job page', ({body}) => {if (body.jobs?.length) body.jobs.pop();}, 'PAGE_TRUNCATED'],
  ['changed job total', ({url, body}) => {if (body.jobs && url.searchParams.get('page') === '2') body.total_count++;}, 'PAGE_COUNT_CHANGED'],
  ['duplicate job IDs', ({body}) => {if (body.jobs?.length > 1) body.jobs[1].id = body.jobs[0].id;}, 'PAGE_DUPLICATE'],
  ['oversized jobs inventory', ({body}) => {if (body.jobs) body.total_count = 1000;}, 'PAGE_LIMIT'],
];
for (const [name, hook, code] of mutations) test(`blocks ${name}`, async () => blocked((await run(fixture(), hook)).result, code));
test('duplicate run numbers fail closed', async () => {const input = fixture(); input.runs[2].run_number = 2; blocked((await run(input)).result, 'RUN_ORDER_AMBIGUOUS');});
test('newer run appearing during jobs invalidates collected success', async () => {
  let added = false;
  const {result} = await run(fixture(), ({tail, input}) => {
    if (tail.endsWith('/jobs') && !added) {added = true; input.runs.push({...clone(input.runs[0]), id: 500, run_number: 3, status: 'queued', conclusion: null});}
  }); blocked(result, 'RUN_SET_CHANGED');
});
test('metadata display fields are neither trusted nor retained', async () => {
  const {result} = await run(fixture(), ({body}) => {body.actor = {login: 'SENSITIVE'}; body.url = 'https://evil.invalid/';});
  assert.equal(result.evaluation.status, 'PASS'); assert(!JSON.stringify(result).includes('SENSITIVE'));
});
test('job attempt field may be absent when the URL pins the attempt', async () => {
  const {result} = await run(fixture(), ({body}) => {body.jobs?.forEach(job => delete job.run_attempt);}); assert.equal(result.evaluation.status, 'PASS');
});
test('stale successful run is not made fresh by recent collection', async () => {
  const {result} = await run(fixture(), undefined, {now: () => NOW + 90000000});
  assert.equal(result.collection.status, 'COMPLETE'); assert.equal(result.evaluation.status, 'BLOCKED');
});
test('backwards clock fails closed', async () => {let t = NOW; blocked((await run(fixture(), undefined, {now: () => t--})).result, 'CLOCK_INVALID');});
test('overall duration is bounded', async () => {let t = NOW; blocked((await run(fixture(), undefined, {now: () => t += 500, maxDurationMs: 1000})).result, 'COLLECTION_TIMEOUT');});
test('hanging reader cannot leave a passing result', async () => {
  const input = fixture(), result = await collectReleaseEvidence(input.policy, SHA, {read: () => new Promise(() => {}), maxDurationMs: 20});
  blocked(result, 'COLLECTION_TIMEOUT');
});
test('unknown reader errors do not leak details', async () => {
  const input = fixture(), result = await collectReleaseEvidence(input.policy, SHA, {read: () => {throw Error('SECRET');}});
  blocked(result, 'COLLECTION_FAILED'); assert(!JSON.stringify(result).includes('SECRET'));
});
test('invalid input is refused before any request', async () => {
  for (const change of [p => {p.required = [];}, p => {p.repository = '../escape';}, p => {p.branch = '../escape';}]) {
    const input = fixture(); change(input.policy); let calls = 0;
    const result = await collectReleaseEvidence(input.policy, SHA, {read: () => {calls++;}});
    blocked(result, 'INVALID_POLICY_OR_TARGET'); assert.equal(calls, 0);
  }
});

const response = (body = {}, init = {}) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}, ...init});
function reader(fetchImpl, options = {}) {return createGitHubReader({repository: REPO, token: 'TEST_TOKEN_NEVER_LOG', fetchImpl, ...options});}
test('real transport is GET only, same origin, nonredirecting, authenticated and uncached', async () => {
  const read = reader(async (url, options) => {
    assert.equal(url, `https://api.github.com${BASE}`); assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer TEST_TOKEN_NEVER_LOG'); return response({ok: true});
  }); assert.deepEqual(await read(BASE), {ok: true});
});
test('reader accepts branch and exact attempt endpoints', async () => {
  const read = reader(async () => response({ok: true}));
  for (const path of [`${BASE}/git/ref/heads/main`, `${BASE}/actions/runs/10`, `${BASE}/actions/runs/10/attempts/2`,
    `${BASE}/actions/runs/10/attempts/2/jobs?per_page=100&page=1`, `${BASE}/actions/runs?head_sha=${SHA}&branch=main&event=push&per_page=100&page=1`]) assert.equal((await read(path)).ok, true);
});
for (const path of ['https://evil.invalid/', '//evil.invalid/', `${BASE}/actions/runs/1/rerun`, `${BASE}/actions/runs/1/jobs`,
  `${BASE}/actions/runs?head_sha=${SHA}&branch=main&event=push&status=success&per_page=100&page=1`,
  `${BASE}/git/ref/heads/../secrets`, `${BASE}/actions/runs/1/attempts/1/jobs?per_page=100&page=1&page=2`,
  `${BASE}/actions/runs/1/attempts/1/jobs?per_page=101&page=1`, `${BASE}/actions/runs/1/attempts/1/jobs?per_page=100&page=0`]) {
  test(`reader refuses unsafe route ${path}`, async () => {
    let calls = 0; const read = reader(async () => {calls++; return response();});
    await assert.rejects(read(path), error => error.code === 'UNSAFE_ENDPOINT'); assert.equal(calls, 0);
  });
}
for (const status of [301, 302, 400, 401, 403, 404, 429, 500]) test(`HTTP ${status} fails without exposing body`, async () => {
  const read = reader(async () => response({secret: 'SECRET'}, {status}));
  await assert.rejects(read(BASE), error => /^API_/.test(error.code) && !error.message.includes('SECRET'));
});
test('response redirect flag is refused', async () => {
  const read = reader(async () => {const value = response(); Object.defineProperty(value, 'redirected', {value: true}); return value;});
  await assert.rejects(read(BASE), error => error.code === 'API_RESPONSE_INVALID');
});
test('non-JSON content fails closed', async () => {
  await assert.rejects(reader(async () => new Response('SECRET'))(BASE), error => error.code === 'API_RESPONSE_INVALID');
});
test('malformed JSON fails closed', async () => {
  await assert.rejects(reader(async () => new Response('SECRET', {headers: {'content-type': 'application/json'}}))(BASE), error => error.code === 'API_RESPONSE_INVALID');
});
test('declared oversized response is refused', async () => {
  await assert.rejects(reader(async () => response({}, {headers: {'content-type': 'application/json', 'content-length': '99999999'}}))(BASE), error => error.code === 'API_RESPONSE_TOO_LARGE');
});
test('streamed oversized response is bounded without content-length', async () => {
  await assert.rejects(reader(async () => response('x'.repeat(2 * 1024 * 1024)))(BASE), error => error.code === 'API_RESPONSE_TOO_LARGE');
});
test('hanging fetch is bounded', async () => {
  await assert.rejects(reader(() => new Promise(() => {}), {timeoutMs: 20})(BASE), error => error.code === 'REQUEST_TIMEOUT');
});
test('hanging response body is bounded', async () => {
  const read = reader(async () => new Response(new ReadableStream({start() {}}), {headers: {'content-type': 'application/json'}}), {timeoutMs: 20});
  await assert.rejects(read(BASE), error => error.code === 'REQUEST_TIMEOUT');
});
test('token and transport error details never leak', async () => {
  await assert.rejects(reader(() => {throw Error('TEST_TOKEN_NEVER_LOG');})(BASE), error => error.code === 'API_RESPONSE_INVALID' && !error.message.includes('TEST_TOKEN'));
  for (const token of ['', undefined, 'token\nheader']) assert.throws(() => reader(async () => response(), {token}), error => error.code === 'AUTH_REQUIRED');
});
test('opaque stateless installation tokens with dots and variable length reach the same-origin GET', async () => {
  for (const token of ['ghs_123_' + 'a'.repeat(600) + '.payload.signature', 'opaque-' + 'b'.repeat(5000) + '._~+/=']) {
    let calls = 0;
    const read = reader(async (url, options) => {
      calls++; assert.equal(url, `https://api.github.com${BASE}`);
      assert.equal(options.headers.Authorization, `Bearer ${token}`); return response({ok: true});
    }, {token});
    assert.equal((await read(BASE)).ok, true); assert.equal(calls, 1);
  }
});
test('opaque token validation still refuses whitespace, controls and header injection', () => {
  for (const token of ['bad token', 'bad\ttoken', 'bad\rtoken', 'bad\u0000token', 'bad\u007ftoken'])
    assert.throws(() => reader(async () => response(), {token}), error => error.code === 'AUTH_REQUIRED');
});
const script = fileURLToPath(new URL('./a02-release-collector.mjs', import.meta.url));
test('CLI invalid arguments and symlink invocation return sanitized nonzero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hl-collector-'));
  try {
    const alias = join(dir, 'alias.mjs'); symlinkSync(script, alias);
    for (const target of [script, alias]) {
      const child = spawnSync(process.execPath, [target], {encoding: 'utf8', timeout: 5000});
      assert.equal(child.status, 2); assert.equal(child.stderr, ''); assert.equal(JSON.parse(child.stdout).productionAuthorized, false);
    }
    const policy = join(dir, 'policy.json'); writeFileSync(policy, JSON.stringify(fixture().policy));
    const child = spawnSync(process.execPath, [script, policy, SHA], {encoding: 'utf8', timeout: 5000, env: {...process.env, GITHUB_TOKEN: ''}});
    assert.equal(child.status, 2); assert.equal(child.stderr, '');
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('collector retains only required step evidence and rejects a skipped critical step in a green job', async()=>{
  const input=fixture();input.policy.required[0].criticalSteps={build:['Native build']};
  input.jobs[101][0].steps=[
    {number:1,name:'Native build',status:'completed',conclusion:'skipped',command:'SECRET_NOT_RETAINED'},
    {number:2,name:'SECRET_NOT_RETAINED',status:'completed',conclusion:'success'},
  ];
  const {result}=await run(input);
  assert.equal(result.collection.status,'COMPLETE');assert.equal(result.evaluation.status,'BLOCKED');
  assert.deepEqual(result.snapshot.jobs[101].jobs[0].steps,[{number:1,name:'Native build',status:'completed',conclusion:'skipped'}]);
  assert(!JSON.stringify(result).includes('SECRET_NOT_RETAINED'));
  input.jobs[101][0].steps[0].conclusion='success';
  assert.equal((await run(input)).result.evaluation.status,'PASS');
});
test('collector rejects missing critical steps and invalid critical policy before requests',async()=>{
  const input=fixture();input.policy.required[0].criticalSteps={build:['Native build']};
  assert.equal((await run(input)).result.evaluation.status,'BLOCKED');
  input.policy.required[0].criticalSteps={unknown:['Native build']};
  const {result,service}=await run(input);blocked(result,'INVALID_POLICY_OR_TARGET');assert.equal(service.calls.length,0);
});
