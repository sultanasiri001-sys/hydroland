import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bindReleaseSource} from './a02-release-source-binding.mjs';
import {createGitHubReader, waitForPushRunsToSettle, collectReleaseEvidence, summarizeCollection} from './a02-release-collector.mjs';

export const REPOSITORY = 'sultanasiri001-sys/hydroland';
export const INVENTORY_DIGEST = '8c5c4459894d5a2577c32f9ba731da12d10189d9e6beff55544524e9c9a35d47';
const WORKFLOW = '.github/workflows/a02-release-collector.yml';
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const blocked = reason => ({status:'BLOCKED', productionAuthorized:false, reasons:[reason]});

export function gateContext(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || !sha(env.GITHUB_SHA)
      || !/^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '')) return blocked('INVALID_CONTEXT');
  const prefix = `${REPOSITORY}/${WORKFLOW}@`;
  if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/main'
      && env.GITHUB_WORKFLOW_REF === `${prefix}refs/heads/main`) return {status:'PASS', mode:'MAIN_PUSH', commit:env.GITHUB_SHA, runId:Number(env.GITHUB_RUN_ID)};
  if (env.GITHUB_EVENT_NAME === 'pull_request' && env.GITHUB_BASE_REF === 'main'
      && /^refs\/pull\/[1-9]\d*\/merge$/.test(env.GITHUB_REF ?? '')
      && env.GITHUB_WORKFLOW_REF === `${prefix}${env.GITHUB_REF}`) return {status:'PASS', mode:'PR_SOURCE_CONTRACT', commit:env.GITHUB_SHA, runId:Number(env.GITHUB_RUN_ID)};
  return blocked('UNSUPPORTED_EVENT_OR_REF');
}

// Dependencies are injectable for adversarial contract tests. The CLI below
// always selects the existing reviewed binder, strict collector and GET reader.
export async function runFullGate(env, {bind, settle, collect, finalHead} = {}) {
  const context = gateContext(env);
  if (context.status !== 'PASS') return context;
  const binding = await bind(context.commit, INVENTORY_DIGEST);
  if (binding?.status !== 'PASS' || binding.commit !== context.commit
      || binding.inventoryDigest !== INVENTORY_DIGEST || binding.policy?.required?.length !== 28)
    return blocked('SOURCE_BINDING_FAILED');
  if (context.mode === 'PR_SOURCE_CONTRACT') return {status:'PASS', scope:'PR_SOURCE_CONTRACT_ONLY', productionAuthorized:false, commit:context.commit};
  const settled = await settle(binding.policy, context.commit, context.runId);
  if (settled?.status !== 'SETTLED') return blocked('MAIN_RUNS_NOT_SETTLED');
  const result = await collect(binding.policy, context.commit);
  if (result?.collection?.status !== 'COMPLETE' || result?.evaluation?.status !== 'PASS'
      || result.evaluation.commit !== context.commit || result.evaluation.gates?.length !== 28
      || !result.evaluation.gates.every(gate => gate.status === 'PASS')) return {...blocked('FULL_POLICY_NOT_SATISFIED'), evidence:result ? summarizeCollection(result) : null};
  if (await finalHead() !== context.commit) return blocked('HEAD_CHANGED_AFTER_COLLECTION');
  return {status:'PASS', scope:'FULL_MAIN_PUSH_CI_POLICY', productionAuthorized:false,
    commit:context.commit, sourceTree:binding.tree, inventoryDigest:INVENTORY_DIGEST, evidence:summarizeCollection(result)};
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(realpathSync(entry)).href) {
  try {
    const env = process.env;
    const context = gateContext(env);
    if (context.status !== 'PASS') throw Error('INVALID_CONTEXT');
    const root = realpathSync(env.GITHUB_WORKSPACE ?? process.cwd());
    const git = (...args) => execFileSync('git', ['--no-replace-objects','-C',root,...args], {
      encoding:'utf8', timeout:5000, maxBuffer:1024*1024,
      env:{PATH:env.PATH, GIT_CONFIG_NOSYSTEM:'1', GIT_CONFIG_GLOBAL:'/dev/null', GIT_NO_REPLACE_OBJECTS:'1'}, stdio:['ignore','pipe','pipe'],
    }).trim();
    const read = context.mode === 'MAIN_PUSH' ? createGitHubReader({repository:REPOSITORY, token:env.GITHUB_TOKEN}) : null;
    const result = await runFullGate(env, {
      bind: (commit, digest) => bindReleaseSource({repositoryPath:root, expectedCommit:commit,
        expectedTree:git('rev-parse',`${commit}^{tree}`), expectedInventoryDigest:digest, expectedRepository:REPOSITORY}),
      settle: (policy, commit, observerRunId) => waitForPushRunsToSettle(policy, commit, {read, observerRunId}),
      collect: (policy, commit) => collectReleaseEvidence(policy, commit, {read}),
      finalHead: async () => (await read(`/repos/${REPOSITORY}/git/ref/heads/main`))?.object?.sha,
    });
    console.log(JSON.stringify(result,null,2));
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  } catch {
    console.log(JSON.stringify(blocked('GATE_EXECUTION_FAILED')));
    process.exitCode = 1;
  }
}
