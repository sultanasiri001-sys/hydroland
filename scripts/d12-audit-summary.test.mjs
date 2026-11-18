import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { summarizeAudit } from './d12-audit-summary.mjs';

const scope = { organization: 'org-1', from: '2026-11-17T21:00:00Z', until: '2026-11-18T21:00:00Z' };
const sample = { id: 'source-1', action: 'organization.customer_case.created', resource: 'CustomerCase', resourceId: 'case-1',
  occurredAt: scope.from, actorId: 'private-person', metadata: { organizationId: 'org-1', description: 'private text', amountMinor: 12345678 } };

test('counts distinct source rows and business records separately for a half-open UTC interval', async () => {
  const reply = { ...sample, id: 'source-2', action: 'organization.customer_case.replied' };
  const end = { ...sample, id: 'outside', occurredAt: scope.until };
  const result = await summarizeAudit([sample, reply, sample, end], scope);
  assert.equal(result.categories.case.events, 2);
  assert.equal(result.categories.case.distinctSubjects, 1);
  assert.equal(result.sourceDigest, (await summarizeAudit([reply, sample], scope)).sourceDigest);
  assert.match(result.sourceDigest, /^[a-f0-9]{64}$/);
});

test('filters by the recorded organization and exact action/resource pair', async () => {
  const rows = [sample, { ...sample, metadata: {} }, { ...sample, metadata: { organizationId: 'org-2' } }, { ...sample, resource: 'Payment' }];
  const result = await summarizeAudit(rows, scope);
  assert.equal(result.categories.case.events, 1);
  assert.equal(result.sourceDigest, (await summarizeAudit([sample], scope)).sourceDigest);
  for (const secret of ['source-1', 'case-1', 'private-person', 'private text', '12345678', 'org-2']) assert(!JSON.stringify(result).includes(secret));
});

test('conflicting source rows and invalid reporting inputs are rejected', async () => {
  await assert.rejects(summarizeAudit([sample, { ...sample, resourceId: 'case-2' }], scope), /inconsistent/);
  await assert.rejects(summarizeAudit([{ ...sample, id: null }], scope), /identity/);
  await assert.rejects(summarizeAudit([], { ...scope, until: scope.from }), /interval/);
  await assert.rejects(summarizeAudit([], { ...scope, from: '2026-02-31T00:00:00Z' }), /date/);
  await assert.rejects(summarizeAudit([], { ...scope, organization: '' }), /organization/);
});

test('every classification links to its existing producer; unmeasured categories return no invented financial metrics', async () => {
  const result = await summarizeAudit([], scope);
  assert.deepEqual(result.unmeasured, ['search', 'offer', 'payment', 'payout']);
  for (const category of result.unmeasured) assert.equal(result.categories[category], undefined);
  for (const { sources, events } of Object.values(result.categories)) {
    assert.equal(events, 0);
    for (const { action, resource, file } of sources) {
      const code = await readFile(new URL('../' + file, import.meta.url), 'utf8');
      assert(code.includes("'" + action + "'"), action);
      assert(code.includes("'" + resource + "'"), resource);
    }
  }
});

test('the command reads an NDJSON stream and emits only a complete result', () => {
  const script = fileURLToPath(new URL('./d12-audit-summary.mjs', import.meta.url));
  const args = [script, '--organization', scope.organization, '--from', scope.from, '--until', scope.until];
  const run = input => spawnSync(process.execPath, args, { input, encoding: 'utf8' });
  const ok = run(JSON.stringify(sample) + '\n' + JSON.stringify(sample) + '\n');
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).categories.case.events, 1);
  const invalid = run(JSON.stringify(sample) + '\n' + 'private invalid line');
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert(!invalid.stderr.includes('private invalid line'));
});
