import {readFile, stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {evaluateReleaseEvidence} from './a02-release-evidence.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const repositoryName = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const branchName = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(value)
  && !value.includes('..') && !value.includes('//') && !value.endsWith('/') && !value.endsWith('.lock');
const codes = new Set(['INVALID_INPUT', 'INVALID_POLICY_OR_TARGET', 'UNSAFE_ENDPOINT', 'AUTH_REQUIRED',
  'REQUEST_TIMEOUT', 'COLLECTION_TIMEOUT', 'REQUEST_LIMIT', 'API_HTTP_ERROR', 'API_ACCESS_OR_RATE_LIMIT',
  'API_RESOURCE_UNAVAILABLE', 'API_RESPONSE_INVALID', 'API_RESPONSE_TOO_LARGE', 'REPOSITORY_MISMATCH',
  'HEAD_CHANGED', 'PAGE_INVALID', 'PAGE_COUNT_CHANGED', 'PAGE_TRUNCATED', 'PAGE_DUPLICATE',
  'PAGE_LIMIT', 'RUN_PROVENANCE_MISMATCH', 'RUN_ORDER_AMBIGUOUS', 'RUN_CHANGED', 'RUN_SET_CHANGED',
  'JOB_PROVENANCE_MISMATCH', 'CLOCK_INVALID', 'COLLECTION_FAILED']);
class CollectionError extends Error {
  constructor(code) {super(code); this.code = code;}
}
const fail = code => {throw new CollectionError(code);};
const requireThat = (condition, code) => {if (!condition) fail(code);};

async function bounded(operation, milliseconds, code) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => {timer = setTimeout(() => {
        controller.abort(); reject(new CollectionError(code));
      }, milliseconds);}),
    ]);
  } finally {clearTimeout(timer);}
}

