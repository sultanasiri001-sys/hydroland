import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {ensurePurpleTestSchema} from './purple-test-schema.mjs';

const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
const base=new URL((process.env.C08_E2E_BASE_URL||'http://127.0.0.1:3184/api/v1').replace(/\/$/,'')+'/');
assert(process.env.CI==='true'&&process.env.NODE_ENV==='test'&&process.env.C08_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE'&&database.pathname==='/hydroland_c08_test');
for(const url of [database,base])assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname));
const secret=process.env.JWT_SECRET;assert(secret?.length>=32);
const db=new PrismaClient(),tag=randomUUID(),privateText='PRIVATE_C08_SOURCE_'+tag,hash='a'.repeat(64);
let checks=0;const pass=text=>console.log(`PASS ${++checks}: ${text}`);
async function actor(label,role='ADMIN'){
 const person=await db.person.create({data:{firstName:'Synthetic C08',lastName:label}});
 const account=await db.account.create({data:{personId:person.id,email:`c08-${label}-${tag}@example.invalid`,passwordHash:'synthetic-no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});
 await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE'}});
 const session=await db.session.create({data:{accountId:account.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}});
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:account.id,sid:session.id,iat:now,exp:now+3600});
 return {...account,session,token:body+'.'+createHmac('sha256',secret).update(body).digest('base64url')};
}
async function call(actor){const r=await fetch(new URL('admin/agents/department-sources',base),{headers:actor?{authorization:'Bearer '+actor.token}:{},signal:AbortSignal.timeout(30000)});return{status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};}
async function source(actor){const r=await call(actor);assert.equal(r.status,200,JSON.stringify(r.body));assert.match(r.cache||'',/no-store/);assert.equal(r.body.sourceVersion,7);assert.equal(r.body.readOnly,true);assert.equal(r.body.operationalAcceptance,'NOT_ASSESSED');return r.body;}
const packet=(v,code)=>v.departments.find(d=>d.department===code).evidence;
const legal=v=>packet(v,'LEGAL_CONTRACTS_INSURANCE'),maintenance=v=>packet(v,'FACILITIES_ASSETS_MAINTENANCE');

try{
 assert.equal(await db.account.count(),0,'Refuse a database with existing accounts.');
 await ensurePurpleTestSchema(db);
 const owner=await actor('owner'),outside=await actor('outside'),staff=await actor('staff','STAFF');
 const org=await db.organization.create({data:{displayName:privateText,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}});
 const foreign=await db.organization.create({data:{displayName:privateText,kind:'DIVE_CENTER',status:'ACTIVE',ownerId:outside.id}});
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 await db.operationalSetting.create({data:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org.id}}});
 for(const code of ['LEGAL_CONTRACTS_INSURANCE','FACILITIES_ASSETS_MAINTENANCE'])await db.orgUnit.create({data:{organizationId:org.id,type:'DEPARTMENT',code,nameAr:privateText}});
 assert.equal((await call()).status,401);assert.equal((await call(outside)).status,403);assert.equal((await call(staff)).status,403);
 const empty=await source(owner);assert.equal(legal(empty).metrics.legalContractLifecycles,0);assert.equal(maintenance(empty).metrics.maintenanceWorkOrders,0);
 pass('Current owner-only HTTP authority and zero native counts; no operational acceptance is inferred.');

 async function document(organizationId){
  const t=await db.documentTemplate.create({data:{organizationId,code:'C08-'+randomUUID(),department:'LEGAL_CONTRACTS_INSURANCE',titleAr:privateText,titleEn:privateText,fields:[],status:'ACTIVE'}});
  const d=await db.managedDocument.create({data:{organizationId,templateId:t.id,department:t.department,status:'SIGNED',referenceNumber:randomUUID(),contentHash:hash,payload:{private:privateText},createdByAccountId:owner.id,approvedByAccountId:outside.id,approvedAt:new Date(),signedByAccountId:staff.id,signedAt:new Date()}});
  await db.documentRevision.create({data:{documentId:d.id,version:1,contentHash:hash,payload:d.payload,createdByAccountId:owner.id}});return d;
 }
 const ownDoc=await document(org.id),foreignDoc=await document(foreign.id);
 async function lifecycle(organizationId,doc){
  const id=randomUUID(),state={schemaVersion:1,contract:{id:doc.id,version:1,hash},contractSnapshot:{contentHash:hash,payload:doc.payload},status:'OPEN'};
  await db.$executeRaw`INSERT INTO "LegalContractLifecycle" ("id","organizationId","documentId","documentVersion","documentHash","revision","digest","state","createdByAccountId","createdAt","updatedAt") VALUES (${id},${organizationId},${doc.id},1,${hash},1,${hash},${JSON.stringify(state)}::jsonb,${owner.id},timezone('UTC',clock_timestamp()),timezone('UTC',clock_timestamp()))`;
  await db.$executeRaw`INSERT INTO "LegalContractLifecycleEvent" ("id","organizationId","lifecycleId","commandId","actorAccountId","requestHash","action","beforeRevision","afterRevision","resultDigest","evidence","createdAt") VALUES (${randomUUID()},${organizationId},${id},${randomUUID()},${owner.id},${hash},'REGISTER',0,1,${hash},'{}'::jsonb,timezone('UTC',clock_timestamp()))`;
  return id;
 }
 const ownLifecycle=await lifecycle(org.id,ownDoc);await lifecycle(foreign.id,foreignDoc);await lifecycle(org.id,foreignDoc);
 const finance=await db.financeAccount.create({data:{organizationId:org.id,name:privateText}}),claimId=randomUUID();
 const entry=await db.financeEntry.create({data:{organizationId:org.id,financeAccountId:finance.id,type:'REVENUE',status:'POSTED',amountMinor:12345,referenceType:'B06_INSURANCE_CLAIM',referenceId:claimId,requestedByAccountId:owner.id,approvedByAccountId:outside.id,approvedAt:new Date(),postedByAccountId:staff.id,postedAt:new Date()}});
 await db.$executeRaw`INSERT INTO "LegalContractSettlementReference" ("financeEntryId","organizationId","lifecycleId","claimId","ledgerHash") VALUES (${entry.id},${org.id},${ownLifecycle},${claimId},${hash})`;
 let v=await source(owner);assert.equal(legal(v).metrics.legalContractLifecycles,2);assert.equal(legal(v).metrics.legalContractLifecycleEvents,2);assert.equal(legal(v).metrics.inconsistentLegalContractSources,1);assert.equal(legal(v).metrics.legalContractSettlementReferences,1);assert.equal(legal(v).metrics.linkedPostedContractSettlements,1);
 pass('Signed-document and native posted-entry projection excludes foreign source links and keeps inconsistent own rows visible as counts.');

 async function order(organizationId,assetOrganizationId=organizationId){
  const asset=await db.marineAsset.create({data:{organizationId:assetOrganizationId,name:privateText,assetType:'BOAT',status:'ACTIVE'}});
  const native=await db.marineMaintenanceRecord.create({data:{marineAssetId:asset.id,maintenanceType:privateText,status:'COMPLETED',completedAt:new Date()}}),id=randomUUID();
  await db.$executeRaw`INSERT INTO "MaintenanceWorkOrder" ("id","organizationId","marineAssetId","maintenanceRecordId","status","startsAt","endsAt","metadata") VALUES (${id},${organizationId},${asset.id},${native.id},'CLOSED',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','{}'::jsonb)`;
  return{id,asset,native};
 }
 const ownOrder=await order(org.id);await order(foreign.id);await order(org.id,foreign.id);
 await db.$executeRaw`INSERT INTO "MaintenancePreventivePlan" ("id","organizationId","marineAssetId","intervalDays","nextDueAt","metadata") VALUES (${randomUUID()},${org.id},${ownOrder.asset.id},30,clock_timestamp(),'{}'::jsonb)`;
 await db.$executeRaw`INSERT INTO "MaintenanceCommand" ("organizationId","requestId","subjectId","action","actorId","actorPersonId","requestDigest","result") VALUES (${org.id},${randomUUID()},${ownOrder.id},'CLOSED',${owner.id},${owner.personId},${hash},'{}'::jsonb)`;
 const lotId=randomUUID(),issueId=randomUUID();
 await db.warehouseStockLot.create({data:{organizationId:org.id,lotId,locationId:randomUUID(),itemId:randomUUID(),purchaseReference:privateText,receiptReference:privateText,unitCostMinor:100,received:5,onHand:3}});
 await db.warehouseDecisionRequest.create({data:{organizationId:org.id,id:issueId,kind:'ISSUE',details:{lotId,quantity:2,custodianId:staff.id},makerId:owner.id,makerPersonId:owner.personId,finalDecision:'APPROVE',finalActorId:outside.id,finalizedAt:new Date()}});
 await db.warehouseIssuePosting.create({data:{organizationId:org.id,requestId:issueId,lotId,quantity:2,custodianId:staff.id,approvedBy:outside.id,postedBy:owner.id,acknowledgedAt:new Date(),balanceAfter:3}});
 const part={issueRequestId:issueId,lotId,issuedQuantity:2,returnedQuantity:0,quantity:2,unitCostMinor:100,totalCostMinor:200};
 await db.$executeRaw`INSERT INTO "MaintenancePartUsage" ("organizationId","issueRequestId","workOrderId","snapshot") VALUES (${org.id},${issueId},${ownOrder.id},${JSON.stringify(part)}::jsonb)`;
 v=await source(owner);assert.equal(maintenance(v).metrics.maintenanceWorkOrders,2);assert.equal(maintenance(v).metrics.closedMaintenanceWorkOrders,2);assert.equal(maintenance(v).metrics.inconsistentMaintenanceSources,1);assert.equal(maintenance(v).metrics.maintenancePreventivePlans,1);assert.equal(maintenance(v).metrics.maintenanceCommands,1);assert.equal(maintenance(v).metrics.maintenancePartUsageRecords,1);assert.equal(maintenance(v).metrics.linkedWarehousePartUsages,1);
 pass('Marine work-order projection fixtures link to same-organization B05 approval, posting and acknowledgement fields with pinned quantity and cost; actual execution is tested separately by C05.');

 const ownEquipment=await db.calendarResource.create({data:{type:'EQUIPMENT',name:privateText}}),foreignEquipment=await db.calendarResource.create({data:{type:'EQUIPMENT',name:privateText}});
 for(const [resource,organizationId] of [[ownEquipment,org.id],[foreignEquipment,foreign.id]])await db.$executeRaw`INSERT INTO "EquipmentBarcode" ("id","resourceId","assetCode","barcodeValue","qrValue","organizationId") VALUES (${randomUUID()},${resource.id},${randomUUID()},${randomUUID()},${randomUUID()},${organizationId})`;
 for(const [resource,organizationId] of [[ownEquipment,org.id],[foreignEquipment,org.id],[foreignEquipment,foreign.id]])await db.$executeRaw`INSERT INTO "MaintenanceWorkOrder" ("id","organizationId","equipmentResourceId","status","metadata") VALUES (${randomUUID()},${organizationId},${resource.id},'REQUESTED','{}'::jsonb)`;
 v=await source(owner);assert.equal(maintenance(v).metrics.maintenanceWorkOrders,4);assert.equal(maintenance(v).metrics.openMaintenanceWorkOrders,2);assert.equal(maintenance(v).metrics.inconsistentMaintenanceSources,2);
 pass('Equipment links use the original barcode and calendar resource; foreign equipment is not counted as a consistent owned asset.');

 const originalUsage=(await db.$queryRaw`SELECT "snapshot" FROM "MaintenancePartUsage" WHERE "organizationId"=${org.id} AND "issueRequestId"=${issueId}`)[0].snapshot;
 await db.warehouseIssuePosting.update({where:{organizationId_requestId:{organizationId:org.id,requestId:issueId}},data:{returned:1}});
 assert.equal(maintenance(await source(owner)).metrics.linkedWarehousePartUsages,0);
 const reconciled={...part,returnedQuantity:1,quantity:1,totalCostMinor:100};
 await db.$executeRaw`UPDATE "MaintenanceWorkOrder" SET "revision"="revision"+1,"metadata"=${JSON.stringify({partsReconciliation:{[issueId]:{snapshot:reconciled}}})}::jsonb WHERE "id"=${ownOrder.id}`;
 assert.equal(maintenance(await source(owner)).metrics.linkedWarehousePartUsages,1);
 assert.deepEqual((await db.$queryRaw`SELECT "snapshot" FROM "MaintenancePartUsage" WHERE "organizationId"=${org.id} AND "issueRequestId"=${issueId}`)[0].snapshot,originalUsage);
 pass('Changed stock returns remove stale links until the current work-order reconciliation exists; original part evidence remains unchanged.');

 await db.financeEntry.update({where:{id:entry.id},data:{status:'APPROVED'}});assert.equal(legal(await source(owner)).metrics.linkedPostedContractSettlements,0);
 await db.financeEntry.update({where:{id:entry.id},data:{status:'POSTED'}});
 await db.financeEntry.update({where:{id:entry.id},data:{organizationId:foreign.id}});assert.equal(legal(await source(owner)).metrics.linkedPostedContractSettlements,0);
 await db.financeEntry.update({where:{id:entry.id},data:{organizationId:org.id}});
 await db.financeAccount.update({where:{id:finance.id},data:{organizationId:foreign.id}});assert.equal(legal(await source(owner)).metrics.linkedPostedContractSettlements,0);
 await db.financeAccount.update({where:{id:finance.id},data:{organizationId:org.id}});
 await db.managedDocument.update({where:{id:ownDoc.id},data:{version:2}});assert.equal(legal(await source(owner)).metrics.linkedPostedContractSettlements,0);assert.equal(legal(await source(owner)).metrics.inconsistentLegalContractSources,2);
 await db.managedDocument.update({where:{id:ownDoc.id},data:{version:1}});
 pass('Changed financial status, entry/account organization or document revision invalidates current links without rewriting retained sources.');

 const business=()=>Promise.all([db.financeEntry.findMany(),db.warehouseIssuePosting.findMany(),db.managedDocument.findMany(),db.auditEvent.count(),db.aiAgentTask.count()]);
 const before=await business();v=await source(owner);assert.deepEqual(await business(),before);
 const serialized=JSON.stringify(v);for(const secretValue of [privateText,owner.email,owner.id,org.id,foreign.id,entry.id,claimId,issueId,lotId,'12345'])assert(!serialized.includes(secretValue),'Only allowlisted scalar counts leave the source projection.');
 assert.equal(legal(v).coverage,'PARTIAL');assert.equal(maintenance(v).coverage,'PARTIAL');
 pass('Preview is read-only and exposes counts without identities, document payloads, amounts or inferred approval.');

 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ARCHIVED'}});assert.equal((await call(owner)).status,403);
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
 await db.session.update({where:{id:owner.session.id},data:{revokedAt:new Date()}});assert.equal((await call(owner)).status,401);
 pass('Fresh administrator revocation and session revocation stop later HTTP reads.');
 console.log(`${checks} C08 source-projection HTTP/PostgreSQL groups passed. Synthetic projection fixtures are separate from the actual B06/C05 lifecycle acceptance; no business operation or professional approval is claimed.`);
}finally{await db.$disconnect();}
