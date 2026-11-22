const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DatabaseService } = require('../dist/database/database.service');
const { WarehouseReceivingService } = require('../dist/inventory/warehouse-receiving.service');
const { InventoryIssueLedgerService } = require('../dist/inventory/inventory-issue-ledger.service');

async function check() {
  const { warehouseTestDatabase } = await import('./warehouse-location-test-support.mjs');
  warehouseTestDatabase();
  const db = new DatabaseService();
  const receiving = new WarehouseReceivingService(db);
  const issues = new InventoryIssueLedgerService(db);
  const organizationId = randomUUID(), lineId = randomUUID(), receiptId = randomUUID();
  const key = { organizationId_lineId: { organizationId, lineId } };
  try {
    await db.warehousePurchaseLine.create({ data: {
      organizationId, lineId, purchaseReference: 'PO-test', supplierId: 'supplier-test', itemId: 'mask',
      quantity: 12, unitCostMinor: 2500, approvalReference: 'synthetic-approval',
    } });
    const receipt = { organizationId, lineId, receiptId, locationId: 'test-location', receivedBy: 'test-receiver', quantity: 8 };
    await assert.rejects(receiving.receive({ ...receipt, organizationId: randomUUID() }), e => e.getStatus?.() === 404);
    const repeated = await Promise.all(Array.from({ length: 6 }, () => receiving.receive(receipt)));
    assert.ok(repeated.every(r => r.lot.received === 8 && r.lot.unitCostMinor === 2500 && r.lot.purchaseReference === 'PO-test'));
    await assert.rejects(receiving.receive({ ...receipt, quantity: 7 }), e => e.getStatus?.() === 409);
    const rest = await Promise.allSettled([1, 2].map(() => receiving.receive({ ...receipt, receiptId: randomUUID(), quantity: 4 })));
    assert.equal(rest.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(rest.find(r => r.status === 'rejected').reason.getStatus(), 409);
    assert.equal((await db.warehousePurchaseLine.findUniqueOrThrow({ where: key })).received, 12);
    assert.equal(await db.warehousePurchaseReceipt.count({ where: { organizationId } }), 2);
    const requestId = randomUUID();
    await issues.post({ organizationId, requestId, lotId: receiptId, quantity: 3, custodianId: 'custodian', approvedBy: 'approver', postedBy: 'issuer' });
    await issues.acknowledge(organizationId, requestId, 'custodian');
    const lot = await db.warehouseStockLot.findUniqueOrThrow({ where: { organizationId_lotId: { organizationId, lotId: receiptId } } });
    assert.equal(lot.onHand, 5);
    console.log('PASS partial receipts, concurrent retries, quantity and organization limits, purchase cost and custody trace.');
  } finally {
    await db.$disconnect();
  }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
