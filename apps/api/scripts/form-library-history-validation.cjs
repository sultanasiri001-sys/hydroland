'use strict';
// Tests the compiled controller with read-only database/auth doubles.
// This is not an HTTP, PostgreSQL, or production acceptance test.
const assert = require('node:assert/strict');
const { DocumentTemplateHistoryController } = require('../dist/document-forms/document-template-history.controller');
const { COOPERATION_CODE } = require('../dist/document-forms/cooperation-contract.domain');
let passed = 0;
async function check(name, test) { await test(); console.log('PASS ' + name); passed++; }
const request = { auth: { accountId: 'synthetic-owner' } };
function fixture(options = {}) {
  const calls = [];
  const versions = options.rows || Array.from({ length: 28 }, (_, index) => ({
    id: `synthetic-v${index + 1}`, organizationId: 'org-a', code: 'HR-TEST', department: 'HR',
    version: index + 1, status: index === 27 ? 'ACTIVE' : 'INACTIVE',
    titleAr: 'نموذج اختباري', titleEn: 'Synthetic form', printable: true,
    fields: [{ key: 'note', labelAr: 'ملاحظة', labelEn: 'Note', type: 'TEXT', required: false }],
  }));
  const original = structuredClone(versions);
  const tx = { documentTemplate: {
    async findFirst(query) {
      calls.push(['anchor', query]);
      const rows = versions.filter(row => row.organizationId === query.where.organizationId && row.code === query.where.code);
      return rows.length ? { department: rows.at(-1).department } : null;
    },
    async findMany(query) {
      calls.push(['page', query]);
      assert.equal(query.take, 26);
      assert.deepEqual(query.orderBy, { version: 'desc' });
      assert.equal(query.select.fields, true);
      assert.equal(query.select.documents, undefined);
      assert.equal(query.select.payload, undefined);
      return versions.filter(row => row.organizationId === query.where.organizationId && row.code === query.where.code &&
        (!query.where.version || row.version < query.where.version.lt)).sort((a,b) => b.version - a.version).slice(0, query.take);
    },
  }};
  const db = { async serializable(fn) { calls.push(['transaction']); return fn(tx); } };
  const auth = { async assert(actor, org, action, client) {
    calls.push(['auth', actor, org, action]);
    assert.equal(actor, request.auth.accountId); assert.equal(action, 'TEMPLATE_LIST'); assert.equal(client, tx);
    if (options.denied) throw Error('denied');
  }};
  const controller = new DocumentTemplateHistoryController(db, auth);
  return { controller, calls, unchanged() { assert.deepEqual(versions, original); } };
}
(async () => {
  await check('first history page includes retained versions and a bounded cursor', async () => {
    const f = fixture(), result = await f.controller.history(request, 'org-a', 'HR-TEST');
    assert.equal(result.items.length, 25); assert.equal(result.items[0].version, 28);
    assert.equal(result.items[1].status, 'INACTIVE'); assert.equal(result.nextBeforeVersion, 4);
    assert.equal(result.department, 'HR'); f.unchanged();
  });
  await check('older pages have no repeated boundary and an explicit end', async () => {
    const f = fixture(), result = await f.controller.history(request, 'org-a', 'HR-TEST', '4');
    assert.deepEqual(result.items.map(row => row.version), [3,2,1]); assert.equal(result.nextBeforeVersion, null); f.unchanged();
  });
  await check('cursor below the oldest version returns an empty completed page', async () => {
    const result = await fixture().controller.history(request, 'org-a', 'HR-TEST', '1');
    assert.deepEqual(result.items, []); assert.equal(result.nextBeforeVersion, null);
  });
  await check('authorization occurs before any history lookup', async () => {
    const f = fixture({ denied: true });
    await assert.rejects(f.controller.history(request, 'org-a', 'HR-TEST'), /denied/);
    assert.deepEqual(f.calls.map(call => call[0]), ['transaction','auth']);
  });
  await check('another organization cannot receive matching template history', async () => {
    const f = fixture(); await assert.rejects(f.controller.history(request, 'org-b', 'HR-TEST'), /organization scope/);
    assert.equal(f.calls.some(call => call[0] === 'page'), false);
  });
  await check('a missing code is not replaced by a baseline or another code', async () => {
    const f = fixture(); await assert.rejects(f.controller.history(request, 'org-a', 'HR-MISSING'), /not found/);
    assert.equal(f.calls.some(call => call[0] === 'page'), false);
  });
  await check('contract library codes cannot use administrative history', async () => {
    for (const code of ['CLIB-HR-PERMANENT', 'clib-hr-permanent', COOPERATION_CODE]) {
      const f = fixture(); await assert.rejects(f.controller.history(request, 'org-a', code), /contract library/);
      assert.deepEqual(f.calls.map(call => call[0]), ['transaction','auth']);
    }
  });
  await check('malformed cursors are rejected rather than silently changing the page', async () => {
    for (const cursor of ['', '0', '-1', '1.5', '01', '1e2', ' 2', '9007199254740992', ['2']]) {
      const f = fixture(); await assert.rejects(f.controller.history(request, 'org-a', 'HR-TEST', cursor), /positive safe integer/);
      assert.equal(f.calls.length, 0);
    }
  });
  await check('invalid code syntax never reaches the database', async () => {
    for (const code of ['', '../HR', 'HR?scope=all', 'x'.repeat(129), null]) {
      const f = fixture(); await assert.rejects(f.controller.history(request, 'org-a', code), /Invalid template code/);
      assert.equal(f.calls.length, 0);
    }
  });
  await check('conflicting department ownership fails closed', async () => {
    const rows = [1,2].map(version => ({ id: `v${version}`, organizationId: 'org-a', code: 'HR-TEST', version,
      department: version === 1 ? 'FINANCE' : 'HR', status: version === 1 ? 'INACTIVE' : 'ACTIVE' }));
    const f = fixture({ rows }); await assert.rejects(f.controller.history(request, 'org-a', 'HR-TEST'), /conflicting department/); f.unchanged();
  });
  await check('same-code templates in another organization are excluded', async () => {
    const rows = ['org-a','org-b'].map(organizationId => ({ id: organizationId, organizationId,
      code: 'HR-TEST', department: 'HR', version: 1, status: 'ACTIVE' }));
    const f = fixture({ rows }), result = await f.controller.history(request, 'org-a', 'HR-TEST');
    assert.deepEqual(result.items.map(row => row.organizationId), ['org-a']); f.unchanged();
  });
  console.log(`${passed} synthetic history checks passed; no database/service writes or network calls.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