/** GET-only transport. Tokens cannot follow redirects or response-supplied URLs. */
export function createGitHubReader({repository, token, fetchImpl = globalThis.fetch, timeoutMs = 10000} = {}) {
  requireThat(repositoryName(repository) && typeof fetchImpl === 'function'
    && positive(timeoutMs) && timeoutMs <= 10000, 'INVALID_INPUT');
  requireThat(typeof token === 'string' && /^[A-Za-z0-9_]{1,512}$/.test(token), 'AUTH_REQUIRED');
  const base = `/repos/${repository}`;
  function endpoint(path) {
    requireThat(typeof path === 'string' && path.startsWith(base) && !/[\r\n\\#]/.test(path), 'UNSAFE_ENDPOINT');
    const url = new URL(path, 'https://api.github.com');
    requireThat(url.origin === 'https://api.github.com' && !url.username && !url.password, 'UNSAFE_ENDPOINT');
    const tail = url.pathname.slice(base.length), query = url.searchParams;
    const keys = [...query.keys()];
    requireThat(url.pathname.startsWith(base) && new Set(keys).size === keys.length, 'UNSAFE_ENDPOINT');
    let allowed = [];
    if (tail === '') requireThat(keys.length === 0, 'UNSAFE_ENDPOINT');
    else if (tail.startsWith('/git/ref/heads/')) {
      requireThat(branchName(decodeURIComponent(tail.slice(15))) && keys.length === 0, 'UNSAFE_ENDPOINT');
    } else if (tail === '/actions/runs') {
      allowed = ['head_sha', 'branch', 'event', 'per_page', 'page'];
      requireThat(sha(query.get('head_sha')) && branchName(query.get('branch')) && query.get('event') === 'push', 'UNSAFE_ENDPOINT');
    } else if (/^\/actions\/runs\/[1-9]\d*(?:\/attempts\/[1-9]\d*)?$/.test(tail)) {
      requireThat(keys.length === 0, 'UNSAFE_ENDPOINT');
    } else if (/^\/actions\/runs\/[1-9]\d*\/attempts\/[1-9]\d*\/jobs$/.test(tail)) allowed = ['per_page', 'page'];
    else fail('UNSAFE_ENDPOINT');
    requireThat(keys.every(key => allowed.includes(key)), 'UNSAFE_ENDPOINT');
    if (allowed.length) requireThat(/^[1-9]\d*$/.test(query.get('page') || '')
      && Number(query.get('page')) <= 1001 && /^[1-9]\d*$/.test(query.get('per_page') || '')
      && Number(query.get('per_page')) <= 100, 'UNSAFE_ENDPOINT');
    return url;
  }
  return async function read(path, {signal: parentSignal} = {}) {
    try {
      const url = endpoint(path);
      return await bounded(async signal => {
        const combined = parentSignal ? AbortSignal.any([signal, parentSignal]) : signal;
        const response = await fetchImpl(url.href, {method: 'GET', redirect: 'error', cache: 'no-store', signal: combined,
          headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'hydroland-a02-evidence-reader'}});
        requireThat(!response.redirected && (!response.url || response.url === url.href), 'API_RESPONSE_INVALID');
        if (response.status === 403 || response.status === 429) fail('API_ACCESS_OR_RATE_LIMIT');
        if (response.status === 404) fail('API_RESOURCE_UNAVAILABLE');
        requireThat(response.status === 200, 'API_HTTP_ERROR');
        requireThat(/application\/(?:[a-z0-9.+-]*\+)?json/i.test(response.headers.get('content-type') || ''), 'API_RESPONSE_INVALID');
        const maximum = 2 * 1024 * 1024;
        requireThat(Number(response.headers.get('content-length') || 0) <= maximum, 'API_RESPONSE_TOO_LARGE');
        requireThat(response.body?.getReader, 'API_RESPONSE_INVALID');
        const reader = response.body.getReader(), chunks = []; let size = 0;
        try {
          while (true) {
            const {done, value} = await reader.read(); if (done) break;
            size += value.byteLength; requireThat(size <= maximum, 'API_RESPONSE_TOO_LARGE'); chunks.push(value);
          }
        } finally {await reader.cancel().catch(() => {});}
        try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {fail('API_RESPONSE_INVALID');}
      }, timeoutMs, 'REQUEST_TIMEOUT');
    } catch (error) {if (error instanceof CollectionError) throw error; fail('API_RESPONSE_INVALID');}
  };
}

const repoView = value => ({id: value?.id, full_name: value?.full_name});
const runView = value => ({id: value?.id, workflow_id: value?.workflow_id, path: value?.path,
  head_sha: value?.head_sha, head_branch: value?.head_branch, event: value?.event,
  run_number: value?.run_number, run_attempt: value?.run_attempt,
  repository: repoView(value?.repository), head_repository: repoView(value?.head_repository),
  status: value?.status, conclusion: value?.conclusion, created_at: value?.created_at, updated_at: value?.updated_at});
const jobView = value => ({id: value?.id, run_id: value?.run_id, head_sha: value?.head_sha,
  name: value?.name, status: value?.status, conclusion: value?.conclusion,
  started_at: value?.started_at, completed_at: value?.completed_at});
const ordered = values => [...values].sort((a, b) => a.id - b.id);

/**
 * Trusted callers own policy/target selection. No retries, writes or deploys.
 * Stable observations are NOT an atomic lock against changes after the last GET.
 */
export async function collectReleaseEvidence(policyInput, expectedSha, {read, now = Date.now,
  pageSize = 100, maxDurationMs = 120000} = {}) {
  let requests = 0;
  try {
    requireThat(typeof read === 'function' && typeof now === 'function' && positive(pageSize) && pageSize <= 100
      && positive(maxDurationMs) && maxDurationMs <= 120000, 'INVALID_INPUT');
    const policy = structuredClone(policyInput), started = now();
    requireThat(Number.isSafeInteger(started), 'CLOCK_INVALID');
    requireThat(!evaluateReleaseEvidence(policy, null, expectedSha, started).reasons.includes('INVALID_POLICY_OR_TARGET')
      && repositoryName(policy.repository) && branchName(policy.branch), 'INVALID_POLICY_OR_TARGET');
    const base = `/repos/${policy.repository}`;
    let lastTime = started;
    const clock = () => {
      const time = now(); requireThat(Number.isSafeInteger(time) && time >= lastTime, 'CLOCK_INVALID');
      lastTime = time; requireThat(time - started <= maxDurationMs, 'COLLECTION_TIMEOUT'); return time;
    };
    const get = async path => {
      clock(); requireThat(++requests <= 400, 'REQUEST_LIMIT');
      return bounded(signal => read(path, {signal}), Math.max(1, maxDurationMs - (lastTime - started)), 'COLLECTION_TIMEOUT');
    };
    const repo = await get(base);
    requireThat(repo?.id === policy.repositoryId && repo?.full_name === policy.repository, 'REPOSITORY_MISMATCH');
    const head = async () => {
      const ref = await get(`${base}/git/ref/heads/${policy.branch.split('/').map(encodeURIComponent).join('/')}`);
      requireThat(ref?.ref === `refs/heads/${policy.branch}` && ref?.object?.type === 'commit'
        && ref.object.sha === expectedSha, 'HEAD_CHANGED'); return ref.object.sha;
    };
    const headBefore = await head();
    async function pages(path, field, cap) {
      const rows = [], seen = new Set(); let total;
      // Counts, page widths AND a terminal empty page are checked. No Link URL is followed.
      for (let page = 1; page <= Math.ceil(cap / pageSize) + 1; page++) {
        const body = await get(`${path}${path.includes('?') ? '&' : '?'}per_page=${pageSize}&page=${page}`);
        requireThat(record(body) && Number.isSafeInteger(body.total_count) && body.total_count >= 0
          && Array.isArray(body[field]), 'PAGE_INVALID');
        if (total === undefined) {total = body.total_count; requireThat(total < cap, 'PAGE_LIMIT');}
        requireThat(body.total_count === total, 'PAGE_COUNT_CHANGED');
        const expected = Math.min(pageSize, Math.max(0, total - rows.length));
        requireThat(body[field].length === expected, 'PAGE_TRUNCATED');
        for (const row of body[field]) {
          requireThat(record(row) && positive(row.id), 'PAGE_INVALID');
          requireThat(!seen.has(row.id), 'PAGE_DUPLICATE'); seen.add(row.id); rows.push(row);
        }
        if (expected === 0) return rows;
      }
      fail('PAGE_LIMIT');
    }
    const query = new URLSearchParams({head_sha: expectedSha, branch: policy.branch, event: 'push'});
    const listRuns = async () => {
      const values = (await pages(`${base}/actions/runs?${query}`, 'workflow_runs', 1000)).map(runView);
      for (const run of values) requireThat(run.head_sha === expectedSha && run.head_branch === policy.branch
        && run.event === 'push' && isDeepStrictEqual(run.repository, repoView(repo))
        && isDeepStrictEqual(run.head_repository, repoView(repo)) && positive(run.workflow_id)
        && positive(run.run_attempt) && positive(run.run_number), 'RUN_PROVENANCE_MISMATCH');
      return ordered(values);
    };
    const runs = await listRuns(), selected = [];
    for (const rule of policy.required) {
      const candidates = runs.filter(run => run.workflow_id === rule.workflowId || run.path === rule.path);
      requireThat(candidates.every(run => run.workflow_id === rule.workflowId && run.path === rule.path), 'RUN_PROVENANCE_MISMATCH');
      requireThat(new Set(candidates.map(run => run.run_number)).size === candidates.length, 'RUN_ORDER_AMBIGUOUS');
      if (candidates.length) selected.push([...candidates].sort((a, b) => b.run_number - a.run_number)[0]);
    }
    const checkRun = async (run, attempt = false) => {
      const path = `${base}/actions/runs/${run.id}${attempt ? `/attempts/${run.run_attempt}` : ''}`;
      requireThat(isDeepStrictEqual(runView(await get(path)), run), 'RUN_CHANGED');
    };
    const jobs = {};
    for (const run of selected) {
      await checkRun(run); await checkRun(run, true);
      const raw = await pages(`${base}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs', 1000);
      requireThat(raw.every(job => job.run_id === run.id && job.head_sha === expectedSha
        && (job.run_attempt === undefined || job.run_attempt === run.run_attempt)), 'JOB_PROVENANCE_MISMATCH');
      jobs[run.id] = {complete: true, runId: run.id, runAttempt: run.run_attempt, total_count: raw.length, jobs: raw.map(jobView)};
      await checkRun(run);
    }
    requireThat(isDeepStrictEqual(await listRuns(), runs), 'RUN_SET_CHANGED');
    for (const run of selected) await checkRun(run);
    const headAfter = await head(), finished = clock();
    const snapshot = {schemaVersion: 1, complete: true, repository: policy.repository, repositoryId: policy.repositoryId,
      branch: policy.branch, headBefore, headAfter, capturedAt: new Date(finished).toISOString(),
      total_count: runs.length, workflow_runs: runs, jobs};
    const evaluation = evaluateReleaseEvidence(policy, snapshot, expectedSha, finished);
    return {collection: {status: 'COMPLETE', requests, durationMs: finished - started}, snapshot, evaluation};
  } catch (error) {
    const reason = error instanceof CollectionError && codes.has(error.code) ? error.code : 'COLLECTION_FAILED';
    return {collection: {status: 'BLOCKED', requests, reasons: [reason]}, snapshot: null,
      evaluation: {scope: 'CI_EVIDENCE_ONLY', status: 'BLOCKED', productionAuthorized: false, reasons: [reason]}};
  }
}

export function summarizeCollection(result) {
  return {scope: 'CI_EVIDENCE_ONLY', productionAuthorized: false, collection: result.collection, evaluation: result.evaluation};
}

let isMain = false;
try {isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;} catch { /* importing has no side effects */ }
if (isMain) {
  try {
    requireThat(process.argv.length === 4, 'INVALID_INPUT');
    const info = await stat(process.argv[2]); requireThat(info.isFile() && info.size <= 1024 * 1024, 'INVALID_INPUT');
    const policy = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const read = createGitHubReader({repository: policy.repository, token: process.env.GITHUB_TOKEN});
    const result = await collectReleaseEvidence(policy, process.argv[3], {read});
    console.log(JSON.stringify(summarizeCollection(result), null, 2));
    process.exitCode = result.evaluation.status === 'PASS' ? 0 : 1;
  } catch {
    console.log(JSON.stringify({scope: 'CI_EVIDENCE_ONLY', status: 'BLOCKED', productionAuthorized: false, reasons: ['INVALID_INPUT']}));
    process.exitCode = 2;
  }
}
