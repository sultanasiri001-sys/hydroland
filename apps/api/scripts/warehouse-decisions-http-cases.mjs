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
  const supplierFields=[
    {key:'supplierRef',labelAr:'المورد',labelEn:'Supplier',type:'TEXT',required:true},
    {key:'supplierAcceptanceRef',labelAr:'القبول',labelEn:'Approval',type:'TEXT',required:true},
    {key:'nextSupplierReviewDate',labelAr:'المراجعة',labelEn:'Review',type:'DATE',required:true}
  ];
  const template=await db.documentTemplate.create({data:{organizationId:org.id,department:'INVENTORY_LOGISTICS',code:'INV-SUPPLIER-QUALIFICATION',
    titleAr:'تأهيل مورد',titleEn:'Supplier qualification',fields:supplierFields}});
  await db.documentBrandSnapshot.create({data:{organizationId:org.id,brandVersion:1}});
  const payload={supplierRef:'test-supplier',supplierAcceptanceRef:'test-acceptance',nextSupplierReviewDate:'2099-12-31'};
  const doc=await db.managedDocument.create({data:{organizationId:org.id,department:'INVENTORY_LOGISTICS',templateId:template.id,
    documentBrandVersion:1,referenceNumber:randomUUID(),createdByAccountId:maker.id,approvedByAccountId:reviewer.id,approvedAt:new Date(),
    status:'APPROVED',contentHash:'a'.repeat(64),payload}});
  await db.documentRevision.create({data:{documentId:doc.id,version:1,createdByAccountId:maker.id,contentHash:doc.contentHash,payload}});
  await db.documentLifecycleEvent.create({data:{documentId:doc.id,version:1,actorAccountId:reviewer.id,action:'APPROVED',fromStatus:'PENDING_APPROVAL',toStatus:'APPROVED'}});
  const order = {purchaseReference:randomUUID(),supplierId:doc.id,itemId:item.id,quantity:12,unitCostMinor:2500};
  const submit = 'warehouse/purchase-requests/'+purchaseId, receiptPath = 'warehouse/receipts/'+receiptId;
  const receipt = {lineId:purchaseId,locationId,quantity:12};
  const path = (id,step) => 'warehouse/requests/'+id+'/'+step;
  const procurement = await employee('procurement','INVENTORY_LOGISTICS');
  const assignment='warehouse/procurement-representatives/'+procurement.id;
  await deny(other,assignment,'POST',{active:true},[403]);
  await ok(owner,assignment,'POST',{active:true});
  const opinion=(request,decision='APPROVE')=>({digest:request.finalDigest || request.digest,decision,note:'مسوغ تجريبي للقرار'});
  await deny(null,submit,'POST',order,[401]);
  await deny(other,submit,'POST',order,[403]);
  await deny(maker,submit,'POST',{...order,supplierId:randomUUID()},[403]);
  const request = await ok(maker,submit,'POST',order);
  assert.equal(request.details.supplierRef,'test-supplier');
  const sign = {digest:request.digest};
  assert.equal((await ok(maker,submit,'POST',order)).digest,request.digest);
  await deny(maker,submit,'POST',{...order,quantity:1},[409]);
  await deny(reviewer,receiptPath,'POST',receipt,[404]);
  await deny(maker,path(purchaseId,'review'),'POST',sign,[403]);
  await deny(finance,path(purchaseId,'review'),'POST',{digest:'0'.repeat(64)},[409]);
  await ok(finance,path(purchaseId,'review'),'POST',sign);
  await deny(owner,path(purchaseId,'finalize'),'POST',opinion(request),[409]);
  await deny(reviewer,path(purchaseId,'recommend'),'POST',opinion(request),[403]);
  await ok(owner,assignment,'POST',{active:false});
  await deny(procurement,path(purchaseId,'recommend'),'POST',opinion(request),[403]);
  await ok(owner,assignment,'POST',{active:true});
  const recommendation=await ok(procurement,path(purchaseId,'recommend'),'POST',opinion(request));
  await deny(owner,path(purchaseId,'finalize'),'POST',opinion(request),[409]);
  await deny(procurement,path(purchaseId,'finalize'),'POST',opinion(request),[403]);
  await ok(owner,path(purchaseId,'finalize'),'POST',opinion(recommendation));
  await ok(owner,path(purchaseId,'finalize'),'POST',opinion(recommendation));
  const refusedId=randomUUID(), refused=await ok(maker,'warehouse/purchase-requests/'+refusedId,'POST',{...order,purchaseReference:randomUUID()});
  await ok(finance,path(refusedId,'review'),'POST',{digest:refused.digest});
  const adverse=await ok(procurement,path(refusedId,'recommend'),'POST',opinion(refused,'DECLINE'));
  await ok(owner,path(refusedId,'finalize'),'POST',opinion(adverse,'DECLINE'));
  await deny(reviewer,receiptPath,'POST',{...receipt,lineId:refusedId},[404]);
  await deny(finance,receiptPath,'POST',receipt,[403]);
  const delivery = await ok(reviewer,receiptPath,'POST',receipt);
  assert.equal(delivery.lot.received,12); assert.equal(delivery.lot.unitCostMinor,2500);
  await deny(reviewer,'warehouse/receipts/'+randomUUID(),'POST',receipt,[409]);
  async function count(counted) {
    const id=randomUUID(), result=await ok(maker,'warehouse/counts/'+id,'POST',{lotId:receiptId,counted,reason:'عد تجريبي'});
    const body={digest:result.digest};
    await deny(maker,path(id,'review'),'POST',body,[403]);
    await ok(reviewer,path(id,'review'),'POST',body);
    const rec=await ok(procurement,path(id,'recommend'),'POST',opinion(result));
    return {url:path(id,'finalize'),body:opinion(rec)};
  }
  const stale=await count(11), surplus=await count(14);
  await deny(other,surplus.url,'POST',surplus.body,[403]);
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
  const issueRec=await ok(procurement,path(issueId,'recommend'),'POST',opinion(issue));
  await ok(owner,path(issueId,'finalize'),'POST',opinion(issueRec));
  await Promise.all([1,2,3].map(()=>ok(maker,issuePath+'/post','POST')));
  const acknowledgment='warehouse/custody/'+org.id+'/'+issueId+'/acknowledge';
  await deny(maker,acknowledgment,'POST',undefined,[404]);
  await ok(finance,acknowledgment,'POST');
  const final=await db.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId:org.id,lotId:receiptId}}});
  assert.equal(final.onHand,6);
  const inventoryView=await ok(maker,'warehouse/workspace');
  assert.equal(inventoryView.inventory,true);
  assert.equal(inventoryView.lots.find(r=>r.lotId===receiptId).onHand,6);
  const financialView=await ok(finance,'warehouse/workspace');
  assert.equal(financialView.inventory,false);assert.equal(financialView.lots.length,0);
  assert.ok(financialView.requests.every(r=>r.kind==='PURCHASE'));
  await deny(other,'warehouse/workspace','GET',undefined,[403]);
  const dest=(await db.warehouseLocation.findFirstOrThrow({where:{organizationId:org.id,status:'RECORDED',id:{not:locationId}}})).id;
  async function approveMovement(author,route,details) {
    const id=randomUUID(), req=await ok(author,'warehouse/'+route+'/'+id,'POST',details);
    await ok(reviewer,path(id,'review'),'POST',{digest:req.digest});
    const rec=await ok(procurement,path(id,'recommend'),'POST',opinion(req));
    await ok(owner,path(id,'finalize'),'POST',opinion(rec));
    return id;
  }
  const transfer=await approveMovement(maker,'transfers',{lotId:receiptId,destinationId:dest,quantity:4});
  const postMove=id=>'warehouse/movements/'+id+'/receive';
  await deny(maker,postMove(transfer),'POST',undefined,[403]);
  await Promise.all([1,2,3].map(()=>ok(reviewer,postMove(transfer),'POST')));
  const child=await db.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId:org.id,lotId:transfer}}});
  assert.equal(child.onHand,4);assert.equal(child.parentLotId,receiptId);assert.equal(child.unitCostMinor,2500);
  await deny(maker,'warehouse/returns/'+randomUUID(),'POST',{issueId,quantity:1},[404]);
  const ret=await approveMovement(finance,'returns',{issueId,quantity:2});
  await Promise.all([1,2,3].map(()=>ok(reviewer,postMove(ret),'POST')));
  await deny(finance,'warehouse/returns/'+randomUUID(),'POST',{issueId,quantity:2},[409]);
  const after=await db.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId:org.id,lotId:receiptId}}});
  assert.equal(after.onHand,4);
  const returned=await db.warehouseIssuePosting.findUniqueOrThrow({where:{organizationId_requestId:{organizationId:org.id,requestId:issueId}}});
  assert.equal(returned.quantity-returned.returned,1);
  console.log('PASS supplier document, approved cross-location transfer with cost preserved and partial return against acknowledged custody.');
  console.log('PASS HTTP warehouse purchase, independent budget review, documented procurement recommendation, executive approval and refusal, receipt, positive and negative stock counts, stale count rejection and concurrent replay.');
}
