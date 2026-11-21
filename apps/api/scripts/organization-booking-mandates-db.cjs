'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { OrganizationBookingMandateService } = require('../dist/finance/organization-booking-mandate.service');
const { FinanceOperationGrantService } = require('../dist/finance/finance-operation-grant.service');
const { requireFinancialOperationMandate, BOOKING_PREPAYMENT_OPERATION } = require('../dist/finance/finance-operation-mandate');

const url = new URL(process.env.DATABASE_URL);
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.equal(process.env.NODE_ENV, 'test');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.equal(url.pathname, '/commerce_test_operations');
const prisma = new PrismaClient();
const rollback = new Error('ROLLBACK_SYNTHETIC_MANDATE_FIXTURE');
const status = code => error => error.getStatus?.() === code;

async function run(tx) {
  const db = { serializable: fn => fn(tx) };
  const mandates = new OrganizationBookingMandateService(db);
  const refundGrants = new FinanceOperationGrantService(db);
  const actors = [];
  for (const name of ['platform', 'issuer', 'signer', 'delegate', 'approver']) {
    const row = await tx.account.create({ data: { email: randomUUID() + '@example.invalid', passwordHash: 'fixture',
      status: 'ACTIVE', emailVerifiedAt: new Date(), person: { create: { firstName: 'Test', lastName: name } } } });
    actors.push(row);
  }
  const [platform, issuer, signer, delegate, approver] = actors;
  process.env.D12_OWNER_EMAIL = platform.email;
  await tx.roleAssignment.create({ data: { accountId: platform.id, role: 'ADMIN', status: 'ACTIVE' } });
  const platformOrg = await tx.organization.create({ data: { kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE',
    ownerId: platform.id, displayName: 'Test platform' } });
  await tx.operationalSetting.upsert({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' },
    create: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: { organizationId: platformOrg.id } }, update: { value: { organizationId: platformOrg.id } } });
  const org = await tx.organization.create({ data: { kind: 'COMPANY', status: 'ACTIVE', ownerId: issuer.id, displayName: 'Test buyer' } });
  for (const account of [signer, delegate, issuer, approver]) await tx.organizationMember.create({
    data: { organizationId: org.id, accountId: account.id, role: account === delegate ? 'VIEWER' : 'ADMIN', status: 'ACTIVE' } });
  const template = await tx.documentTemplate.create({ data: { organizationId: org.id, code: 'FIN-MANDATE', titleAr: 'تفويض مالي',
    titleEn: 'Booking mandate', department: 'FINANCE', fields: [] } });
  const terms = { purpose: 'ORGANIZATION_BOOKING_PREPAYMENT', decision: 'APPOINT', delegateAccountId: delegate.id,
    currency: 'SAR', limitMinor: '65000', validFrom: new Date(Date.now()-60000).toISOString(), validUntil: new Date(Date.now()+3600000).toISOString() };
  async function document(payload, signed = true) {
    const contentHash = randomUUID();
    return tx.managedDocument.create({ data: { organizationId: org.id, templateId: template.id, department: 'FINANCE', referenceNumber: randomUUID(),
      status: signed ? 'SIGNED' : 'DRAFT', signedAt: signed ? new Date() : null, signedByAccountId: signed ? signer.id : null,
      approvedByAccountId: approver.id, createdByAccountId: issuer.id, payload, contentHash,
      ...(signed ? { lifecycleEvents: { create: { actorAccountId: signer.id, version: 1, action: 'SIGNED', fromStatus: 'APPROVED', toStatus: 'SIGNED' } } } : {}) } });
  }
  const issued = await document(terms);
  const approve = (doc, who = platform.id, scope = org.id, hash = doc.contentHash) =>
    mandates.approve(who, scope, doc.id, { expectedVersion: 1, expectedContentHash: hash });
  const check = () => requireFinancialOperationMandate(tx, delegate.id, org.id, BOOKING_PREPAYMENT_OPERATION, 64000, 'SAR');
  await assert.rejects(check, status(403));
  await assert.rejects(() => approve(issued, issuer.id), status(403));
  await assert.rejects(() => approve(issued, platform.id, platformOrg.id), status(404));
  await assert.rejects(() => approve(issued, platform.id, org.id, 'stale'), status(409));
  const fractional = await document({ ...terms, limitMinor: '65000.5' });
  await assert.rejects(() => approve(fractional), status(409));
  const incomplete = await document(terms, false);
  await assert.rejects(() => approve(incomplete), status(404));
  const unrelated = await document({ purpose: 'PROCUREMENT_CONTACT', delegateAccountId: delegate.id });
  await assert.rejects(() => approve(unrelated), status(409));
  assert.equal((await mandates.preview(platform.id, org.id, issued.id)).terms.accountId, delegate.id);
  const saved = await approve(issued);
  assert.equal(saved.alreadyApplied, false);
  assert.equal((await approve(issued)).alreadyApplied, true);
  assert.equal((await check()).id, delegate.id);
  await assert.rejects(() => requireFinancialOperationMandate(tx, delegate.id, org.id, BOOKING_PREPAYMENT_OPERATION, 65001, 'SAR'), status(403));
  const membership = { organizationId_accountId: { organizationId: org.id, accountId: delegate.id } };
  await tx.organizationMember.update({ where: membership, data: { status: 'SUSPENDED' } });
  await assert.rejects(check, status(403));
  await tx.organizationMember.update({ where: membership, data: { status: 'ACTIVE' } });
  await require('./organization-booking-prepayment-db.cjs')(tx, db, org, platform, issuer, signer, delegate, approver);
  const overlapping = await document(terms);
  await assert.rejects(() => approve(overlapping), status(409));
  await assert.rejects(() => refundGrants.revoke(platform.id, saved.grantId), status(404));
  const revoke = await document({ purpose: terms.purpose, decision: 'REVOKE', delegateAccountId: delegate.id, grantId: saved.grantId });
  await assert.rejects(() => approve(revoke, signer.id), status(403));
  assert.equal((await approve(revoke)).decision, 'REVOKE');
  assert.equal((await approve(revoke)).alreadyApplied, true);
  await assert.rejects(check, status(403));
  assert.equal(await tx.auditEvent.count({ where: { action: 'ORGANIZATION_BOOKING_MANDATE_REVIEWED', resourceId: { in: [issued.id, revoke.id] } } }), 2);
  throw rollback;
}

(async () => {
  await assert.rejects(() => prisma.$transaction(run, { isolationLevel: 'Serializable', timeout: 30000 }), e => e === rollback);
  console.log('Organization-issued mandate approved and revoked by platform management, with origin, validity, scope, amount, duplicate and separation checks.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
