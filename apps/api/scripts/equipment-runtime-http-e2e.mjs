import { PDFDocument } from 'pdf-lib';
import assert from 'node:assert/strict';
import { DatabaseService } from '../dist/database/database.service.js';
import { AuditService } from '../dist/audit/audit.service.js';
import { EquipmentRentalService } from '../dist/trips/equipment-rental.service.js';
import { EquipmentRentalHandoverService } from '../dist/trips/equipment-rental-handover.service.js';
import { EquipmentInspectionService } from '../dist/trips/equipment-inspection.service.js';
import { PolicyControlService } from '../dist/trips/policy-control.service.js';
import { NotificationsService } from '../dist/notifications/notifications.service.js';
import { randomBytes, scryptSync } from 'node:crypto';
import {createSyntheticRentalCollection,cleanupSyntheticRentalCollections} from './rental-collection-evidence-fixture.mjs';

const db=new DatabaseService();
const base=process.env.EQUIPMENT_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for (const endpoint of [base, process.env.DATABASE_URL]) {
  if (!['localhost','127.0.0.1','[::1]'].includes(new URL(endpoint).hostname)) throw new Error('Equipment fixtures require loopback services.');
}
const suffix=randomBytes(8).toString('hex');
const password=randomBytes(24).toString('hex');
const salt=randomBytes(16).toString('hex');
const passwordHash=salt+':'+scryptSync(password,salt,64).toString('hex');
async function login(account) {
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:account.email,password})});
  const session=await json(response);
  if (!session.accessToken) throw new Error('Equipment test login returned no access token');
  return session.accessToken;
}
const auth=token=>({authorization:`Bearer ${token}`});
const json=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const people=[],accounts=[],extraAssets=[],holdFixtures=[],calendarTrips=[],calendarCenters=[],collectionReceipts=[];let equipmentId=null,rentalId=null,competingId=null,multiId=null;
const makeAccount=async label=>{const person=await db.person.create({data:{firstName:'Equipment',lastName:label}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:`equipment-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash,status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);return account};

try{
  const collisionProbe=new EquipmentRentalService(db,new AuditService(db),{notify(){}});
  const originalNow=Date.now;
  try{
    // Reproduce the prior millisecond-only invoice collision without changing server time.
    Date.now=()=>1730000000000;
    assert.notEqual(collisionProbe.invoiceNumber(),collisionProbe.invoiceNumber(),'Distinct rentals require unique invoice references even in one millisecond');
  }finally{Date.now=originalNow;}
  const admin=await makeAccount('Admin'),renter=await makeAccount('Renter'),other=await makeAccount('Other');
  const financeApprover=await makeAccount('FinanceApprover'),financePoster=await makeAccount('FinancePoster');
  await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',scope:{}}});
  const [adminToken,renterToken,otherToken]=await Promise.all([admin,renter,other].map(login));

  let response=await fetch(`${base}/trips/admin/equipment`);
  if(response.status!==401)throw new Error(`Anonymous inventory list expected 401, got ${response.status}`);
  response=await fetch(`${base}/trips/admin/equipment`,{headers:auth(renterToken)});
  if(response.status!==403)throw new Error(`Non-admin inventory list expected 403, got ${response.status}`);

  response=await fetch(`${base}/trips/admin/equipment`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({name:'BCD Runtime E2E',serialNumber:`BCD-${suffix}`,sku:`SKU-${suffix}`,location:'WAREHOUSE-A',acquisitionCostSar:1250})});
  const equipment=await json(response);equipmentId=equipment.id;
  if(!equipmentId||equipment.passport?.stockStatus!=='AVAILABLE'||!equipment.passport?.assetCode)throw new Error('Equipment registration response mismatch');
  const assetCode=equipment.passport.assetCode;
  const registered=await db.$queryRawUnsafe(`SELECT "stockStatus","assetCode","serialNumber" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(registered[0]?.stockStatus!=='AVAILABLE'||registered[0]?.assetCode!==assetCode)throw new Error('Equipment registration did not persist AVAILABLE passport');

  response=await fetch(`${base}/trips/admin/equipment`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({name:'Duplicate Serial E2E',serialNumber:`BCD-${suffix}`,location:'WAREHOUSE-B'})});
  if(response.status!==409)throw new Error(`Duplicate serial expected 409, got ${response.status}`);

  const dueAt=new Date(Date.now()+2*86400000).toISOString();
  const scheduledHandoverAt=new Date(Date.now()+86400000).toISOString();
  async function makeCalendarTrip(ownerId, name, start) {
    const center = await db.organization.create({data:{displayName:'Calendar fixture '+name, kind:'DIVE_CENTER', ownerId}});
    calendarCenters.push(center.id);
    const trip = await db.trip.create({data:{
      title:'Equipment calendar '+name, type:'TEST', capacity:1, organizationId:center.id,
      startsAt:new Date(start), endsAt:new Date(start+3600_000),
    }});
    calendarTrips.push(trip.id);
    return trip;
  }
  const during = await makeCalendarTrip(admin.id, 'A', Date.now()+3600_000);
  const adjacent = await makeCalendarTrip(other.id, 'B', Date.parse(dueAt));
  await db.organization.update({where:{id:during.organizationId},data:{status:'ACTIVE',legalName:'SYNTHETIC Rental Center',registrationNumber:'SYNTHETIC-RENTAL-001',address:'Synthetic test warehouse'}});
  await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${during.organizationId} WHERE "resourceId"=${equipmentId}`;
  const collectionFor=async id=>{const receipt=await createSyntheticRentalCollection(db,{rentalId:id,centerId:during.organizationId,requesterId:admin.id,approverId:financeApprover.id,posterId:financePoster.id});collectionReceipts.push(receipt);return receipt;};
  const allocate = (trip, resourceIds) => fetch(base+'/trips/admin/calendar/'+trip.id+'/allocations', {
    method:'POST', headers:{...auth(adminToken),'content-type':'application/json'}, body:JSON.stringify({resourceIds}),
  });
  const calendarBook = () => fetch(base+'/trips/equipment-rentals', {
    method:'POST', headers:{...auth(adminToken),'content-type':'application/json'},
    body:JSON.stringify({renterAccountId:renter.id, scheduledHandoverAt, dueAt, items:[{resourceId:equipmentId,unitPriceSar:50}]}),
  });
  await json(await allocate(during,[equipmentId]));
  assert.equal((await calendarBook()).status,409,'Trip allocation blocks an overlapping rental');
  await json(await allocate(during,[]));
  await json(await allocate(adjacent,[equipmentId]));
  for (const trip of [during,adjacent]) {
    const event=await db.calendarEvent.findUniqueOrThrow({where:{referenceType_referenceId:{referenceType:'TRIP',referenceId:trip.id}}});
    assert.equal(event.organizationId,trip.organizationId);
  }
  const repeatedItem={resourceId:equipmentId,equipmentType:'BCD',unitPriceSar:50};
  response=await fetch(base+'/trips/equipment-rentals',{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,scheduledHandoverAt,dueAt,items:[repeatedItem,{...repeatedItem,resourceId:' '+equipmentId+' '}]})});
  if(response.status!==400)throw new Error('Duplicate serialized equipment must be rejected before creating a rental');
  const reservations=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "EquipmentRental" WHERE "renterAccountId"=${renter.id}`;
  if(reservations[0].count!==0)throw new Error('Duplicate equipment left a partial reservation');
  const failingReservation = new EquipmentRentalService(db, {
    record() { throw new Error('Synthetic reservation receipt failure'); }
  }, new NotificationsService(db));
  await assert.rejects(failingReservation.create(admin.id, {
    renterAccountId: renter.id, scheduledHandoverAt, dueAt, items: [repeatedItem]
  }), /Synthetic reservation receipt failure/);
  const afterReceiptFailure = await db.$queryRaw`
    SELECT
      (SELECT COUNT(*)::int FROM "EquipmentRental" WHERE "renterAccountId"=${renter.id}) AS rentals,
      (SELECT COUNT(*)::int FROM "EquipmentRentalItem" WHERE "resourceId"=${equipmentId}) AS items`;
  assert.deepEqual(afterReceiptFailure, [{rentals: 0, items: 0}]);
  response=await fetch(`${base}/trips/equipment-rentals`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,scheduledHandoverAt,dueAt,items:[{resourceId:equipmentId,equipmentType:'BCD',size:'M',unitPriceSar:50}]})});
  let rental=await json(response);rentalId=rental.id;
  assert.equal(await db.auditEvent.count({
    where: { resourceId: rentalId, action: 'EQUIPMENT_RENTAL_RESERVED' }
  }), 1);
  if (new Date(rental.dueAt).getTime() !== Date.parse(dueAt)) throw new Error('Initial due date must preserve the requested instant.');
  if(rental.status!=='RESERVED'||rental.paymentStatus!=='PENDING'||rental.items?.length!==1)throw new Error('Rental reservation state mismatch');

  response=await fetch(`${base}/trips/equipment-rentals/mine`,{headers:auth(renterToken)});const mine=await json(response);
  if(!mine.some(row=>row.id===rentalId))throw new Error('Renter cannot see own rental');
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/mine`,{headers:auth(otherToken)});
  if(response.status!==404)throw new Error(`Cross-user rental read expected 404, got ${response.status}`);

  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(renterToken)});
  if(response.status!==403)throw new Error(`Non-admin payment confirmation expected 403, got ${response.status}`);
  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(adminToken)});
  assert.equal(response.status,409,'Missing verified collection must reject an administrative PAID marker');
  assert.equal((await response.json()).code,'RENTAL_COLLECTION_EVIDENCE_REQUIRED');
  await collectionFor(rentalId);
  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(adminToken)});
  assert.equal(response.status,409,'Valid collection cannot bypass the equipment safety check');
  assert.match((await response.json()).message,/inspection|service policy/);
  const unpaid=await db.$queryRawUnsafe(`SELECT "paymentStatus" FROM "EquipmentRental" WHERE "id"=$1 LIMIT 1`,rentalId);
  if(unpaid[0]?.paymentStatus!=='PENDING')throw new Error('Blocked payment confirmation mutated rental payment state');

  const serviceExpiresAt=new Date(Date.now()+30*86400000).toISOString();
  response=await fetch(`${base}/trips/admin/equipment/${encodeURIComponent(equipmentId)}/inspections`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({status:'PASS',serviceExpiresAt,notes:'Equipment runtime E2E safety clearance'})});
  const inspection=await json(response);if(inspection.status!=='PASS')throw new Error('PASS inspection was not recorded');

  const book = () => fetch(base+'/trips/equipment-rentals', {
    method:'POST', headers:{...auth(adminToken),'content-type':'application/json'},
    body: JSON.stringify({renterAccountId:renter.id, scheduledHandoverAt, dueAt, items:[repeatedItem]})
  });
  const confirm=id=>fetch(base+'/trips/admin/equipment-rentals/'+encodeURIComponent(id)+'/payment-confirmation',{method:'POST',headers:auth(adminToken)});
  const mineById=id=>fetch(base+'/trips/equipment-rentals/'+id+'/mine',{headers:auth(renterToken)}).then(json);
  const cancel=(id,token)=>fetch(base+'/trips/equipment-rentals/'+id+'/mine/cancel',{method:'POST',headers:auth(token)});
  assert.equal(Date.parse(rental.holdExpiresAt)-Date.parse(rental.reservedAt), 15*60_000);
  assert.equal((await book()).status, 409, 'An unpaid hold keeps the serialized asset exclusive');
  assert.equal((await allocate(during,[equipmentId])).status,409,'Unexpired rental hold blocks a trip');
  assert.equal(await db.calendarAllocation.count({where:{resourceId:equipmentId,status:'ACTIVE',event:{referenceId:during.id}}}),0);
  holdFixtures.push(rentalId);
  await db.$executeRaw`UPDATE "EquipmentRental" SET "holdExpiresAt"=clock_timestamp() WHERE "id"=${rentalId}`;
  assert.equal((await mineById(rentalId)).status, 'EXPIRED');
  assert.equal((await confirm(rentalId)).status, 409, 'A late payment cannot revive the expired hold');
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}}),0);
  await json(await allocate(during,[equipmentId]));
  await json(await allocate(during,[]));
  const [calendarRace, rentalRace] = await Promise.all([allocate(during,[equipmentId]),calendarBook()]);
  assert.deepEqual([calendarRace.status,rentalRace.status].sort(),[201,409]);
  if (rentalRace.ok) {
    const raceId=(await json(rentalRace)).id;
    holdFixtures.push(raceId);
    await json(await cancel(raceId,renterToken));
  } else {
    await json(await allocate(during,[]));
  }
  const competingBookings=await Promise.all([book(), book()]);
  assert.deepEqual(competingBookings.map(response=>response.status).sort(), [201,409]);
  const heldId=(await json(competingBookings.find(response=>response.ok))).id;
  holdFixtures.push(heldId);
  assert.equal((await cancel(heldId,otherToken)).status,404);
  assert.equal((await json(await cancel(heldId,renterToken))).status,'CANCELLED');
  assert.equal((await json(await cancel(heldId,renterToken))).status,'CANCELLED');
  assert.equal(await db.auditEvent.count({where:{resourceId:heldId,action:'EQUIPMENT_RENTAL_CANCELLED'}}),1);
  assert.equal((await confirm(heldId)).status,409);

  // An unpaid older quote has no exclusive hold of its own.
  competingId=(await json(await book())).id;
  await collectionFor(competingId);
  await db.$executeRaw`UPDATE "EquipmentRental" SET "holdExpiresAt"=NULL WHERE "id"=${competingId}`;
  await json(await allocate(during,[equipmentId]));
  assert.equal((await confirm(competingId)).status,409,'A legacy quote cannot be paid over a trip allocation');
  assert.equal((await mineById(competingId)).paymentStatus,'PENDING');
  assert.equal(await db.auditEvent.count({where:{resourceId:competingId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}}),0);
  await json(await allocate(during,[]));
  rentalId=(await json(await book())).id;
  await collectionFor(rentalId);
  assert.equal((await allocate(during,[equipmentId])).status,409);
  const attempts=await Promise.all([confirm(rentalId),confirm(competingId)]);
  assert.equal(attempts[0].ok,true);
  assert.equal(attempts[1].status,409);
  const paid=await json(attempts[0]);
  assert.equal((await allocate(during,[equipmentId])).status,409,'Paid equipment remains reserved until return');
  await db.$executeRaw`UPDATE "EquipmentRental" SET "holdExpiresAt"=clock_timestamp() WHERE "id"=${rentalId}`;
  assert.equal((await mineById(rentalId)).status,'RESERVED');
  assert.equal((await book()).status,409,'A paid hold still protects the asset before handover');
  assert.equal((await cancel(rentalId,renterToken)).status,409);
  if(paid.paymentStatus!=='PAID'||paid.status!=='RESERVED')throw new Error('Payment confirmation must keep rental RESERVED until handover');
  await json(await confirm(rentalId));
  const notices=await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_INVOICE',payload:{path:['rentalId'],equals:rentalId}}});
  const audits=await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}});
  if(notices!==1||audits!==1)throw new Error('Replaying payment confirmation must keep one notification and audit');
  const unpaidOther=await db.$queryRaw`SELECT "paymentStatus" FROM "EquipmentRental" WHERE "id"=${competingId}`;
  if(unpaidOther[0]?.paymentStatus!=='PENDING')throw new Error('Losing invoice must remain pending');
  const afterPayment=await db.$queryRawUnsafe(`SELECT "stockStatus" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(afterPayment[0]?.stockStatus!=='AVAILABLE')throw new Error('Payment confirmation checked equipment out before handover');

  const handover=(token=adminToken)=>fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/handover-scan`,{
    method:'POST',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({code:assetCode,handoverCondition:'Intact except for a documented scratch'})
  });
  assert.equal((await handover(renterToken)).status,403);
  const audit=new AuditService(db);
  const inspections=new EquipmentInspectionService(db,audit,new PolicyControlService(db,audit));
  const assertHandoverUnchanged=async()=>{
    const state=await db.$queryRaw`
      SELECT r."status", i."handedOverAt", b."stockStatus"
      FROM "EquipmentRental" r JOIN "EquipmentRentalItem" i ON i."rentalId"=r."id"
      JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE r."id"=${rentalId}`;
    assert.deepEqual(state,[{status:'RESERVED',handedOverAt:null,stockStatus:'AVAILABLE'}]);
    const movements=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "EquipmentMovement" WHERE "resourceId"=${equipmentId} AND "movementType"='CHECK_OUT' AND "assignedAccountId"=${renter.id}`;
    assert.equal(movements[0].count,0);
    assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER'}}),0);
    assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_HANDED_OVER',payload:{path:['rentalId'],equals:rentalId}}}),0);
  };
  // A safety failure recorded after payment must still prevent checkout.
  await inspections.record(admin.id,equipmentId,{status:'FAIL',serviceExpiresAt,notes:'Isolated handover safety regression'});
  assert.equal((await handover()).status,409);
  await assertHandoverUnchanged();
  await inspections.record(admin.id,equipmentId,{status:'PASS',serviceExpiresAt,notes:'Restore isolated fixture clearance'});
  // Each failure occurs after inventory writes, using the real PostgreSQL transaction.
  const failedNotification=new EquipmentRentalHandoverService(db,audit,{
    notify(){throw new Error('Synthetic handover notification failure');}
  },inspections);
  await assert.rejects(failedNotification.scan(admin.id,rentalId,{code:assetCode,handoverCondition:'Intact except for a documented scratch'}),/Synthetic handover notification failure/);
  await assertHandoverUnchanged();
  const failedAudit=new EquipmentRentalHandoverService(db,{
    record(){throw new Error('Synthetic handover audit failure');}
  },new NotificationsService(db),inspections);
  await assert.rejects(failedAudit.scan(admin.id,rentalId,{code:assetCode,handoverCondition:'Intact except for a documented scratch'}),/Synthetic handover audit failure/);
  await assertHandoverUnchanged();

  const handovers=await Promise.all((await Promise.all([handover(),handover()])).map(json));
  assert.deepEqual(handovers.map(result=>result.result).sort(),['ALREADY_HANDED_OVER','HANDED_OVER']);
  const handed=handovers[0];
  if(handed.status!=='ACTIVE'||handed.pendingHandoverCount!==0)throw new Error('Handover scan did not activate rental');
  const afterHandover=await db.$queryRawUnsafe(`SELECT "stockStatus" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(afterHandover[0]?.stockStatus!=='CHECKED_OUT')throw new Error('Handover did not persist CHECKED_OUT inventory status');
  const checkoutMovements=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "EquipmentMovement" WHERE "resourceId"=${equipmentId} AND "movementType"='CHECK_OUT' AND "assignedAccountId"=${renter.id}`;
  assert.equal(checkoutMovements[0].count,1);
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER'}}),1);
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_HANDED_OVER',payload:{path:['rentalId'],equals:rentalId}}}),1);

  const requestedUntil=new Date(Date.now()+4*86400000).toISOString();
  const extensionState = () => db.$queryRaw`
    SELECT "extensionRequestedUntil", "extensionStatus", "extensionRequestedAt", "extensionReviewedAt", "extensionReviewedByAccountId", "dueAt"
    FROM "EquipmentRental" WHERE "id"=${rentalId}`;
  const initialExtensionState = await extensionState();
  const failedExtensionNotification = new EquipmentRentalService(db, audit, {
    notify() { throw new Error('Synthetic extension request notification failure'); }
  });
  await assert.rejects(failedExtensionNotification.requestExtension(renter.id, rentalId, {requestedUntil}), /Synthetic extension request notification failure/);
  assert.deepEqual(await extensionState(), initialExtensionState, 'Failed extension notice must roll back the request');
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_EXTENSION_REQUESTED'}}), 0);
  const failedExtensionAudit = new EquipmentRentalService(db, {
    record() { throw new Error('Synthetic extension request audit failure'); }
  }, new NotificationsService(db));
  await assert.rejects(failedExtensionAudit.requestExtension(renter.id, rentalId, {requestedUntil}), /Synthetic extension request audit failure/);
  assert.deepEqual(await extensionState(), initialExtensionState, 'Failed extension receipt must roll back the request');
  assert.equal(await db.notification.count({where:{accountId:admin.id,type:'EQUIPMENT_RENTAL_EXTENSION_REQUEST',payload:{path:['rentalId'],equals:rentalId}}}), 0);
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-request`,{method:'POST',headers:{...auth(otherToken),'content-type':'application/json'},body:JSON.stringify({requestedUntil})});
  if(response.status!==404)throw new Error(`Cross-user extension request expected 404, got ${response.status}`);
  const requestExtension = () => fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-request`,{method:'POST',headers:{...auth(renterToken),'content-type':'application/json'},body:JSON.stringify({requestedUntil})});
  const extensionRequests = await Promise.all((await Promise.all([requestExtension(),requestExtension()])).map(json));
  rental=extensionRequests[0];if(extensionRequests.some(row=>row.extensionStatus!=='PENDING'))throw new Error('Extension request not persisted as PENDING');
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_EXTENSION_REQUESTED'}}), 1);
  assert.equal(await db.notification.count({where:{accountId:admin.id,type:'EQUIPMENT_RENTAL_EXTENSION_REQUEST',payload:{path:['rentalId'],equals:rentalId}}}), 1);
  const pendingExtensionState = await extensionState();
  await json(await requestExtension());
  assert.deepEqual(await extensionState(), pendingExtensionState, 'Exact extension replay must preserve its original request timestamps');
  if (new Date(rental.extensionRequestedUntil).getTime() !== Date.parse(requestedUntil)) throw new Error('Pending extension must preserve the requested instant.');
  const reviewExtension = () => fetch(base+'/trips/equipment-rentals/'+rentalId+'/extension-review',{
    method:'POST', headers:{...auth(adminToken),'content-type':'application/json'}, body:JSON.stringify({decision:'APPROVED'}),
  });
  assert.equal((await reviewExtension()).status,409,'Extension cannot reserve the other center’s adjacent trip window');
  assert.equal((await mineById(rentalId)).extensionStatus,'PENDING');
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_EXTENSION_APPROVED'}}),0);
  await json(await allocate(adjacent,[]));
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-review`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED'})});
  rental=await json(response);if(rental.extensionStatus!=='APPROVED'||new Date(rental.dueAt).getTime()!==new Date(requestedUntil).getTime())throw new Error('Extension approval did not persist new due date');

  const returnIntentState = () => db.$queryRaw`SELECT "returnIntentAt" FROM "EquipmentRental" WHERE "id"=${rentalId}`;
  const initialReturnIntentState = await returnIntentState();
  const failedReturnIntentNotification = new EquipmentRentalService(db, audit, {
    notify() { throw new Error('Synthetic return intent notification failure'); }
  });
  await assert.rejects(failedReturnIntentNotification.returnIntent(renter.id,rentalId), /Synthetic return intent notification failure/);
  assert.deepEqual(await returnIntentState(), initialReturnIntentState, 'Failed return notice must roll back the intent');
  const failedReturnIntentAudit = new EquipmentRentalService(db, {
    record() { throw new Error('Synthetic return intent audit failure'); }
  }, new NotificationsService(db));
  await assert.rejects(failedReturnIntentAudit.returnIntent(renter.id,rentalId), /Synthetic return intent audit failure/);
  assert.deepEqual(await returnIntentState(), initialReturnIntentState, 'Failed return receipt must roll back the intent');
  assert.equal(await db.notification.count({where:{accountId:admin.id,type:'EQUIPMENT_RENTAL_RETURN_INTENT',payload:{path:['rentalId'],equals:rentalId}}}), 0);
  const recordReturnIntent = (token=renterToken) => fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-intent`,{method:'POST',headers:auth(token)});
  assert.equal((await recordReturnIntent(otherToken)).status, 404);
  const intents = await Promise.all((await Promise.all([recordReturnIntent(),recordReturnIntent()])).map(json));
  if(intents.some(intent=>intent.status!=='RETURN_INTENT_RECORDED'))throw new Error('Return intent was not recorded');
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_RETURN_INTENT'}}), 1);
  assert.equal(await db.notification.count({where:{accountId:admin.id,type:'EQUIPMENT_RENTAL_RETURN_INTENT',payload:{path:['rentalId'],equals:rentalId}}}), 1);
  const recordedReturnIntentState = await returnIntentState();
  await json(await recordReturnIntent());
  assert.deepEqual(await returnIntentState(), recordedReturnIntentState, 'Return intent replay must preserve its first timestamp');
  const returnInput={code:assetCode,condition:'OK',toLocation:'WAREHOUSE-A'};
  // Fail the final notification in process while all inventory and audit writes use the real test database.
  const failing=new EquipmentRentalService(db,new AuditService(db),{notify(){throw new Error('Synthetic return notification failure');}});
  await assert.rejects(failing.returnScan(admin.id,rentalId,returnInput),/Synthetic return notification failure/);
  const afterFailure=await db.$queryRaw`
    SELECT r."status", i."returnedAt", b."stockStatus"
    FROM "EquipmentRental" r JOIN "EquipmentRentalItem" i ON i."rentalId"=r."id"
    JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE r."id"=${rentalId}`;
  assert.deepEqual(afterFailure,[{status:'ACTIVE',returnedAt:null,stockStatus:'CHECKED_OUT'}]);
  assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_ITEM_RETURNED'}}),0);
  const scan=input=>fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-scan`,{
    method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify(input)
  });
  const scans=await Promise.all([scan(returnInput),scan(returnInput)]);
  const results=await Promise.all(scans.map(json));
  rental=results[0];
  assert.equal(results[1].status,'RETURNED');
  assert.equal((await scan({...returnInput,condition:'DAMAGED'})).status,409);
  const movements=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "EquipmentMovement" WHERE "resourceId"=${equipmentId} AND "movementType"='CHECK_IN' AND "assignedAccountId"=${renter.id}`;
  assert.equal(movements[0].count,1);
  for(const action of ['EQUIPMENT_RENTAL_ITEM_RETURNED','EQUIPMENT_RENTAL_RETURNED']){
    assert.equal(await db.auditEvent.count({where:{resourceId:rentalId,action}}),1);
  }
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_RETURNED',payload:{path:['rentalId'],equals:rentalId}}}),1);
  if(rental.status!=='RETURNED'||rental.pendingReturnCount!==0)throw new Error('Rental did not close after final return scan');
  const returned=await db.$queryRawUnsafe(`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(returned[0]?.stockStatus!=='AVAILABLE'||returned[0]?.location!=='WAREHOUSE-A')throw new Error('Returned equipment did not persist AVAILABLE warehouse state');
  const persistedRental=await db.$queryRawUnsafe(`SELECT "status","paymentStatus","extensionStatus","returnIntentAt","returnedAt" FROM "EquipmentRental" WHERE "id"=$1 LIMIT 1`,rentalId);
  if(persistedRental[0]?.status!=='RETURNED'||persistedRental[0]?.paymentStatus!=='PAID'||persistedRental[0]?.extensionStatus!=='APPROVED'||!persistedRental[0]?.returnIntentAt||!persistedRental[0]?.returnedAt)throw new Error('Final rental lifecycle persistence mismatch');
  const closedExtensionState = await extensionState();
  assert.equal((await requestExtension()).status, 409, 'Returned rental cannot accept an extension request');
  assert.equal((await recordReturnIntent()).status, 409, 'Returned rental cannot accept a new return intent');
  assert.deepEqual(await extensionState(), closedExtensionState);
  assert.deepEqual(await returnIntentState(), recordedReturnIntentState);

  const afterReturn=await json(await confirm(competingId));
  if(afterReturn.paymentStatus!=='PAID')throw new Error('Return must release the asset for a subsequent rental');
  const post = (path, body) => fetch(base+path, {
    method:'POST', headers:{...auth(adminToken),'content-type':'application/json'}, body:JSON.stringify(body)
  }).then(json);
  const passports = [];
  for (const tag of ['primary','spare']) {
    const registered = await post('/trips/admin/equipment', {
      name:'Multi-item return '+tag, serialNumber:'MULTI-'+tag+'-'+suffix, location:'WAREHOUSE-A'
    });
    extraAssets.push(registered.id);
    await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${during.organizationId} WHERE "resourceId"=${registered.id}`;
    passports.push(registered.passport);
    await post('/trips/admin/equipment/'+registered.id+'/inspections', {
      status:'PASS', serviceExpiresAt, notes:'Isolated multi-item return fixture'
    });
  }
  const multi = await post('/trips/equipment-rentals', {
    renterAccountId:renter.id, scheduledHandoverAt, dueAt, items:extraAssets.map(resourceId=>({resourceId,unitPriceSar:20}))
  });
  multiId=multi.id;
  await collectionFor(multiId);
  await json(await confirm(multiId));
  const missingBaseline=await fetch(base+'/trips/admin/equipment-rentals/'+multiId+'/handover-scan',{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({code:passports[0].assetCode})});
  assert.equal(missingBaseline.status,400);
  await Promise.all(passports.map(passport=>post('/trips/admin/equipment-rentals/'+multiId+'/handover-scan',{code:passport.assetCode,handoverCondition:'Existing scratch on handle'})));
  assert.equal(await db.auditEvent.count({where:{resourceId:multiId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER'}}),2);
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_HANDED_OVER',payload:{path:['rentalId'],equals:multiId}}}),1);
  const damageBase=base+'/trips/rental-damage';
  const repairPdf=await PDFDocument.create();repairPdf.addPage();const bytes=await repairPdf.save();
  for(const who of [admin,financeApprover,other]) {
    await db.roleAssignment.create({data:{accountId:who.id,role:'DIVE_CENTER',status:'ACTIVE',scope:{}}});
    await db.organizationMember.create({data:{accountId:who.id,organizationId:who===other?adjacent.organizationId:during.organizationId,role:'ADMIN',status:'ACTIVE'}});
  }
  await db.organization.update({where:{id:adjacent.organizationId},data:{status:'ACTIVE'}});
  const reviewerToken=await login(financeApprover);
  const openItems=await json(await fetch(damageBase+'/center/missing-items',{headers:auth(adminToken)}));
  const missingItem=openItems.find(row=>row.assetCode===passports[1].assetCode);
  const lossBody={circumstance:'REPORTED_BY_RENTER',proposal:'EQUIVALENT',valuation:'IN_KIND',recovery:'IN_KIND_REVIEW',reason:'Reported lost during return'};
  const reportLoss=token=>fetch(damageBase+'/items/'+missingItem.itemId+'/missing',{method:'POST',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify(lossBody)});
  assert.equal((await reportLoss(otherToken)).status,404);
  assert.equal((await json(await reportLoss(adminToken))).status,'MISSING');
  assert.equal((await json(await reportLoss(adminToken))).status,'MISSING');
  const lostLine=(await json(await fetch(base+'/trips/equipment-rentals/'+multiId+'/mine',{headers:auth(renterToken)}))).items.find(i=>i.id===missingItem.itemId);
  assert.equal(lostLine.lossReport.valuation,'IN_KIND');assert.equal(lostLine.lossReport.recovery,'IN_KIND_REVIEW');assert.equal(lostLine.lossStatus,'MISSING');assert.equal(lostLine.returnedAt,null);
  assert.equal(await db.rentalDamageClaim.count({where:{itemId:missingItem.itemId}}),0);
  const returnPath='/trips/equipment-rentals/'+multiId+'/return-scan';
  const damaged=await post(returnPath,{code:passports[0].assetCode,condition:'DAMAGED',toLocation:'INSPECTION',newDamage:true,damageCause:'MISUSE',notes:'New crack on the base'});
  const damageReceipt=await db.auditEvent.findFirstOrThrow({where:{resource:'EquipmentRental',resourceId:multiId,action:'EQUIPMENT_RENTAL_ITEM_RETURNED'}});
  assert.equal(damageReceipt.metadata.newDamageConfirmed,true);assert.equal(damageReceipt.metadata.damageCause,'MISUSE');
  const baseline=await db.auditEvent.findUniqueOrThrow({where:{id:damageReceipt.metadata.handoverReceiptId}});
  assert.equal(baseline.metadata.handoverCondition,'Existing scratch on handle');
  assert.equal(damaged.status,'ACTIVE');
  assert.equal(damaged.pendingReturnCount,1);
  const held=await db.$queryRaw`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=${extraAssets[0]}`;
  assert.deepEqual(held,[{stockStatus:'QUARANTINED',location:'INSPECTION'}]);
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_RETURNED',payload:{path:['rentalId'],equals:multiId}}}),0);
  assert.equal((await post(returnPath,{code:passports[0].assetCode,condition:'DAMAGED'})).pendingReturnCount,1);
  assert.equal((await post(returnPath,{code:passports[1].assetCode,condition:'OK'})).status,'RETURNED');
  assert.equal(await db.auditEvent.count({where:{resourceId:multiId,action:'EQUIPMENT_RENTAL_ITEM_RETURNED'}}),2);
  assert.equal(await db.auditEvent.count({where:{resourceId:multiId,action:'EQUIPMENT_RENTAL_RETURNED'}}),1);
  assert.equal((await reportLoss(adminToken)).status,409);
  const recovered=await json(await fetch(base+'/trips/equipment-rentals/'+multiId+'/mine',{headers:auth(renterToken)}));
  assert.equal(recovered.items.find(i=>i.id===missingItem.itemId).lossStatus,'RECOVERED');
  assert.equal(await db.auditEvent.count({where:{resourceId:missingItem.itemId,action:'RENTAL_ITEM_REPORTED_MISSING'}}),1);
  const eligibleRows=await json(await fetch(damageBase+'/center',{headers:auth(adminToken)}));
  const line=eligibleRows.find(row=>row.rentalId===multiId);
  assert.equal(line.damage,'New crack on the base');assert.equal(line.baseline,'Existing scratch on handle');
  const clean=damaged.items.find(i=>i.id!==line.itemId);
  const submitDamage=(token,itemId,sum='1900',doc=bytes)=>{
    const form=new FormData();form.set('amountMinor',sum);form.set('kind','ESTIMATE');form.set('document',new Blob([doc],{type:'application/pdf'}),'estimate.pdf');
    return fetch(damageBase+'/items/'+itemId,{method:'POST',headers:auth(token),body:form});
  };
  assert.equal((await submitDamage(otherToken,line.itemId)).status,404);
  assert.equal((await submitDamage(adminToken,clean.id)).status,404);
  assert.equal((await submitDamage(adminToken,line.itemId,'1900',new Uint8Array([1,2,3]))).status,400);
  const claim=await json(await submitDamage(adminToken,line.itemId));
  assert.equal(claim.status,'AWAITING_RENTER');assert.equal(claim.amountMinor,1900);assert.equal(claim.currency,'SAR');
  assert.equal((await json(await submitDamage(adminToken,line.itemId))).id,claim.id);
  assert.equal((await submitDamage(adminToken,line.itemId,'2000')).status,409);
  const claimPath=damageBase+'/'+claim.id;
  assert.equal((await fetch(claimPath+'/document',{headers:auth(otherToken)})).status,403);
  const ownPdf=await fetch(claimPath+'/document',{headers:auth(renterToken)});assert.equal(ownPdf.status,200);
  assert.deepEqual(new Uint8Array(await ownPdf.arrayBuffer()),bytes);
  const decide=(token,op,decision,reason)=>fetch(claimPath+'/'+op,{method:'POST',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({decision,reason})});
  assert.equal((await decide(otherToken,'respond','ACCEPT')).status,404);
  assert.equal((await decide(reviewerToken,'review','UPHOLD','Before dispute')).status,409);
  const objection=await json(await decide(renterToken,'respond','DISPUTE','Already scratched'));
  assert.equal(objection.status,'DISPUTED');assert.equal(objection.payableAt,null);
  assert.equal((await decide(adminToken,'review','UPHOLD','Same assessor')).status,403);
  assert.equal((await decide(otherToken,'review','UPHOLD','Other center')).status,403);
  assert.equal((await json(await decide(reviewerToken,'review','DISMISS','The estimate covers an old scratch'))).status,'DISMISSED');
  assert.equal((await decide(renterToken,'respond','ACCEPT')).status,409);
  assert.equal(await db.rentalDamageClaim.count({where:{id:claim.id,financeEntryId:{not:null}}}),0);
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'RENTAL_DAMAGE_AWAITING_RENTER',payload:{path:['claimId'],equals:claim.id}}}),1);
  console.log('Rental damage acceptance passed: handover and return evidence, legacy-free clean return rejection, scoped PDF, idempotent pricing, renter objection, independent review and no collection on dismissal.');
  console.log('Calendar/rental acceptance passed across two center-owned trips: overlap, adjacency, concurrent claims, paid and expired holds, legacy confirmation, and extension rollback.');
  console.log('Rental collection gate passed: missing receipt rejected; explicit synthetic provider binding and three-person posted financial evidence required. No provider money moved.');
  console.log('Equipment HTTP/DB E2E passed: admin isolation, registration, duplicate protection, safety gate, reservation ownership, staged payment/handover, handover audit/notification rollback, concurrent handover and return replay, extension, return intent, atomic return rollback, partial returns, quarantine and persistence.');
} finally {
  const personIds=people.map(row=>row.id),accountIds=accounts.map(row=>row.id);
  if(personIds.length)await db.auditEvent.deleteMany({where:{actorId:{in:personIds}}}).catch(()=>{});
  if (calendarTrips.length) {
    await db.calendarAllocation.deleteMany({where:{event:{referenceType:'TRIP',referenceId:{in:calendarTrips}}}});
    await db.calendarEvent.deleteMany({where:{referenceType:'TRIP',referenceId:{in:calendarTrips}}});
    await db.trip.deleteMany({where:{id:{in:calendarTrips}}});
  }
  await db.rentalDamageClaim.deleteMany({where:{customerAccountId:{in:accountIds}}});
  await db.organizationMember.deleteMany({where:{accountId:{in:accountIds},organizationId:{in:calendarCenters}}});
  await cleanupSyntheticRentalCollections(db,collectionReceipts);
  for(const id of [rentalId,competingId,multiId,...holdFixtures].filter(Boolean))await db.auditEvent.deleteMany({where:{resourceId:id}}).catch(()=>{});
  for (const id of [equipmentId,...extraAssets].filter(Boolean)) await db.auditEvent.deleteMany({where:{resourceId:id}}).catch(()=>{});
  if(accountIds.length)await db.notification.deleteMany({where:{accountId:{in:accountIds}}}).catch(()=>{});
  for(const id of [rentalId,competingId,multiId,...holdFixtures].filter(Boolean)){await db.$executeRawUnsafe(`DELETE FROM "EquipmentRentalItem" WHERE "rentalId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentRental" WHERE "id"=$1`,id).catch(()=>{})}
  for (const id of [equipmentId,...extraAssets].filter(Boolean)){await db.$executeRawUnsafe(`DELETE FROM "EquipmentInspection" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentMovement" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "CalendarResource" WHERE "id"=$1`,id).catch(()=>{})}
  await db.organization.deleteMany({where:{id:{in:calendarCenters}}});
  for(const account of accounts.reverse()){await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{})}
  for(const person of people.reverse())await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
