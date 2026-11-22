const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {DatabaseService}=require('../dist/database/database.service');
const {InventoryIssueLedgerService}=require('../dist/inventory/inventory-issue-ledger.service');

async function check() {
  const {warehouseTestDatabase}=await import('./warehouse-location-test-support.mjs');
  warehouseTestDatabase();
  const db=new DatabaseService(), ledger=new InventoryIssueLedgerService(db);
  try {
    const organizationId=randomUUID(),lotId=randomUUID(),where={organizationId_lotId:{organizationId,lotId}};
    await db.warehouseStockLot.create({data:{organizationId,lotId,itemId:'mask',locationId:'store',purchaseReference:'PO-TEST',
      receiptReference:'GR-TEST',unitCostMinor:2500,received:12,onHand:12}});
    const issue={organizationId,lotId,requestId:randomUUID(),quantity:3,custodianId:'test-diver',postedBy:'test-clerk',approvedBy:'test-approver'};
    const responses=await Promise.all(Array.from({length:8},()=>ledger.post(issue)));
    assert.ok(responses.every(x=>x.balanceAfter===9));
    assert.equal(await db.warehouseIssuePosting.count({where:{organizationId}}),1);
    await assert.rejects(ledger.post({...issue,quantity:2}),e=>e.getStatus?.()===409);
    await assert.rejects(ledger.post({...issue,organizationId:randomUUID()}),e=>e.getStatus?.()===409);
    for (const [org, actor] of [[organizationId, 'another-account'], [randomUUID(), issue.custodianId]]) {
      await assert.rejects(ledger.acknowledge(org, issue.requestId, actor), error => error.getStatus?.() === 404);
    }
    assert.equal((await db.warehouseIssuePosting.findFirstOrThrow({ where: { organizationId } })).acknowledgedAt, null);
    const receipts = await Promise.all(Array.from({length: 4}, () =>
      ledger.acknowledge(organizationId, issue.requestId, issue.custodianId)));
    assert.ok(receipts.every(receipt => receipt.acknowledgedAt instanceof Date &&
      receipt.acknowledgedAt.getTime() === receipts[0].acknowledgedAt.getTime() && receipt.quantity === 3));
    const competing=await Promise.allSettled([1,2].map(()=>ledger.post({...issue,requestId:randomUUID(),quantity:6})));
    assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(competing.find(r=>r.status==='rejected').reason.getStatus(),409);
    const saved=await db.warehouseStockLot.findUniqueOrThrow({where,include:{issues:true}});
    assert.equal(saved.onHand,3);assert.equal(saved.issues.length,2);assert.equal(saved.purchaseReference,'PO-TEST');
    assert.equal(saved.received-saved.issues.reduce((n,i)=>n+i.quantity,0),saved.onHand);
    console.log('PASS 8 concurrent replays produced one issue; conflicting amount and foreign organization rejected; competing issues preserved a balance of 3.');
  }finally{await db.$disconnect();}
}
check().catch(error=>{console.error(error);process.exitCode=1;});
