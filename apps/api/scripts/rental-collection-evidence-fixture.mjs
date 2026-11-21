import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join} from 'node:path';

const dist = process.env.RENTAL_COLLECTION_TEST_DIST || fileURLToPath(new URL('../dist/',import.meta.url));
const {FinancePersistenceService} = await import(pathToFileURL(join(dist,'finance/finance-persistence.service.js')));
const {rentalContractHash} = await import(pathToFileURL(join(dist,'commerce/rental-contract.js')));

function requireDisposableLoopback() {
  assert.notEqual(process.env.NODE_ENV,'production','Synthetic collection receipts cannot run in production');
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname),'Synthetic collection receipts require loopback PostgreSQL');
}

/**
 * Test-only receipt: deliberately manufactured from synthetic fixture data. It
 * proves the consumer gate and real ledger checks, not a provider collection.
 * No production API exposes this helper or accepts these fields from a browser.
 */
export async function createSyntheticRentalCollection(db,input) {
  requireDisposableLoopback();
  const {rentalId,centerId,requesterId,approverId,posterId,mutateEvidence} = input;
  assert.equal(new Set([requesterId,approverId,posterId]).size,3);
  const [rental] = await db.$queryRaw`SELECT * FROM "EquipmentRental" WHERE "id"=${rentalId}`;
  assert.ok(rental);
  const items = await db.$queryRaw`SELECT "id","resourceId","unitPriceHalala" FROM "EquipmentRentalItem" WHERE "rentalId"=${rentalId} ORDER BY "resourceId"`;
  assert.ok(items.length);
  const organization = await db.organization.findUniqueOrThrow({where:{id:centerId}});
  for (const key of ['legalName','registrationNumber','address']) assert.ok(organization[key],'Synthetic center needs explicit '+key);
  // Ownership is explicit fixture setup, not a collection-side production change.
  for (const item of items) {
    await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${centerId} WHERE "resourceId"=${item.resourceId}`;
  }
  const amountMinor = Number(rental.totalHalala);
  const ledger = new FinancePersistenceService(db);
  const account = await ledger.createAccount({organizationId:centerId,name:'SYNTHETIC Rental Collection '+rentalId,currency:'SAR'});
  const entry = await ledger.createEntry({organizationId:centerId,financeAccountId:account.id,type:'REVENUE',amountMinor,currency:'SAR',referenceType:'EQUIPMENT_RENTAL_COLLECTION',referenceId:rentalId,description:'SYNTHETIC — not a real provider receipt',requestedByAccountId:requesterId});
  await ledger.decideEntry(entry.id,approverId,true,'SYNTHETIC isolated acceptance approval');
  await ledger.postEntry(entry.id,posterId);
  const providerPaymentId = randomUUID(),providerInvoiceId = randomUUID(),checkoutId=randomUUID();
  assert.ok(rental.contractSnapshot,'Fixture requires a real reservation contract, not a fabricated legacy agreement');
  const scheduledHandoverAt = rental.scheduledHandoverAt.toISOString();
  assert.ok(Date.parse(scheduledHandoverAt)<rental.dueAt.getTime(),'Fixture needs a separate future handover before its return deadline');
  const providerVerifiedAt = new Date();
  const evidence = {
    sourceType:'EQUIPMENT_RENTAL',sourceId:rentalId,organizationId:centerId,customerAccountId:rental.renterAccountId,
    amountMinor,currency:'SAR',provider:'MOYASAR',providerPaymentId,providerInvoiceId,
    providerCapturedMinor:amountMinor,providerRefundedMinor:0,providerVerifiedAt,financeEntryId:entry.id,
    providerSnapshot:{id:providerPaymentId,invoiceId:providerInvoiceId,status:'paid',amountMinor,currency:'SAR',
      capturedMinor:amountMinor,refundedMinor:0,updatedAt:providerVerifiedAt.toISOString(),refundedAt:null,
      invoiceMetadata:{hydroland_checkout_id:checkoutId,hydroland_source_type:'EQUIPMENT_RENTAL',hydroland_source_id:rentalId,
        hydroland_customer_account_id:rental.renterAccountId,hydroland_organization_id:centerId}},
    contractSnapshot:{...rental.contractSnapshot,termsAcceptedAt:providerVerifiedAt.toISOString(),acceptedQuoteHash:rentalContractHash(rental.contractSnapshot)},
  };
  await db.commerceCheckout.create({data:{id:checkoutId,sourceType:'EQUIPMENT_RENTAL',sourceId:rentalId,organizationId:centerId,
    customerAccountId:rental.renterAccountId,amountMinor,currency:'SAR',provider:'MOYASAR',idempotencyKey:'synthetic:'+rentalId,
    requestFingerprint:rentalContractHash(rental.contractSnapshot),providerInvoiceId,providerPaymentId,status:'CAPTURED',dispatchedAt:providerVerifiedAt,
    contractSnapshot:structuredClone(evidence.contractSnapshot),providerResult:{payment:structuredClone(evidence.providerSnapshot),verifiedAt:providerVerifiedAt.toISOString()}}});
  if (mutateEvidence) await mutateEvidence(evidence,{entry,account,rental,items});
  const receipt = await db.commerceCollectionEvidence.create({data:evidence});
  return {evidenceId:receipt.id,financeEntryId:entry.id,financeAccountId:account.id,rentalId,centerId};
}

export async function cleanupSyntheticRentalCollections(db,receipts) {
  requireDisposableLoopback();
  const evidenceIds=receipts.map(row=>row.evidenceId),entryIds=receipts.map(row=>row.financeEntryId),accountIds=receipts.map(row=>row.financeAccountId);
  await db.commerceCollectionEvidence.deleteMany({where:{id:{in:evidenceIds}}});
  await db.commerceCheckout.deleteMany({where:{sourceType:'EQUIPMENT_RENTAL',sourceId:{in:receipts.map(row=>row.rentalId)}}});
  await db.financeApproval.deleteMany({where:{financeEntryId:{in:entryIds}}});
  await db.financeEntry.deleteMany({where:{id:{in:entryIds}}});
  await db.financeAccount.deleteMany({where:{id:{in:accountIds}}});
  await db.auditEvent.deleteMany({where:{resource:'FinanceEntry',resourceId:{in:entryIds}}}).catch(error=>{
    // Later CI passes deliberately enable the production append-only audit
    // boundary. Preserve those fixture receipts; never disable its trigger.
    if(!String(error?.message||error).includes('append-only'))throw error;
  });
}
