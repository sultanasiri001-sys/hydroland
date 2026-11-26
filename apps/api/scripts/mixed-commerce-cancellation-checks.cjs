const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');

exports.verifyCancelledSources = async (f, {check, financePath}) => {
  const {db, call, ok, denied, buyer, stranger, owner, accountant, financeAccount, center} = f;
  const offer = await f.offerings('cancelled-original-sources');
  let order, collected, courseRequest, rentalRequest, tripRequest;
  const refunds = [];
  const writes = () => f.requests.filter(row => row.method === 'POST').length;
  const approved = async (type, id, amount) => {
    const entry = await f.ledger.createEntry({organizationId: center.id, financeAccountId: financeAccount.id, type: 'REFUND', amountMinor: amount,
      currency: 'SAR', referenceType: type, referenceId: id, requestedByAccountId: buyer.id});
    await f.ledger.decideEntry(entry.id, f.approver.id, true, 'Synthetic B08 original policy refund approval');
    await assert.rejects(f.ledger.postEntry(entry.id, f.poster.id), error => error.getStatus?.() === 400);
    return entry;
  };
  await check('a second grouped order retains its same native sources through cancellation and refunds', async () => {
    order = ok(await call(buyer, '/store/unified-orders', 'POST', offer.input));
    collected = [];
    for (const line of order.lines) collected.push(await f.collectLine(line));
    assert.equal(order.totalMinor, 12600); assert.equal(order.paymentMode, 'PER_SOURCE');
    assert.equal(new Set(collected.map(row => row.providerPayment.id)).size, 4);
  });
  const lines = Object.fromEntries(order.lines.map(row => [row.kind, row]));
  await check('source cancellation decisions use original policy, leave provider money unchanged and reject other customers', async () => {
    // This explicit synthetic legal fact is a prerequisite for testing the
    // adopted 75% course rule, not a real legal classification of any offering.
    await db.operationalSetting.create({data: {key: 'commerce-legal-classification:COURSE:' + lines.COURSE.sourceId, value: {
      sourceId: lines.COURSE.sourceId, sourceType: 'COURSE', classification: 'EXEMPT', exception: 'EVENT_ORGANIZATION',
      evidenceReference: 'SYNTHETIC_ISOLATED_COURSE_CLASSIFICATION',
    }}});
    const before = writes();
    const coursePath = `/payments/courses/${lines.COURSE.sourceId}/cancellation`;
    denied(await call(stranger, coursePath, 'POST'), 404);
    courseRequest = ok(await call(buyer, coursePath, 'POST'));
    assert.equal(courseRequest.decision.refundAmountMinor, 2550); assert.equal(courseRequest.decision.refundBasisPoints, 7500);
    assert.equal(courseRequest.financialActionExecuted, false);
    assert.equal(ok(await call(buyer, coursePath, 'POST')).requestId, courseRequest.requestId);
    const rentalPath = `/payments/rentals/${lines.RENTAL.sourceId}/refund-requests`;
    const rentalInput = {idempotencyKey: 'b08-cancel:' + randomUUID(), requestedAmountMinor: 4500, cause: 'CUSTOMER_CANCELLATION', reason: 'Synthetic B08 before original equipment handover'};
    denied(await call(stranger, rentalPath, 'POST', rentalInput), 404);
    rentalRequest = ok(await call(buyer, rentalPath, 'POST', rentalInput));
    assert.equal(rentalRequest.decision.refundAmountMinor, 4500); assert.equal(rentalRequest.cancellationRecorded, true);
    assert.equal(rentalRequest.financialActionExecuted, false);
    assert.equal(ok(await call(buyer, rentalPath, 'POST', rentalInput)).requestId, rentalRequest.requestId);
    denied(await call(buyer, rentalPath, 'POST', {...rentalInput, requestedAmountMinor: 1}), 409);
    denied(await call(stranger, `/trips/bookings/${lines.TRIP.sourceId}/cancel`, 'PATCH'), 404);
    ok(await call(buyer, `/trips/bookings/${lines.TRIP.sourceId}/cancel`, 'PATCH'));
    const tripCollection = collected.find(row => row.line.kind === 'TRIP');
    const tripPath = `/payments/${tripCollection.paymentId}/refund-request`;
    denied(await call(stranger, tripPath, 'POST', {reason: 'Synthetic original customer cancellation', amountMinor: 2300, currency: 'SAR'}), 404);
    tripRequest = ok(await call(buyer, tripPath, 'POST', {reason: 'Synthetic original customer cancellation', amountMinor: 2300, currency: 'SAR'}));
    assert.equal(tripRequest.policyDecision.refundAmountMinor, 2300); assert.equal(tripRequest.policyDecision.refundBasisPoints, 10000);
    assert.equal(tripRequest.financialActionExecuted, false); assert.equal(writes(), before);
  });
  await check('course, rental and trip refunds each post the exact permitted amount once through the provider', async () => {
    const course = await approved('COURSE_CANCELLATION_REFUND', courseRequest.requestId, 2550);
    const rental = await approved('EQUIPMENT_RENTAL_REFUND', lines.RENTAL.sourceId, 4500);
    const tripCollection = collected.find(row => row.line.kind === 'TRIP');
    const trip = await approved('PAYMENT_REFUND', tripCollection.paymentId, 2300);
    const commands = [
      {kind: 'COURSE', entry: course, path: `/payments/courses/cancellations/${courseRequest.requestId}/refund`, input: {financeEntryId: course.id}, finalStatus: 'POSTED'},
      {kind: 'RENTAL', entry: rental, path: `/payments/rentals/${lines.RENTAL.sourceId}/refund-operations`,
        input: {requestId: rentalRequest.requestId, financeEntryId: rental.id, idempotencyKey: 'b08-refund:' + randomUUID()}, finalStatus: 'SUCCEEDED'},
      {kind: 'TRIP', entry: trip, path: '/payments/refund-operations', input: {paymentId: tripCollection.paymentId,
        requestAuditEventId: tripRequest.auditEventId, financeEntryId: trip.id, idempotencyKey: 'b08-refund:' + randomUUID()}, finalStatus: 'SUCCEEDED'},
    ];
    for (const command of commands) {
      const before = writes(); denied(await call(stranger, command.path, 'POST', command.input), 403); assert.equal(writes(), before);
      const first = ok(await call(f.poster, command.path, 'POST', command.input));
      assert.equal(first.status, command.finalStatus, JSON.stringify(first));
      const replays = await Promise.all([1, 2].map(() => call(f.poster, command.path, 'POST', command.input).then(ok)));
      assert.ok(replays.every(row => (row.id || row.operationId) === (first.id || first.operationId)));
      assert.equal(writes(), before + 1);
      const saved = await db.financeEntry.findUniqueOrThrow({where: {id: command.entry.id}});
      assert.equal(saved.status, 'POSTED'); assert.equal(saved.amountMinor, command.entry.amountMinor);
      const provider = collected.find(row => row.line.kind === command.kind).providerPayment;
      assert.equal(provider.refunded, saved.amountMinor); refunds.push({kind: command.kind, entry: saved});
    }
    assert.equal(refunds.reduce((sum, row) => sum + row.entry.amountMinor, 0), 9350);
  });
  await check('refunded and retained cancellation money never becomes unperformed supplier entitlement', async () => {
    const view = ok(await call(buyer, '/store/unified-orders/' + order.id));
    assert.equal(view.totalMinor, 12600); assert.equal(view.paidMinor, 12600); assert.equal(view.refundedMinor, 9350);
    assert.equal(view.remainingMinor, 0); assert.equal(view.netCollectedMinor, 3250);
    const expected = {GOODS: 0, TRIP: 2300, COURSE: 2550, RENTAL: 4500};
    for (const line of view.lines) {
      assert.equal(line.sourceId, lines[line.kind].sourceId); assert.equal(line.contractHash, lines[line.kind].contractHash);
      assert.equal(line.capturedMinor, line.amountMinor); assert.equal(line.refundedMinor, expected[line.kind]);
      assert.equal(line.netCollectedMinor, line.amountMinor - expected[line.kind]); assert.equal(line.remainingMinor, 0);
      assert.equal(line.collectionVerified, true); assert.equal(line.refundPending, false);
      const state = ok(await call(accountant, financePath(line)));
      assert.equal(state.grossReadiness, 'BLOCKED'); assert.equal(state.eligibleGrossAmountMinor, 0); assert.equal(state.canPrepareSettlement, false);
      const count = await db.financeEntry.count();
      denied(await call(owner, financePath(line) + '/allocation', 'POST', {financeAccountId: financeAccount.id,
        commissionAmountMinor: 0, otherDeductionsMinor: 0, expectedEvidenceHash: state.allocationEvidenceHash}), 409);
      denied(await call(accountant, financePath(line) + '/prepare', 'POST', {financeAccountId: financeAccount.id, allocationApprovalEventId: randomUUID()}), 409);
      assert.equal(await db.financeEntry.count(), count);
    }
    const sourceIds = order.lines.map(row => row.sourceId);
    assert.equal(await db.financeEntry.count({where: {type: 'SETTLEMENT', referenceId: {in: sourceIds}}}), 0);
    assert.equal(await db.commerceSourceTransferReceipt.count({where: {sourceId: {in: sourceIds}}}), 0);
    assert.equal(await db.commerceSourceTransferReceipt.count({where: {status: 'CONFIRMED'}}), 4);
  });
  return {orderId: order.id, collectedMinor: 12600, refundedMinor: 9350, unperformedRemainingMinor: 3250, supplierSettlementMinor: 0,
    refunds: refunds.map(row => ({kind: row.kind, financeEntryId: row.entry.id, amountMinor: row.entry.amountMinor,
      sourceId: lines[row.kind].sourceId}))};
};
