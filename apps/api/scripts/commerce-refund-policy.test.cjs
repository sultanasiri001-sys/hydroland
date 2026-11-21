'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const policy = require(process.env.COMMERCE_REFUND_POLICY_MODULE
  || path.join(__dirname, '../dist/commerce/commerce-refund-policy.js'));
const { createRefundPolicySnapshot: snapshot, evaluateCommerceRefund: evaluate,
  riyadhSevenDayRefundDeadline: deadline, CommerceRefundValidationError } = policy;

function line(kind = 'TRIP', overrides = {}) {
  return snapshot({ lineId: `line-${kind}`, kind, currency: 'SAR', grossAmountMinor: 10_000,
    contractedAt: '2026-11-01T09:00:00Z',
    contractedScheduledAt: kind === 'PHYSICAL_GOOD' ? null : '2026-11-21T09:00:00Z',
    ...overrides });
}

function request(kind = 'TRIP', overrides = {}, evidenceOverrides = {}) {
  return {
    snapshot: line(kind), requestedAt: '2026-11-19T09:00:00Z',
    evidenceAsOf: '2026-11-30T12:00:00Z', cause: 'CUSTOMER_CANCELLATION',
    collectedAmountMinor: 10_000, refundedAmountMinor: 0, reservedRefundAmountMinor: 0,
    ...overrides,
    evidence: {
      lineId: overrides.snapshot?.lineId || `line-${kind}`,
      receiptAt: null, handoverAt: null, serviceStartedAt: null, tripClosedAt: null, noShowAt: null,
      consumption: 'NONE', statutoryClassification: 'ELIGIBLE', legalEvidenceReference: 'legal-review-fixture:line',
      ...evidenceOverrides,
    },
  };
}

test('snapshots are immutable, serializable and retain the original contracted schedule', () => {
  const input = { lineId: 'immutable', kind: 'TRIP', currency: 'SAR', grossAmountMinor: 10_000,
    contractedAt: '2026-11-01T12:00:00+03:00', contractedScheduledAt: '2026-11-21T12:00:00+03:00' };
  const saved = snapshot(input);
  input.contractedScheduledAt = '2026-12-31T12:00:00+03:00';
  assert(Object.isFrozen(saved));
  assert.equal(saved.contractedScheduledAt, '2026-11-21T09:00:00.000Z');
  assert.equal(saved.version, '2026-11-21.1');
  assert.throws(() => { saved.grossAmountMinor = 1; }, TypeError);
  const restored = JSON.parse(JSON.stringify(saved));
  const result = evaluate(request('TRIP', { snapshot: restored, requestedAt: '2026-11-20T09:00:00Z' }));
  assert.equal(result.refundAmountMinor, 5_000);
});

test('trip48-hour boundary is inclusive, with adjacent milliseconds and unknown-classification full refund', () => {
  for (const [requestedAt, refund] of [
    ['2026-11-19T08:59:59.999Z', 10_000],
    ['2026-11-19T09:00:00.000Z', 10_000],
    ['2026-11-19T09:00:00.001Z', 5_000],
  ]) assert.equal(evaluate(request('TRIP', { requestedAt })).refundAmountMinor, refund);
  const allowed = evaluate(request('TRIP', {}, { statutoryClassification: 'UNKNOWN', legalEvidenceReference: undefined }));
  assert.equal(allowed.refundAmountMinor, 10_000);
  const held = evaluate(request('TRIP', { requestedAt: '2026-11-19T09:00:00.001Z' },
    { statutoryClassification: 'UNKNOWN', legalEvidenceReference: undefined }));
  assert.equal(held.status, 'REVIEW_REQUIRED');
  assert.equal(held.refundAmountMinor, null);
});

