import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateReleaseEvidence} from './a02-release-evidence.mjs';

const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40), NOW = Date.parse('2026-10-28T16:00:00.000Z');
const iso = value => new Date(value).toISOString();
const clone = value => structuredClone(value);
function fixture(now = NOW) {
  const policy = {schemaVersion: 1, repository: 'sultanasiri001-sys/hydroland', repositoryId: 1366555943,
    branch: 'main', event: 'push', maxSnapshotAgeMs: 300000, maxRunAgeMs: 86400000,
    required: [
      {workflowId: 357149799, path: '.github/workflows/api-validation.yml', jobs: ['build']},
      {workflowId: 362196381, path: '.github/workflows/production-release-gate.yml', jobs: ['production-readiness']},
    ]};
  const evidence = {schemaVersion: 1, complete: true, repository: policy.repository, repositoryId: policy.repositoryId,
    branch: 'main', headBefore: SHA, headAfter: SHA, capturedAt: iso(now), total_count: 2, workflow_runs: [], jobs: {}};
  for (const [index, rule] of policy.required.entries()) {
    const id = 100 + index;
    evidence.workflow_runs.push({id, workflow_id: rule.workflowId, path: rule.path,
      head_sha: SHA, head_branch: 'main', event: 'push', run_number: 1, run_attempt: 1,
      repository: {id: policy.repositoryId, full_name: policy.repository},
      head_repository: {id: policy.repositoryId, full_name: policy.repository},
      status: 'completed', conclusion: 'success', created_at: iso(now - 120000), updated_at: iso(now - 60000)});
    evidence.jobs[id] = {complete: true, runId: id, runAttempt: 1, total_count: 1,
      jobs: [{id: id * 10, run_id: id, head_sha: SHA, name: rule.jobs[0], status: 'completed', conclusion: 'success',
        started_at: iso(now - 110000), completed_at: iso(now - 61000)}]};
  }
  return {policy, evidence};
}
function check({policy, evidence}, now = NOW, target = SHA) {return evaluateReleaseEvidence(policy, evidence, target, now);}
function rejects(change, code) {
  const input = fixture(); change(input);
  const result = check(input);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.productionAuthorized, false);
  assert(JSON.stringify(result).includes(code), `${code}: ${JSON.stringify(result)}`);
}

test('complete exact deployment-branch evidence passes without authorizing production', () => {
  const result = check(fixture());
  assert.equal(result.status, 'PASS'); assert.equal(result.gates.length, 2);
  assert.equal(result.productionAuthorized, false); assert.equal(result.scope, 'CI_EVIDENCE_ONLY');
});

