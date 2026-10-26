import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

// This suite creates only synthetic, disposable records. It never interprets a
// recorded blocker, a document status or a passing test as operational closure.
const base = new URL((process.env.STAFFING_E2E_BASE_URL || 'http://127.0.0.1:3103/api/v1').replace(/\/$/, '') + '/');
const database = new URL(process.env.DATABASE_URL || 'postgresql://missing');
for (const url of [base, database]) assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Closure fixtures require loopback API and PostgreSQL');
assert(process.env.CI === 'true' || process.env.NODE_ENV === 'test', 'Closure fixtures are test-only');
const secret = process.env.JWT_SECRET;
assert(secret && secret.length >= 32, 'Isolated API signing secret is required');
const require = createRequire(import.meta.url);
const { OPERATING_CYCLE_CLOSURE_GATES } = require('../dist/document-forms/department-operating-cycle.catalog.js');
const { decisionDigest } = require('../dist/document-forms/owner-administrative-decision.domain.js');
const gateIds = OPERATING_CYCLE_CLOSURE_GATES.map(g => g.id);
assert.equal(gateIds.length, 7);
const db = new PrismaClient(), suffix = randomUUID(), people = [], accounts = [], organizations = [];
const platformKey = 'PLATFORM_STAFFING_ORGANIZATION:v1';
const triggerName = 'hl_closure_failure_' + suffix.replaceAll('-', '');
const endpoint = 'admin/department-references/HR/assessment';
let previousPlatform, changedPlatform = false, triggerInstalled = false, checks = 0;
let owner, other, staff, org, outside, evidenceDoc;
const pass = message => console.log(`PASS ${++checks}: ${message}`);

