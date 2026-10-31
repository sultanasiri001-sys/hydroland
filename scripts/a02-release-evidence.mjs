import {readFile, stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Pure, offline evidence contract. A PASS is never deployment authorization.
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = values => new Set(values).size === values.length;
const timestamp = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value), canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical ? parsed : NaN;
};
const text = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 160;

function validPolicy(policy) {
  if (!object(policy) || policy.schemaVersion !== 1
      || typeof policy.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy.repository)
      || !integer(policy.repositoryId) || !text(policy.branch) || policy.event !== 'push'
      || !integer(policy.maxSnapshotAgeMs) || policy.maxSnapshotAgeMs > 300_000
      || !integer(policy.maxRunAgeMs) || policy.maxRunAgeMs > 86_400_000
      || !Array.isArray(policy.required) || policy.required.length === 0 || policy.required.length > 50) return false;
  return policy.required.every(rule => object(rule) && integer(rule.workflowId)
    && typeof rule.path === 'string' && /^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/.test(rule.path)
    && Array.isArray(rule.jobs) && rule.jobs.length > 0 && rule.jobs.every(text) && unique(rule.jobs))
    && unique(policy.required.map(rule => rule.workflowId)) && unique(policy.required.map(rule => rule.path));
}

/**
 * expectedSha and policy must come from the trusted release coordinator, NOT
 * from a candidate-controlled artifact. The collector must provide complete
 * REST snapshots and pin jobs to the run attempt. This module does no fetching.
 */
export function evaluateReleaseEvidence(policy, evidence, expectedSha, now = Date.now()) {
  const result = {schemaVersion: 1, scope: 'CI_EVIDENCE_ONLY', status: 'BLOCKED',
    productionAuthorized: false, commit: sha(expectedSha) ? expectedSha : null, reasons: [], gates: []};
  const stop = code => {result.reasons.push(code); return result;};
  if (!sha(expectedSha) || !Number.isSafeInteger(now) || !validPolicy(policy)) return stop('INVALID_POLICY_OR_TARGET');
  if (!object(evidence) || evidence.schemaVersion !== 1 || evidence.complete !== true
      || evidence.repository !== policy.repository || evidence.repositoryId !== policy.repositoryId
      || evidence.branch !== policy.branch || !Array.isArray(evidence.workflow_runs)
      || !object(evidence.jobs)) return stop('INVALID_OR_INCOMPLETE_SNAPSHOT');
  const captured = timestamp(evidence.capturedAt);
  if (!Number.isFinite(captured) || captured > now || now - captured > policy.maxSnapshotAgeMs) return stop('SNAPSHOT_NOT_FRESH');
  if (evidence.headBefore !== expectedSha || evidence.headAfter !== expectedSha) return stop('DEPLOYMENT_HEAD_CHANGED');
  const runs = evidence.workflow_runs;
  if (!Number.isSafeInteger(evidence.total_count) || evidence.total_count !== runs.length
      || runs.length > 10_000 || !runs.every(run => object(run) && integer(run.id))
      || !unique(runs.map(run => run.id))) return stop('INCOMPLETE_OR_DUPLICATE_RUNS');
  const repoMatches = repo => object(repo) && repo.full_name === policy.repository && repo.id === policy.repositoryId;
  for (const rule of policy.required) {
    const gate = {workflowId: rule.workflowId, path: rule.path, status: 'BLOCKED', reasons: []};
    result.gates.push(gate);
    const block = code => gate.reasons.push(code);
    // Unrelated PR/branch/commit successes cannot substitute for a main push.
    const scoped = runs.filter(run => (run.workflow_id === rule.workflowId || run.path === rule.path)
      && run.head_sha === expectedSha && run.head_branch === policy.branch && run.event === policy.event);
    if (scoped.length === 0) {block('MISSING_DEPLOYMENT_RUN'); continue;}
    if (scoped.some(run => run.workflow_id !== rule.workflowId || run.path !== rule.path
        || !repoMatches(run.repository) || !repoMatches(run.head_repository))) {
      block('WORKFLOW_OR_REPOSITORY_MISMATCH'); continue;
    }
    if (scoped.some(run => !integer(run.run_number) || !integer(run.run_attempt))
        || !unique(scoped.map(run => run.run_number))) {block('AMBIGUOUS_RUN_ORDER'); continue;}
    // Do not choose an older green run when the newest run is pending or failed.
    const latest = [...scoped].sort((a, b) => b.run_number - a.run_number)[0];
    gate.runId = latest.id; gate.attempt = latest.run_attempt;
    const created = timestamp(latest.created_at), updated = timestamp(latest.updated_at);
    if (!Number.isFinite(created) || !Number.isFinite(updated) || created > updated || updated > captured
        || now - updated > policy.maxRunAgeMs) block('RUN_NOT_FRESH');
    if (latest.status !== 'completed' || latest.conclusion !== 'success') block('RUN_NOT_SUCCESS');
    const page = evidence.jobs[String(latest.id)];
    if (!object(page) || page.complete !== true || page.runId !== latest.id || page.runAttempt !== latest.run_attempt
        || !Array.isArray(page.jobs) || page.jobs.length === 0 || !Number.isSafeInteger(page.total_count)
        || page.total_count !== page.jobs.length || !page.jobs.every(job => object(job) && integer(job.id))
        || !unique(page.jobs.map(job => job.id))) {block('INCOMPLETE_OR_WRONG_ATTEMPT_JOBS'); continue;}
    const jobs = page.jobs;
    if (jobs.some(job => job.run_id !== latest.id || job.head_sha !== expectedSha)) block('JOB_PROVENANCE_MISMATCH');
    if (jobs.some(job => job.status !== 'completed' || job.conclusion !== 'success')) block('JOB_NOT_SUCCESS');
    if (jobs.some(job => {
      const start = timestamp(job.started_at), end = timestamp(job.completed_at);
      return !Number.isFinite(start) || !Number.isFinite(end) || start < created || start > end || end > updated;
    })) block('INVALID_JOB_TIMING');
    for (const name of rule.jobs) if (jobs.filter(job => job.name === name).length !== 1) block('MISSING_OR_DUPLICATE_REQUIRED_JOB');
    if (gate.reasons.length === 0) gate.status = 'PASS';
  }
  if (result.gates.every(gate => gate.status === 'PASS')) result.status = 'PASS';
  else result.reasons.push('REQUIRED_EVIDENCE_NOT_SATISFIED');
  return result;
}

async function readJson(file) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 5 * 1024 * 1024) throw new Error('INVALID_INPUT');
  return JSON.parse(await readFile(file, 'utf8'));
}

// CLI: node scripts/a02-release-evidence.mjs <trusted-policy.json> <snapshot.json> <exact-sha>
// Sanitized stdout only: never print raw input, error messages, paths or secrets.
const entry = process.argv[1];
const isMain = entry && (import.meta.url === pathToFileURL(entry).href
  || import.meta.url === pathToFileURL(realpathSync(entry)).href);
if (isMain) {
  try {
    if (process.argv.length !== 5) throw new Error('INVALID_INPUT');
    const result = evaluateReleaseEvidence(await readJson(process.argv[2]), await readJson(process.argv[3]), process.argv[4]);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  } catch {
    console.log(JSON.stringify({schemaVersion: 1, scope: 'CI_EVIDENCE_ONLY', status: 'BLOCKED',
      productionAuthorized: false, reasons: ['INVALID_INPUT']}));
    process.exitCode = 2;
  }
}