test('rental24-hour boundary is inclusive and applies25% deduction only before actual handover', () => {
  for (const [requestedAt, refund] of [
    ['2026-11-20T08:59:59.999Z', 10_000],
    ['2026-11-20T09:00:00.000Z', 10_000],
    ['2026-11-20T09:00:00.001Z', 7_500],
  ]) assert.equal(evaluate(request('RENTAL', { requestedAt })).refundAmountMinor, refund);
  const handedOver = evaluate(request('RENTAL', { requestedAt: '2026-11-22T09:00:00Z' },
    { handoverAt: '2026-11-21T09:00:00Z', consumption: 'CONSUMED' }));
  assert.equal(handedOver.refundAmountMinor, 0);
  assert.equal(handedOver.reasonCode, 'RENTAL_VOLUNTARY_RETURN_AFTER_HANDOVER');
  const unknownHandover = evaluate(request('RENTAL', {}, { handoverAt: undefined }));
  assert.equal(unknownHandover.reasonCode, 'RENTAL_HANDOVER_STATE_REQUIRED');
  const pastDue = evaluate(request('RENTAL', { requestedAt: '2026-11-21T09:00:00Z' }));
  assert.equal(pastDue.status, 'REVIEW_REQUIRED');
});

test('course cancellations honor the 48-hour boundary and the original policy version', () => {
  for (const [requestedAt, expectedAmount, expectedStatus] of [
    ['2026-11-19T08:59:59.999Z', 7500, 'ELIGIBLE'],
    ['2026-11-19T09:00:00.000Z', 0, 'NO_REFUND'],
    ['2026-11-19T09:00:00.001Z', 0, 'NO_REFUND'],
  ]) {
    const result = evaluate(request('COURSE', {requestedAt}));
    assert.equal(result.refundAmountMinor, expectedAmount);
    assert.equal(result.status, expectedStatus);
    assert.equal(result.reasonCode, expectedAmount ? 'COURSE_MORE_THAN_48_HOURS' : 'COURSE_WITHIN_48_HOURS');
    assert.equal(result.policyVersion, '2026-11-21.2');
  }
  const old = {...line('COURSE'), version: '2026-11-21.1'};
  assert.equal(evaluate(request('COURSE', {snapshot: old})).status, 'REVIEW_REQUIRED');
  const after = evaluate(request('COURSE', { requestedAt: '2026-11-22T09:00:00Z' },
    { serviceStartedAt: '2026-11-21T09:00:00Z', consumption: 'CONSUMED' }));
  assert.equal(after.refundAmountMinor, 0);
  const noShow = evaluate(request('COURSE', { requestedAt: '2026-11-21T09:05:00Z', cause: 'NO_SHOW' },
    { noShowAt: '2026-11-21T09:01:00Z' }));
  assert.equal(noShow.refundAmountMinor, 0);
  assert.equal(noShow.serviceCompletionImplied, false);
  assert.equal(noShow.financialActionExecuted, false);
});

test('statutory unconsumed-service entitlement overrides course/trip/rental commercial deduction', () => {
  for (const kind of ['COURSE', 'TRIP', 'RENTAL']) {
    const saved = line(kind, { contractedAt: '2026-11-20T08:00:00Z', contractedScheduledAt: '2026-11-21T09:00:00Z' });
    const result = evaluate(request(kind, { snapshot: saved, requestedAt: '2026-11-20T12:00:00Z' }));
    assert.equal(result.refundAmountMinor, 10_000, kind);
    assert.equal(result.basis, 'STATUTORY', kind);
    const unknown = evaluate(request(kind, { snapshot: saved, requestedAt: '2026-11-20T12:00:00Z' },
      { consumption: 'UNKNOWN' }));
    assert.equal(unknown.status, 'REVIEW_REQUIRED', kind);
  }
});

test('exceptions require actual classification and evidence, never merely a scheduled service kind', () => {
  const saved = line('TRIP', { contractedAt: '2026-11-20T08:00:00Z' });
  const partial = request('TRIP', { snapshot: saved, requestedAt: '2026-11-20T12:00:00Z' },
    { statutoryClassification: 'EXEMPT', statutoryException: 'TRAVEL_TICKET' });
  assert.equal(evaluate(partial).refundAmountMinor, 5_000);
  delete partial.evidence.legalEvidenceReference;
  assert.equal(evaluate(partial).status, 'REVIEW_REQUIRED');
  partial.evidence.legalEvidenceReference = 'verified-classification';
  delete partial.evidence.statutoryException;
  assert.equal(evaluate(partial).status, 'REVIEW_REQUIRED');
  partial.evidence.statutoryClassification = 'ELIGIBLE';
  partial.evidence.statutoryException = 'TRAVEL_TICKET';
  assert.equal(evaluate(partial).reasonCode, 'CONTRADICTORY_STATUTORY_CLASSIFICATION');
});

