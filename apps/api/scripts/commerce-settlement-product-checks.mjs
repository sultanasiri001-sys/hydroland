import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function verifyProductSettlement({db,access,settlements,provider,accountant,reviewer,secondReviewer,centerId,organizationId,paymentId,checkoutId,amountMinor}) {
  assert.notEqual(process.env.NODE_ENV,'production');
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
  const refs=[],roles=[];
  const line={payment_id:paymentId,type:'payment',source_currency:'SAR',currency:'SAR',payment_amount:amountMinor,
    amount:amountMinor-15,settlement_amount:amountMinor-15,fee:15,tax:2,transacted_at:new Date().toISOString()};
  let lines=[line];
  const source={fetchSettlement:async id=>({id,currency:'SAR'}),listSettlementLines:async()=>({lines,meta:{next_page:null}})};
  const service=new settlements(db,access,source,provider);
  const capture=async()=>{const ref=randomUUID();refs.push(ref);return service.import(accountant,centerId,ref);};
  try{
    for(const actor of [reviewer,secondReviewer]){
      const row=await db.roleAssignment.create({data:{accountId:actor,role:'EXECUTIVE_APPROVER',status:'ACTIVE',scope:{organizationId}}});
      roles.push(row.id);
    }
    const imported=await capture();
    assert.equal(imported.matchedLineCount,1);assert.equal(imported.mismatchedLineCount,0);
    assert.equal(imported.lines[0].localPaymentId,checkoutId);assert.equal(imported.lines[0].sourceType,'EQUIPMENT_RENTAL');
    assert.equal(imported.grossAmountMinor,amountMinor);
    await service.review(reviewer,imported.id,'APPROVED');
    const evidence=await db.commerceCollectionEvidence.findUniqueOrThrow({where:{providerPaymentId:paymentId}});
    await db.commerceCollectionEvidence.update({where:{id:evidence.id},data:{providerCapturedMinor:amountMinor-1}});
    await assert.rejects(service.review(secondReviewer,imported.id,'APPROVED'),/FINANCE_SETTLEMENT_RECONCILIATION_BLOCKED/);
    assert.equal((await capture()).mismatchedLineCount,1);
    await db.commerceCollectionEvidence.update({where:{id:evidence.id},data:{providerCapturedMinor:amountMinor}});
    await service.review(secondReviewer,imported.id,'APPROVED');
    assert.equal((await db.financeSettlementImport.findUniqueOrThrow({where:{id:imported.id}})).status,'APPROVED');
    lines=[line,{...line}];assert.equal((await capture()).mismatchedLineCount,2);
    lines=[{...line,type:'refund'}];assert.equal((await capture()).mismatchedLineCount,1);
    console.log('PASS: product settlement from a verified rental receipt, independent dual review, evidence recheck, duplicate payment and unverified refund rejection');
  }finally{
    const imports=await db.financeSettlementImport.findMany({where:{providerSettlementId:{in:refs}},select:{id:true}});
    await db.financeSettlementReview.deleteMany({where:{importId:{in:imports.map(v=>v.id)}}});
    await db.financeSettlementImport.deleteMany({where:{id:{in:imports.map(v=>v.id)}}});
    await db.roleAssignment.deleteMany({where:{id:{in:roles}}});
  }
}
