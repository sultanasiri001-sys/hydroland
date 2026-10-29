import assert from 'node:assert/strict';
import {createGitHubReader, collectReleaseEvidence, summarizeCollection} from './a02-release-collector.mjs';

// Read-only integration PROBE, not a complete/approved production release policy.
// No target override, deployment, database access, account data or provider call.
const repository = 'sultanasiri001-sys/hydroland';
const policy = {schemaVersion: 1, repository, repositoryId: 1366555943, branch: 'main', event: 'push',
  maxSnapshotAgeMs: 300000, maxRunAgeMs: 86400000,
  required: [
    {workflowId: 357149799, path: '.github/workflows/api-validation.yml', jobs: ['build']},
    {workflowId: 362196381, path: '.github/workflows/production-release-gate.yml', jobs: ['production-readiness']},
  ]};
try {
  const read = createGitHubReader({repository, token: process.env.GITHUB_TOKEN});
  const ref = await read(`/repos/${repository}/git/ref/heads/main`);
  const result = await collectReleaseEvidence(policy, ref?.object?.sha, {read, pageSize: 2});
  // Stale/missing/failed evidence MUST stay BLOCKED; that isn't a collector fault.
  // A collection failure or race, however, must fail this probe without retries.
  console.log(JSON.stringify({probe: 'READ_ONLY_MAIN_TWO_WORKFLOW_SAMPLE', approvedProductionPolicy: false,
    ...summarizeCollection(result), observedRunCount: result.snapshot?.total_count ?? null,
    observedJobCount: result.snapshot ? Object.values(result.snapshot.jobs).reduce((n, row) => n + row.total_count, 0) : null}, null, 2));
  assert.equal(result.collection.status, 'COMPLETE');
  assert.equal(result.evaluation.productionAuthorized, false);
  assert(['PASS', 'BLOCKED'].includes(result.evaluation.status));
} catch (error) {
  const reason = ['AUTH_REQUIRED', 'UNSAFE_ENDPOINT', 'API_HTTP_ERROR', 'API_RESPONSE_INVALID',
    'API_ACCESS_OR_RATE_LIMIT', 'API_RESOURCE_UNAVAILABLE', 'REQUEST_TIMEOUT'].includes(error?.code) ? error.code : 'LIVE_PROBE_FAILED';
  console.log(JSON.stringify({probe: 'READ_ONLY_MAIN_TWO_WORKFLOW_SAMPLE', status: 'BLOCKED',
    productionAuthorized: false, reasons: [reason]}));
  process.exitCode = 1;
}
