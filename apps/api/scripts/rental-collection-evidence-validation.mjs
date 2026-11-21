import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createSyntheticRentalCollection,cleanupSyntheticRentalCollections} from './rental-collection-evidence-fixture.mjs';

assert.notEqual(process.env.NODE_ENV,'production');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
const dist=process.env.RENTAL_COLLECTION_TEST_DIST||fileURLToPath(new URL('../dist/',import.meta.url));
const load=async file=>import(pathToFileURL(join(dist,file)));
const {DatabaseService}=await load('database/database.service.js');
const {AuditService}=await load('audit/audit.service.js');
const {NotificationsService}=await load('notifications/notifications.service.js');
const {EquipmentRentalService}=await load('trips/equipment-rental.service.js');
const {EquipmentRentalHandoverService}=await load('trips/equipment-rental-handover.service.js');
const {EquipmentRentalAdminService}=await load('trips/equipment-rental-admin.service.js');
const {EquipmentInspectionService}=await load('trips/equipment-inspection.service.js');
const {PolicyControlService}=await load('trips/policy-control.service.js');
const db=new DatabaseService(),audit=new AuditService(db),notifications=new NotificationsService(db);
const inspections=new EquipmentInspectionService(db,audit,new PolicyControlService(db,audit));
const rentals=new EquipmentRentalService(db,audit,notifications),handover=new EquipmentRentalHandoverService(db,audit,notifications,inspections);
const people=[],accounts=[],centers=[],resources=[],rentalIds=[],receipts=[];
let passed=0;
const account=async label=>{
  const person=await db.person.create({data:{firstName:'Synthetic Rental',lastName:label}});people.push(person.id);
  const account=await db.account.create({data:{personId:person.id,email:`rental-proof-${randomUUID()}@example.invalid`,passwordHash:'unusable-synthetic-no-login',status:'ACTIVE'}});accounts.push(account.id);return account.id;
};
const denied=error=>{assert.equal(error.getStatus(),409);assert.equal(error.getResponse().code,'RENTAL_COLLECTION_EVIDENCE_REQUIRED');return true;};
try{
  const requesterId=await account('Requester'),approverId=await account('Approver'),posterId=await account('Poster'),customerId=await account('Customer'),otherCustomerId=await account('Other');
  const adminRole=await db.roleAssignment.create({data:{accountId:requesterId,role:'ADMIN',status:'ACTIVE'}});
  for(const label of ['A','B']){
    const center=await db.organization.create({data:{kind:'DIVE_CENTER',status:'ACTIVE',displayName:'SYNTHETIC Rental '+label,legalName:'SYNTHETIC Rental Center '+label,registrationNumber:'SYNTHETIC-'+label,address:'Synthetic isolated warehouse '+label,ownerId:requesterId}});
    centers.push(center.id);
  }
  async function makeRental(count=1){
    const items=[];
    for(let index=0;index<count;index++){
      const resource=await db.calendarResource.create({data:{type:'EQUIPMENT',name:'Synthetic financial evidence '+randomUUID()}});resources.push(resource.id);
      const barcodeId=randomUUID(),code='SYN-'+randomUUID();
      await db.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","stockStatus","organizationId") VALUES(${barcodeId},${resource.id},${code},${code},${'qr:'+code},'AVAILABLE',${centers[0]})`;
      await inspections.record(requesterId,resource.id,{status:'PASS',serviceExpiresAt:new Date(Date.now()+30*86400000).toISOString(),notes:'SYNTHETIC readiness'});
      items.push({resourceId:resource.id,unitPriceSar:50,code});
    }
    const rental=await rentals.create(requesterId,{renterAccountId:customerId,scheduledHandoverAt:new Date(Date.now()+86400000).toISOString(),dueAt:new Date(Date.now()+3*86400000).toISOString(),items});
    rentalIds.push(rental.id);return{rental,items};
  }
  async function receiptFor(fixture,mutateEvidence){
    const receipt=await createSyntheticRentalCollection(db,{rentalId:fixture.rental.id,centerId:centers[0],requesterId,approverId,posterId,mutateEvidence});
    receipts.push(receipt);return receipt;
  }
  async function unchanged(fixture){
    const [state]=await db.$queryRaw`SELECT "paymentStatus","paidAt" FROM "EquipmentRental" WHERE "id"=${fixture.rental.id}`;
    assert.deepEqual(state,{paymentStatus:'PENDING',paidAt:null});
    const lines=await db.$queryRaw`SELECT i."handedOverAt",b."stockStatus" FROM "EquipmentRentalItem" i JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE i."rentalId"=${fixture.rental.id}`;
    assert.ok(lines.every(line=>line.handedOverAt===null&&line.stockStatus==='AVAILABLE'));
    assert.equal(await db.auditEvent.count({where:{resourceId:fixture.rental.id,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}}),0);
    assert.equal(await db.notification.count({where:{type:'EQUIPMENT_RENTAL_INVOICE',payload:{path:['rentalId'],equals:fixture.rental.id}}}),0);
  }
  const missing=await makeRental();
  await assert.rejects(handover.confirmPayment(requesterId,missing.rental.id),denied);await unchanged(missing);passed++;
  await db.$executeRaw`UPDATE "EquipmentRental" SET "paymentStatus"='PAID',"paidAt"=NOW() WHERE "id"=${missing.rental.id}`;
  await assert.rejects(handover.confirmPayment(requesterId,missing.rental.id),denied);
  await assert.rejects(handover.scan(requesterId,missing.rental.id,{code:missing.items[0].code}),denied);
  await assert.rejects(new EquipmentRentalAdminService(db,rentals,handover).handoverScan(requesterId,missing.rental.id,{code:missing.items[0].code}),denied);passed+=3;

  const negatives=[
    ['other customer',proof=>{proof.customerAccountId=otherCustomerId;}],
    ['other center',proof=>{proof.organizationId=centers[1];}],
    ['other currency',proof=>{proof.currency='USD';}],
    ['different amount',proof=>{proof.amountMinor++;}],
    ['partial capture',proof=>{proof.providerCapturedMinor--;}],
    ['already refunded',proof=>{proof.providerRefundedMinor=100;}],
    ['unselected provider',proof=>{proof.provider='UNVERIFIED';}],
    ['future verification',proof=>{proof.providerVerifiedAt=new Date(Date.now()+86400000);}],
    ['wrong provider payment',proof=>{proof.providerSnapshot.id=randomUUID();}],
    ['wrong provider invoice',proof=>{proof.providerSnapshot.invoiceId=randomUUID();}],
    ['uncaptured provider status',proof=>{proof.providerSnapshot.status='authorized';}],
    ['unrelated trip payment metadata',proof=>{proof.providerSnapshot.invoiceMetadata={hydroland_payment_id:randomUUID(),hydroland_booking_id:randomUUID()};}],
    ['wrong provider source customer',proof=>{proof.providerSnapshot.invoiceMetadata.hydroland_customer_account_id=otherCustomerId;}],
    ['missing actual handover schedule',proof=>{delete proof.contractSnapshot.scheduledHandoverAt;}],
    ['return due date used as handover', (proof,{rental})=>{proof.contractSnapshot.scheduledHandoverAt=rental.dueAt.toISOString();}],
    ['missing accepted terms',proof=>{delete proof.contractSnapshot.termsAcceptedAt;}],
    ['current policy substituted',proof=>{proof.contractSnapshot.policySnapshot.version='future-version';}],
    ['wrong rental policy kind',proof=>{proof.contractSnapshot.policySnapshot.kind='TRIP';}],
    ['wrong snapshot source',proof=>{proof.contractSnapshot.sourceId=randomUUID();}],
    ['wrong line amount',proof=>{proof.contractSnapshot.lines[0].amountMinor++;}],
    ['missing legal issuer',proof=>{proof.contractSnapshot.issuer.legalName=null;}],
    ['unposted ledger',async(_proof,{entry})=>{await db.financeEntry.update({where:{id:entry.id},data:{status:'APPROVED',postedAt:null,postedByAccountId:null}});}],
    ['unrelated ledger reference',async(_proof,{entry})=>{await db.financeEntry.update({where:{id:entry.id},data:{referenceType:'TRIP_PAYMENT',referenceId:randomUUID()}});}],
    ['ledger amount mismatch',async(_proof,{entry})=>{await db.financeEntry.update({where:{id:entry.id},data:{amountMinor:4999}});}],
    ['ledger center mismatch',async(_proof,{entry})=>{await db.financeEntry.update({where:{id:entry.id},data:{organizationId:centers[1]}});}],
    ['missing actual approval',async(_proof,{entry})=>{await db.financeApproval.deleteMany({where:{financeEntryId:entry.id}});}],
    ['self approval marker',async(_proof,{entry})=>{await db.financeEntry.update({where:{id:entry.id},data:{approvedByAccountId:requesterId}});}],
    ['inactive finance account',async(_proof,{account})=>{await db.financeAccount.update({where:{id:account.id},data:{active:false}});}],
    ['equipment center mismatch',async(_proof,{items})=>{await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${centers[1]} WHERE "resourceId"=${items[0].resourceId}`;}],
  ];
  for(const[label,mutate]of negatives){
    const fixture=await makeRental();await receiptFor(fixture,mutate);
    await assert.rejects(handover.confirmPayment(requesterId,fixture.rental.id),denied,label);
    await unchanged(fixture);passed++;
  }

  const mixed=await makeRental(2);
  await receiptFor(mixed,async(_proof,{items})=>{await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${centers[1]} WHERE "resourceId"=${items[1].resourceId}`;});
  await assert.rejects(handover.confirmPayment(requesterId,mixed.rental.id),denied);await unchanged(mixed);passed++;

  for(const failedComponent of ['notification','audit']){
    const fixture=await makeRental();await receiptFor(fixture);
    const failing=new EquipmentRentalHandoverService(db,failedComponent==='audit'?{record(){throw new Error('Synthetic collection audit failure');}}:audit,
      failedComponent==='notification'?{notify(){throw new Error('Synthetic collection notification failure');}}:notifications,inspections);
    await assert.rejects(failing.confirmPayment(requesterId,fixture.rental.id),/Synthetic collection/);
    await unchanged(fixture);passed++;
  }

  const authority=await makeRental();await receiptFor(authority);
  const forbidden=error=>{assert.equal(error.getStatus(),403);return true;};
  await db.account.update({where:{id:requesterId},data:{status:'SUSPENDED'}});
  await assert.rejects(handover.confirmPayment(requesterId,authority.rental.id),forbidden);await unchanged(authority);passed++;
  await db.account.update({where:{id:requesterId},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:centers[0]},data:{status:'SUSPENDED'}});
  await assert.rejects(handover.confirmPayment(requesterId,authority.rental.id),forbidden);await unchanged(authority);passed++;
  await db.organization.update({where:{id:centers[0]},data:{status:'ACTIVE'}});
  await db.roleAssignment.update({where:{id:adminRole.id},data:{status:'SUSPENDED'}});
  await assert.rejects(handover.confirmPayment(requesterId,authority.rental.id),forbidden);await unchanged(authority);passed++;
  await db.roleAssignment.update({where:{id:adminRole.id},data:{status:'ACTIVE'}});
  for(const operation of ['confirmation','handover']){
    const fixture=await makeRental();await receiptFor(fixture);
    if(operation==='handover')await handover.confirmPayment(requesterId,fixture.rental.id);
    let notifyHeld,release;const held=new Promise(resolve=>{notifyHeld=resolve;}),unblock=new Promise(resolve=>{release=resolve;});
    const guarded=new EquipmentRentalHandoverService(db,audit,notifications,{async evaluate(ids,tx){notifyHeld();await unblock;return inspections.evaluate(ids,tx);}});
    const attempt=operation==='confirmation'?guarded.confirmPayment(requesterId,fixture.rental.id):guarded.scan(requesterId,fixture.rental.id,{code:fixture.items[0].code});
    const denial=assert.rejects(attempt,forbidden);
    await held;await db.roleAssignment.update({where:{id:adminRole.id},data:{status:'SUSPENDED'}});release();await denial;
    const [row]=await db.$queryRaw`SELECT "handedOverAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${fixture.rental.id}`;
    assert.equal(row.handedOverAt,null);
    if(operation==='confirmation')await unchanged(fixture);
    await db.roleAssignment.update({where:{id:adminRole.id},data:{status:'ACTIVE'}});passed++;
  }

  const valid=await makeRental();const validReceipt=await receiptFor(valid);
  const concurrent=await Promise.all([handover.confirmPayment(requesterId,valid.rental.id),handover.confirmPayment(requesterId,valid.rental.id)]);
  assert.deepEqual(concurrent.map(result=>result.result).sort(),['ALREADY_PAID','PAYMENT_CONFIRMED']);
  assert.equal(await db.auditEvent.count({where:{resourceId:valid.rental.id,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}}),1);
  assert.equal(await db.notification.count({where:{type:'EQUIPMENT_RENTAL_INVOICE',payload:{path:['rentalId'],equals:valid.rental.id}}}),1);passed++;
  const scans=await Promise.all([handover.scan(requesterId,valid.rental.id,{code:valid.items[0].code}),handover.scan(requesterId,valid.rental.id,{code:valid.items[0].code})]);
  assert.deepEqual(scans.map(result=>result.result).sort(),['ALREADY_HANDED_OVER','HANDED_OVER']);
  assert.equal(scans[0].status,'ACTIVE');passed++;
  await db.financeEntry.update({where:{id:validReceipt.financeEntryId},data:{status:'VOIDED'}});
  await assert.rejects(handover.confirmPayment(requesterId,valid.rental.id),denied);
  await assert.rejects(handover.scan(requesterId,valid.rental.id,{code:valid.items[0].code}),denied);passed+=2;
  console.log(JSON.stringify({result:'PASS',checks:passed,postgresql:true,providerCalls:0,realMoneyMovement:false,syntheticProofOnly:true}));
}finally{
  await cleanupSyntheticRentalCollections(db,receipts);
  await db.notification.deleteMany({where:{accountId:{in:accounts}}});
  await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:people}},{resourceId:{in:[...rentalIds,...resources]}}]}});
  for(const id of rentalIds){await db.$executeRaw`DELETE FROM "EquipmentRentalItem" WHERE "rentalId"=${id}`;await db.$executeRaw`DELETE FROM "EquipmentRental" WHERE "id"=${id}`;}
  for(const id of resources){await db.$executeRaw`DELETE FROM "EquipmentInspection" WHERE "resourceId"=${id}`;await db.$executeRaw`DELETE FROM "EquipmentMovement" WHERE "resourceId"=${id}`;await db.$executeRaw`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=${id}`;}
  await db.calendarResource.deleteMany({where:{id:{in:resources}}});
  await db.organization.deleteMany({where:{id:{in:centers}}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});
  await db.account.deleteMany({where:{id:{in:accounts}}});
  await db.person.deleteMany({where:{id:{in:people}}});
  await db.$disconnect();
}
