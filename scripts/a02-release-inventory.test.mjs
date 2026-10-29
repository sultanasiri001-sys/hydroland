import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {expandedJobNames, validateReleaseInventory} from './a02-release-inventory.mjs';
import {evaluateReleaseEvidence} from './a02-release-evidence.mjs';
// js-yaml is supplied by the existing locked API build tooling; no new dependency.
const yaml = createRequire(import.meta.url)('js-yaml');
const root = new URL('../', import.meta.url);
const inventory = JSON.parse(readFileSync(new URL('scripts/a02-release-inventory.json', root)));
const sources = Object.fromEntries(readdirSync(new URL('.github/workflows/', root)).filter(f => /\.ya?ml$/.test(f)).map(f => {
  const path = `.github/workflows/${f}`;
  return [path, yaml.load(readFileSync(new URL(path, root), 'utf8'))];
}));
const first = inventory.policy.required[0].path;
const copy = x => structuredClone(x);

test('every source workflow classified; proposed gates have unconditional main coverage and exact jobs', () => {
  assert.deepEqual(validateReleaseInventory(inventory, sources), {status:'PASS', productionAuthorized:false, scope:'PROPOSED_SOURCE_CONTRACT', errors:[]});
});
const mutations = [
  ['absent push', w => {delete w.on.push;}],
  ['paths filter', w => {w.on.push.paths = ['apps/web/**'];}],
  ['paths-ignore filter', w => {w.on.push['paths-ignore'] = ['docs/**'];}],
  ['wrong branch', w => {w.on.push.branches = ['feature'];}],
  ['negated main', w => {w.on.push.branches.push('!main');}],
  ['tag-only push', w => {w.on.push = {tags:['v*']};}],
  ['conditional job', w => {Object.values(w.jobs)[0].if = 'false';}],
  ['optional job', w => {Object.values(w.jobs)[0]['continue-on-error'] = true;}],
  ['renamed job', w => {Object.values(w.jobs)[0].name = 'other';}],
  ['extra unchecked job', w => {w.jobs.unreviewed = {'runs-on':'ubuntu-latest',steps:[]};}],
];
for (const [name, mutate] of mutations) test(`source contract blocks ${name}`, () => {
  const workflows=copy(sources); mutate(workflows[first]);
  assert.equal(validateReleaseInventory(inventory, workflows).status, 'BLOCKED');
});
for (const [name, mutate] of [
  ['new unclassified workflow', w => {w['.github/workflows/new.yml'] = {};}],
  ['deleted workflow', w => {delete w[first];}],
]) test(name, () => {const w=copy(sources); mutate(w); assert.equal(validateReleaseInventory(inventory,w).status,'BLOCKED');});
test('omitting a required rule or duplicate workflow ID blocks', () => {
  let i=copy(inventory); i.policy.required.pop(); assert.equal(validateReleaseInventory(i,sources).status,'BLOCKED');
  i=copy(inventory); i.policy.required[1].workflowId=i.policy.required[0].workflowId; assert.equal(validateReleaseInventory(i,sources).status,'BLOCKED');
});
test('calendar and offline session matrices expand to all five distinct names', () => {
  assert.deepEqual(expandedJobNames(sources['.github/workflows/calendar-training-availability-validation.yml']), ['availability (UTC)','availability (Asia/Riyadh)','availability (America/New_York)']);
  assert.deepEqual(expandedJobNames(sources['.github/workflows/offline-trip-authorization.yml']), ['Private offline reads (timestamp)','Private offline reads (timestamptz)']);
});
for (const job of [
  {strategy:{matrix:'${{ fromJSON(needs.plan.outputs.matrix) }}'}},
  {strategy:{matrix:{os:['linux'],include:[{os:'mac'}]}}},
  {strategy:{matrix:{os:['linux'],exclude:[{os:'linux'}]}}},
  {strategy:{matrix:{os:['linux','linux']}}},
  {name:'${{ needs.plan.outputs.name }}'},
  {name:'${{ matrix.unknown }}',strategy:{matrix:{os:['linux']}}},
]) test(`unsupported matrix/name fails closed: ${JSON.stringify(job)}`, () => assert.throws(() => expandedJobNames({jobs:{check:job}})));
test('independent mobile and mutation workflows cannot silently enter the proposed required set', () => {
  for (const entry of inventory.workflows.filter(w => ['mutating','independent-mobile'].includes(w.disposition))) {
    assert(!inventory.policy.required.some(r => r.path === entry.path));
    const i=copy(inventory); i.policy.required.push({path:entry.path,workflowId:999,jobs:['fake']});
    assert.equal(validateReleaseInventory(i,sources).status,'BLOCKED');
  }
});

const SHA='a'.repeat(40), NOW=Date.parse('2026-10-29T10:00:00Z');
const iso=n=>new Date(n).toISOString();
function evidence() {
  const p=inventory.policy;
  const e={schemaVersion:1,complete:true,repository:p.repository,repositoryId:p.repositoryId,branch:'main',headBefore:SHA,headAfter:SHA,capturedAt:iso(NOW),total_count:p.required.length,workflow_runs:[],jobs:{}};
  for (const [index,r] of p.required.entries()) {
    const id=index+100, repository={id:p.repositoryId,full_name:p.repository};
    e.workflow_runs.push({id,workflow_id:r.workflowId,path:r.path,head_sha:SHA,head_branch:'main',event:'push',run_number:1,run_attempt:1,repository,head_repository:repository,status:'completed',conclusion:'success',created_at:iso(NOW-120000),updated_at:iso(NOW-60000)});
    e.jobs[id]={complete:true,runId:id,runAttempt:1,total_count:r.jobs.length,jobs:r.jobs.map((name,j)=>({id:id*100+j,run_id:id,head_sha:SHA,name,status:'completed',conclusion:'success',started_at:iso(NOW-110000),completed_at:iso(NOW-61000)}))};
  }
  return e;
}
const evaluate=e=>evaluateReleaseEvidence(inventory.policy,e,SHA,NOW);
test('complete synthetic inventory evidence passes without production authorization',()=>{
  const result=evaluate(evidence()); assert.equal(result.status,'PASS'); assert.equal(result.productionAuthorized,false); assert.equal(result.gates.length,24);
});
for (const [index,rule] of inventory.policy.required.entries()) {
  test(`missing workflow blocks: ${rule.path}`,()=>{const e=evidence();e.workflow_runs.splice(index,1);e.total_count--;assert.equal(evaluate(e).status,'BLOCKED');});
  for (const name of rule.jobs) test(`wrong required job blocks: ${rule.path} / ${name}`,()=>{
    const e=evidence();e.jobs[index+100].jobs.find(j=>j.name===name).name='unrelated';assert.equal(evaluate(e).status,'BLOCKED');
  });
}
test('successful PR or path-filtered missing main run cannot substitute for main evidence',()=>{
  const e=evidence();e.workflow_runs[0].event='pull_request';assert.equal(evaluate(e).status,'BLOCKED');
});
test('skipped matrix leg blocks despite successful workflow',()=>{
  const e=evidence(), index=inventory.policy.required.findIndex(r=>r.path.includes('calendar-training'));
  e.jobs[index+100].jobs[1].conclusion='skipped';assert.equal(evaluate(e).status,'BLOCKED');
});
