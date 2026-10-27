const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const Module = require('node:module');
const {test, after} = require('node:test');
const ts = require('typescript');
const {ServiceUnavailableException} = require('@nestjs/common');

// Exercise the actual controller source with a query-only database double.
// No app boot, sockets, Prisma generation or database connection. Metadata is
// omitted because constructor injection is direct: Nest DI/HTTP is not tested.
const filename = resolve(__dirname, '../src/health/health.controller.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true, emitDecoratorMetadata: false},
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length || 0, 0);
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(resolve(__dirname, '..'));
loaded._compile(compiled.outputText, filename);
const {HealthController} = loaded.exports;
const originalCommit = process.env.RENDER_GIT_COMMIT;
after(() => {
  if (originalCommit === undefined) delete process.env.RENDER_GIT_COMMIT;
  else process.env.RENDER_GIT_COMMIT = originalCommit;
});

function database(query) {
  return new Proxy({$queryRaw: query}, {get(target, name) {
    assert.equal(name, '$queryRaw', 'Health must only query readiness');
    return target[name];
  }});
}

test('readiness awaits SELECT 1, reports exact release, and never writes', async () => {
  const commit = 'a'.repeat(40);
  process.env.RENDER_GIT_COMMIT = commit;
  let calls = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const controller = new HealthController(database(async (strings, ...values) => {
    calls++;
    assert.deepEqual([...strings], ['SELECT 1']);
    assert.deepEqual(values, []);
    await pending;
    return [{one: 1}];
  }));
  let settled = false;
  const result = controller.getReadiness().then(value => { settled = true; return value; });
  await Promise.resolve();
  assert.equal(settled, false, 'Must not claim ready before database completes');
  release();
  const response = await result;
  assert.equal(calls, 1);
  assert.equal(response.service, 'hydroland-api');
  assert.equal(response.status, 'ready');
  assert.equal(response.database, 'ok');
  assert.equal(response.commit, commit);
  assert.equal(new Date(response.timestamp).toISOString(), response.timestamp);
});

test('database failure yields sanitized 503 for the same release', async () => {
  process.env.RENDER_GIT_COMMIT = 'b'.repeat(40);
  const controller = new HealthController(database(async () => {
    throw new Error('synthetic-sensitive-connection-detail');
  }));
  await assert.rejects(controller.getReadiness(), error => {
    assert(error instanceof ServiceUnavailableException);
    assert.equal(error.getStatus(), 503);
    const response = error.getResponse();
    assert.equal(response.status, 'not_ready');
    assert.equal(response.database, 'unavailable');
    assert.equal(response.commit, 'b'.repeat(40));
    assert.equal(response.service, 'hydroland-api');
    assert(!JSON.stringify(response).includes('synthetic-sensitive'));
    return true;
  });
});

test('liveness cannot be mistaken for database readiness', () => {
  const response = new HealthController(database(() => {
    assert.fail('Liveness must not query the database');
  })).getHealth();
  assert.equal(response.status, 'ok');
  assert.equal(response.service, 'hydroland-api');
  assert.equal(response.database, undefined);
});

test('release identity follows current environment and missing identity remains local', async () => {
  const controller = new HealthController(database(async () => []));
  // A direct controller contract, NOT proof of process/version rollback.
  for (const commit of ['1'.repeat(40), '2'.repeat(40), '1'.repeat(40)]) {
    process.env.RENDER_GIT_COMMIT = commit;
    assert.equal((await controller.getReadiness()).commit, commit);
    assert.equal(controller.getHealth().commit, commit);
  }
  delete process.env.RENDER_GIT_COMMIT;
  assert.equal((await controller.getReadiness()).commit, 'local');
  assert.equal(controller.getHealth().commit, 'local');
});
