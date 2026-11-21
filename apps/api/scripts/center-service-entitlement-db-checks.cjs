'use strict';

// Actual service, authorization, transactions and partial unique index against a
// disposable loopback database. No payment or bank provider is invoked.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const build = process.env.COMMERCE_ENTITLEMENT_MODULE_ROOT || resolve(__dirname, '../dist');
const { DatabaseService } = require(resolve(build, 'database/database.service.js'));
const { FinanceAccessService } = require(resolve(build, 'finance/finance-access.service.js'));
const { CenterServiceEntitlementService } = require(resolve(build, 'commerce/center-service-entitlement.service.js'));
const { captureTripBookingContract } = require(resolve(build, 'commerce/trip-booking-contract.js'));
const { entitlementContractHash } = require(resolve(build, 'commerce/center-service-entitlement.js'));
const db = new DatabaseService();
const service = new CenterServiceEntitlementService(db, new FinanceAccessService(db));
const status = code => error => error.getStatus?.() === code;
const check = async (name, run) => { await run(); outcomes.push(name); console.log('PASS', name); };
const outcomes = [];
const originalFetch = global.fetch;
global.fetch = () => { throw new Error('Provider access is forbidden in center entitlement acceptance'); };
const baseTime = Date.now();
let owner, accountant, foreignAccountant, buyer, collector, approver, poster, center, foreignCenter, centerUnit, foreignUnit, financeAccount;
let eventSequence = 0;
const nextApprovalTime = () => new Date(baseTime - 3_600_000 + ++eventSequence * 1000);

async function account(label) {
  const person = await db.person.create({ data: { firstName: label, lastName: 'Synthetic entitlement acceptance' } });
  return db.account.create({ data: { personId: person.id, email: `entitlement-${label}-${randomUUID()}@example.invalid`,
    passwordHash: 'not-a-login', status: 'ACTIVE', emailVerifiedAt: new Date(baseTime - 60_000) } });
}