test('goods retain the entire seventh following Riyadh calendar day from actual receipt', () => {
  const received = '2026-11-20T20:59:59.000Z';
  assert.equal(deadline(received), '2026-11-27T20:59:59.999Z');
  assert.equal(deadline('2026-11-21T00:00:00+03:00'), '2026-11-28T20:59:59.999Z');
  for (const [requestedAt, refund] of [
    ['2026-11-27T20:59:59.998Z', 10_000],
    ['2026-11-27T20:59:59.999Z', 10_000],
    ['2026-11-27T21:00:00.000Z', 0],
  ]) {
    const result = evaluate(request('PHYSICAL_GOOD', { requestedAt }, { receiptAt: received }));
    assert.equal(result.refundAmountMinor, refund, requestedAt);
  }
  assert.equal(evaluate(request('PHYSICAL_GOOD')).status, 'REVIEW_REQUIRED');
  assert.equal(evaluate(request('PHYSICAL_GOOD', { requestedAt: '2026-11-20T20:00:00Z' },
    { receiptAt: received })).reasonCode, 'GOODS_PRE_RECEIPT_CANCELLATION_REVIEW');
});

test('goods health/custom exceptions and consumption never suppress defect or warranty review', () => {
  const goods = request('PHYSICAL_GOOD', { requestedAt: '2026-11-23T09:00:00Z' },
    { receiptAt: '2026-11-20T09:00:00Z', statutoryClassification: 'EXEMPT', statutoryException: 'HEALTH_RESALE_RESTRICTION' });
  assert.equal(evaluate(goods).refundAmountMinor, 0);
  for (const cause of ['DEFECT', 'NON_CONFORMITY', 'WARRANTY']) {
    const late = evaluate({ ...goods, requestedAt: '2026-11-30T09:00:00Z', cause,
      evidence: { ...goods.evidence, consumption: 'CONSUMED', defectStatus: 'ALLEGED' } });
    assert.equal(late.status, 'REVIEW_REQUIRED');
    assert.equal(late.reasonCode, 'DEFECT_OR_WARRANTY_REMEDY_REVIEW');
    assert.equal(late.refundAmountMinor, null);
  }
  const confirmed = evaluate({ ...goods, cause: 'DEFECT', evidence: { ...goods.evidence,
    fullRefundRightVerified: true, fullRefundRightReference: 'authorized-remedy:123' } });
  assert.equal(confirmed.refundAmountMinor, 10_000);
  assert.equal(confirmed.basis, 'VERIFIED_RIGHT');
});

test('provider-failure full refund is approved for course before start and rental before handover only', () => {
  for (const kind of ['COURSE', 'RENTAL']) {
    const result = evaluate(request(kind, { cause: 'PROVIDER_CANCELLATION' },
      { providerFailureVerified: true, providerEvidenceReference: 'provider-event:123' }));
    assert.equal(result.refundAmountMinor, 10_000);
    assert.equal(result.basis, 'PROVIDER_FAILURE');
  }
  const trip = evaluate(request('TRIP', { cause: 'PROVIDER_CANCELLATION' },
    { providerFailureVerified: true, providerEvidenceReference: 'weather-cancellation:123' }));
  assert.equal(trip.status, 'REVIEW_REQUIRED');
  const unverified = evaluate(request('COURSE', { cause: 'PROVIDER_CANCELLATION' }));
  assert.equal(unverified.reasonCode, 'PROVIDER_FAILURE_EVIDENCE_REQUIRED');
  const noEvidence = evaluate(request('COURSE', { cause: 'PROVIDER_CANCELLATION' },
    { providerFailureVerified: true, providerEvidenceReference: 'provider-event:123', serviceStartedAt: undefined }));
  assert.equal(noEvidence.status, 'REVIEW_REQUIRED');
});

