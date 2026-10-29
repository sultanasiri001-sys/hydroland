import assert from 'node:assert/strict';
import {test} from 'node:test';
import {collectReleaseEvidence} from './a02-release-collector.mjs';

// Observed main run40576158199: run.updated_at=20:14:52Z, attempt.updated_at=20:14:53Z.
// Identity/status still match. Compare each endpoint to itself, not metadata clocks to each other.
const SHA = 'a'.repeat(40), repo = {id: 1, full_name: 'owner/repo'};
const NOW = Date.parse('2026-10-28T18:00:00Z');
const policy = {schemaVersion: 1, repository: repo.full_name, repositoryId: 1, branch: 'main', event: 'push',
  maxSnapshotAgeMs: 300000, maxRunAgeMs: 86400000,
  required: [{workflowId: 2, path: '.github/workflows/test.yml', jobs: ['build']}]};
async function exercise(change = () => {}) {
  const run = {id: 3, workflow_id: 2, path: '.github/workflows/test.yml', head_sha: SHA, head_branch: 'main', event: 'push',
    run_number: 1, run_attempt: 1, repository: repo, head_repository: repo, status: 'completed', conclusion: 'success',
    created_at: '2026-10-28T17:00:00Z', updated_at: '2026-10-28T17:10:00Z'};
  let attempts = 0, current = 0;
  const result = await collectReleaseEvidence(policy, SHA, {now: () => NOW, read: async path => {
    const url = new URL(path, 'https://api.github.com'), page = Number(url.searchParams.get('page'));
    if (url.pathname === '/repos/owner/repo') return repo;
    if (path.endsWith('/git/ref/heads/main')) return {ref: 'refs/heads/main', object: {type: 'commit', sha: SHA}};
    if (url.pathname.endsWith('/actions/runs')) return {total_count: 1, workflow_runs: page === 1 ? [structuredClone(run)] : []};
    if (url.pathname.endsWith('/jobs')) return {total_count: 1, jobs: page === 1 ? [{id: 4, run_id: 3, head_sha: SHA,
      name: 'build', status: 'completed', conclusion: 'success', started_at: '2026-10-28T17:01:00Z', completed_at: '2026-10-28T17:09:00Z'}] : []};
    const body = structuredClone(run), attempt = path.endsWith('/attempts/1');
    if (attempt) {attempts++; body.updated_at = '2026-10-28T17:10:01Z';} else current++;
    change({body, attempt, attempts, current}); return body;
  }});
  return {result, attempts};
}
test('independent stable run/attempt timestamps pass with three attempt reads', async () => {
  const {result, attempts} = await exercise();
  assert.equal(result.collection.status, 'COMPLETE'); assert.equal(result.evaluation.status, 'PASS');
  assert.equal(attempts, 3); assert.equal(result.snapshot.workflow_runs[0].updated_at, '2026-10-28T17:10:00Z');
});
for (const [label, change] of [
  ['attempt update during jobs', ({body, attempt, attempts}) => {if (attempt && attempts === 2) body.updated_at = '2026-10-28T17:10:02Z';}],
  ['attempt update during final revalidation', ({body, attempt, attempts}) => {if (attempt && attempts === 3) body.updated_at = '2026-10-28T17:10:02Z';}],
  ['current run update is not relaxed', ({body, attempt, current}) => {if (!attempt && current === 2) body.updated_at = '2026-10-28T17:10:01Z';}],
  ['future attempt clock', ({body, attempt}) => {if (attempt) body.updated_at = '2026-10-29T17:10:00Z';}],
  ['malformed attempt timestamp', ({body, attempt}) => {if (attempt) body.updated_at = 'SECRET_NOT_A_DATE';}],
]) test(`independent endpoint pinning blocks ${label}`, async () => {
  const {result} = await exercise(change);
  assert.equal(result.collection.status, 'BLOCKED'); assert.equal(result.snapshot, null);
  assert.deepEqual(result.collection.reasons, ['RUN_CHANGED']); assert(!JSON.stringify(result).includes('SECRET_NOT_A_DATE'));
});
