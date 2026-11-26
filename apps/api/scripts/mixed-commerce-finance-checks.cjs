const assert = require('node:assert/strict');
const {randomUUID, createHash} = require('node:crypto');
const {PDFDocument} = require('pdf-lib');
const execution = require('./mixed-commerce-execution.cjs');

async function pdf(label) {
  const document = await PDFDocument.create();
  document.setTitle(label); document.addPage().drawText('SYNTHETIC B08 / ' + label, {x: 40, y: 700, size: 12});
  return Buffer.from(await document.save());
}

async function failAudit(db, action, work) {
  assert.match(action, /^[A-Z_]+$/);
  await db.$executeRawUnsafe(`CREATE FUNCTION b08_fail_finance_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."action"='${action}' THEN RAISE EXCEPTION 'synthetic B08 audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER b08_fail_finance_audit BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION b08_fail_finance_audit()');
  try {await work();} finally {
    await db.$executeRawUnsafe('DROP TRIGGER b08_fail_finance_audit ON "AuditEvent"');
    await db.$executeRawUnsafe('DROP FUNCTION b08_fail_finance_audit()');
  }
}

exports.verifyFinancialLifecycle = async function verifyFinancialLifecycle(f, {main, order, collected, check}) {
  const {db, call, ok, denied, owner, buyer, stranger, accountant, receiver, center, unit, financeAccount} = f;
  const path = line => `/finance/centers/${unit.id}/commerce-sources/${line.sourceType}/${line.sourceId}`;
  const transferPath = `/finance/centers/${unit.id}/commerce-transfers`;
  const read = line => call(accountant, path(line)).then(ok);
  const refs = {GOODS: 'CENTER_STORE_ENTITLEMENT', TRIP: 'CENTER_SERVICE_ENTITLEMENT', COURSE: 'CENTER_COURSE_ENTITLEMENT', RENTAL: 'CENTER_RENTAL_ENTITLEMENT'};
  const byKind = Object.fromEntries(order.lines.map(line => [line.kind, line]));
  const originalHashes = Object.fromEntries(order.lines.map(line => [line.id, line.contractHash]));
  const financeSnapshot = async () => ({entries: await db.financeEntry.count(), approvals: await db.financeApproval.count(),
    invoices: await db.commerceInvoiceFinalization.count(), transfers: await db.commerceSourceTransferReceipt.count(),
    nativeStoreInvoices: await db.storeInvoice.count(), nativeTripInvoices: await db.invoice.count(),
    audit: await db.auditEvent.count({where: {action: {startsWith: 'COMMERCE_SOURCE_'}}}), providerWrites: f.requests.filter(r => r.method === 'POST').length});
  let goods, refund;
  const settlements = [], invoiceReceipts = [];

  await check('collected but unperformed sources cannot allocate or prepare a settlement', async () => {
    const before = await financeSnapshot();
    for (const line of order.lines) {
      denied(await call(stranger, path(line)), 403);
      const state = await read(line); assert.equal(state.grossReadiness, 'BLOCKED'); assert.equal(state.canPrepareSettlement, false);
      assert.equal(state.eligibleGrossAmountMinor, 0);
      denied(await call(owner, path(line) + '/allocation', 'POST', {financeAccountId: financeAccount.id,
        commissionAmountMinor: 0, otherDeductionsMinor: 0, expectedEvidenceHash: state.allocationEvidenceHash}), 409);
      denied(await call(accountant, path(line) + '/prepare', 'POST', {financeAccountId: financeAccount.id, allocationApprovalEventId: randomUUID()}), 409);
      denied(await call(owner, '/finance/admin/entries', 'POST', {organizationId: center.id, financeAccountId: financeAccount.id,
        type: 'SETTLEMENT', amountMinor: line.amountMinor, currency: 'SAR', referenceType: refs[line.kind], referenceId: line.sourceId}), 400);
    }
    assert.deepEqual(await financeSnapshot(), before);
  });
  await check('a corrupt collection ledger is shown as review without fabricated paid money', async () => {
    const collection = collected.find(row => row.line.kind === 'GOODS');
    await db.financeEntry.update({where: {id: collection.revenue.id}, data: {amountMinor: collection.line.amountMinor + 1}});
    try {
      const view = ok(await call(buyer, '/store/unified-orders/' + order.id));
      const line = view.lines.find(row => row.kind === 'GOODS');
      assert.equal(line.collectionVerified, false); assert.equal(line.financialReviewRequired, true);
      assert.equal(line.capturedMinor, null); assert.equal(view.paidMinor, null);
      const state = await read(byKind.GOODS); assert.equal(state.collectionVerified, false); assert.equal(state.canPrepareSettlement, false);
    } finally {await db.financeEntry.update({where: {id: collection.revenue.id}, data: {amountMinor: collection.line.amountMinor}});}
    const trip = collected.find(row => row.line.kind === 'TRIP');
    await db.payment.update({where: {id: trip.paymentId}, data: {status: 'CANCELLED'}});
    try {
      const view = ok(await call(buyer, '/store/unified-orders/' + order.id));
      const line = view.lines.find(row => row.kind === 'TRIP');
      assert.equal(line.financialReviewRequired, true); assert.equal(line.capturedMinor, null); assert.equal(view.paidMinor, null);
    } finally {await db.payment.update({where: {id: trip.paymentId}, data: {status: 'CAPTURED'}});}
  });
  await check('completion of goods alone never earns entitlement for the other three sources', async () => {
    goods = await execution.completeGoods(f, byKind.GOODS);
    for (const line of order.lines) {
      const state = await read(line);
      assert.equal(state.grossReadiness, line.kind === 'GOODS' ? 'ELIGIBLE' : 'BLOCKED');
      assert.equal(state.eligibleGrossAmountMinor, line.kind === 'GOODS' ? line.amountMinor : 0);
      assert.equal(state.canPrepareSettlement, false);
    }
  });
  await check('all source completion evidence comes from original operational commands', async () => {
    await execution.completeRental(f, byKind.RENTAL, main);
    await execution.completeTrip(f, byKind.TRIP, main);
    await execution.completeCourse(f, byKind.COURSE);
    for (const line of order.lines) {
      const state = await read(line); assert.equal(state.grossReadiness, 'ELIGIBLE', JSON.stringify(state));
      assert.equal(state.eligibleGrossAmountMinor, line.amountMinor); assert.equal(state.collectionVerified, true);
      assert.equal(state.canPrepareSettlement, false); assert.equal(state.invoice.status, 'DRAFT');
    }
  });
  await check('a partial goods refund posts once and preserves the other three paid obligations', async () => {
    for (const [actor, operation] of [[f.approver, 'APPROVE_REFUND'], [f.poster, 'EXECUTE_REFUND']]) {
      ok(await call(owner, '/payments/refund-operations/financial-grants', 'POST', {accountId: actor.id, organizationId: center.id,
        operation, currency: 'SAR', limitMinor: 100000, validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 3_600_000).toISOString()}));
    }
    refund = await execution.refundGoods(f, byKind.GOODS, goods.deliveries[0], 1200);
    const view = ok(await call(buyer, '/store/unified-orders/' + order.id));
    assert.equal(view.totalMinor, 12600); assert.equal(view.paidMinor, 12600); assert.equal(view.refundedMinor, 1200);
    assert.equal(view.netCollectedMinor, 11400); assert.equal(view.remainingMinor, 0);
    for (const line of view.lines) {
      assert.equal(line.contractHash, originalHashes[line.id]); assert.equal(line.collectionVerified, true);
      assert.equal(line.capturedMinor, line.amountMinor); assert.equal(line.refundedMinor, line.kind === 'GOODS' ? 1200 : 0);
      assert.equal(line.netCollectedMinor, line.amountMinor - line.refundedMinor); assert.equal(line.remainingMinor, 0);
      assert.equal(line.refundPending, false);
    }
    assert.equal((await read(byKind.GOODS)).eligibleGrossAmountMinor, 1200);
  });
  await check('original seller invoices finalize with exact lines, amounts, tax and atomic audit evidence', async () => {
    const profile = ok(await call(owner, `/organizations/${center.id}/financial-profile`));
    let declaredProfile = ok(await call(owner, `/organizations/${center.id}/financial-profile`, 'PATCH', {currency: 'SAR', taxStatus: 'EXEMPT',
      registrationStatus: 'REGISTERED', expectedRevision: profile.revision}));
    // Finalize three exempt originals first, then one explicitly taxable course.
    // Tax is supplied in minor units from the original; no rate is inferred.
    for (const line of [...order.lines.filter(row => row.kind !== 'COURSE'), byKind.COURSE]) {
      const taxMinor = line.kind === 'COURSE' ? 400 : 0;
      if (line.kind === 'COURSE') {
        const current = ok(await call(owner, `/organizations/${center.id}/financial-profile`));
        declaredProfile = ok(await call(owner, `/organizations/${center.id}/financial-profile`, 'PATCH', {currency: 'SAR', taxStatus: 'TAXABLE',
          registrationStatus: 'REGISTERED', expectedRevision: current.revision}));
        assert.equal(declaredProfile.revision, current.revision + 1);
        assert.equal(invoiceReceipts.length, 3);
        for (const prior of invoiceReceipts) {
          const stored = await db.commerceInvoiceFinalization.findUniqueOrThrow({where: {id: prior.id}});
          assert.deepEqual(stored.snapshot, prior.snapshot);
          assert.equal(stored.taxMinor, 0); assert.equal(stored.snapshot.sellerFinancialProfile.taxStatus, 'EXEMPT');
          const state = await read(byKind[prior.kind]);
          assert.equal(state.invoice.status, 'FINALIZED'); assert.equal(state.invoice.taxMinor, 0);
          assert.equal(state.invoice.sellerFinancialProfile.taxStatus, 'EXEMPT');
          assert.equal(ok(await call(accountant, path(byKind[prior.kind]) + '/invoice-finalization', 'POST', prior.input)).id, prior.id);
        }
      }
      let state = await read(line); assert.equal(state.invoice.canFinalize, false);
      const key = state.invoice.documentKey;
      const rows = ok(await call(accountant, `/account/invoices?sourceType=${key.sourceType}&sourceId=${key.sourceId}`));
      assert.equal(rows.items.length, 1, JSON.stringify(rows));
      const number = rows.items[0].number || 'SYN-B08-' + randomUUID();
      const content = await pdf('invoice-' + line.kind + '-' + line.sourceId);
      const form = new FormData(); form.append('number', number); form.append('document', new Blob([content], {type: 'application/pdf'}), 'synthetic-invoice.pdf');
      const attached = await fetch(f.base + `/account/invoices/${key.sourceType}/${key.sourceId}/document`, {
        method: 'POST', headers: {authorization: 'Bearer ' + accountant.token}, body: form,
      });
      assert.equal(attached.status, 201, await attached.text());
      state = await read(line); assert.equal(state.invoice.canFinalize, true, JSON.stringify(state));
      const taxLines = line.kind === 'GOODS' ? line.contractSnapshot.lines.map(row => ({lineId: row.source.id, taxMinor: 0}))
        : line.kind === 'RENTAL' ? line.contractSnapshot.lines.map(row => ({lineId: row.id, taxMinor: 0})) : [{lineId: line.sourceId, taxMinor}];
      const input = {issuedAt: new Date().toISOString(), expectedEvidenceHash: state.invoice.expectedEvidenceHash, taxLines};
      const endpoint = path(line) + '/invoice-finalization';
      denied(await call(owner, endpoint, 'POST', input), 403);
      denied(await call(accountant, endpoint, 'POST', {...input, expectedEvidenceHash: '0'.repeat(64)}), 409);
      denied(await call(accountant, endpoint, 'POST', {...input, taxLines: [{lineId: randomUUID(), taxMinor: 0}]}), 409);
      const before = await financeSnapshot();
      if (line.kind !== 'COURSE') {
        denied(await call(accountant, endpoint, 'POST', {...input, taxLines: taxLines.map((row, index) => ({...row, taxMinor: index ? 0 : 1}))}), 409);
        assert.deepEqual(await financeSnapshot(), before);
      }
      if (line.kind === 'GOODS') {
        await failAudit(db, 'COMMERCE_SOURCE_INVOICE_FINALIZED', async () => denied(await call(accountant, endpoint, 'POST', input), 500));
        assert.deepEqual(await financeSnapshot(), before);
      }
      const result = ok(await call(accountant, endpoint, 'POST', input));
      assert.equal(result.status, 'FINALIZED'); assert.equal(result.amountMinor, line.amountMinor); assert.equal(result.taxMinor, taxMinor);
      assert.equal(ok(await call(accountant, endpoint, 'POST', input)).id, result.id);
      const stored = await db.commerceInvoiceFinalization.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: line.sourceType, sourceId: line.sourceId}}});
      assert.equal(stored.documentSha256, createHash('sha256').update(content).digest('hex'));
      assert.equal(stored.customerAccountId, buyer.id); assert.equal(stored.sellerId, center.id); assert.equal(stored.amountMinor, line.amountMinor);
      assert.equal(stored.taxMinor, taxMinor); assert.equal(stored.snapshot.taxMinor, taxMinor);
      assert.equal(stored.snapshot.subtotalMinor, line.amountMinor - taxMinor);
      assert.equal(stored.snapshot.subtotalMinor + stored.snapshot.taxMinor, line.amountMinor);
      assert.deepEqual(stored.snapshot.taxLines, [...taxLines].sort((a, b) => a.lineId.localeCompare(b.lineId)));
      assert.equal(stored.snapshot.sellerFinancialProfile.taxStatus, line.kind === 'COURSE' ? 'TAXABLE' : 'EXEMPT');
      assert.equal(stored.snapshot.sellerFinancialProfile.revision, declaredProfile.revision);
      assert.equal(stored.snapshot.originalContract.customerAccountId, buyer.id);
      assert.equal(await db.auditEvent.count({where: {action: 'COMMERCE_SOURCE_INVOICE_FINALIZED', resourceId: line.sourceId}}), 1);
      if (line.kind === 'GOODS') assert.equal(await db.storeInvoice.count({where: {payment: {orderId: line.sourceId}}}), 1);
      const projected = ok(await call(buyer, '/store/unified-orders/' + order.id)).lines.find(row => row.id === line.id);
      assert.equal(projected.invoice.finalizationStatus, 'FINALIZED'); assert.equal(projected.invoice.finalizationId, stored.id);
      invoiceReceipts.push({kind: line.kind, id: stored.id, amountMinor: stored.amountMinor, taxMinor, subtotalMinor: stored.snapshot.subtotalMinor,
        profileRevision: declaredProfile.revision, snapshot: stored.snapshot, input});
    }
  });
  await check('tampered invoice tax evidence and void native invoices cannot support settlement', async () => {
    for (const line of order.lines) {
      const finalization = await db.commerceInvoiceFinalization.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: line.sourceType, sourceId: line.sourceId}}});
      await db.commerceInvoiceFinalization.update({where: {id: finalization.id}, data: {snapshot: {...finalization.snapshot, taxMinor: 1}}});
      try {const state = await read(line); assert.equal(state.invoice.status, 'DRAFT'); assert.equal(state.canPrepareSettlement, false);}
      finally {await db.commerceInvoiceFinalization.update({where: {id: finalization.id}, data: {snapshot: finalization.snapshot}});}
      if (line.kind === 'GOODS' || line.kind === 'TRIP') {
        const native = line.kind === 'GOODS'
          ? await db.storeInvoice.findFirstOrThrow({where: {payment: {orderId: line.sourceId}}})
          : await db.invoice.findFirstOrThrow({where: {payment: {bookingId: line.sourceId}}});
        const model = line.kind === 'GOODS' ? db.storeInvoice : db.invoice;
        await model.update({where: {id: native.id}, data: {status: 'VOID'}});
        try {const state = await read(line); assert.equal(state.invoice.status, 'DRAFT'); assert.equal(state.canPrepareSettlement, false);}
        finally {await model.update({where: {id: native.id}, data: {status: native.status}});}
      }
      assert.equal((await read(line)).invoice.status, 'FINALIZED');
    }
  });
  await check('independent allocations prepare one exact net settlement per original source', async () => {
    for (const line of order.lines) {
      const state = await read(line), gross = line.amountMinor - (line.kind === 'GOODS' ? 1200 : 0);
      assert.equal(state.eligibleGrossAmountMinor, gross); assert.equal(state.invoice.status, 'FINALIZED');
      const input = {financeAccountId: financeAccount.id, commissionAmountMinor: 100, otherDeductionsMinor: 0, expectedEvidenceHash: state.allocationEvidenceHash};
      denied(await call(accountant, path(line) + '/allocation', 'POST', input), 403);
      denied(await call(owner, path(line) + '/allocation', 'POST', {...input, expectedEvidenceHash: '0'.repeat(64)}), 409);
      const allocated = ok(await call(owner, path(line) + '/allocation', 'POST', input));
      assert.equal(allocated.netPayoutAmountMinor, gross - 100, JSON.stringify(allocated));
      const replayed = ok(await call(owner, path(line) + '/allocation', 'POST', input));
      assert.equal(replayed.allocationApprovalEventId, allocated.allocationApprovalEventId);
      const prepare = {financeAccountId: financeAccount.id, allocationApprovalEventId: allocated.allocationApprovalEventId};
      const before = await financeSnapshot();
      if (line.kind === 'GOODS') {
        await failAudit(db, 'COMMERCE_SOURCE_SETTLEMENT_PREPARED', async () => denied(await call(accountant, path(line) + '/prepare', 'POST', prepare), 500));
        assert.deepEqual(await financeSnapshot(), before);
      }
      const results = await Promise.all([1, 2].map(() => call(accountant, path(line) + '/prepare', 'POST', prepare).then(ok)));
      assert.equal(results[0].settlementFinanceEntryId, results[1].settlementFinanceEntryId);
      const entry = await db.financeEntry.findUniqueOrThrow({where: {id: results[0].settlementFinanceEntryId}});
      assert.equal(entry.referenceType, refs[line.kind]); assert.equal(entry.referenceId, line.sourceId);
      assert.equal(entry.amountMinor, gross - 100); assert.equal(entry.status, 'PENDING_APPROVAL'); assert.equal(entry.requestedByAccountId, accountant.id);
      ok(await call(owner, `/finance/admin/entries/${entry.id}/decision`, 'POST', {approved: true, note: 'Synthetic B08 independent settlement approval'}));
      denied(await call(owner, `/finance/admin/entries/${entry.id}/post`, 'POST'), 400);
      assert.equal((await db.financeEntry.findUniqueOrThrow({where: {id: entry.id}})).status, 'APPROVED');
      settlements.push({line, entry, gross});
    }
    assert.equal(settlements.reduce((sum, row) => sum + row.gross, 0), 11400);
    assert.equal(settlements.reduce((sum, row) => sum + row.entry.amountMinor, 0), 11000);
  });
  await check('transfer refusal, stale source evidence and audit failure do not post any settlement', async () => {
    const first = settlements.find(row => row.line.kind === 'GOODS');
    const transferDocument = await pdf('first-external-transfer'), receiptDocument = await pdf('first-independent-receipt');
    const input = {requestId: randomUUID(), financeEntryId: first.entry.id, bankName: 'SYNTHETIC BANK', bankReference: 'SYN-B08-' + randomUUID(),
      amountMinor: first.entry.amountMinor, currency: 'SAR', transferredAt: new Date().toISOString(), documentBase64: transferDocument.toString('base64')};
    const before = await financeSnapshot();
    denied(await call(stranger, transferPath, 'POST', input), 403);
    denied(await call(owner, transferPath, 'POST', {...input, amountMinor: input.amountMinor + 1}), 409);
    assert.deepEqual(await financeSnapshot(), before);
    let receipt = ok(await call(owner, transferPath, 'POST', input));
    const reviewPath = transferPath + '/' + receipt.id + '/review';
    const rejected = {decision: 'REJECTED', note: 'Synthetic independent mismatch; no money posted'};
    denied(await call(accountant, reviewPath, 'POST', rejected), 403);
    const refusal = ok(await call(receiver, reviewPath, 'POST', rejected)); assert.equal(refusal.status, 'REJECTED');
    assert.equal(ok(await call(receiver, reviewPath, 'POST', rejected)).id, refusal.id);
    assert.equal((await db.financeEntry.findUniqueOrThrow({where: {id: first.entry.id}})).status, 'APPROVED');
    input.requestId = randomUUID(); receipt = ok(await call(owner, transferPath, 'POST', input));
    const confirmation = {decision: 'CONFIRMED', note: 'Synthetic independently observed incoming receipt', receivedAt: new Date().toISOString(), documentBase64: receiptDocument.toString('base64')};
    const finalPath = transferPath + '/' + receipt.id + '/review';
    const item = await db.storeOrderItem.findUniqueOrThrow({where: {id: goods.items[0].id}});
    await db.storeOrderItem.update({where: {id: item.id}, data: {actualReceivedAt: new Date(item.actualReceivedAt.getTime() + 1)}});
    try {denied(await call(receiver, finalPath, 'POST', confirmation), 409);} finally {
      await db.storeOrderItem.update({where: {id: item.id}, data: {actualReceivedAt: item.actualReceivedAt}});
    }
    assert.equal((await db.financeEntry.findUniqueOrThrow({where: {id: first.entry.id}})).status, 'APPROVED');
    const beforeFailure = await financeSnapshot();
    await failAudit(db, 'COMMERCE_SOURCE_EXTERNAL_TRANSFER_CONFIRMED', async () => denied(await call(receiver, finalPath, 'POST', confirmation), 500));
    assert.deepEqual(await financeSnapshot(), beforeFailure);
    assert.equal((await db.commerceSourceTransferReceipt.findUniqueOrThrow({where: {id: receipt.id}})).status, 'PENDING');
    const results = await Promise.all([1, 2].map(() => call(receiver, finalPath, 'POST', confirmation).then(ok)));
    assert.ok(results.every(row => row.status === 'CONFIRMED' && row.bankTransferExecuted === false && row.externalTransferConfirmed === true));
    first.transfer = receipt; first.input = input;
    assert.equal(await db.auditEvent.count({where: {action: 'FINANCE_ENTRY_POSTED', resourceId: first.entry.id}}), 1);
    const others = settlements.filter(row => row !== first);
    denied(await call(owner, transferPath, 'POST', {...input, requestId: randomUUID(), financeEntryId: others[0].entry.id,
      amountMinor: others[0].entry.amountMinor, transferredAt: new Date().toISOString()}), 409);
  });
  await check('legacy B12 reference claims block B08 reuse and every remaining source confirms once', async () => {
    for (const row of settlements.filter(row => !row.transfer)) {
      const document = await pdf('outgoing-' + row.line.kind), incoming = await pdf('incoming-' + row.line.kind);
      const input = {requestId: randomUUID(), financeEntryId: row.entry.id, bankName: 'SYNTHETIC BANK', bankReference: 'SYN-B08-' + randomUUID(),
        amountMinor: row.entry.amountMinor, currency: 'SAR', transferredAt: new Date().toISOString(), documentBase64: document.toString('base64')};
      if (row.line.kind === 'TRIP') {
        // Even an unresolved legacy claim must prevent reuse. This sentinel is
        // not completion/payment evidence and is removed after its refusal test.
        const hash = f.load('commerce/center-service-entitlement.js').entitlementContractHash;
        const claim = await db.centerServiceTransferReceipt.create({data: {id: randomUUID(), financeEntryId: randomUUID(), organizationId: center.id,
          centerOrgUnitId: unit.id, bookingId: row.line.sourceId, paymentId: collected.find(r => r.line.kind === 'TRIP').paymentId,
          invoiceFinalizationId: randomUUID(), bankName: input.bankName, bankReference: input.bankReference,
          bankReferenceKey: hash([input.bankName.toUpperCase(), input.bankReference.toUpperCase()]), amountMinor: input.amountMinor, currency: 'SAR',
          transferredAt: new Date(input.transferredAt), document, documentSha256: createHash('sha256').update(document).digest('hex'),
          evidenceSnapshot: {syntheticUnresolvedClaim: true}, status: 'PENDING', submittedBy: owner.id}});
        try {denied(await call(owner, transferPath, 'POST', input), 409);} finally {await db.centerServiceTransferReceipt.delete({where: {id: claim.id}});}
      }
      const receipt = ok(await call(owner, transferPath, 'POST', input));
      assert.equal(ok(await call(owner, transferPath, 'POST', input)).id, receipt.id);
      const confirmation = {decision: 'CONFIRMED', note: 'Synthetic original incoming receipt ' + row.line.kind,
        receivedAt: new Date().toISOString(), documentBase64: incoming.toString('base64')};
      const final = ok(await call(receiver, transferPath + '/' + receipt.id + '/review', 'POST', confirmation));
      assert.equal(final.status, 'CONFIRMED'); assert.equal(final.bankTransferExecuted, false); assert.equal(final.providerVerified, false);
      assert.equal(ok(await call(receiver, transferPath + '/' + receipt.id + '/review', 'POST', confirmation)).id, receipt.id);
      row.transfer = receipt;
    }
    const rows = await db.financeEntry.findMany({where: {id: {in: settlements.map(row => row.entry.id)}}});
    assert.equal(rows.length, 4); assert.ok(rows.every(row => row.status === 'POSTED' && row.postedByAccountId === receiver.id));
    assert.equal(rows.reduce((sum, row) => sum + row.amountMinor, 0), 11000);
    const receipts = await db.commerceSourceTransferReceipt.findMany({where: {status: 'CONFIRMED'}});
    assert.equal(receipts.length, 4); assert.equal(new Set(receipts.map(row => row.sourceType)).size, 4);
    assert.equal(f.requests.filter(row => row.method === 'POST' && !row.path.endsWith('/refund') && row.path !== '/v1/invoices').length, 0);
  });
  let cancellation;
  if (process.env.B08_ACCEPTANCE_STAGE !== 'SETTLEMENT') {
    const {verifyCancelledSources} = require('./mixed-commerce-cancellation-checks.cjs');
    cancellation = await verifyCancelledSources(f, {check, financePath: path});
  }
  return {currency: 'SAR', originalCollectedMinor: 12600, refundedMinor: 1200, earnedGrossMinor: 11400, commissionMinor: 400,
    confirmedExternalReceiptMinor: 11000, realBankExecution: false,
    invoices: invoiceReceipts.map(({kind, id, amountMinor, taxMinor, subtotalMinor, profileRevision}) => ({kind, id, amountMinor, taxMinor, subtotalMinor, profileRevision})),
    settlements: settlements.map(row => ({kind: row.line.kind,
      sourceType: row.line.sourceType, sourceId: row.line.sourceId, grossMinor: row.gross, netMinor: row.entry.amountMinor,
      financeEntryId: row.entry.id, transferReceiptId: row.transfer.id})), cancellation};
};