test('no-show and closure require actual correctly ordered evidence and never imply fulfillment', () => {
  const missing = evaluate(request('TRIP', { cause: 'NO_SHOW', requestedAt: '2026-11-21T10:00:00Z' }));
  assert.equal(missing.reasonCode, 'NO_SHOW_EVIDENCE_REQUIRED');
  const premature = evaluate(request('TRIP', { cause: 'NO_SHOW' }, { noShowAt: '2026-11-19T08:00:00Z' }));
  assert.equal(premature.reasonCode, 'NO_SHOW_PRECEDES_CONTRACTED_SCHEDULE');
  const valid = evaluate(request('TRIP', { cause: 'NO_SHOW', requestedAt: '2026-11-21T10:00:00Z' },
    { noShowAt: '2026-11-21T09:01:00Z' }));
  assert.equal(valid.refundAmountMinor, 0);
  assert.equal(valid.serviceCompletionImplied, false);
  const conflicting = evaluate(request('TRIP', { cause: 'NO_SHOW', requestedAt: '2026-11-21T10:00:00Z' },
    { noShowAt: '2026-11-21T09:01:00Z', consumption: 'CONSUMED' }));
  assert.equal(conflicting.reasonCode, 'NO_SHOW_CONFLICTS_WITH_CONSUMPTION');
  assert.equal(conflicting.refundAmountMinor, null);
  assert.equal(evaluate(request('TRIP', { requestedAt: '2026-11-21T10:00:00Z' })).status, 'REVIEW_REQUIRED');
  assert.equal(evaluate(request('TRIP', { requestedAt: '2026-11-21T10:00:00Z' },
    { tripClosedAt: '2026-11-21T09:05:00Z' })).refundAmountMinor, 0);
  assert.equal(evaluate(request('TRIP', {}, { tripClosedAt: '2026-11-19T08:00:00Z' })).status, 'REVIEW_REQUIRED');
});

test('refunds include VAT and round once in minor units without overflow', () => {
  const vatInclusive = line('TRIP', { grossAmountMinor: 11_500 });
  assert.equal(evaluate(request('TRIP', { snapshot: vatInclusive, collectedAmountMinor: 11_500 })).refundAmountMinor, 11_500);
  for (const [kind, expected] of [['TRIP', 51], ['RENTAL', 76]]) {
    const result = evaluate(request(kind, { snapshot: line(kind, { grossAmountMinor: 101 }),
      collectedAmountMinor: 101, requestedAt: '2026-11-21T08:00:00Z' }));
    assert.equal(result.refundAmountMinor, expected);
  }
  const max = Number.MAX_SAFE_INTEGER;
  const result = evaluate(request('TRIP', { snapshot: line('TRIP', { grossAmountMinor: max }),
    collectedAmountMinor: max, requestedAt: '2026-11-20T09:00:00Z' }));
  assert.equal(result.refundAmountMinor, 4_503_599_627_370_496);
});

test('prior successful refunds and unknown/pending provider reservations cap the next refund', () => {
  const base = request('TRIP', { requestedAt: '2026-11-20T09:00:00Z',
    refundedAmountMinor: 3_000, reservedRefundAmountMinor: 1_500 });
  const first = evaluate(base);
  assert.equal(first.cumulativeRefundEntitlementMinor, 5_000);
  assert.equal(first.remainingCollectedMinor, 5_500);
  assert.equal(first.refundAmountMinor, 500);
  const reserved = evaluate({ ...base, reservedRefundAmountMinor: 2_000 });
  assert.equal(reserved.refundAmountMinor, 0);
  assert.equal(reserved.reasonCode, 'REFUND_ALREADY_RESERVED');
  const paid = evaluate({ ...base, refundedAmountMinor: 5_000, reservedRefundAmountMinor: 0 });
  assert.equal(paid.refundAmountMinor, 0);
  assert.equal(paid.reasonCode, 'REFUND_ENTITLEMENT_ALREADY_SATISFIED');
  assert.equal(evaluate({ ...base, refundedAmountMinor: 8_000, reservedRefundAmountMinor: 0 }).refundAmountMinor, 0);
});

test('partial collection returns actual collected funds for full refunds but never invents deposit penalty allocation', () => {
  const full = evaluate(request('TRIP', { collectedAmountMinor: 2_000 }));
  assert.equal(full.refundAmountMinor, 2_000);
  const fee = evaluate(request('TRIP', { collectedAmountMinor: 2_000, requestedAt: '2026-11-20T09:00:00Z' }));
  assert.equal(fee.reasonCode, 'PARTIAL_COLLECTION_REQUIRES_REVIEW');
  assert.equal(fee.refundAmountMinor, null);
  const unpaid = evaluate(request('TRIP', { collectedAmountMinor: 0 }));
  assert.equal(unpaid.reasonCode, 'NO_COLLECTED_PAYMENT');
  assert.equal(unpaid.refundAmountMinor, 0);
});

