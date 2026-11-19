import assert from 'node:assert/strict';
import { DatabaseService } from '../dist/database/database.service.js';
import { AuditService } from '../dist/audit/audit.service.js';
import { EquipmentRentalService } from '../dist/trips/equipment-rental.service.js';
import { randomBytes, scryptSync } from 'node:crypto';

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
const people=[],accounts=[],extraAssets=[];let equipmentId=null,rentalId=null,competingId=null,multiId=null;
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
  const repeatedItem={resourceId:equipmentId,equipmentType:'BCD',unitPriceSar:50};
  response=await fetch(base+'/trips/equipment-rentals',{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,dueAt,items:[repeatedItem,{...repeatedItem,resourceId:' '+equipmentId+' '}]})});
  if(response.status!==400)throw new Error('Duplicate serialized equipment must be rejected before creating a rental');
  const reservations=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "EquipmentRental" WHERE "renterAccountId"=${renter.id}`;
  if(reservations[0].count!==0)throw new Error('Duplicate equipment left a partial reservation');
  response=await fetch(`${base}/trips/equipment-rentals`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,dueAt,items:[{resourceId:equipmentId,equipmentType:'BCD',size:'M',unitPriceSar:50}]})});
  let rental=await json(response);rentalId=rental.id;
  if (new Date(rental.dueAt).getTime() !== Date.parse(dueAt)) throw new Error('Initial due date must preserve the requested instant.');
  if(rental.status!=='RESERVED'||rental.paymentStatus!=='PENDING'||rental.items?.length!==1)throw new Error('Rental reservation state mismatch');

  response=await fetch(`${base}/trips/equipment-rentals/mine`,{headers:auth(renterToken)});const mine=await json(response);
  if(!mine.some(row=>row.id===rentalId))throw new Error('Renter cannot see own rental');
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/mine`,{headers:auth(otherToken)});
  if(response.status!==404)throw new Error(`Cross-user rental read expected 404, got ${response.status}`);

  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(renterToken)});
  if(response.status!==403)throw new Error(`Non-admin payment confirmation expected 403, got ${response.status}`);
  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(adminToken)});
  if(response.status!==409)throw new Error(`Uninspected equipment payment expected 409 safety block, got ${response.status}`);
  const unpaid=await db.$queryRawUnsafe(`SELECT "paymentStatus" FROM "EquipmentRental" WHERE "id"=$1 LIMIT 1`,rentalId);
  if(unpaid[0]?.paymentStatus!=='PENDING')throw new Error('Blocked payment confirmation mutated rental payment state');

  const serviceExpiresAt=new Date(Date.now()+30*86400000).toISOString();
  response=await fetch(`${base}/trips/admin/equipment/${encodeURIComponent(equipmentId)}/inspections`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({status:'PASS',serviceExpiresAt,notes:'Equipment runtime E2E safety clearance'})});
  const inspection=await json(response);if(inspection.status!=='PASS')throw new Error('PASS inspection was not recorded');

  const additional=await json(await fetch(base+'/trips/equipment-rentals',{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,dueAt,items:[repeatedItem]})}));
  competingId=additional.id;
  const confirm=id=>fetch(base+'/trips/admin/equipment-rentals/'+encodeURIComponent(id)+'/payment-confirmation',{method:'POST',headers:auth(adminToken)});
  const attempts=await Promise.all([confirm(rentalId),confirm(competingId)]);
  if(attempts.filter(r=>r.ok).length!==1||attempts.filter(r=>r.status===409).length!==1)throw new Error('Only one overlapping invoice may be confirmed');
  if(!attempts[0].ok)[rentalId,competingId]=[competingId,rentalId];
  const paid=await json(attempts.find(r=>r.ok));
  if(paid.paymentStatus!=='PAID'||paid.status!=='RESERVED')throw new Error('Payment confirmation must keep rental RESERVED until handover');
  await json(await confirm(rentalId));
  const notices=await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_INVOICE',payload:{path:['rentalId'],equals:rentalId}}});
  const audits=await db.auditEvent.count({where:{resourceId:rentalId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED'}});
  if(notices!==1||audits!==1)throw new Error('Replaying payment confirmation must keep one notification and audit');
  const unpaidOther=await db.$queryRaw`SELECT "paymentStatus" FROM "EquipmentRental" WHERE "id"=${competingId}`;
  if(unpaidOther[0]?.paymentStatus!=='PENDING')throw new Error('Losing invoice must remain pending');
  const afterPayment=await db.$queryRawUnsafe(`SELECT "stockStatus" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(afterPayment[0]?.stockStatus!=='AVAILABLE')throw new Error('Payment confirmation checked equipment out before handover');

  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/handover-scan`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({code:assetCode})});
  const handed=await json(response);
  if(handed.status!=='ACTIVE'||handed.pendingHandoverCount!==0)throw new Error('Handover scan did not activate rental');
  const afterHandover=await db.$queryRawUnsafe(`SELECT "stockStatus" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(afterHandover[0]?.stockStatus!=='CHECKED_OUT')throw new Error('Handover did not persist CHECKED_OUT inventory status');

  const requestedUntil=new Date(Date.now()+4*86400000).toISOString();
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-request`,{method:'POST',headers:{...auth(otherToken),'content-type':'application/json'},body:JSON.stringify({requestedUntil})});
  if(response.status!==404)throw new Error(`Cross-user extension request expected 404, got ${response.status}`);
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-request`,{method:'POST',headers:{...auth(renterToken),'content-type':'application/json'},body:JSON.stringify({requestedUntil})});
  rental=await json(response);if(rental.extensionStatus!=='PENDING')throw new Error('Extension request not persisted as PENDING');
  if (new Date(rental.extensionRequestedUntil).getTime() !== Date.parse(requestedUntil)) throw new Error('Pending extension must preserve the requested instant.');
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-review`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED'})});
  rental=await json(response);if(rental.extensionStatus!=='APPROVED'||new Date(rental.dueAt).getTime()!==new Date(requestedUntil).getTime())throw new Error('Extension approval did not persist new due date');

  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-intent`,{method:'POST',headers:auth(renterToken)});const intent=await json(response);
  if(intent.status!=='RETURN_INTENT_RECORDED')throw new Error('Return intent was not recorded');
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
    passports.push(registered.passport);
    await post('/trips/admin/equipment/'+registered.id+'/inspections', {
      status:'PASS', serviceExpiresAt, notes:'Isolated multi-item return fixture'
    });
  }
  const multi = await post('/trips/equipment-rentals', {
    renterAccountId:renter.id, dueAt, items:extraAssets.map(resourceId=>({resourceId,unitPriceSar:20}))
  });
  multiId=multi.id;
  await json(await confirm(multiId));
  for(const passport of passports) await post('/trips/admin/equipment-rentals/'+multiId+'/handover-scan',{code:passport.assetCode});
  const returnPath='/trips/equipment-rentals/'+multiId+'/return-scan';
  const damaged=await post(returnPath,{code:passports[0].assetCode,condition:'DAMAGED',toLocation:'INSPECTION'});
  assert.equal(damaged.status,'ACTIVE');
  assert.equal(damaged.pendingReturnCount,1);
  const held=await db.$queryRaw`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=${extraAssets[0]}`;
  assert.deepEqual(held,[{stockStatus:'QUARANTINED',location:'INSPECTION'}]);
  assert.equal(await db.notification.count({where:{accountId:renter.id,type:'EQUIPMENT_RENTAL_RETURNED',payload:{path:['rentalId'],equals:multiId}}}),0);
  assert.equal((await post(returnPath,{code:passports[0].assetCode,condition:'DAMAGED'})).pendingReturnCount,1);
  assert.equal((await post(returnPath,{code:passports[1].assetCode,condition:'OK'})).status,'RETURNED');
  assert.equal(await db.auditEvent.count({where:{resourceId:multiId,action:'EQUIPMENT_RENTAL_ITEM_RETURNED'}}),2);
  assert.equal(await db.auditEvent.count({where:{resourceId:multiId,action:'EQUIPMENT_RENTAL_RETURNED'}}),1);
  console.log('Equipment HTTP/DB E2E passed: admin isolation, registration, duplicate protection, safety gate, reservation ownership, staged payment/handover, extension, return intent, atomic return rollback, concurrent replay, partial returns, quarantine and persistence.');
} finally {
  const personIds=people.map(row=>row.id),accountIds=accounts.map(row=>row.id);
  if(personIds.length)await db.auditEvent.deleteMany({where:{actorId:{in:personIds}}}).catch(()=>{});
  for(const id of [rentalId,competingId,multiId].filter(Boolean))await db.auditEvent.deleteMany({where:{resourceId:id}}).catch(()=>{});
  for (const id of [equipmentId,...extraAssets].filter(Boolean)) await db.auditEvent.deleteMany({where:{resourceId:id}}).catch(()=>{});
  if(accountIds.length)await db.notification.deleteMany({where:{accountId:{in:accountIds}}}).catch(()=>{});
  for(const id of [rentalId,competingId,multiId].filter(Boolean)){await db.$executeRawUnsafe(`DELETE FROM "EquipmentRentalItem" WHERE "rentalId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentRental" WHERE "id"=$1`,id).catch(()=>{})}
  for (const id of [equipmentId,...extraAssets].filter(Boolean)){await db.$executeRawUnsafe(`DELETE FROM "EquipmentInspection" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentMovement" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=$1`,id).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "CalendarResource" WHERE "id"=$1`,id).catch(()=>{})}
  for(const account of accounts.reverse()){await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{})}
  for(const person of people.reverse())await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