async function centerScope(label, staff) {
  const organization = await db.organization.create({ data: { displayName: label, kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: owner.id } });
  const unit = await db.orgUnit.create({ data: { organizationId: organization.id, type: 'CENTER', code: 'TEST_CENTER', nameAr: label } });
  const position = await db.position.create({ data: { orgUnitId: unit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'Synthetic accountant' } });
  await db.employment.create({ data: { accountId: staff.id, organizationId: organization.id, orgUnitId: unit.id,
    positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE' } });
  return { organization, unit };
}

async function bookingFixture(trip, seats) {
  const recordedAt = new Date(baseTime - 20 * 86_400_000), bookingId = randomUUID();
  const contract = captureTripBookingContract({ bookingId, accountId: buyer.id, buyerOrganizationId: null, seats, createdAt: recordedAt,
    price: { pricePerSeatMinor: 5750, currency: 'SAR', configured: true }, trip: { ...trip, organization: center } });
  const booking = await db.booking.create({ data: { id: bookingId, tripId: trip.id, accountId: buyer.id,
    seats, status: 'CONFIRMED', createdAt: recordedAt, contractSnapshot: contract } });
  const participants = [];
  for (let index = 0; index < seats; index++) participants.push(await db.bookingParticipant.create({ data: {
    bookingId, fullName: `Synthetic participant ${index}`, eligibilityStatus: 'ELIGIBLE' } }));
  const accepted = { ...contract, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: new Date(recordedAt.getTime() + 1000).toISOString() };
  const payment = await db.payment.create({ data: { bookingId, accountId: buyer.id, amountMinor: seats * 5750, currency: 'SAR',
    status: 'CAPTURED', idempotencyKey: randomUUID(), providerReference: randomUUID(), moyasarPaymentId: randomUUID(),
    createdAt: new Date(recordedAt.getTime() + 2000), contractSnapshot: accepted } });
  const approvedAt = new Date(baseTime - 3 * 86_400_000);
  const collection = await db.financeEntry.create({ data: { organizationId: center.id, financeAccountId: financeAccount.id,
    type: 'REVENUE', status: 'POSTED', amountMinor: payment.amountMinor, currency: 'SAR',
    referenceType: 'TRIP_PAYMENT_COLLECTION', referenceId: payment.id, requestedByAccountId: collector.id,
    approvedByAccountId: approver.id, approvedAt, postedByAccountId: poster.id, postedAt: new Date(approvedAt.getTime() + 1000),
    createdAt: new Date(approvedAt.getTime() - 1000) } });
  const approval = await db.financeApproval.create({ data: { financeEntryId: collection.id, status: 'APPROVED',
    requestedByAccountId: collector.id, decidedByAccountId: approver.id, decidedAt: approvedAt,
    createdAt: new Date(approvedAt.getTime() - 500) } });
  return { booking, contract, accepted, participants, payment, collection, approval, trip };
}

async function ownerAllocation(fixture, completion, changes = {}, actor = owner) {
  const participants = fixture.participants.map(participant => participant.id);
  const preview = await service.readTrip(accountant.id, centerUnit.id, fixture.booking.id);
  return db.auditEvent.create({ data: { actorId: actor.personId, action: 'CENTER_SERVICE_ALLOCATION_APPROVED',
    resource: 'Booking', resourceId: fixture.booking.id, occurredAt: nextApprovalTime(), metadata: {
      approvedByAccountId: actor.id, organizationId: center.id, bookingId: fixture.booking.id, paymentId: fixture.payment.id,
      completionEventId: completion.id, contractHash: entitlementContractHash(fixture.contract), currency: 'SAR',
      allocationEvidenceHash: preview.allocationEvidenceHash,
      grossAmountMinor: 5750, commissionAmountMinor: 575, otherDeductionsMinor: 25, netAmountMinor: 5150,
      financeAccountId: financeAccount.id, participantIds: participants, completedParticipantIds: [participants[0]], ...changes,
    } } });
}

async function main() {
  await db.$connect();
  // The migration is intentionally tested separately from the minimal legacy
  // TEXT/UUID finance migration fixtures. It works on the actual Prisma schema.
  await db.$executeRawUnsafe(readFileSync(resolve(__dirname, '../prisma/migrations/20261121045000_center_entitlement_reference/migration.sql'), 'utf8'));
  [owner, accountant, foreignAccountant, buyer, collector, approver, poster] = await Promise.all(
    ['owner', 'accountant', 'foreign-accountant', 'buyer', 'collector', 'approver', 'poster'].map(account));
  process.env.D12_OWNER_EMAIL = owner.email;
  await db.roleAssignment.create({ data: { accountId: owner.id, role: 'ADMIN', status: 'ACTIVE' } });
  const platform = await db.organization.create({ data: { displayName: 'Synthetic internal platform', kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', ownerId: owner.id } });
  await db.operationalSetting.upsert({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' },
    create: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: { organizationId: platform.id } }, update: { value: { organizationId: platform.id } } });
  ({ organization: center, unit: centerUnit } = await centerScope('Synthetic supplier', accountant));
  ({ organization: foreignCenter, unit: foreignUnit } = await centerScope('Synthetic other supplier', foreignAccountant));
  financeAccount = await db.financeAccount.create({ data: { organizationId: center.id, name: 'Synthetic settlement ledger', currency: 'SAR' } });
  const trip = await db.trip.create({ data: { organizationId: center.id, title: 'Synthetic completed trip', type: 'BOAT_DIVE', capacity: 3,
    startsAt: new Date(baseTime - 2 * 86_400_000), endsAt: new Date(baseTime - 86_400_000), status: 'COMPLETED' } });
  const partial = await bookingFixture(trip, 2), noShow = await bookingFixture(trip, 1);
  const completion = await db.auditEvent.create({ data: { actorId: owner.personId, action: 'TRIP_COMPLETED', resource: 'Trip', resourceId: trip.id,
    occurredAt: new Date(baseTime - 12 * 3_600_000), metadata: { status: 'COMPLETED',
      attendedParticipantIds: [partial.participants[0].id], absentParticipantIds: [partial.participants[1].id, noShow.participants[0].id] } } });
  const read = () => service.readTrip(accountant.id, centerUnit.id, partial.booking.id);
  const prepare = event => service.prepareTrip(accountant.id, centerUnit.id, partial.booking.id,
    { financeAccountId: financeAccount.id, allocationApprovalEventId: event.id });

  await check('actual attendance isolates one completed seat and excludes a fully paid no-show booking', async () => {
    const performed = await read(), absent = await service.readTrip(accountant.id, centerUnit.id, noShow.booking.id);
    assert.equal(performed.completedQuantity, 1); assert.equal(performed.eligibleGrossAmountMinor, 5750);
    assert.equal(performed.unperformedGrossAmountMinor, 5750); assert.equal(performed.netPayoutAmountMinor, null);
    assert.equal(performed.payoutReadiness, 'REVIEW_REQUIRED'); assert(performed.reviewReasons.includes('OWNER_APPROVED_ALLOCATION_REQUIRED'));
    assert.equal(absent.eligibleGrossAmountMinor, 0); assert(absent.blockers.includes('NO_PERFORMED_SERVICE_FOR_THIS_BOOKING'));
    assert.equal(performed.bankTransferExecuted, false);
  });

  await check('active accountant scope precedes reads and prevents cross-center disclosure', async () => {
    await assert.rejects(service.readTrip(accountant.id, foreignUnit.id, partial.booking.id), /FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED/);
    await assert.rejects(service.readTrip(foreignAccountant.id, foreignUnit.id, partial.booking.id), status(404));
    await db.account.update({ where: { id: accountant.id }, data: { status: 'SUSPENDED' } });
    try { await assert.rejects(read(), /FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED/); }
    finally { await db.account.update({ where: { id: accountant.id }, data: { status: 'ACTIVE' } }); }
    await db.organization.update({ where: { id: center.id }, data: { status: 'SUSPENDED' } });
    try { await assert.rejects(read(), status(404)); }
    finally { await db.organization.update({ where: { id: center.id }, data: { status: 'ACTIVE' } }); }
  });

  await check('captured money without matching posted approval evidence does not become eligible gross', async () => {
    await db.financeApproval.update({ where: { id: partial.approval.id }, data: { status: 'REQUESTED' } });
    try { const value = await read(); assert.equal(value.eligibleGrossAmountMinor, 0); assert(value.blockers.includes('POSTED_COLLECTION_LEDGER_REQUIRED')); }
    finally { await db.financeApproval.update({ where: { id: partial.approval.id }, data: { status: 'APPROVED' } }); }
  });

  await check('saved contract governs eligibility after catalog changes; altered payment terms are rejected', async () => {
    await db.operationalSetting.create({ data: { key: `trip-price:${trip.id}`, value: { pricePerSeatMinor: 50000, currency: 'SAR' } } });
    await db.trip.update({ where: { id: trip.id }, data: { startsAt: new Date(baseTime + 20 * 86_400_000), endsAt: new Date(baseTime + 21 * 86_400_000) } });
    assert.equal((await read()).eligibleGrossAmountMinor, 5750);
    const altered = structuredClone(partial.accepted); altered.originalSchedule.startsAt = '2026-12-01T00:00:00.000Z';
    altered.refundPolicy.snapshot.contractedScheduledAt = altered.originalSchedule.startsAt;
    await db.payment.update({ where: { id: partial.payment.id }, data: { contractSnapshot: altered } });
    try { assert((await read()).blockers.includes('PAYMENT_ORIGINAL_CONTRACT_BINDING_REQUIRED')); }
    finally { await db.payment.update({ where: { id: partial.payment.id }, data: { contractSnapshot: partial.accepted } }); }
  });

  await check('partial refund and reserved refund money both prevent preparation', async () => {
    await db.payment.update({ where: { id: partial.payment.id }, data: { refundedAmountMinor: 1 } });
    try { assert((await read()).blockers.includes('REFUND_ALLOCATION_REVIEW_REQUIRED')); }
    finally { await db.payment.update({ where: { id: partial.payment.id }, data: { refundedAmountMinor: 0 } }); }
    const refundEntry = await db.financeEntry.create({ data: { organizationId: center.id, financeAccountId: financeAccount.id, type: 'REFUND', status: 'APPROVED',
      amountMinor: 100, currency: 'SAR', referenceType: 'PAYMENT_REFUND', referenceId: partial.payment.id, requestedByAccountId: collector.id } });
    const reservation = await db.commerceRefundOperation.create({ data: { paymentId: partial.payment.id, financeEntryId: refundEntry.id,
      requestAuditEventId: randomUUID(), idempotencyKey: randomUUID(), requestFingerprint: 'synthetic', organizationId: center.id,
      requestedByAccountId: buyer.id, approvedByAccountId: approver.id, executedByAccountId: poster.id, amountMinor: 100, currency: 'SAR',
      baselineRefundedMinor: 0, status: 'RESERVED', providerPaymentId: partial.payment.moyasarPaymentId, providerInvoiceId: partial.payment.providerReference, policyDecision: {} } });
    try { assert((await read()).blockers.includes('PENDING_REFUND_REQUIRES_RECONCILIATION')); }
    finally { await db.commerceRefundOperation.update({ where: { id: reservation.id }, data: { status: 'FAILED' } }); }
  });

  await check('unapproved, stale, malformed and incorrect allocation amounts remain explicit review', async () => {
    await ownerAllocation(partial, completion, {}, accountant);
    assert((await read()).reviewReasons.includes('OWNER_ALLOCATION_EVIDENCE_MISMATCH'));
    for (const change of [
      { grossAmountMinor: 50000 }, { netAmountMinor: 5151 }, { financeAccountId: 17 },
      { participantIds: [randomUUID(), partial.participants[1].id] }, { completedParticipantIds: [partial.participants[1].id] },
      { contractHash: 'old-price-contract' }, { completionEventId: randomUUID() }, { commissionAmountMinor: null },
    ]) {
      const event = await ownerAllocation(partial, completion, change);
      const value = await read(); assert.equal(value.netPayoutAmountMinor, null); assert(value.reviewReasons.includes('OWNER_ALLOCATION_EVIDENCE_MISMATCH'));
      await assert.rejects(prepare(event), status(409));
    }
    assert.equal(await db.financeEntry.count({ where: { referenceType: 'CENTER_SERVICE_ENTITLEMENT' } }), 0);
  });

  let validAllocation;
  await check('superseded and revoked owner approvals cannot be replayed for a new settlement', async () => {
    const old = await ownerAllocation(partial, completion);
    const newer = await ownerAllocation(partial, completion, { commissionAmountMinor: 600, netAmountMinor: 5125 });
    await assert.rejects(prepare(old), status(409));
    assert.equal((await read()).netPayoutAmountMinor, 5125);
    await db.auditEvent.create({ data: { actorId: owner.personId, resource: 'Booking', resourceId: partial.booking.id,
      action: 'CENTER_SERVICE_ALLOCATION_REVOKED', occurredAt: nextApprovalTime(), metadata: { approvedByAccountId: owner.id, allocationApprovalEventId: newer.id } } });
    await assert.rejects(prepare(newer), status(409)); assert.equal((await read()).netPayoutAmountMinor, null);
    validAllocation = await ownerAllocation(partial, completion);
    assert.equal((await read()).canPrepareSettlement, true);
  });

  await check('roster changes invalidate completion and the original allocation before any ledger write', async () => {
    const originalId = partial.participants[0].id, replacement = randomUUID();
    await db.bookingParticipant.update({ where: { id: originalId }, data: { id: replacement } });
    try {
      const value = await read(); assert.equal(value.canPrepareSettlement, false);
      assert(value.blockers.includes('CONTRADICTORY_OR_INCOMPLETE_ATTENDANCE'));
      await assert.rejects(prepare(validAllocation), status(409));
    } finally { await db.bookingParticipant.update({ where: { id: replacement }, data: { id: originalId } }); }
  });

  await check('owner allocation endpoints reject generic administrators and require explicit current amounts', async () => {
    await db.roleAssignment.create({ data: { accountId: accountant.id, role: 'ADMIN', status: 'ACTIVE' } });
    await assert.rejects(service.readTripForOwner(accountant.id, center.id, partial.booking.id), status(403));
    await assert.rejects(service.readTripForOwner(owner.id, foreignCenter.id, partial.booking.id), status(404));
    assert.equal(await db.employment.count({ where: { accountId: owner.id } }), 0);
    const preview = await service.readTripForOwner(owner.id, center.id, partial.booking.id);
    const command = { financeAccountId: financeAccount.id, commissionAmountMinor: 600, otherDeductionsMinor: 25,
      expectedEvidenceHash: preview.allocationEvidenceHash };
    await assert.rejects(service.approveTripAllocation(accountant.id, center.id, partial.booking.id, command), status(403));
    await assert.rejects(service.approveTripAllocation(owner.id, center.id, partial.booking.id, { ...command, commissionAmountMinor: undefined }), status(400));
    await assert.rejects(service.approveTripAllocation(owner.id, center.id, partial.booking.id, { ...command, commissionAmountMinor: 99999 }), status(400));
    await assert.rejects(service.approveTripAllocation(owner.id, center.id, partial.booking.id, { ...command, netAmountMinor: 5750 }), status(400));
    assert.equal(await db.financeEntry.count({ where: { referenceType: 'CENTER_SERVICE_ENTITLEMENT' } }), 0);
  });

  await check('owner approval rejects an obsolete preview after newer verified completion evidence', async () => {
    const preview = await service.readTripForOwner(owner.id, center.id, partial.booking.id);
    await db.auditEvent.create({ data: { actorId: owner.personId, action: 'TRIP_COMPLETED', resource: 'Trip', resourceId: trip.id,
      occurredAt: new Date(baseTime - 10 * 3_600_000), metadata: completion.metadata } });
    await assert.rejects(service.approveTripAllocation(owner.id, center.id, partial.booking.id,
      { financeAccountId: financeAccount.id, commissionAmountMinor: 600, otherDeductionsMinor: 25, expectedEvidenceHash: preview.allocationEvidenceHash }), status(409));
    const refreshed = await service.readTripForOwner(owner.id, center.id, partial.booking.id);
    assert.notEqual(refreshed.allocationEvidenceHash, preview.allocationEvidenceHash);
    assert.equal(refreshed.grossReadiness, 'ELIGIBLE'); assert.equal(refreshed.netPayoutAmountMinor, null);
  });

  await check('actual owner approval and revocation are concurrent-idempotent and preserve decision history', async () => {
    const preview = await service.readTripForOwner(owner.id, center.id, partial.booking.id);
    const command = { financeAccountId: financeAccount.id, commissionAmountMinor: 600, otherDeductionsMinor: 25,
      expectedEvidenceHash: preview.allocationEvidenceHash };
    const before = await db.auditEvent.count({ where: { action: 'CENTER_SERVICE_ALLOCATION_APPROVED', resourceId: partial.booking.id } });
    const approved = await Promise.all(Array.from({ length: 4 }, () => service.approveTripAllocation(owner.id, center.id, partial.booking.id, command)));
    assert.equal(new Set(approved.map(value => value.allocationApprovalEventId)).size, 1);
    assert.equal(approved.filter(value => !value.alreadyApproved).length, 1);
    assert(approved.every(value => value.netPayoutAmountMinor === 5125 && value.bankTransferExecuted === false));
    assert.equal(await db.auditEvent.count({ where: { action: 'CENTER_SERVICE_ALLOCATION_APPROVED', resourceId: partial.booking.id } }), before + 1);
    const approvalId = approved[0].allocationApprovalEventId;
    const revoke = { allocationApprovalEventId: approvalId, reason: 'Synthetic owner allocation correction' };
    await assert.rejects(service.revokeTripAllocation(accountant.id, center.id, partial.booking.id, revoke), status(403));
    const revoked = await Promise.all(Array.from({ length: 4 }, () => service.revokeTripAllocation(owner.id, center.id, partial.booking.id, revoke)));
    assert.equal(new Set(revoked.map(value => value.revocationEventId)).size, 1);
    assert.equal(revoked.filter(value => !value.alreadyRevoked).length, 1);
    assert(revoked.every(value => value.netPayoutAmountMinor === null && value.bankTransferExecuted === false));
    await assert.rejects(prepare({ id: approvalId }), status(409));
    const restored = await service.approveTripAllocation(owner.id, center.id, partial.booking.id,
      { ...command, commissionAmountMinor: 575 });
    assert.equal(restored.netPayoutAmountMinor, 5150); assert.equal(restored.canPrepareSettlement, true);
    validAllocation = { id: restored.allocationApprovalEventId };
  });

  let settlementId;
  await check('concurrent preparation creates exactly one pending ledger entry, approval and audit without a bank transfer', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => prepare(validAllocation)));
    settlementId = results[0].settlementFinanceEntryId;
    assert.equal(new Set(results.map(result => result.settlementFinanceEntryId)).size, 1);
    assert.equal(results.filter(result => !result.alreadyPrepared).length, 1);
    for (const result of results) { assert.equal(result.bankTransferExecuted, false); assert.equal(result.financialActionExecuted, false); }
    const entry = await db.financeEntry.findUniqueOrThrow({ where: { id: settlementId } });
    assert.equal(entry.status, 'PENDING_APPROVAL'); assert.equal(entry.amountMinor, 5150); assert.equal(entry.postedAt, null);
    assert.equal(await db.financeEntry.count({ where: { organizationId: center.id, referenceType: 'CENTER_SERVICE_ENTITLEMENT', referenceId: partial.booking.id } }), 1);
    assert.equal(await db.financeApproval.count({ where: { financeEntryId: settlementId } }), 1);
    assert.equal(await db.auditEvent.count({ where: { resource: 'FinanceEntry', resourceId: settlementId, action: 'CENTER_SERVICE_SETTLEMENT_PREPARED' } }), 1);
  });

  await check('rejected or voided settlement history stays idempotent instead of issuing a replacement', async () => {
    for (const state of ['REJECTED', 'VOIDED']) {
      await db.financeEntry.update({ where: { id: settlementId }, data: { status: state } });
      const result = await prepare(validAllocation);
      assert.equal(result.settlementFinanceEntryId, settlementId); assert.equal(result.settlementLedgerStatus, state);
      assert.equal(result.alreadyPrepared, true); assert.equal(result.bankTransferExecuted, false);
    }
    assert.equal(await db.financeApproval.count({ where: { financeEntryId: settlementId } }), 1);
    const preview = await service.readTripForOwner(owner.id, center.id, partial.booking.id);
    await assert.rejects(service.approveTripAllocation(owner.id, center.id, partial.booking.id,
      { financeAccountId: financeAccount.id, commissionAmountMinor: 0, otherDeductionsMinor: 0, expectedEvidenceHash: preview.allocationEvidenceHash }), status(409));
  });

  await check('partial unique index rejects concurrent duplicate entitlement references while preserving other references', async () => {
    const referenceId = randomUUID();
    const data = { organizationId: center.id, financeAccountId: financeAccount.id, type: 'SETTLEMENT', status: 'PENDING_APPROVAL',
      amountMinor: 1, currency: 'SAR', referenceType: 'CENTER_SERVICE_ENTITLEMENT', referenceId, requestedByAccountId: accountant.id };
    const race = await Promise.allSettled(Array.from({ length: 6 }, () => db.financeEntry.create({ data })));
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    assert(race.filter(result => result.status === 'rejected').every(result => result.reason.code === 'P2002'));
    const otherAccount = await db.financeAccount.create({ data: { organizationId: foreignCenter.id, name: 'Other synthetic ledger' } });
    await db.financeEntry.create({ data: { ...data, organizationId: foreignCenter.id, financeAccountId: otherAccount.id } });
    await Promise.all(Array.from({ length: 2 }, () => db.financeEntry.create({ data: { ...data, referenceType: 'SYNTHETIC_OTHER_REFERENCE' } })));
    const definition = await db.$queryRaw`SELECT indexdef FROM pg_indexes WHERE indexname='FinanceEntry_center_service_entitlement_unique'`;
    assert.equal(definition.length, 1); assert.match(definition[0].indexdef, /UNIQUE INDEX/); assert.match(definition[0].indexdef, /CENTER_SERVICE_ENTITLEMENT/);
  });

  console.log(JSON.stringify({ status: 'PASS', cases: outcomes.length, checks: outcomes, actualDatabase: true,
    actualServiceAndAuthorization: true, financialActionExecuted: false, bankTransferExecuted: false, providerCalls: 0 }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { global.fetch = originalFetch; await db.$disconnect(); });
