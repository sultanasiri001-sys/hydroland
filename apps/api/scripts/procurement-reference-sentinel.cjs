// A deliberately unresolved cross-system claim used only in disposable tests.
// It is never accepted as contract, collection, transfer or operational evidence.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

exports.withProcurementReference = async function (db, input, work) {
  const url = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
  const order = await db.procurementOrder.create({ data: { id: randomUUID(), organizationId: input.organizationId,
    purchaseReference: 'SYNTHETIC-REFERENCE-SENTINEL-' + randomUUID(), contractDocumentId: randomUUID(), contractVersion: 1,
    contractHash: 'a'.repeat(64), contractSnapshot: { syntheticUnresolvedClaim: true }, supplierDocumentId: randomUUID(),
    supplierVersion: 1, supplierHash: 'b'.repeat(64), supplierSnapshot: { syntheticUnresolvedClaim: true },
    terms: { syntheticUnresolvedClaim: true }, authoritySnapshot: { syntheticUnresolvedClaim: true },
    amountMinor: input.amountMinor, requestedByAccountId: input.actorId, ownerAccountId: input.actorId } });
  let claim;
  try {
    claim = await db.procurementMoneyProof.create({ data: { id: randomUUID(), organizationId: input.organizationId,
      orderId: order.id, kind: 'SETTLEMENT', financeEntryId: randomUUID(), activeKey: order.id + ':SETTLEMENT',
      status: 'PREPARED', amountMinor: input.amountMinor, preparedByAccountId: input.actorId, bankReferenceKey: input.bankReferenceKey } });
    return await work();
  } finally {
    if (claim) await db.procurementMoneyProof.delete({ where: { id: claim.id } });
    await db.procurementOrder.delete({ where: { id: order.id } });
  }
};
