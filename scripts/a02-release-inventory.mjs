// Offline source contract. Parsed workflow input is data, never executed here.
const dispositions = new Set(['required', 'independent-mobile', 'mutating', 'sample-observer', 'aggregate-covered']);
const equalSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every(x => b.includes(x));

export function expandedJobNames(workflow) {
  const names = [];
  if (!workflow?.jobs || !Object.keys(workflow.jobs).length) throw Error('EMPTY_JOBS');
  for (const [id, job] of Object.entries(workflow.jobs)) {
    if (job.if !== undefined || (job['continue-on-error'] !== undefined && job['continue-on-error'] !== false)) throw Error('CONDITIONAL_JOB');
    if (job.uses) throw Error('UNREVIEWED_REUSABLE_JOB');
    const matrix = job.strategy?.matrix;
    let rows = [{}];
    if (matrix !== undefined) {
      if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) || !Object.keys(matrix).length) throw Error('UNSUPPORTED_MATRIX');
      for (const [key, values] of Object.entries(matrix)) {
        if (['include', 'exclude'].includes(key) || !Array.isArray(values) || !values.length || values.some(v => !['string', 'number', 'boolean'].includes(typeof v))) throw Error('UNSUPPORTED_MATRIX');
        rows = rows.flatMap(row => values.map(value => ({...row, [key]: value})));
        if (rows.length > 256) throw Error('MATRIX_LIMIT');
      }
    }
    for (const row of rows) {
      let name = job.name;
      if (name !== undefined) {
        if (typeof name !== 'string') throw Error('INVALID_JOB_NAME');
        name = name.replace(/\$\{\{\s*matrix\.([\w-]+)\s*\}\}/g, (_, key) => {
          if (!Object.hasOwn(row, key)) throw Error('UNKNOWN_MATRIX_KEY');
          return String(row[key]);
        });
      } else name = matrix ? `${id} (${Object.values(row).join(', ')})` : id;
      if (!name || name.includes('${{')) throw Error('UNSUPPORTED_JOB_EXPRESSION');
      names.push(name);
    }
  }
  if (new Set(names).size !== names.length) throw Error('DUPLICATE_JOB_NAME');
  return names;
}

export function validateReleaseInventory(inventory, workflows) {
  const errors = [];
  const fail = (path, code) => errors.push({path, code});
  if (inventory?.status !== 'PROPOSED_NOT_ADOPTED' || !Array.isArray(inventory.workflows) || !Array.isArray(inventory.policy?.required)) return {status: 'BLOCKED', productionAuthorized: false, errors: [{code: 'INVALID_INVENTORY'}]};
  const policy = inventory.policy;
  if (policy.branch !== 'main' || policy.event !== 'push' || !policy.required.length) fail('', 'INVALID_RELEASE_TARGET');
  const paths = inventory.workflows.map(w => w.path);
  if (!equalSet(paths, Object.keys(workflows))) fail('', 'UNCLASSIFIED_OR_MISSING_WORKFLOW');
  const requiredPaths = inventory.workflows.filter(w => w.disposition === 'required').map(w => w.path);
  if (!equalSet(requiredPaths, policy.required.map(w => w.path))) fail('', 'REQUIRED_SET_MISMATCH');
  const ids = policy.required.map(w => w.workflowId);
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) fail('', 'INVALID_WORKFLOW_IDS');
  for (const entry of inventory.workflows) {
    if (!dispositions.has(entry.disposition) || typeof entry.reason !== 'string' || !entry.reason.trim()) fail(entry.path, 'UNREVIEWED_DISPOSITION');
  }
  for (const rule of policy.required) {
    const workflow = workflows[rule.path];
    if (!workflow) {fail(rule.path, 'MISSING_WORKFLOW_SOURCE'); continue;}
    const push = workflow.on?.push;
    // Explicit main coverage: no path/tag filtering or negated branch patterns.
    if (!push || !Array.isArray(push.branches) || !push.branches.includes('main') || push.branches.some(b => typeof b !== 'string' || b.startsWith('!')) || ['paths', 'paths-ignore', 'branches-ignore', 'tags', 'tags-ignore'].some(k => Object.hasOwn(push, k))) fail(rule.path, 'MAIN_PUSH_NOT_GUARANTEED');
    try {
      if (!Array.isArray(rule.jobs) || !equalSet(rule.jobs, expandedJobNames(workflow))) fail(rule.path, 'INCORRECT_JOB_INVENTORY');
    } catch (error) {fail(rule.path, error.message); continue;}
    if (rule.criticalSteps !== undefined) {
      if (!rule.criticalSteps || typeof rule.criticalSteps !== 'object' || Array.isArray(rule.criticalSteps) || !Object.keys(rule.criticalSteps).length) {fail(rule.path, 'INVALID_CRITICAL_STEP_POLICY'); continue;}
      for (const [jobName, names] of Object.entries(rule.criticalSteps)) {
        const matchingJobs = Object.entries(workflow.jobs).filter(([id, job]) => expandedJobNames({jobs: {[id]: job}}).includes(jobName));
        if (!rule.jobs.includes(jobName) || matchingJobs.length !== 1 || !Array.isArray(names) || !names.length || names.some(n => typeof n !== 'string' || !n.trim()) || new Set(names).size !== names.length) {fail(rule.path, 'INVALID_CRITICAL_STEP_POLICY'); continue;}
        const steps = matchingJobs[0][1].steps;
        for (const name of names) {
          const matching = Array.isArray(steps) ? steps.filter(step => step.name === name) : [];
          if (matching.length !== 1) fail(rule.path, 'MISSING_OR_DUPLICATE_CRITICAL_SOURCE_STEP');
          else if (matching[0].if !== undefined || (matching[0]['continue-on-error'] !== undefined && matching[0]['continue-on-error'] !== false)) fail(rule.path, 'OPTIONAL_CRITICAL_SOURCE_STEP');
        }
      }
    }
  }
  return {status: errors.length ? 'BLOCKED' : 'PASS', productionAuthorized: false, scope: 'PROPOSED_SOURCE_CONTRACT', errors};
}
