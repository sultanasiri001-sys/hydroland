import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.EQUIPMENT_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+1800})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const auth=token=>({authorization:`Bearer ${token}`});
const json=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const people=[],accounts=[];let equipmentId=null,rentalId=null;
const makeAccount=async label=>{const person=await db.person.create({data:{firstName:'Equipment',lastName:label}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:`equipment-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);return account};

try{
  const admin=await makeAccount('Admin'),renter=await makeAccount('Renter'),other=await makeAccount('Other');
  await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',scope:{}}});
  const adminToken=tokenFor(admin.id),renterToken=tokenFor(renter.id),otherToken=tokenFor(other.id);

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
  response=await fetch(`${base}/trips/equipment-rentals`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({renterAccountId:renter.id,dueAt,items:[{resourceId:equipmentId,equipmentType:'BCD',size:'M',unitPriceSar:50}]})});
  let rental=await json(response);rentalId=rental.id;
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

  response=await fetch(`${base}/trips/admin/equipment-rentals/${encodeURIComponent(rentalId)}/payment-confirmation`,{method:'POST',headers:auth(adminToken)});
  const paid=await json(response);
  if(paid.paymentStatus!=='PAID'||paid.status!=='RESERVED')throw new Error('Payment confirmation must keep rental RESERVED until handover');
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
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-review`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED'})});
  rental=await json(response);if(rental.extensionStatus!=='APPROVED'||new Date(rental.dueAt).getTime()!==new Date(requestedUntil).getTime())throw new Error('Extension approval did not persist new due date');

  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-intent`,{method:'POST',headers:auth(renterToken)});const intent=await json(response);
  if(intent.status!=='RETURN_INTENT_RECORDED')throw new Error('Return intent was not recorded');
  response=await fetch(`${base}/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-scan`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({code:assetCode,condition:'OK',toLocation:'WAREHOUSE-A'})});
  rental=await json(response);
  if(rental.status!=='RETURNED'||rental.pendingReturnCount!==0)throw new Error('Rental did not close after final return scan');
  const returned=await db.$queryRawUnsafe(`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=$1 LIMIT 1`,equipmentId);
  if(returned[0]?.stockStatus!=='AVAILABLE'||returned[0]?.location!=='WAREHOUSE-A')throw new Error('Returned equipment did not persist AVAILABLE warehouse state');
  const persistedRental=await db.$queryRawUnsafe(`SELECT "status","paymentStatus","extensionStatus","returnIntentAt","returnedAt" FROM "EquipmentRental" WHERE "id"=$1 LIMIT 1`,rentalId);
  if(persistedRental[0]?.status!=='RETURNED'||persistedRental[0]?.paymentStatus!=='PAID'||persistedRental[0]?.extensionStatus!=='APPROVED'||!persistedRental[0]?.returnIntentAt||!persistedRental[0]?.returnedAt)throw new Error('Final rental lifecycle persistence mismatch');

  console.log('Equipment HTTP/DB E2E passed: admin isolation, registration, duplicate protection, safety gate, reservation ownership, staged payment/handover, extension, return intent, return scan and persistence.');
} finally {
  const personIds=people.map(row=>row.id),accountIds=accounts.map(row=>row.id);
  if(personIds.length)await db.auditEvent.deleteMany({where:{actorId:{in:personIds}}}).catch(()=>{});
  if(rentalId)await db.auditEvent.deleteMany({where:{resourceId:rentalId}}).catch(()=>{});
  if(equipmentId)await db.auditEvent.deleteMany({where:{resourceId:equipmentId}}).catch(()=>{});
  if(accountIds.length)await db.notification.deleteMany({where:{accountId:{in:accountIds}}}).catch(()=>{});
  if(rentalId){await db.$executeRawUnsafe(`DELETE FROM "EquipmentRentalItem" WHERE "rentalId"=$1`,rentalId).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentRental" WHERE "id"=$1`,rentalId).catch(()=>{})}
  if(equipmentId){await db.$executeRawUnsafe(`DELETE FROM "EquipmentInspection" WHERE "resourceId"=$1`,equipmentId).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentMovement" WHERE "resourceId"=$1`,equipmentId).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=$1`,equipmentId).catch(()=>{});await db.$executeRawUnsafe(`DELETE FROM "CalendarResource" WHERE "id"=$1`,equipmentId).catch(()=>{})}
  for(const account of accounts.reverse()){await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{})}
  for(const person of people.reverse())await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
