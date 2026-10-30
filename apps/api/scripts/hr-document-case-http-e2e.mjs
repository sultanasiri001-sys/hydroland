import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

// This is an executable synthetic acceptance case, never personnel evidence.
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
const base = new URL(process.env.FORM_LIBRARY_E2E_BASE_URL || 'http://127.0.0.1:3114/api/v1/');
const loopback = ['localhost', '127.0.0.1', '[::1]'];
if (process.env.NODE_ENV !== 'test' || process.env.FORM_LIBRARY_E2E_CONFIRM !== 'ISOLATED_LOOPBACK_DATABASE' ||
    database.pathname !== '/hydroland_form_library_ci' || !loopback.includes(database.hostname) || !loopback.includes(base.hostname)) {
  throw Error('A dedicated loopback test database and API are required; production is refused.');
}
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw Error('An isolated test signing secret is required.');
const require = createRequire(import.meta.url);
const { reviewedAdministrativeTemplates } = require('../dist/document-forms/administrative-form-catalog.js');
const db = new PrismaClient(), suffix = randomUUID(), people = [], accounts = [];
const caseId = `SYNTHETIC-HR-${suffix}`, platformKey = 'PLATFORM_STAFFING_ORGANIZATION:v1';
const output = process.env.HR_DOCUMENT_CASE_OUTPUT || '/tmp/hr-document-case-evidence';
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const report = {
  caseId, kind: 'SYNTHETIC_HR_DOCUMENT_ACCEPTANCE_V1', startedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  nodeVersion: process.version, productionClosure: false, professionalApproval: false,
  scope: 'One isolated employee case, all 21 HR administrative forms, persisted HTTP document decisions and selected HR runtime actions.',
  excluded: ['Real identity verification', 'Independent legal approval', 'Official employment-contract registration', 'Bank payment', 'Professional operational acceptance'],
  fixtures: [], checks: [], documents: [], status: 'RUNNING', cleanup: 'NOT_RUN',
};
let org, previous, changed = false, controlId;
const pass = name => { report.checks.push(name); console.log(`PASS ${report.checks.length}: ${name}`); };
const fixture = (name, id, execution = 'DATABASE_FIXTURE') => { report.fixtures.push({ name, id, execution, realWorldEvidence: false }); return id; };
async function actor(label, role = 'STAFF') {
  const p = await db.person.create({ data: { firstName: 'اختبار موارد بشرية', lastName: label } }); people.push(p.id);
  const a = await db.account.create({ data: { personId: p.id, email: `hr-case-${label}-${suffix}@example.invalid`, passwordHash: 'synthetic-no-login', status: 'ACTIVE', emailVerifiedAt: new Date() } }); accounts.push(a.id);
  if (role) await db.roleAssignment.create({ data: { accountId: a.id, role, status: 'ACTIVE' } });
  const session = await db.session.create({ data: { accountId: a.id, tokenHash: `hr-case-${label}-${suffix}`, expiresAt: new Date(Date.now() + 3600000) } });
  const enc = v => Buffer.from(JSON.stringify(v)).toString('base64url'), now = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: a.id, sid: session.id, iat: now, exp: now + 3600 })}`;
  return { ...a, token: `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}` };
}
async function call(a, path, method = 'GET', body, binary = false) {
  const r = await fetch(new URL(path, base), { method, headers: { ...(a ? { authorization: `Bearer ${a.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
  const data = binary ? Buffer.from(await r.arrayBuffer()) : await r.json();
  return { status: r.status, headers: r.headers, data };
}
async function ok(a, path, method = 'GET', body) {
  const r = await call(a, path, method, body);
  assert.ok(r.status >= 200 && r.status < 300, `${path}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}
async function activeStaff(a, unit) {
  await db.organizationMember.create({ data: { organizationId: org.id, accountId: a.id, role: 'STAFF', status: 'ACTIVE' } });
  const position = await db.position.create({ data: { orgUnitId: unit.id, code: `CASE-${a.id}`, titleAr: 'دور مراجعة اصطناعي', active: true } });
  await db.employment.create({ data: { accountId: a.id, organizationId: org.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE', startsAt: new Date('2026-10-01T00:00:00Z') } });
}
const rows = d => db.managedDocument.findUniqueOrThrow({ where: { id: d.id }, include: { revisions: { orderBy: { version: 'asc' } }, lifecycleEvents: { orderBy: { occurredAt: 'asc' } } } });
try {
  await mkdir(output, { recursive: true });
  report.databaseVersion = (await db.$queryRawUnsafe('SELECT version() AS version'))[0].version;
  const owner = await actor('owner', 'ADMIN'), maker = await actor('requester', 'ADMIN');
  const reviewer = await actor('reviewer'), signer = await actor('signer'), subject = await actor('employee', 'DIVER'), outsider = await actor('outsider', 'ADMIN'), iam = await actor('iam');
  org = await db.organization.create({ data: { displayName: `${caseId} — اختبار غير نافذ`, kind: 'HYDROLAND_INTERNAL_PLATFORM', ownerId: owner.id, status: 'ACTIVE' } });
  previous = await db.operationalSetting.findUnique({ where: { key: platformKey } });
  await db.operationalSetting.upsert({ where: { key: platformKey }, create: { key: platformKey, value: { organizationId: org.id } }, update: { value: { organizationId: org.id } } }); changed = true;
  const unit = await db.orgUnit.create({ data: { organizationId: org.id, type: 'DEPARTMENT', code: 'HR', nameAr: 'موارد بشرية — اختبار غير نافذ', active: true } });
  await db.roleAssignment.create({ data: { accountId: owner.id, role: 'STAFF', status: 'ACTIVE' } });
  for (const a of [owner, reviewer, signer]) await activeStaff(a, unit);
  for (const [a, role] of [[owner, 'HR_EXECUTIVE'], [maker, 'HR_MANAGER'], [iam, 'IAM_SERVICE']]) {
    await db.roleAssignment.create({ data: { accountId: a.id, role, status: 'ACTIVE', scope: { organizationIds: [org.id] } } });
    if (![owner.id].includes(a.id)) await db.organizationMember.create({ data: { organizationId: org.id, accountId: a.id, role: 'STAFF', status: 'ACTIVE' } });
  }
  const requested = await ok(maker, 'admin/employees', 'POST', { mode: 'LINK', accountId: subject.id, departmentCode: 'HR', jobTitle: 'حالة موظف افتراضي لاختبار النماذج', profile: 'HR_MANAGER', reason: `${caseId}: اختبار غير نافذ`, reviewed: true, requestId: randomUUID() });
  const decide = (row, action) => ({ action, reason: `${caseId}: قرار اختبار غير نافذ`, reviewed: true, expectedUpdatedAt: row.updatedAt });
  let movement = await ok(owner, `admin/employees/${requested.id}/decision`, 'PATCH', decide(requested, 'REVIEW'));
  const before = await db.employment.findUniqueOrThrow({ where: { id: movement.employment.id } });
  const denied = await call(owner, `admin/employees/${movement.id}/decision`, 'PATCH', decide(movement, 'APPROVE'));
  assert.equal(denied.status, 409); assert.deepEqual(await db.employment.findUniqueOrThrow({ where: { id: before.id } }), before);
  pass('Actual staffing request and review persist; missing compliance prevents activation without partial mutation.');
  const control = await db.policyControl.create({ data: { category: 'HR_COMPLIANCE', ruleKey: caseId, labelAr: 'ضابط اصطناعي للاختبار فقط', state: 'ENABLED', metadata: { mandatory: true, applicable: true, testOnly: true, regulatoryRequirementId: 'SYNTHETIC-NOT-A-LEGAL-REQUIREMENT', regulatoryVersion: 'SYNTHETIC-ONLY', evidenceIds: [`urn:${caseId}:fixture`], validationStatus: 'VALID' } } }); controlId = control.id;
  fixture('Compliance input; not an approved legal requirement', control.id);
  movement = await ok(owner, `admin/employees/${movement.id}/decision`, 'PATCH', decide(movement, 'APPROVE'));
  assert.equal(movement.status, 'EFFECTIVE'); assert.equal(movement.effectiveAccess, true);
  const employment = await db.employment.findUniqueOrThrow({ where: { id: movement.employment.id } });
  assert.equal(employment.status, 'ACTIVE');
  assert.equal(await db.auditEvent.count({ where: { resourceId: employment.id, action: 'STAFFING_IAM_APPLIED' } }), 1);
  fixture('Employee and appointment created, reviewed and activated through HTTP', employment.id, 'HTTP_RUNTIME');
  pass('Platform-owner appointment applies scoped roles and emits one actual isolated IAM audit.');

  const contract = await db.employmentContract.create({ data: { employmentId: employment.id, contractType: 'SYNTHETIC-DRAFT-ONLY', effectiveFrom: new Date('2026-10-01'), status: 'DRAFT' } });
  fixture('Unsigned employment contract placeholder; no legal or official approval', contract.id);
  const leave = await db.leaveRequest.create({ data: { employmentId: employment.id, type: 'SYNTHETIC-ANNUAL', status: 'APPROVED', startsAt: new Date('2026-10-20'), endsAt: new Date('2026-10-21'), requestedByAccountId: maker.id, approvedByAccountId: owner.id } });
  fixture('Leave record and approval prepared as test input', leave.id);
  await ok(owner, `hr/employments/${employment.id}/status`, 'PATCH', { action: 'CHANGE_EMPLOYMENT', nextStatus: 'ON_LEAVE', context: { organizationId: org.id } });
  await ok(owner, `hr/employments/${employment.id}/status`, 'PATCH', { action: 'CHANGE_EMPLOYMENT', nextStatus: 'ACTIVE', context: { organizationId: org.id } });
  const attendance = await db.attendanceEntry.create({ data: { employmentId: employment.id, workDate: new Date('2026-10-22'), clockInAt: new Date('2026-10-22T05:00:00Z'), clockOutAt: new Date('2026-10-22T13:00:00Z'), status: 'PRESENT' } }); fixture('Attendance / return source record', attendance.id);
  const commencement = await db.attendanceEntry.create({ data: { employmentId: employment.id, workDate: new Date('2026-10-01'), clockInAt: new Date('2026-10-01T05:00:00Z'), status: 'PRESENT' } }); fixture('Commencement source input; not real attendance', commencement.id);
  const performance = await db.performanceCycle.create({ data: { employmentId: employment.id, periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-30'), status: 'SYNTHETIC-REVIEW', goals: { testOnly: true } } }); fixture('Performance review source record', performance.id);
  const compensation = await db.compensationTerm.create({ data: { employmentId: employment.id, effectiveFrom: new Date('2026-10-01'), baseAmountMinor: 500000, currency: 'SAR', status: 'APPROVAL_REQUIRED', requestedByAccountId: maker.id, reviewedByAccountId: reviewer.id } });
  assert.equal((await ok(owner, `hr/employments/compensation/${compensation.id}/approve`, 'PATCH', { context: { organizationId: org.id } })).status, 'APPROVED');
  fixture('Compensation request seeded; approval executed through HTTP', compensation.id, 'FIXTURE_REQUEST_HTTP_APPROVAL');
  const relations = await ok(maker, `hr/employments/${employment.id}/relations`, 'POST', { caseType: 'DISCIPLINARY', summary: `${caseId}: واقعة اصطناعية غير حقيقية` });
  await db.employeeRelationsCase.update({ where: { id: relations.id }, data: { reviewedByAccountId: reviewer.id, decision: 'قرار اختبار فقط', status: 'APPROVAL_REQUIRED' } });
  assert.equal((await ok(owner, `hr/employments/relations/${relations.id}/disciplinary-approval`, 'PATCH', { context: { organizationId: org.id } })).status, 'APPROVED');
  fixture('Relations opened and decision approved over HTTP; review input seeded', relations.id, 'HTTP_WITH_SEEDED_REVIEW');
  const grievance = await ok(maker, `hr/employments/${employment.id}/relations`, 'POST', { caseType: 'GRIEVANCE', summary: `${caseId}: تظلم افتراضي مرتبط بالقرار ${relations.id}` });
  fixture('Grievance opened through HTTP; no real dispute or external decision', grievance.id, 'HTTP_RUNTIME');
  pass('Leave and return state transitions, compensation approval and relations decision run through the isolated API.');

  const termination = await db.employmentMovement.create({ data: { employmentId: employment.id, type: 'TERMINATION', status: 'APPROVAL_REQUIRED', requestedByAccountId: maker.id, reviewedByAccountId: reviewer.id, reason: `${caseId}: خروج اصطناعي` } });
  const offboarding = await db.offboardingCase.create({ data: { employmentId: employment.id, status: 'APPROVED', reason: `${caseId}: تسليم عهد وتسوية اصطناعيان`, clearance: { completed: true, testOnly: true, payrollPaid: false, realSettlement: false } } });
  fixture('Approved offboarding/clearance input; no real settlement or property handoff', offboarding.id);
  const liveSession = await db.session.create({ data: { accountId: subject.id, tokenHash: `${caseId}:active-session`, expiresAt: new Date(Date.now() + 3600000) } });
  await ok(owner, `hr/employments/${employment.id}/status`, 'PATCH', { action: 'APPROVE_TERMINATION', nextStatus: 'TERMINATED', context: { organizationId: org.id } });
  await ok(iam, `hr/employments/${employment.id}/status`, 'PATCH', { action: 'APPLY_IAM_CHANGE', nextStatus: 'OFFBOARDED', context: { organizationId: org.id } });
  assert.equal((await db.employment.findUniqueOrThrow({ where: { id: employment.id } })).status, 'OFFBOARDED');
  assert.ok((await db.session.findUniqueOrThrow({ where: { id: liveSession.id } })).revokedAt);
  assert.equal(await db.session.count({ where: { accountId: subject.id, revokedAt: null } }), 0);
  assert.equal(await db.roleAssignment.count({ where: { accountId: subject.id, status: 'ACTIVE' } }), 0);
  assert.equal((await db.offboardingCase.findUniqueOrThrow({ where: { id: offboarding.id } })).status, 'CLOSED');
  const iamAudit = await db.auditEvent.findFirstOrThrow({ where: { resourceId: employment.id, action: 'HR_EMPLOYMENT_STATUS_CHANGED', metadata: { path: ['hrAction'], equals: 'APPLY_IAM_CHANGE' } } });
  pass('Actual termination and IAM offboarding revoke a live session and all active subject roles.');

  const root = `documents/organizations/${org.id}/template-completion`, plan = await ok(owner, `${root}?department=HR`);
  assert.equal(plan.summary.source, 21);
  await ok(owner, root, 'POST', { department: 'HR', expectedPlanHash: plan.planHash, confirmed: true });
  const templates = await db.documentTemplate.findMany({ where: { organizationId: org.id, department: 'HR', status: 'ACTIVE' }, orderBy: { code: 'asc' } });
  const expected = reviewedAdministrativeTemplates(org.id).filter(t => t.department === 'HR');
  assert.equal(templates.length, 21); assert.deepEqual(templates.map(t => t.code).sort(), expected.map(t => t.code).sort());
  for (const t of templates) assert.deepEqual(t.fields, expected.find(e => e.code === t.code).fields);
  pass('All 21 actual HR definitions are initialized atomically and match their current source fields.');

  const refs = { employeeNo: employment.id, employeeReference: employment.id, movementReference: movement.id, appointmentReference: movement.id, positionReference: employment.positionId, contractReference: contract.id, compensationReference: compensation.id, leaveReference: leave.id, attendanceReference: attendance.id, caseReference: relations.id, offboardingReference: offboarding.id, iamReference: iamAudit.id, auditReference: iamAudit.id, period: '2026-10', departmentCode: 'HR', positionTitle: 'موظف اختبار غير نافذ', headcount: 1, effectiveDate: '2026-10-01', commencementDate: '2026-10-01', returnDate: '2026-10-22', startDate: '2026-10-20', endDate: '2026-10-21', leaveType: 'اختبار إجازة', rating: 'اختبار فقط' };
  report.employee = { id: employment.id, appointmentId: movement.id, terminationId: termination.id, offboardingId: offboarding.id, iamAuditId: iamAudit.id, contractId: contract.id, finalStatus: 'OFFBOARDED', legalApproval: false, officialRegistration: false };
  const reviewRoot = d => `document-reviews/organizations/${org.id}/documents/${d.id}`;
  async function assign(d) {
    const input = { reviewerAccountId: reviewer.id, signerAccountId: signer.id, expectedDocumentVersion: d.version, expiresAt: new Date(Date.now() + 86400000).toISOString(), reason: `${caseId}: اختبار مستقل لحسابات اصطناعية` };
    const p = await ok(owner, reviewRoot(d) + '/plan', 'POST', input);
    return ok(owner, reviewRoot(d) + '/assignment', 'POST', { ...input, expectedPlanHash: p.planHash, confirmed: true });
  }
  async function decision(a, d, action) {
    const view = await ok(a, reviewRoot(d) + '/view');
    return ok(a, reviewRoot(d) + '/decisions', 'POST', { action, expectedVersion: view.source.version, reviewHash: view.reviewHash, note: `${caseId}: قرار اختبار غير نافذ`, confirmed: true });
  }
  for (const [index, t] of templates.entries()) {
    const payload = Object.fromEntries(t.fields.map(f => [f.key, refs[f.key] ?? (f.type === 'DATE' ? '2026-10-30' : f.type === 'NUMBER' ? 1 : `${caseId}: مرجع اصطناعي غير نافذ — ${f.labelAr}`)]));
    if (t.code === 'HR-COMMENCEMENT') payload.evidenceReference = commencement.id;
    if (t.code === 'HR-GRIEVANCE-RECORD') { payload.caseReference = grievance.id; payload.decisionReference = relations.id; }
    if (t.code === 'HR-EMPLOYEE-REPORT') payload.status = 'OFFBOARDED';
    payload.recordDetails = `${caseId}: هذه الحالة افتراضية. المراجع غير المنفذة خارجيًا مدخلات اختبار، وليست هوية أو عقدًا أو صرفًا أو رأيًا قانونيًا فعليًا.`;
    if (!t.fields.some(f => f.key === 'recordDetails')) delete payload.recordDetails;
    const input = { organizationId: org.id, templateId: t.id, department: 'HR', contentHash: hash(payload), payload };
    if (index === 0) {
      const invalid = { ...payload }; delete invalid[t.fields.find(f => f.required).key];
      assert.equal((await call(owner, 'documents', 'POST', { ...input, payload: invalid })).status, 400);
      assert.equal(await db.managedDocument.count({ where: { organizationId: org.id } }), 0);
    }
    let d = await ok(owner, 'documents', 'POST', input);
    assert.equal((await call(outsider, `documents/${d.id}`)).status, 403);
    await ok(owner, `documents/${d.id}/submit`, 'POST');
    assert.equal((await call(owner, `documents/${d.id}/approve`, 'POST')).status, 400);
    await assign(d);
    if (index === 0) {
      const original = await rows(d); await decision(reviewer, d, 'RETURN');
      const returned = await rows(d); assert.equal(returned.status, 'DRAFT'); assert.equal(returned.version, 2); assert.deepEqual(returned.revisions[0], original.revisions[0]);
      if (Object.hasOwn(payload, 'recordDetails')) payload.recordDetails += ' تصحيح اختبار موثق.';
      await ok(owner, `documents/${d.id}/revise`, 'POST', { contentHash: hash(payload), payload });
      await ok(owner, `documents/${d.id}/submit`, 'POST'); d = await rows(d); await assign(d);
    }
    const approval = await decision(reviewer, d, 'APPROVE'), signature = await decision(signer, d, 'SIGN');
    const signed = await rows(d);
    assert.equal(signed.status, 'SIGNED'); assert.equal(signed.createdByAccountId, owner.id); assert.equal(signed.approvedByAccountId, reviewer.id); assert.equal(signed.signedByAccountId, signer.id);
    assert.deepEqual(signed.payload, payload); assert.equal(signed.templateId, t.id);
    const pdf = await call(owner, `documents/${d.id}/pdf`, 'GET', undefined, true);
    assert.equal(pdf.status, 200); assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-'); assert.ok(pdf.data.length > 1000);
    await writeFile(`${output}/${t.code}.pdf`, pdf.data);
    await ok(owner, `documents/${d.id}/archive`, 'POST');
    const archived = await rows(d); assert.equal(archived.status, 'ARCHIVED'); assert.deepEqual(archived.revisions, signed.revisions); assert.deepEqual(archived.payload, signed.payload);
    report.documents.push({ code: t.code, titleAr: t.titleAr, id: d.id, referenceNumber: d.referenceNumber, employeeId: employment.id, templateId: t.id, templateVersion: t.version, version: archived.version, state: archived.status, payloadHash: hash(archived.payload), pdfSha256: hash(pdf.data), pdfBytes: pdf.data.length, revisionCount: archived.revisions.length, events: archived.lifecycleEvents.map(e => ({ action: e.action, version: e.version, actorAccountId: e.actorAccountId })), approvalReceipt: approval.receipt, signatureReceipt: signature.receipt, interpretation: 'Synthetic document lifecycle acceptance only; source references do not prove external execution.' });
    pass(`${t.code}: created, independently reviewed, test-signed, printed and archived with pinned payload.`);
  }
  assert.equal(report.documents.length, 21);
  const original = report.documents.find(d => d.code === 'HR-EMPLOYEE-REPORT');
  const pinned = await rows(original), template = templates.find(t => t.code === original.code);
  await ok(owner, `documents/templates/${template.id}`, 'PUT', { titleAr: 'تقرير بيانات موظف — إصدار اختبار تالٍ' });
  assert.deepEqual(await rows(original), pinned);
  pass('Publishing a later template version preserves the previously archived employee document and decisions.');

  assert.equal(await db.managedDocument.count({ where: { organizationId: org.id, status: 'ARCHIVED' } }), 21);
  pass('All 21 archived documents retain the same canonical employee and actual isolated runtime references.');
  report.status = 'PASSED';
  console.log(`${report.checks.length} checks passed; 21 synthetic documents. No production or professional closure is asserted.`);
} catch (error) {
  report.status = 'FAILED'; report.error = error instanceof Error ? error.message : String(error); throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  try {
    if (changed) { if (previous) await db.operationalSetting.update({ where: { key: platformKey }, data: { value: previous.value, updatedAt: previous.updatedAt } }); else await db.operationalSetting.deleteMany({ where: { key: platformKey } }); }
    if (org) {
      await db.operationalSetting.deleteMany({ where: { OR: [{ key: { startsWith: `INTERNAL_DOCUMENT_REVIEW:v1:${org.id}:` } }, ...accounts.map(id => ({ key: { startsWith: `STAFFING_REQUEST:${id}:` } }))] } });
      const ids = (await db.managedDocument.findMany({ where: { organizationId: org.id }, select: { id: true } })).map(d => d.id);
      await db.documentLifecycleEvent.deleteMany({ where: { documentId: { in: ids } } }); await db.documentRevision.deleteMany({ where: { documentId: { in: ids } } }); await db.managedDocument.deleteMany({ where: { id: { in: ids } } });
      await db.documentTemplate.deleteMany({ where: { organizationId: org.id } }); await db.documentReferenceCounter.deleteMany({ where: { organizationId: org.id } }); await db.documentBrandSnapshot.deleteMany({ where: { organizationId: org.id } });
      const employmentIds = (await db.employment.findMany({ where: { organizationId: org.id }, select: { id: true } })).map(e => e.id);
      for (const model of ['employmentContract', 'employmentMovement', 'leaveRequest', 'attendanceEntry', 'shiftAssignment', 'compensationTerm', 'performanceCycle', 'employeeRelationsCase', 'offboardingCase']) await db[model].deleteMany({ where: { employmentId: { in: employmentIds } } });
      await db.employment.deleteMany({ where: { organizationId: org.id } }); await db.position.deleteMany({ where: { orgUnit: { organizationId: org.id } } }); await db.orgUnit.deleteMany({ where: { organizationId: org.id } });
      await db.organizationMember.deleteMany({ where: { organizationId: org.id } }); await db.organization.deleteMany({ where: { id: org.id } });
    }
    if (controlId) await db.policyControl.deleteMany({ where: { id: controlId } });
    await db.notification.deleteMany({ where: { accountId: { in: accounts } } }); await db.auditEvent.deleteMany({ where: { actorId: { in: people } } });
    await db.roleAssignment.deleteMany({ where: { accountId: { in: accounts } } }); await db.session.deleteMany({ where: { accountId: { in: accounts } } }); await db.account.deleteMany({ where: { id: { in: accounts } } }); await db.person.deleteMany({ where: { id: { in: people } } });
    report.cleanup = 'PASSED';
  } catch (error) { report.cleanup = 'FAILED'; report.cleanupError = String(error); process.exitCode = 1; }
  await db.$disconnect(); await mkdir(output, { recursive: true }); await writeFile(`${output}/receipt.json`, JSON.stringify(report, null, 2) + '\n');
}
