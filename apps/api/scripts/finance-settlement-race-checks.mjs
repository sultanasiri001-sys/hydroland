import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {FinanceSettlementService} from '../dist/finance/finance-settlement.service.js';

// Called only by the loopback-only disposable TEXT/UUID database matrix.
// Provider responses are synthetic; authorization and persistence are real.
export async function checkSettlementSyncRaces(db,access,provider,paymentProvider,{accountId,centerId,paymentId,foreignOrganizationId}){
  let count=0;
  const linkedId=async()=>(await db.$queryRaw`SELECT "moyasarPaymentId" AS id FROM "Payment" WHERE "id"::text=${paymentId}`)[0].id;
  const originalTrip=(await db.$queryRaw`SELECT t."id"::text AS id,t."organizationId"::text AS organization FROM "Payment" p JOIN "Booking" b ON b.id=p."bookingId" JOIN "Trip" t ON t.id=b."tripId" WHERE p.id::text=${paymentId}`)[0];
  const race=mutate=>new FinanceSettlementService(db,access,provider,{
    fetchInvoice:async ref=>{const response=await paymentProvider.fetchInvoice(ref);await mutate();return response;}
  });
  try{
    const revoked=race(()=>db.$executeRaw`UPDATE "Account" SET status='INACTIVE' WHERE id::text=${accountId}`);
    await assert.rejects(revoked.syncPaymentReferences(accountId,centerId),/FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED/);
    assert.equal(await linkedId(),null);count++;
  }finally{await db.$executeRaw`UPDATE "Account" SET status='ACTIVE' WHERE id::text=${accountId}`;}
  const replacements=[
    [()=>db.$executeRaw`UPDATE "Payment" SET "amountMinor"=41 WHERE id::text=${paymentId}`,()=>db.$executeRaw`UPDATE "Payment" SET "amountMinor"=40 WHERE id::text=${paymentId}`],
    [()=>db.$executeRaw`UPDATE "Payment" SET currency='USD' WHERE id::text=${paymentId}`,()=>db.$executeRaw`UPDATE "Payment" SET currency='SAR' WHERE id::text=${paymentId}`],
    [()=>db.$executeRaw`UPDATE "Payment" SET status='REFUNDED' WHERE id::text=${paymentId}`,()=>db.$executeRaw`UPDATE "Payment" SET status='CAPTURED' WHERE id::text=${paymentId}`],
    [()=>db.$executeRaw`UPDATE "Trip" SET "organizationId"=(SELECT id FROM "Organization" WHERE id::text=${foreignOrganizationId}) WHERE id::text=${originalTrip.id}`,()=>db.$executeRaw`UPDATE "Trip" SET "organizationId"=(SELECT id FROM "Organization" WHERE id::text=${originalTrip.organization}) WHERE id::text=${originalTrip.id}`],
  ];
  for(const [mutate,restore] of replacements){
    try{
      const result=await race(mutate).syncPaymentReferences(accountId,centerId);
      assert.equal(result.syncedCount,0);assert.equal(result.failedCount,1);
      assert.equal(await linkedId(),null);count++;
    }finally{await restore();}
  }
  const concurrentId=randomUUID();
  try{
    const result=await race(()=>db.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"=${concurrentId} WHERE id::text=${paymentId}`).syncPaymentReferences(accountId,centerId);
    assert.equal(result.syncedCount,0);assert.equal(result.failedCount,1);
    assert.equal(await linkedId(),concurrentId);count++;
  }finally{await db.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"=NULL WHERE id::text=${paymentId}`;}
  return count;
}

export async function checkSettlementImportRaces(db,access,provider,paymentProvider,{accountId,centerId,settlementId,importId}){
  let count=0;
  const snapshot=async()=>({
    imports:await db.$queryRaw`SELECT * FROM "FinanceSettlementImport" ORDER BY id`,
    audit:await db.$queryRaw`SELECT * FROM "AuditEvent" ORDER BY id`,
    entries:await db.$queryRaw`SELECT * FROM "FinanceEntry" ORDER BY id`,
  });
  for(const ref of [randomUUID(),settlementId]){
    const before=await snapshot();
    const revoked=new FinanceSettlementService(db,access,{
      fetchSettlement:id=>provider.fetchSettlement(id),
      listSettlementLines:async(id,page)=>{
        const result=await provider.listSettlementLines(id,page);
        await db.$executeRaw`UPDATE "Account" SET status='INACTIVE' WHERE id::text=${accountId}`;
        return result;
      }
    },paymentProvider);
    try{
      await assert.rejects(revoked.import(accountId,centerId,ref),/FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED/);
      assert.deepEqual(await snapshot(),before);count++;
    }finally{await db.$executeRaw`UPDATE "Account" SET status='ACTIVE' WHERE id::text=${accountId}`;}
  }
  const service=new FinanceSettlementService(db,access,provider,paymentProvider);
  const before=await snapshot();
  const replayed=await Promise.all([service.import(accountId,centerId,settlementId),service.import(accountId,centerId,settlementId)]);
  assert.deepEqual(replayed.map(row=>row.id),[importId,importId]);
  assert.deepEqual(await snapshot(),before);count++;
  return count;
}