async function actor(label, role) {
  const person = await db.person.create({ data: { firstName: 'SyntheticClosure', lastName: label } });
  people.push(person.id);
  const account = await db.account.create({ data: { personId: person.id, email: `closure-${label}-${suffix}@example.invalid`, passwordHash: 'synthetic-no-login', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  accounts.push(account.id);
  await db.roleAssignment.create({ data: { accountId: account.id, role, status: 'ACTIVE' } });
  const session = await db.session.create({ data: { accountId: account.id, tokenHash: `closure-${label}-${suffix}`, expiresAt: new Date(Date.now() + 3600000) } });
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000), body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: account.id, sid: session.id, iat: now, exp: now + 3600 })}`;
  return { ...account, token: `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}` };
}
async function call(actor, path = endpoint, method = 'GET', body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, headers: response.headers, data: await response.json().catch(() => null) };
}
async function ok(actor, path = endpoint, method = 'GET', body) {
  const result = await call(actor, path, method, body);
  assert(result.status >= 200 && result.status < 300, `${path}: ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
}
const rows = () => db.departmentClosureAssessment.findMany({ where: { organizationId: org.id }, orderBy: [{ department: 'asc' }, { revision: 'asc' }] });
const audits = () => db.auditEvent.findMany({ where: { actorId: owner.personId, resource: 'DepartmentClosureAssessment' }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
const unchangedBusiness = () => Promise.all([
  db.managedDocument.findMany({ where: { organizationId: { in: organizations } }, orderBy: { id: 'asc' } }),
  db.documentRevision.findMany({ where: { document: { organizationId: { in: organizations } } }, orderBy: { id: 'asc' } }),
  db.documentLifecycleEvent.findMany({ where: { document: { organizationId: { in: organizations } } }, orderBy: { id: 'asc' } }),
  db.documentTemplate.findMany({ where: { organizationId: { in: organizations } }, orderBy: { id: 'asc' } }),
  db.organizationMember.findMany({ where: { organizationId: { in: organizations } }, orderBy: { id: 'asc' } }),
  db.roleAssignment.findMany({ where: { accountId: { in: accounts } }, orderBy: { id: 'asc' } }),
  db.employment.count(), db.aiAgentTask.count(),
  db.policyControl.findMany({ orderBy: [{ category: 'asc' }, { ruleKey: 'asc' }] }),
]);
const inputFor = (view, evidence = evidenceDoc) => ({
  expectedRevision: view.expectedRevision,
  specificationVersion: view.specificationVersion,
  gates: gateIds.map((id, index) => ({ id, verificationStatus: index === 0 ? 'BLOCKED' : 'NOT_ASSESSED', note: index === 0 ? 'Synthetic private blocker: actual independent review has not occurred.' : '', evidence: index === 0 && evidence ? [{ documentId: evidence.id, version: evidence.version }] : [] })),
});
const preview = input => ok(owner, endpoint + '/preview', 'POST', input);
const confirm = (input, plan) => ({ ...input, expectedPlanHash: plan.expectedPlanHash, confirmed: true });
const clone = value => structuredClone(value);
async function template(department, organizationId = org.id) {
  if (organizationId !== org.id) return db.documentTemplate.create({ data: { organizationId, code: 'CI-CLOSURE-FOREIGN', titleAr: 'نموذج اصطناعي خارج النطاق', titleEn: 'Synthetic outside scope', department, fields: [{ key: 'note', labelAr: 'ملاحظة', labelEn: 'Note', type: 'TEXT', required: true }] } });
  return ok(owner, 'documents/templates', 'POST', { organizationId, code: 'CI-CLOSURE-' + department, titleAr: 'نموذج تقييم اصطناعي', titleEn: 'Synthetic closure evidence form', department, printable: true, fields: [{ key: 'note', labelAr: 'ملاحظة', labelEn: 'Note', type: 'TEXT', required: true }] });
}
async function document(t, note) {
  const payload = { note };
  return ok(owner, 'documents', 'POST', { organizationId: org.id, templateId: t.id, department: t.department, contentHash: decisionDigest(payload), payload });
}
async function deniedPreview(input, statuses = [400]) {
  const response = await call(owner, endpoint + '/preview', 'POST', input);
  assert(statuses.includes(response.status), `Expected ${statuses}, received ${response.status}: ${JSON.stringify(response.data)}`);
}
async function catalogCycle(actor = other, department = 'HR') {
  const result = await ok(actor, 'admin/department-references');
  assert.equal(result.referenceOnly, true);
  assert.equal(result.canActivate, false);
  assert.equal(result.departments.length, 14);
  return result.departments.find(d => d.code === department).operatingCycle;
}
function notClosed(view) {
  assert.equal(view.departmentClosed, false, 'A blocker assessment must never close a department');
  assert.equal(view.closureDecisionReference, null, 'An assessment reference is not a closure decision');
}
async function installAuditFailure() {
  await db.$executeRawUnsafe(`CREATE FUNCTION "${triggerName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.resource='DepartmentClosureAssessment' AND NEW.action='DEPARTMENT_CLOSURE_ASSESSMENT_RECORDED' AND NEW."actorId"::text='${owner.personId}' THEN RAISE EXCEPTION 'synthetic closure assessment audit failure'; END IF; RETURN NEW; END; $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${triggerName}"()`);
  triggerInstalled = true;
}
async function removeAuditFailure() {
  await db.$executeRawUnsafe(`DROP TRIGGER "${triggerName}" ON "AuditEvent"`); triggerInstalled = false;
  await db.$executeRawUnsafe(`DROP FUNCTION "${triggerName}"()`);
}

try {
  owner = await actor('owner', 'ADMIN'); other = await actor('other-admin', 'ADMIN'); staff = await actor('ordinary-staff', 'STAFF');
  org = await db.organization.create({ data: { displayName: 'Synthetic closure assessment only ' + suffix, kind: 'HYDROLAND_INTERNAL_PLATFORM', ownerId: owner.id, status: 'ACTIVE' } }); organizations.push(org.id);
  outside = await db.organization.create({ data: { displayName: 'Synthetic external closure scope ' + suffix, kind: 'DIVING_CENTER', ownerId: other.id, status: 'ACTIVE' } }); organizations.push(outside.id);
  previousPlatform = await db.operationalSetting.findUnique({ where: { key: platformKey } });
  await db.operationalSetting.upsert({ where: { key: platformKey }, create: { key: platformKey, value: { organizationId: org.id } }, update: { value: { organizationId: org.id }, updatedAt: new Date() } }); changedPlatform = true;
  await db.organizationMember.create({ data: { organizationId: org.id, accountId: owner.id, role: 'OWNER', status: 'ACTIVE' } });
  await db.organizationMember.create({ data: { organizationId: org.id, accountId: other.id, role: 'ADMIN', status: 'ACTIVE' } });
  await db.orgUnit.create({ data: { organizationId: org.id, type: 'DEPARTMENT', code: 'HR', nameAr: 'موارد بشرية اصطناعية' } });
  const hrTemplate = await template('HR'), financeTemplate = await template('FINANCE'), outsideTemplate = await template('HR', outside.id);
  evidenceDoc = await document(hrTemplate, 'private-payload-never-shown-in-assessments-' + suffix);
  const financeDoc = await document(financeTemplate, 'wrong-department-private-payload-' + suffix);
  const foreignDoc = await db.managedDocument.create({ data: { organizationId: outside.id, templateId: outsideTemplate.id, referenceNumber: 'OUTSIDE-' + suffix, department: 'HR', contentHash: 'outside-not-acceptance', payload: { note: 'outside-secret' }, createdByAccountId: other.id } });
  const brokenDoc = await document(hrTemplate, 'Synthetic missing revision evidence');
  await db.documentRevision.deleteMany({ where: { documentId: brokenDoc.id } });

  assert.equal((await call(null)).status, 401);
  assert.equal((await call(staff)).status, 403);
  assert.equal((await call(other)).status, 403, 'Organization ADMIN membership is not the internal owner');
  const initialResponse = await call(owner);
  assert.equal(initialResponse.status, 200);
  assert.match(initialResponse.headers.get('cache-control') || '', /private.*no-store/);
  const initial = initialResponse.data;
  assert.equal(initial.schemaVersion, 1); assert.equal(initial.policy, 'DEPARTMENT_CLOSURE_ASSESSMENT_V1'); assert.equal(initial.organizationId, org.id); assert.equal(initial.department, 'HR');
  assert.equal(initial.expectedRevision, 0); assert.equal(initial.current, null); assert.deepEqual(initial.history, []); assert.equal(initial.canRecord, true); notClosed(initial);
  assert.equal((await call(owner, 'admin/department-references/UNKNOWN/assessment')).status, 400);
  pass('anonymous, STAFF and non-owner ADMIN denied; current owner reads uncached empty scoped assessment without creating one');

  let input = inputFor(initial);
  for (const extra of [{ organizationId: outside.id }, { departmentClosed: true }, { closureDecisionReference: 'invented' }, { reviewerAccountId: other.id }, { policyVersion: 'ACCEPTED' }]) await deniedPreview({ ...input, ...extra });
  for (const value of [-1, 1.5, '0', null]) await deniedPreview({ ...input, expectedRevision: value });
  await deniedPreview({ ...input, specificationVersion: 'obsolete-specification' }, [409]);
  for (const status of ['ACCEPTED', 'PASSED', 'CLOSED', 'OWNER_APPROVED', null]) { const bad = clone(input); bad.gates[0].verificationStatus = status; await deniedPreview(bad); }
  for (const gates of [input.gates.slice(1), [...input.gates, input.gates[0]], [...input.gates.slice(1), input.gates[1]], input.gates.map((g, i) => i ? g : { ...g, id: 'UNRECOGNIZED_GATE' })]) await deniedPreview({ ...input, gates });
  for (const note of ['', 'tiny', 'x'.repeat(1001), '\u0000injected']) { const bad = clone(input); bad.gates[0].note = note; await deniedPreview(bad); }
  const duplicate = clone(input); duplicate.gates[0].evidence.push(duplicate.gates[0].evidence[0]); await deniedPreview(duplicate);
  const tooMany = clone(input); tooMany.gates[0].evidence = Array.from({ length: 4 }, () => ({ documentId: randomUUID(), version: 1 })); await deniedPreview(tooMany);
  const forged = clone(input); forged.gates[0].evidence[0].contentHash = decisionDigest('forged'); await deniedPreview(forged);
  for (const actor of [other, staff]) assert.equal((await call(actor, endpoint + '/preview', 'POST', input)).status, 403);
  pass('strict seven-gate input rejects missing/duplicate gates, acceptance/closure injection, client authority, malformed notes and evidence digests');

  for (const [doc, statuses] of [[{ id: randomUUID(), version: 1 }, [403, 404]], [foreignDoc, [403, 404]], [financeDoc, [403, 404]], [brokenDoc, [409]], [{ ...evidenceDoc, version: evidenceDoc.version + 1 }, [409]]]) await deniedPreview(inputFor(initial, doc), statuses);
  const original = await db.managedDocument.findUniqueOrThrow({ where: { id: evidenceDoc.id } });
  await db.managedDocument.update({ where: { id: evidenceDoc.id }, data: { payload: { note: 'tampered-without-matching-revision' } } });
  await deniedPreview(input, [409]);
  await db.managedDocument.update({ where: { id: evidenceDoc.id }, data: { payload: original.payload, updatedAt: original.updatedAt } });
  pass('server resolves scoped current evidence and refuses nonexistent, foreign, wrong-department, wrong-version, missing-revision and inconsistent-payload pointers');

  const beforePreview = await unchangedBusiness(), beforeRows = await rows(), beforeAudits = await audits();
  const planResponse = await call(owner, endpoint + '/preview', 'POST', input);
  assert.equal(planResponse.status, 201); assert.match(planResponse.headers.get('cache-control') || '', /private.*no-store/);
  const plan = planResponse.data;
  assert.match(plan.expectedPlanHash, /^[a-f0-9]{64}$/); assert.equal(plan.expectedRevision, 0); assert.equal(plan.organizationId, org.id); assert.equal(plan.gates.length, 7);
  assert.equal(plan.gates[0].evidence[0].documentId, evidenceDoc.id); assert.equal(plan.gates[0].evidence[0].version, evidenceDoc.version); assert.equal(plan.gates[0].evidence[0].contentHash, evidenceDoc.contentHash);
  assert(!JSON.stringify(plan).includes('private-payload-never-shown-in-assessments'));
  assert.deepEqual(await unchangedBusiness(), beforePreview); assert.deepEqual(await rows(), beforeRows); assert.deepEqual(await audits(), beforeAudits);
  for (const extra of [{ confirmed: false }, { expectedPlanHash: 'a'.repeat(64) }, { actorAccountId: other.id }, { departmentClosed: true }]) {
    const response = await call(owner, endpoint, 'POST', { ...confirm(input, plan), ...extra }); assert([400, 409].includes(response.status));
  }
  const editedConfirmation = confirm(clone(input), plan); editedConfirmation.gates[0].note = 'Changed after preview, not the confirmed assessment';
  assert.equal((await call(owner, endpoint, 'POST', editedConfirmation)).status, 409);
  assert.equal((await rows()).length, 0);
  pass('preview is read-only and returns server-resolved pointers without payload; confirmation rejects forged hash, missing consent and injected actor/closure');

  // Revisions are changed through the real document endpoint, not invented by
  // the assessment client. No old evidence version is silently upgraded.
  const revisedPayload = { note: 'Synthetic revised evidence, still not independently accepted' };
  evidenceDoc = await ok(owner, `documents/${evidenceDoc.id}/revise`, 'POST', { payload: revisedPayload, contentHash: decisionDigest(revisedPayload) });
  assert.equal((await call(owner, endpoint, 'POST', confirm(input, plan))).status, 409);
  input = inputFor(await ok(owner));
  pass('document revision between preview and confirmation invalidates the plan instead of auto-upgrading its evidence');

  for (const kind of ['role', 'membership', 'verification', 'owner-transfer', 'platform-pointer', 'account-status']) {
    const currentPlan = await preview(input);
    if (kind === 'role') {
      const where = { accountId_role: { accountId: owner.id, role: 'ADMIN' } };
      await db.roleAssignment.update({ where, data: { status: 'SUSPENDED' } }); assert.equal((await call(owner, endpoint, 'POST', confirm(input, currentPlan))).status, 403);
      await db.roleAssignment.update({ where, data: { status: 'ACTIVE' } });
    } else if (kind === 'membership') {
      const where = { organizationId_accountId: { organizationId: org.id, accountId: owner.id } };
      await db.organizationMember.update({ where, data: { status: 'SUSPENDED' } }); assert.equal((await call(owner)).status, 403);
      await db.organizationMember.update({ where, data: { status: 'ACTIVE' } });
    } else if (kind === 'verification') {
      await db.account.update({ where: { id: owner.id }, data: { emailVerifiedAt: null } }); assert([401, 403].includes((await call(owner)).status));
      await db.account.update({ where: { id: owner.id }, data: { emailVerifiedAt: new Date() } });
    } else if (kind === 'owner-transfer') {
      await db.organization.update({ where: { id: org.id }, data: { ownerId: other.id } }); assert.equal((await call(owner)).status, 403);
      await db.organization.update({ where: { id: org.id }, data: { ownerId: owner.id } });
    } else if (kind === 'platform-pointer') {
      await db.operationalSetting.update({ where: { key: platformKey }, data: { value: { organizationId: outside.id }, updatedAt: new Date() } }); assert([403, 409].includes((await call(owner)).status));
      await db.operationalSetting.update({ where: { key: platformKey }, data: { value: { organizationId: org.id }, updatedAt: new Date() } });
    } else {
      for (const status of ['SUSPENDED', 'ACTIVE']) {
        await db.$transaction(async tx => {
          await tx.account.update({ where: { id: owner.id }, data: { status } });
          await tx.auditEvent.create({ data: { actorId: owner.personId, resource: 'Account', resourceId: owner.id, action: 'ACCOUNT_STATUS_CHANGED', metadata: { status, synthetic: true } } });
        });
        if (status === 'SUSPENDED') assert([401, 403].includes((await call(owner)).status));
      }
    }
    assert.equal((await call(owner, endpoint, 'POST', confirm(input, currentPlan))).status, 409, `${kind} restoration must not resurrect a stale confirmation`);
    assert.equal((await rows()).length, 0);
    pass(`${kind} revocation takes effect immediately; restoration invalidates the old owner confirmation`);
  }

  const readyPlan = await preview(input), beforeSave = await unchangedBusiness();
  await installAuditFailure();
  assert.equal((await call(owner, endpoint, 'POST', confirm(input, readyPlan))).status, 500);
  assert.equal((await rows()).length, 0); assert.deepEqual(await audits(), beforeAudits); assert.deepEqual(await unchangedBusiness(), beforeSave);
  await removeAuditFailure();
  pass('actual PostgreSQL audit failure rolls back assessment creation and leaves documents, permissions, AI tasks and policies unchanged');

  const races = await Promise.all([call(owner, endpoint, 'POST', confirm(input, readyPlan)), call(owner, endpoint, 'POST', confirm(input, readyPlan))]);
  assert.deepEqual(races.map(r => r.status).sort(), [201, 409]);
  assert.match(races.find(r => r.status === 201).headers.get('cache-control') || '', /private.*no-store/);
  const saved = races.find(r => r.status === 201).data;
  notClosed(saved); assert.equal(saved.expectedRevision, 1); assert.equal(saved.current.state, 'BLOCKED'); assert.equal(saved.current.revision, 1); assert.equal(saved.current.assessmentCurrent, true); assert(saved.current.assessmentReference);
  const firstRows = await rows(), firstAudits = await audits();
  assert.equal(firstRows.length, 1); assert.equal(firstRows[0].createdByAccountId, owner.id); assert.equal(firstRows[0].revision, 1); assert.equal(firstRows[0].state, 'BLOCKED');
  assert.equal(firstAudits.length, 1); assert.equal(firstAudits[0].action, 'DEPARTMENT_CLOSURE_ASSESSMENT_RECORDED'); assert.equal(firstAudits[0].actorId, owner.personId); assert.equal(firstAudits[0].resourceId, saved.current.id);
  assert.equal((await call(owner, endpoint, 'POST', confirm(input, readyPlan))).status, 409);
  assert.deepEqual(await rows(), firstRows); assert.deepEqual(await unchangedBusiness(), beforeSave);
  pass('concurrent confirmed saves yield one persisted revision and actual-actor audit; replay conflicts without duplicate effects');

  const persisted = await ok(owner), summary = await catalogCycle();
  assert.equal(persisted.current.id, saved.current.id); assert.equal(persisted.current.gates[0].note, input.gates[0].note); assert.equal(persisted.history.length, 1);
  notClosed(summary); assert.equal(summary.closureAssessment, 'BLOCKED'); assert.equal(summary.closureRecord.revision, 1); assert.equal(summary.closureRecord.assessmentCurrent, true); assert.equal(summary.closureGates[0].verificationStatus, 'BLOCKED');
  const publicSummary = JSON.stringify(summary);
  for (const privateValue of [input.gates[0].note, evidenceDoc.id, owner.id, owner.personId, evidenceDoc.referenceNumber, evidenceDoc.contentHash]) assert(!publicSummary.includes(privateValue), 'Broad admin catalog must not disclose private assessment evidence or identity');
  assert.equal((await call(other)).status, 403); assert.equal((await call(other, endpoint, 'POST', confirm(input, readyPlan))).status, 403);
  const financeSummary = await catalogCycle(other, 'FINANCE'); assert.equal(financeSummary.closureAssessment, 'NOT_ASSESSED'); assert.equal(financeSummary.closureRecord, null);
  pass('owner-only detail retains blockers and source versions; other admins receive only minimal department-isolated catalog metadata');

  await ok(owner, `documents/${evidenceDoc.id}/submit`, 'POST');
  const stale = await catalogCycle();
  notClosed(stale); assert.equal(stale.closureAssessment, 'STALE'); assert.equal(stale.closureRecord.assessmentCurrent, false); assert(stale.closureGates.every(g => g.verificationStatus === 'NOT_ASSESSED'));
  const staleDetail = await ok(owner); assert.equal(staleDetail.current.assessmentCurrent, false); assert.deepEqual(await rows(), firstRows, 'Source change cannot rewrite prior assessment bytes');
  pass('source status change marks the projection stale and clears displayed gate conclusions while preserving original history');

  const secondInput = inputFor(staleDetail), secondPlan = await preview(secondInput), secondBefore = await unchangedBusiness();
  await installAuditFailure();
  assert.equal((await call(owner, endpoint, 'POST', confirm(secondInput, secondPlan))).status, 500);
  assert.deepEqual(await rows(), firstRows); assert.deepEqual(await audits(), firstAudits); assert.deepEqual(await unchangedBusiness(), secondBefore);
  await removeAuditFailure();
  pass('audit failure while appending a later revision preserves every byte of prior assessment and audit history');
  const second = await ok(owner, endpoint, 'POST', confirm(secondInput, secondPlan));
  assert.equal(second.expectedRevision, 2); assert.equal(second.current.revision, 2); assert.equal(second.current.assessmentCurrent, true); assert.equal(second.history.length, 2); notClosed(second);
  const secondRows = await rows(); assert.equal(secondRows.length, 2); assert.deepEqual(secondRows[0], firstRows[0]); assert.equal(secondRows[1].previousAssessmentId, firstRows[0].id); assert.equal((await audits()).length, 2);
  assert.deepEqual(await unchangedBusiness(), secondBefore);
  const emptyInput = inputFor(second, null); emptyInput.gates = emptyInput.gates.map(g => ({ ...g, verificationStatus: 'NOT_ASSESSED', note: '', evidence: [] }));
  const emptyPlan = await preview(emptyInput), empty = await ok(owner, endpoint, 'POST', confirm(emptyInput, emptyPlan));
  assert.equal(empty.current.state, 'NOT_ASSESSED'); assert.equal(empty.expectedRevision, 3); notClosed(empty); assert.equal((await rows()).length, 3);
  assert.deepEqual((await rows()).slice(0, 2), secondRows);
  assert.equal((await catalogCycle()).closureAssessment, 'NOT_ASSESSED');
  pass('new revisions append without replacing earlier evidence; empty evidence remains explicitly unassessed, never accepted or closed');

  if (process.env.CLOSURE_E2E_BROWSER === '1') {
    const { chromium } = await import('@playwright/test');
    const { readFileSync, existsSync, mkdirSync } = await import('node:fs');
    const shippedPath = new URL('../../web/dist/hydroland-department-references.js', import.meta.url);
    assert(existsSync(shippedPath), 'Build the shipped web bundle before connected browser acceptance');
    const shipped = readFileSync(shippedPath, 'utf8');
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
    const contexts = [];
    async function actualPage(a) {
      const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, bypassCSP: true }); contexts.push(context);
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      await page.goto(new URL('health', base).href);
      await page.setContent('<!doctype html><html dir="rtl" lang="ar"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><section id="hl-admin-employees"><div data-staff-readiness></div></section></body></html>');
      for (const file of ['styles.css', 'hydroland-design-system.css', 'hydroland-admin-employees.css']) {
        const path = new URL('../../web/dist/' + file, import.meta.url);
        if (existsSync(path)) await page.addStyleTag({ content: readFileSync(path, 'utf8') });
      }
      await page.evaluate(({ token, api }) => {
        const request = async (path, init = {}) => fetch(api + path.replace(/^\//, ''), { ...init, headers: { ...init.headers, authorization: 'Bearer ' + token } });
        window.HydrolandAuth = { isAuthenticated: () => true, getSessionVersion: () => 1, authorizedFetch: request };
        window.HydrolandPortalAccess = {
          getCurrentRole: () => 'admin', roleAllowed: () => true,
          authorizeRole: async () => { const response = await request('/me'); const profile = await response.json(); return response.ok && profile.roleAssignments?.some(r => r.role === 'ADMIN' && r.status === 'ACTIVE'); },
        };
      }, { token: a.token, api: base.href });
      await page.addScriptTag({ content: shipped });
      await page.locator('[data-department-references] > summary').click();
      await page.waitForFunction(() => document.querySelector('[data-reference-status]')?.textContent.includes('وقت القراءة'));
      await page.locator('[data-reference-department]').selectOption('HR');
      return page;
    }
    try {
      const ownerPage = await actualPage(owner), beforeBrowser = await rows(), beforeBrowserBusiness = await unchangedBusiness();
      await ownerPage.locator('[data-closure-open]').click();
      await ownerPage.locator('[data-closure-form]').waitFor();
      await ownerPage.getByLabel('حالة REFERENCE_APPLICABILITY', { exact: true }).selectOption('BLOCKED');
      await ownerPage.getByLabel('ملاحظة REFERENCE_APPLICABILITY', { exact: true }).fill('Synthetic connected browser blocker; no independent review or acceptance');
      await ownerPage.getByLabel('أدلة REFERENCE_APPLICABILITY', { exact: true }).fill(evidenceDoc.id + ' ' + evidenceDoc.version);
      await ownerPage.locator('[data-closure-preview]').click();
      await ownerPage.locator('[data-closure-confirmed]').waitFor();
      assert.deepEqual(await rows(), beforeBrowser, 'Actual browser preview must not create a revision');
      assert.equal(await ownerPage.locator('[data-closure-save]').isDisabled(), true);
      await ownerPage.locator('[data-closure-confirmed]').check();
      // Repeated DOM clicks exercise the shipped in-flight guard without
      // intercepting, fulfilling or replacing any live API response.
      await ownerPage.locator('[data-closure-save]').evaluate(button => { button.click(); button.click(); });
      await ownerPage.waitForFunction(() => document.querySelector('[data-closure-status]')?.textContent.includes('حُفظ تقييم النواقص'));
      const browserRows = await rows(); assert.equal(browserRows.length, beforeBrowser.length + 1); assert.deepEqual(browserRows.slice(0, beforeBrowser.length), beforeBrowser);
      assert.equal(browserRows.at(-1).createdByAccountId, owner.id); assert.equal(browserRows.at(-1).state, 'BLOCKED');
      assert.deepEqual(await unchangedBusiness(), beforeBrowserBusiness);
      pass('shipped owner browser previews without writes and explicitly saves exactly one blocker revision through live HTTP/PostgreSQL despite repeated clicks');

      await ownerPage.getByRole('button', { name: 'إغلاق تقييم النواقص', exact: true }).click();
      assert.equal(await ownerPage.locator('[data-closure-form]').count(), 0);
      await ownerPage.locator('[data-reference-refresh]').click();
      await ownerPage.waitForFunction(() => document.querySelector('[data-reference-status]')?.textContent.includes('وقت القراءة'));
      await ownerPage.locator('[data-closure-open]').click(); await ownerPage.locator('[data-closure-form]').waitFor();
      assert.equal(await ownerPage.getByLabel('حالة REFERENCE_APPLICABILITY', { exact: true }).inputValue(), 'BLOCKED');
      await ownerPage.setViewportSize({ width: 390, height: 844 });
      assert.equal(await ownerPage.locator('[data-closure-editor]').evaluate(element => element.scrollWidth <= element.clientWidth + 2), true, 'Assessment controls must remain contained on mobile');
      mkdirSync('/tmp/closure-assessment-evidence', { recursive: true });
      await ownerPage.screenshot({ path: '/tmp/closure-assessment-evidence/owner-mobile.png', fullPage: true });
      pass('actual saved assessment survives dismissal and fresh reads; private controls remain contained in mobile viewport');

      const outsiderPage = await actualPage(other);
      await outsiderPage.locator('[data-closure-open]').click();
      await outsiderPage.waitForFunction(() => document.querySelector('[data-closure-status]')?.textContent.includes('للمالك المتحقق فقط'));
      assert.equal(await outsiderPage.locator('[data-closure-form]').count(), 0);
      assert.equal(await outsiderPage.locator('[data-closure-private]').innerText(), '');
      assert(!(await outsiderPage.locator('body').innerText()).includes(evidenceDoc.id));
      assert.equal((await rows()).length, browserRows.length);
      pass('actual unrelated ADMIN browser reads minimal catalog metadata but live API denies private blocker evidence and editing');
    } finally {
      for (const context of contexts) await context.close();
      await browser.close();
    }
  }

  console.log(`${checks} real HTTP/PostgreSQL closure-assessment groups passed. This verifies persisted blockers only, not departmental operational acceptance or closure.`);
} finally {
  if (triggerInstalled) await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "AuditEvent"`);
  await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${triggerName}"()`);
  if (changedPlatform) {
    const current = await db.operationalSetting.findUnique({ where: { key: platformKey } });
    assert.equal(current?.value?.organizationId, org.id, 'Do not overwrite another fixture owner');
    if (previousPlatform) await db.operationalSetting.update({ where: { key: platformKey }, data: { value: previousPlatform.value, updatedAt: previousPlatform.updatedAt } });
    else await db.operationalSetting.delete({ where: { key: platformKey } });
  }
  await db.departmentClosureAssessment.deleteMany({ where: { organizationId: { in: organizations } } });
  const ids = (await db.managedDocument.findMany({ where: { organizationId: { in: organizations } }, select: { id: true } })).map(d => d.id);
  await db.documentLifecycleEvent.deleteMany({ where: { documentId: { in: ids } } });
  await db.documentRevision.deleteMany({ where: { documentId: { in: ids } } });
  await db.managedDocument.deleteMany({ where: { id: { in: ids } } });
  await db.documentTemplate.deleteMany({ where: { organizationId: { in: organizations } } });
  await db.documentReferenceCounter.deleteMany({ where: { organizationId: { in: organizations } } });
  await db.documentBrandSnapshot.deleteMany({ where: { organizationId: { in: organizations } } });
  await db.orgUnit.deleteMany({ where: { organizationId: { in: organizations } } });
  await db.organizationMember.deleteMany({ where: { organizationId: { in: organizations } } });
  await db.organization.deleteMany({ where: { id: { in: organizations } } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: people } } });
  await db.notification.deleteMany({ where: { accountId: { in: accounts } } });
  await db.session.deleteMany({ where: { accountId: { in: accounts } } });
  await db.roleAssignment.deleteMany({ where: { accountId: { in: accounts } } });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.person.deleteMany({ where: { id: { in: people } } });
  await db.$disconnect();
}