const mutations = [
  ['zero mandatory workflows', ({policy}) => {policy.required = [];}, 'INVALID_POLICY'],
  ['duplicate policy identity', ({policy}) => {policy.required.push(clone(policy.required[0]));}, 'INVALID_POLICY'],
  ['empty required jobs', ({policy}) => {policy.required[0].jobs = [];}, 'INVALID_POLICY'],
  ['duplicate required job', ({policy}) => {policy.required[0].jobs.push('build');}, 'INVALID_POLICY'],
  ['unsafe workflow path', ({policy}) => {policy.required[0].path = '../../secret';}, 'INVALID_POLICY'],
  ['pull-request policy', ({policy}) => {policy.event = 'pull_request';}, 'INVALID_POLICY'],
  ['unbounded snapshot lifetime', ({policy}) => {policy.maxSnapshotAgeMs = 300001;}, 'INVALID_POLICY'],
  ['unbounded run lifetime', ({policy}) => {policy.maxRunAgeMs = 86400001;}, 'INVALID_POLICY'],
  ['empty snapshot', ({evidence}) => {evidence.workflow_runs = []; evidence.total_count = 0;}, 'MISSING_DEPLOYMENT_RUN'],
  ['explicitly incomplete snapshot', ({evidence}) => {evidence.complete = false;}, 'INCOMPLETE_SNAPSHOT'],
  ['truncated run pagination', ({evidence}) => {evidence.total_count++;}, 'INCOMPLETE_OR_DUPLICATE_RUNS'],
  ['duplicate run ID', ({evidence}) => {evidence.workflow_runs.push(clone(evidence.workflow_runs[0])); evidence.total_count++;}, 'INCOMPLETE_OR_DUPLICATE_RUNS'],
  ['stale snapshot', ({evidence}) => {evidence.capturedAt = iso(NOW - 300001);}, 'SNAPSHOT_NOT_FRESH'],
  ['future snapshot', ({evidence}) => {evidence.capturedAt = iso(NOW + 1);}, 'SNAPSHOT_NOT_FRESH'],
  ['unparseable timestamp', ({evidence}) => {evidence.capturedAt = 'yesterday';}, 'SNAPSHOT_NOT_FRESH'],
  ['head moved during collection', ({evidence}) => {evidence.headAfter = OTHER;}, 'DEPLOYMENT_HEAD_CHANGED'],
  ['wrong initial head', ({evidence}) => {evidence.headBefore = OTHER;}, 'DEPLOYMENT_HEAD_CHANGED'],
  ['foreign repository envelope', ({evidence}) => {evidence.repository = 'foreign/hydroland';}, 'INVALID_OR_INCOMPLETE'],
  ['foreign numeric repository identity', ({evidence}) => {evidence.repositoryId++;}, 'INVALID_OR_INCOMPLETE'],
  ['different source commit', ({evidence}) => {evidence.workflow_runs[0].head_sha = OTHER;}, 'MISSING_DEPLOYMENT_RUN'],
  ['PR success cannot authorize push', ({evidence}) => {evidence.workflow_runs[0].event = 'pull_request';}, 'MISSING_DEPLOYMENT_RUN'],
  ['manual dispatch not approved by push policy', ({evidence}) => {evidence.workflow_runs[0].event = 'workflow_dispatch';}, 'MISSING_DEPLOYMENT_RUN'],
  ['wrong branch', ({evidence}) => {evidence.workflow_runs[0].head_branch = 'feature';}, 'MISSING_DEPLOYMENT_RUN'],
  ['wrong workflow ID with same path', ({evidence}) => {evidence.workflow_runs[0].workflow_id++;}, 'WORKFLOW_OR_REPOSITORY'],
  ['wrong path with same workflow ID', ({evidence}) => {evidence.workflow_runs[0].path = '.github/workflows/forged.yml';}, 'WORKFLOW_OR_REPOSITORY'],
  ['foreign head repository', ({evidence}) => {evidence.workflow_runs[0].head_repository.id++;}, 'WORKFLOW_OR_REPOSITORY'],
  ['foreign run repository', ({evidence}) => {evidence.workflow_runs[0].repository.full_name = 'foreign/hydroland';}, 'WORKFLOW_OR_REPOSITORY'],
  ['missing attempt', ({evidence}) => {delete evidence.workflow_runs[0].run_attempt;}, 'AMBIGUOUS_RUN_ORDER'],
  ['missing run sequence', ({evidence}) => {delete evidence.workflow_runs[0].run_number;}, 'AMBIGUOUS_RUN_ORDER'],
  ['future run update', ({evidence}) => {evidence.workflow_runs[0].updated_at = iso(NOW + 1);}, 'RUN_NOT_FRESH'],
  ['stale run', ({evidence}) => {evidence.workflow_runs[0].created_at = iso(NOW - 100000000); evidence.workflow_runs[0].updated_at = iso(NOW - 86400001);}, 'RUN_NOT_FRESH'],
  ['missing jobs', ({evidence}) => {delete evidence.jobs[100];}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['empty job list', ({evidence}) => {evidence.jobs[100].jobs = []; evidence.jobs[100].total_count = 0;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['truncated job pagination', ({evidence}) => {evidence.jobs[100].total_count++;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['incomplete jobs flag', ({evidence}) => {evidence.jobs[100].complete = false;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['old attempt jobs', ({evidence}) => {evidence.workflow_runs[0].run_attempt = 2;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['wrong job run envelope', ({evidence}) => {evidence.jobs[100].runId++;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['wrong job commit', ({evidence}) => {evidence.jobs[100].jobs[0].head_sha = OTHER;}, 'JOB_PROVENANCE'],
  ['wrong job run', ({evidence}) => {evidence.jobs[100].jobs[0].run_id++;}, 'JOB_PROVENANCE'],
  ['missing required job name', ({evidence}) => {evidence.jobs[100].jobs[0].name = 'unrelated';}, 'MISSING_OR_DUPLICATE_REQUIRED'],
  ['duplicate required job name', ({evidence}) => {const job = clone(evidence.jobs[100].jobs[0]); job.id++; evidence.jobs[100].jobs.push(job); evidence.jobs[100].total_count++;}, 'MISSING_OR_DUPLICATE_REQUIRED'],
  ['duplicate job ID', ({evidence}) => {evidence.jobs[100].jobs.push(clone(evidence.jobs[100].jobs[0])); evidence.jobs[100].total_count++;}, 'INCOMPLETE_OR_WRONG_ATTEMPT'],
  ['missing job completion time', ({evidence}) => {delete evidence.jobs[100].jobs[0].completed_at;}, 'INVALID_JOB_TIMING'],
  ['reversed job timing', ({evidence}) => {evidence.jobs[100].jobs[0].started_at = iso(NOW);}, 'INVALID_JOB_TIMING'],
];
for (const [name, mutate, code] of mutations) test(`blocks ${name}`, () => rejects(mutate, code));
for (const conclusion of ['failure', 'neutral', 'skipped', 'cancelled', 'timed_out', 'action_required', 'stale', null]) {
  test(`blocks workflow conclusion ${conclusion}`, () => rejects(({evidence}) => {evidence.workflow_runs[0].conclusion = conclusion;}, 'RUN_NOT_SUCCESS'));
  test(`blocks job conclusion ${conclusion}`, () => rejects(({evidence}) => {evidence.jobs[100].jobs[0].conclusion = conclusion;}, 'JOB_NOT_SUCCESS'));
}
for (const status of ['queued', 'in_progress', 'waiting', 'requested']) {
  test(`blocks ${status} workflow even with success field`, () => rejects(({evidence}) => {evidence.workflow_runs[0].status = status;}, 'RUN_NOT_SUCCESS'));
}
for (const status of ['failure', 'in_progress']) test(`newer ${status} cannot be hidden by old success`, () => {
  const input = fixture(), next = clone(input.evidence.workflow_runs[0]);
  next.id = 200; next.run_number = 2;
  if (status === 'failure') next.conclusion = status; else next.status = status;
  input.evidence.workflow_runs.push(next); input.evidence.total_count++;
  input.evidence.jobs[200] = clone(input.evidence.jobs[100]); input.evidence.jobs[200].runId = 200;
  input.evidence.jobs[200].jobs[0].run_id = 200;
  assert.equal(check(input).status, 'BLOCKED'); assert.equal(check(input).gates[0].runId, 200);
});
test('newer success supersedes old failure independent of array order', () => {
  const input = fixture(), old = clone(input.evidence.workflow_runs[0]);
  old.id = 90; old.run_number = 1; old.conclusion = 'failure';
  input.evidence.workflow_runs[0].run_number = 2;
  input.evidence.workflow_runs.push(old); input.evidence.total_count++;
  assert.equal(check(input).status, 'PASS'); input.evidence.workflow_runs.reverse();
  assert.equal(check(input).status, 'PASS');
});
test('same sequence in two run IDs is ambiguous rather than cherry-picked', () => {
  const input = fixture(), duplicate = clone(input.evidence.workflow_runs[0]); duplicate.id = 999;
  input.evidence.workflow_runs.push(duplicate); input.evidence.total_count++;
  assert.equal(check(input).gates[0].reasons[0], 'AMBIGUOUS_RUN_ORDER');
});
test('frozen source evidence remains unmodified', () => {
  const input = fixture(), before = JSON.stringify(input);
  const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}};
  freeze(input); assert.equal(check(input).status, 'PASS'); assert.equal(JSON.stringify(input), before);
});
test('malformed target, clock and missing inputs fail closed', () => {
  const input = fixture();
  for (const target of ['', 'main', 'a'.repeat(39), SHA.toUpperCase(), null]) assert.equal(check(input, NOW, target).status, 'BLOCKED');
  assert.equal(check(input, NaN).status, 'BLOCKED'); assert.equal(evaluateReleaseEvidence(null, null, SHA).status, 'BLOCKED');
});

const script = fileURLToPath(new URL('./a02-release-evidence.mjs', import.meta.url));
function withFiles(callback) {
  const dir = mkdtempSync(join(tmpdir(), 'hydroland-release-contract-'));
  try {
    const input = fixture(Date.now()), policy = join(dir, 'policy.json'), snapshot = join(dir, 'snapshot.json');
    writeFileSync(policy, JSON.stringify(input.policy)); writeFileSync(snapshot, JSON.stringify(input.evidence));
    callback({dir, input, policy, snapshot});
  } finally {rmSync(dir, {recursive: true, force: true});}
}
function cli(args) {return spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 5000});}
test('CLI positive fixture returns zero but never deployment approval', () => withFiles(({policy, snapshot}) => {
  const output = cli([script, policy, snapshot, SHA]); assert.equal(output.status, 0);
  assert.equal(JSON.parse(output.stdout).productionAuthorized, false);
}));
test('CLI missing mandatory evidence returns one, not a successful empty result', () => withFiles(({input, policy, snapshot}) => {
  input.evidence.workflow_runs = []; input.evidence.total_count = 0; writeFileSync(snapshot, JSON.stringify(input.evidence));
  const output = cli([script, policy, snapshot, SHA]); assert.equal(output.status, 1); assert.equal(JSON.parse(output.stdout).status, 'BLOCKED');
}));
test('CLI malformed input returns two without echoing private content', () => withFiles(({policy, snapshot}) => {
  writeFileSync(snapshot, 'SECRET_MUST_NOT_APPEAR');
  const output = cli([script, policy, snapshot, SHA]); assert.equal(output.status, 2);
  assert(!output.stdout.includes('SECRET_MUST_NOT_APPEAR')); assert.equal(output.stderr, '');
}));
test('CLI wrong arguments fail closed', () => {const output = cli([script]); assert.equal(output.status, 2);});
test('CLI invoked through a symlink still evaluates and blocks missing evidence', () => withFiles(({dir, input, policy, snapshot}) => {
  const alias = join(dir, 'alias.mjs'); symlinkSync(script, alias);
  input.evidence.total_count = 0; input.evidence.workflow_runs = []; writeFileSync(snapshot, JSON.stringify(input.evidence));
  const output = cli([alias, policy, snapshot, SHA]); assert.equal(output.status, 1);
}));

function criticalFixture() {
  const input=fixture(); input.policy.required[0].criticalSteps={build:['Native build','Runtime query']};
  input.evidence.jobs[100].jobs[0].steps=[
    {number:1,name:'Native build',status:'completed',conclusion:'success'},
    {number:2,name:'Runtime query',status:'completed',conclusion:'success'},
    {number:3,name:'Failure-only diagnostics',status:'completed',conclusion:'skipped'},
  ];
  return input;
}
test('critical steps pass while noncritical failure-only diagnostics may be skipped',()=>assert.equal(check(criticalFixture()).status,'PASS'));
for (const [name, mutate] of [
  ['missing steps', i=>{delete i.evidence.jobs[100].jobs[0].steps;}],
  ['empty steps', i=>{i.evidence.jobs[100].jobs[0].steps=[];}],
  ['missing critical step', i=>{i.evidence.jobs[100].jobs[0].steps.shift();}],
  ['duplicate critical name', i=>{i.evidence.jobs[100].jobs[0].steps.push({number:4,name:'Native build',status:'completed',conclusion:'success'});}],
  ['duplicate number', i=>{i.evidence.jobs[100].jobs[0].steps[1].number=1;}],
  ['invalid number', i=>{i.evidence.jobs[100].jobs[0].steps[0].number=0;}],
  ['pending step', i=>{i.evidence.jobs[100].jobs[0].steps[0].status='in_progress';}],
  ['wrong critical job in policy', i=>{i.policy.required[0].criticalSteps={other:['Build']};}],
  ['empty critical policy', i=>{i.policy.required[0].criticalSteps={};}],
  ['empty critical names', i=>{i.policy.required[0].criticalSteps={build:[]};}],
  ['duplicate policy name', i=>{i.policy.required[0].criticalSteps.build.push('Native build');}],
  ['array critical policy', i=>{i.policy.required[0].criticalSteps=[];}],
]) test(`critical-step contract blocks ${name}`,()=>{const i=criticalFixture();mutate(i);assert.equal(check(i).status,'BLOCKED');});
for(const conclusion of ['skipped','neutral','failure','cancelled','timed_out',null]) test(`green job cannot hide critical-step ${conclusion}`,()=>{
  const i=criticalFixture();i.evidence.jobs[100].jobs[0].steps[0].conclusion=conclusion;assert.equal(check(i).status,'BLOCKED');
});
