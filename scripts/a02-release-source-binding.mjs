import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {createRequire} from 'node:module';
import {validateReleaseInventory} from './a02-release-inventory.mjs';
import {evaluateReleaseEvidence} from './a02-release-evidence.mjs';

const yaml = createRequire(import.meta.url)('js-yaml');
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const policyPath = 'scripts/a02-release-inventory.json';

// All expected values must be selected by protected coordinator code. Neither
// reading a candidate's own digest nor a PASS here constitutes policy approval.
// This function only reads existing local Git objects; it never fetches or runs
// workflow code and never reads the worktree copy of an inventory/workflow.
export function bindReleaseSource({repositoryPath, expectedCommit, expectedTree, expectedInventoryDigest, expectedRepository} = {}) {
  const result = {status: 'BLOCKED', scope: 'OFFLINE_SOURCE_BINDING_ONLY', productionAuthorized: false, policy: null, reasons: []};
  const stop = code => {result.reasons.push(code); return result;};
  if (typeof repositoryPath !== 'string' || !isAbsolute(repositoryPath) || !sha(expectedCommit) || !sha(expectedTree)
      || typeof expectedInventoryDigest !== 'string' || !/^[a-f0-9]{64}$/.test(expectedInventoryDigest)
      || typeof expectedRepository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(expectedRepository)) return stop('INVALID_TRUSTED_TARGET');
  const deadline = Date.now() + 30000;
  const git = (...args) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw Error('SOURCE_READ_FAILED');
    return execFileSync('git', ['--no-replace-objects', '-C', repositoryPath, ...args], {
      encoding: 'utf8', timeout: Math.min(5000, remaining), maxBuffer: 2 * 1024 * 1024,
      // Do not inherit GIT_DIR, index/object overrides, external config or tracing.
      env: {PATH: process.env.PATH, LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_NO_REPLACE_OBJECTS: '1'},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  };
  try {
    if (git('cat-file', '-t', expectedCommit).trim() !== 'commit') return stop('TARGET_NOT_COMMIT');
    if (git('rev-parse', `${expectedCommit}^{tree}`).trim() !== expectedTree) return stop('TARGET_TREE_MISMATCH');
    if (git('ls-tree', expectedCommit, '--', policyPath).split(/\s+/)[0] !== '100644') return stop('UNSUPPORTED_INVENTORY_MODE');
    const bytes = git('cat-file', 'blob', `${expectedCommit}:${policyPath}`);
    if (digest(bytes) !== expectedInventoryDigest) return stop('INVENTORY_DIGEST_MISMATCH');
    const inventory = JSON.parse(bytes);
    if (inventory.policy?.repository !== expectedRepository) return stop('POLICY_REPOSITORY_MISMATCH');
    const names = git('ls-tree', '--name-only', '-z', `${expectedCommit}:.github/workflows`).split('\0').filter(Boolean).filter(name => /\.ya?ml$/.test(name));
    if (!names.length || names.length > 100 || names.some(name => !/^[A-Za-z0-9_-]+\.ya?ml$/.test(name))) return stop('UNSUPPORTED_WORKFLOW_SOURCE');
    const workflows = {};
    for (const name of names) {
      const path = `.github/workflows/${name}`;
      const mode = git('ls-tree', expectedCommit, '--', path).split(/\s+/)[0];
      if (mode !== '100644') return stop('UNSUPPORTED_WORKFLOW_MODE');
      workflows[path] = yaml.load(git('cat-file', 'blob', `${expectedCommit}:${path}`));
    }
    const validation = validateReleaseInventory(inventory, workflows);
    if (validation.status !== 'PASS') return stop('SOURCE_CONTRACT_BLOCKED');
    return {...result, status: 'PASS', commit: expectedCommit, tree: expectedTree,
      inventoryDigest: expectedInventoryDigest, policy: inventory.policy};
  } catch {return stop('SOURCE_READ_OR_PARSE_FAILED');}
}

// Combined entrypoint re-reads source itself, instead of trusting a caller-made
// JSON object claiming that source validation already passed.
export function evaluateBoundReleaseEvidence(trustedTarget, evidence, now = Date.now()) {
  const binding = bindReleaseSource(trustedTarget);
  if (binding.status !== 'PASS') return {status: 'BLOCKED', scope: 'CI_EVIDENCE_ONLY', productionAuthorized: false, reasons: binding.reasons};
  return {...evaluateReleaseEvidence(binding.policy, evidence, binding.commit, now),
    sourceTree: binding.tree, inventoryDigest: binding.inventoryDigest};
}
