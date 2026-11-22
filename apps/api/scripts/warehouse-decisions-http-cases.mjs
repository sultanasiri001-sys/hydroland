import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function warehouseDecisionsCases({db, org, owner, other, actor, ok, deny, locationId}) {
  async function employee(name, code) {
    const account = await actor(name, 'STAFF');
    const unit = await db.orgUnit.findUniqueOrThrow({where:{organizationId_code:{organizationId:org.id,code}}});
    const pos = await db.position.create({data:{orgUnitId:unit.id,code:randomUUID(),titleAr:'موظف تجريبي'}});
    await db.organizationMember.create({data:{organizationId:org.id,accountId:account.id,role:'STAFF',status:'ACTIVE'}});
    await db.employment.create({data:{accountId:account.id,organizationId:org.id,orgUnitId:unit.id,positionId:pos.id,workerClass:'EMPLOYEE',status:'ACTIVE'}});
    return account;
  }
  const maker = await employee('maker','INVENTORY_LOGISTICS'), reviewer = await employee('counter','INVENTORY_LOGISTICS');
  const finance = await employee('finance','FINANCE');
  const item = await db.storeProduct.create({data:{organizationId:org.id,sku:randomUUID(),nameAr:'اختبار',kind:'GOODS',priceMinor:100}});
  const purchaseId = randomUUID(), receiptId = randomUUID();
  const order = {purchaseReference:randomUUID(),supplierId:'test-supplier',itemId:item.id,quantity:12,unitCostMinor:2500};
  const submit = 'warehouse/purchase-requests/'+purchaseId, receiptPath = 'warehouse/receipts/'+receiptId;
  const receipt = {lineId:purchaseId,locationId,quantity:12};
  const path = (id,step) => 'warehouse/requests/'+id+'/'+step;
  const mandate = kind => db.operationalSetting.create({data:{key:'WAREHOUSE_FINAL_APPROVER:v1:'+org.id+':'+kind,value:{accountId:owner.id}}});
  await deny(null,submit,'POST',order,[401]);
  await deny(other,submit,'POST',order,[403]);
  const request = await ok(maker,submit,'POST',order);
  const sign = {digest:request.digest};
  assert.equal((await ok(maker,submit,'POST',order)).digest,request.digest);
  await deny(maker,submit,'POST',{...order,quantity:1},[409]);
  await deny(reviewer,receiptPath,'POST',receipt,[404]);
  await deny(maker,path(purchaseId,'review'),'POST',sign,[403]);
  await deny(finance,path(purchaseId,'review'),'POST',{digest:'0'.repeat(64)},[409]);
  await ok(finance,path(purchaseId,'review'),'POST',sign);
  await deny(owner,path(purchaseId,'finalize'),'POST',sign,[403]);
  await mandate('PURCHASE');
  await ok(owner,path(purchaseId,'finalize'),'POST',sign);
  await ok(owner,path(purchaseId,'finalize'),'POST',sign);
  await deny(finance,receiptPath,'POST',receipt,[403]);
  const delivery = await ok(reviewer,receiptPath,'POST',receipt);
  assert.equal(delivery.lot.received,12); assert.equal(delivery.lot.unitCostMinor,2500);
  await deny(reviewer,'warehouse/receipts/'+randomUUID(),'POST',receipt,[409]);
  async function count(counted) {
    const id=randomUUID(), result=await ok(maker,'warehouse/counts/'+id,'POST',{lotId:receiptId,counted,reason:'عد تجريبي'});
    const body={digest:result.digest};
    await deny(maker,path(id,'review'),'POST',body,[403]);
    await ok(reviewer,path(id,'review'),'POST',body);
    return {url:path(id,'finalize'),body};
  }
  const stale=await count(11), surplus=await count(14);
  await deny(owner,surplus.url,'POST',surplus.body,[403]);
  await mandate('COUNT');
  await Promise.all([1,2,3].map(()=>ok(owner,surplus.url,'POST',surplus.body)));
  await deny(owner,stale.url,'POST',stale.body,[409]);
  const loss=await count(9);
  await ok(owner,loss.url,'POST',loss.body);
  const lot=await db.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId:org.id,lotId:receiptId}}});
  assert.equal(lot.received,12); assert.equal(lot.onHand,9); assert.equal(lot.revision,2);
  const issueId=randomUUID(), issuePath='warehouse/issue-requests/'+issueId;
  const issue=await ok(maker,issuePath,'POST',{lotId:receiptId,custodianId:finance.id,quantity:3});
  await deny(maker,issuePath+'/post','POST',undefined,[409]);
  await ok(reviewer,path(issueId,'review'),'POST',{digest:issue.digest});
  await mandate('ISSUE');
  await ok(owner,path(issueId,'finalize'),'POST',{digest:issue.digest});
  await Promise.all([1,2,3].map(()=>ok(maker,issuePath+'/post','POST')));
  const acknowledgment='warehouse/custody/'+org.id+'/'+issueId+'/acknowledge';
  await deny(maker,acknowledgment,'POST',undefined,[404]);
  await ok(finance,acknowledgment,'POST');
  const final=await db.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId:org.id,lotId:receiptId}}});
  assert.equal(final.onHand,6);
  const inventoryView=await ok(maker,'warehouse/workspace');
  assert.equal(inventoryView.inventory,true);
  assert.equal(inventoryView.receipts.find(r=>r.receiptId===receiptId).lot.onHand,6);
  const financialView=await ok(finance,'warehouse/workspace');
  assert.equal(financialView.inventory,false);assert.equal(financialView.receipts.length,0);
  assert.ok(financialView.requests.every(r=>r.kind==='PURCHASE'));
  await deny(other,'warehouse/workspace','GET',undefined,[403]);
  console.log('PASS HTTP warehouse purchase, independent budget review, final mandates, receipt, positive and negative stock counts, stale count rejection and concurrent replay.');
}