test('mixed order line policies and balances remain isolated and do not mutate caller data', () => {
  const requests = [
    request('TRIP', { requestedAt: '2026-11-20T21:00:00Z', refundedAmountMinor: 1_000 }),
    request('RENTAL', { requestedAt: '2026-11-20T21:00:00Z' }),
    request('COURSE', { requestedAt: '2026-11-20T21:00:00Z' }),
    request('PHYSICAL_GOOD', { requestedAt: '2026-11-20T21:00:00Z' }, { receiptAt: '2026-11-20T09:00:00Z' }),
  ];
  const original = JSON.stringify(requests);
  const results = requests.map(evaluate);
  assert.deepEqual(results.map(result => result.refundAmountMinor), [4_000, 7_500, 0, 10_000]);
  assert.deepEqual(results.map(result => result.lineId), requests.map(item => item.snapshot.lineId));
  assert.equal(JSON.stringify(requests), original);
  assert(results.every(result => !result.financialActionExecuted && !result.serviceCompletionImplied));
});

test('stale and contradictory evidence is reviewable, with no decided monetary amount', () => {
  const stale = evaluate(request('TRIP', { evidenceAsOf: '2026-11-19T08:59:59Z' }));
  assert.equal(stale.reasonCode, 'STALE_DOMAIN_EVIDENCE');
  assert.equal(stale.refundAmountMinor, null);
  const future = evaluate(request('TRIP', {}, { tripClosedAt: '2026-12-01T09:00:00Z' }));
  assert.equal(future.reasonCode, 'INCONSISTENT_EVENT_TIMELINE');
  const wrongKind = evaluate(request('TRIP', {}, { receiptAt: '2026-11-19T08:00:00Z' }));
  assert.equal(wrongKind.reasonCode, 'EVIDENCE_LINE_KIND_MISMATCH');
  const wrongLine = evaluate(request('TRIP', {}, { lineId: 'another-trip-line' }));
  assert.equal(wrongLine.reasonCode, 'EVIDENCE_LINE_ID_MISMATCH');
  assert.equal(wrongLine.refundAmountMinor, null);
  const early = evaluate(request('TRIP', { requestedAt: '2026-10-01T09:00:00Z' }));
  assert.equal(early.reasonCode, 'REQUEST_PRECEDES_CONTRACT');
});

test('invalid money, snapshots, times and enum values fail strictly before an amount is decided', () => {
  for (const value of [-1, -0, 0.5, NaN, Infinity, '10000', null, true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => evaluate(request('TRIP', { collectedAmountMinor: value })), CommerceRefundValidationError);
  }
  for (const date of ['2026-02-30T09:00:00Z', '2026-11-19T09:00:00', '2026-11-19',
    '2026-11-19T24:00:00Z', '2026-11-19T09:00:00+15:00', 'not-a-date', null]) {
    assert.throws(() => evaluate(request('TRIP', { requestedAt: date })), CommerceRefundValidationError);
  }
  assert.throws(() => snapshot({ ...line(), currency: 'USD' }), CommerceRefundValidationError);
  assert.throws(() => snapshot({ ...line(), kind: 'SERVICE' }), CommerceRefundValidationError);
  assert.throws(() => snapshot({ ...line(), contractedScheduledAt: null }), CommerceRefundValidationError);
  assert.throws(() => snapshot({ ...line(), contractedScheduledAt: '2026-10-31T09:00:00Z' }), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { snapshot: { ...line(), version: '2026-11-21.0' } })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { cause: 'ANYTHING' })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', {}, { statutoryClassification: 'true' })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', {}, { providerFailureVerified: 'true' })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { collectedAmountMinor: 10_001 })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { refundedAmountMinor: 10_001 })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { refundedAmountMinor: 8_000, reservedRefundAmountMinor: 2_001 })), CommerceRefundValidationError);
  assert.throws(() => evaluate(request('TRIP', { reservedRefundAmountMinor: null })), CommerceRefundValidationError);
});
