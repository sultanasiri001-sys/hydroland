import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';

// Disposable native HTTP/PG fixture only. No external model or real HR data.
export async function departmentSourceAcceptance({db,organization,actor,ordinary,token,otherToken,call,providerCalls}){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const require=createRequire(import.meta.url),{STAFFING_DEPARTMENTS}=require('../dist/hr/staffing-catalog.js'),{reviewedAdministrativeTemplates}=require('../dist/document-forms/administrative-form-catalog.js'),{readDepartmentSources}=require('../dist/agents/department-source.reader.js');
 const sentinel='SOURCE_PRIVATE_PAYLOAD_MUST_NOT_LEAVE_DATABASE',templates=reviewedAdministrativeTemplates('isolated-source'),hr=templates.find(t=>t.department==='HR'),finance=templates.find(t=>t.department==='FINANCE');let foreign,ownHrTemplate;const productIds=[],assetIds=[];
 const ids=()=>[organization.id,...(foreign?[foreign.id]:[])];
 const cleanup=async()=>{
  const scope={in:ids()},trip={organizationId:scope},enrollment={centerOrganizationId:scope};
  await db.storeProduct.deleteMany({where:{id:{in:productIds}}});await db.marineMaintenanceRecord.deleteMany({where:{marineAssetId:{in:assetIds}}});await db.marineAsset.deleteMany({where:{id:{in:assetIds}}});
  await db.trainingCertificate.deleteMany({where:{trainingRecord:{enrollment}}});await db.trainingRecord.deleteMany({where:{enrollment}});await db.trainingEnrollment.deleteMany({where:enrollment});await db.storeCourseOffer.deleteMany({where:{organizationId:scope}});
  await db.safetyIncident.deleteMany({where:{trip}});await db.safetyChecklist.deleteMany({where:{trip}});await db.booking.deleteMany({where:{trip}});await db.trip.deleteMany({where:trip});
  await db.administrativeRouting.deleteMany({where:{organizationId:scope}});await db.administrativeMeeting.deleteMany({where:{organizationId:scope}});await db.administrativeRecord.deleteMany({where:{organizationId:scope}});
  await db.managedDocument.deleteMany({where:{organizationId:scope}});await db.documentTemplate.deleteMany({where:{organizationId:scope}});
  await db.financeEntry.deleteMany({where:{organizationId:scope}});await db.financeAccount.deleteMany({where:{organizationId:scope}});await db.customerCase.deleteMany({where:{organizationId:scope}});
  await db.internalResearchReview.deleteMany({where:{organizationId:scope}});await db.internalResearchInitiative.deleteMany({where:{organizationId:scope}});await db.departmentClosureAssessment.deleteMany({where:{organizationId:scope}});
  await db.employmentContract.deleteMany({where:{employment:{organizationId:scope}}});await db.leaveRequest.deleteMany({where:{employment:{organizationId:scope}}});await db.employment.deleteMany({where:{organizationId:scope}});await db.hrCandidate.deleteMany({where:{organizationId:scope}});await db.orgUnit.deleteMany({where:{organizationId:scope}});
  if(foreign)await db.organization.delete({where:{id:foreign.id}});
 };
 const doc=async(organizationId,templateId,department,status='APPROVED')=>db.managedDocument.create({data:{organizationId,templateId,department,status,referenceNumber:randomUUID(),contentHash:'a'.repeat(64),createdByAccountId:actor.id,payload:{private:sentinel,privateSalaryMinor:917273,email:actor.email}}});
 const product=async(organizationId,kind,status,stockQuantity)=>{const row=await db.storeProduct.create({data:{organizationId,kind,status,stockQuantity,sku:'SOURCE-'+randomUUID(),nameAr:sentinel,description:sentinel,priceMinor:917273}});productIds.push(row.id);return row;};
 const preview=async()=>{const r=await call('/admin/agents/department-sources',token);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.cacheControl,'no-store');return r.body;};
 try{
  await db.orgUnit.createMany({data:STAFFING_DEPARTMENTS.map(d=>({organizationId:organization.id,type:'DEPARTMENT',code:d.code,nameAr:d.nameAr,active:true}))});
  foreign=await db.organization.create({data:{displayName:sentinel,kind:'DIVE_CENTER',status:'ACTIVE',ownerId:ordinary.id}});
  const unit=await db.orgUnit.findFirstOrThrow({where:{organizationId:organization.id,code:'HR'}}),adminUnit=await db.orgUnit.findFirstOrThrow({where:{organizationId:organization.id,code:'ADMIN_AFFAIRS_RECORDS'}}),foreignUnit=await db.orgUnit.create({data:{organizationId:foreign.id,type:'DEPARTMENT',code:'HR',nameAr:sentinel}});
  const template=async(org,t,version=1)=>db.documentTemplate.create({data:{organizationId:org,code:t.code,department:t.department,titleAr:sentinel,titleEn:sentinel,fields:[],version,status:'ACTIVE'}});
  ownHrTemplate=await template(organization.id,hr);await template(organization.id,hr,2);const foreignHr=await template(foreign.id,hr),ownFinance=await template(organization.id,finance);
  await doc(organization.id,ownHrTemplate.id,'HR');await doc(foreign.id,foreignHr.id,'HR');await doc(organization.id,ownHrTemplate.id,'FINANCE');await doc(organization.id,foreignHr.id,'HR');await doc(organization.id,ownFinance.id,'FINANCE','DRAFT');
  for(const org of [organization,foreign])await db.hrCandidate.create({data:{organizationId:org.id,personId:ordinary.personId,status:'SUBMITTED',verificationNotes:sentinel}});
  const employments=[];for(const [org,u] of [[organization,unit],[foreign,foreignUnit]])employments.push(await db.employment.create({data:{organizationId:org.id,orgUnitId:u.id,accountId:ordinary.id,workerClass:'EMPLOYEE',status:'ACTIVE'}}));
  await db.leaveRequest.create({data:{employmentId:employments[0].id,type:sentinel,status:'SUBMITTED',startsAt:new Date(),endsAt:new Date(Date.now()+3600000),requestedByAccountId:ordinary.id}});
  for(const e of employments)await db.employmentContract.create({data:{employmentId:e.id,contractType:'EMPLOYEE',effectiveFrom:new Date(),status:'DRAFT',librarySnapshot:{private:sentinel}}});
  for(const org of [organization,foreign]){
   for(const [kind,status,stock] of [['GOODS','ACTIVE',3],['GOODS','ACTIVE',0],['GOODS','DRAFT',5],['GOODS','INACTIVE',-1],['SERVICE','ACTIVE',0]])await product(org.id,kind,status,stock);
   const assets=[];for(const status of ['ACTIVE','DRAFT','OUT_OF_SERVICE']){const row=await db.marineAsset.create({data:{organizationId:org.id,name:sentinel,assetType:'BOAT',status}});assetIds.push(row.id);assets.push(row);}
   for(const [asset,status,completedAt] of [[assets[0],'OPEN',null],[assets[0],'COMPLETED',null],[assets[1],'COMPLETED',new Date()],[assets[2],'CANCELLED',null]])await db.marineMaintenanceRecord.create({data:{marineAssetId:asset.id,maintenanceType:sentinel,status,completedAt,notes:sentinel}});
  }
  await product(null,'GOODS','ACTIVE',4);
  const financial=[];for(const org of [organization,foreign])financial.push(await db.financeAccount.create({data:{organizationId:org.id,name:sentinel}}));
  for(const [org,account,status] of [[organization,financial[0],'PENDING_APPROVAL'],[foreign,financial[1],'POSTED'],[organization,financial[1],'POSTED']])await db.financeEntry.create({data:{organizationId:org.id,financeAccountId:account.id,type:'EXPENSE',status,amountMinor:917273,referenceType:'ISOLATED_SOURCE',referenceId:randomUUID(),description:sentinel,requestedByAccountId:actor.id}});
  for(const org of [organization,foreign])await db.customerCase.create({data:{organizationId:org.id,customerId:ordinary.id,type:'QUESTION',status:'OPEN',subject:sentinel,description:sentinel}});
  const tripData={title:sentinel,type:'SHORE',startsAt:new Date(Date.now()+3600000),endsAt:new Date(Date.now()+7200000),capacity:4,status:'OPEN'},ownTrip=await db.trip.create({data:{...tripData,organizationId:organization.id}}),foreignTrip=await db.trip.create({data:{...tripData,organizationId:foreign.id}});
  for(const t of [ownTrip,foreignTrip]){await db.booking.create({data:{tripId:t.id,accountId:ordinary.id,organizationId:organization.id}});await db.safetyChecklist.create({data:{tripId:t.id,items:{private:sentinel}}});await db.safetyIncident.create({data:{tripId:t.id,reportedByAccountId:ordinary.id,severity:'LOW',title:sentinel,description:sentinel,status:'OPEN'}});}
  for(const org of [organization,foreign]){
   const offer=await db.storeCourseOffer.create({data:{organizationId:org.id,courseCode:'SOURCE-FIXTURE',title:sentinel,description:sentinel,locationName:sentinel,startsAt:new Date(Date.now()+3600000),endsAt:new Date(Date.now()+7200000),capacity:4,priceMinor:917273}});
   const enrollment=await db.trainingEnrollment.create({data:{storeCourseOfferId:offer.id,centerOrganizationId:org.id,studentAccountId:ordinary.id,courseCode:'SOURCE-FIXTURE',status:'COMPLETED',completedAt:new Date(),metadata:{private:sentinel}}});
   const record=await db.trainingRecord.create({data:{enrollmentId:enrollment.id,status:'COMPLETED',progressPercent:100,completedAt:new Date()}});
   await db.trainingCertificate.create({data:{trainingRecordId:record.id,studentAccountId:ordinary.id,courseCode:'SOURCE-FIXTURE',recommendedByInstructorId:actor.id}});
   await db.internalResearchInitiative.create({data:{organizationId:org.id,requestKey:randomUUID(),policyVersion:'isolated-source',createdByAccountId:actor.id,createdByPersonId:actor.personId,content:{private:sentinel},recordDigest:'b'.repeat(64)}});
   await db.departmentClosureAssessment.create({data:{organizationId:org.id,department:'HR',revision:1,policyVersion:'isolated-source',specificationVersion:'isolated-source',state:'RECORDED',gates:{private:sentinel},sourceDigest:'b'.repeat(64),authorityDigest:'b'.repeat(64),recordDigest:'b'.repeat(64),createdByAccountId:actor.id}});
  }
  for(const [org,u] of [[organization,adminUnit],[foreign,foreignUnit]]){
   const record=await db.administrativeRecord.create({data:{organizationId:org.id,unitId:u.id,type:'CORRESPONDENCE',referenceNumber:randomUUID(),subject:sentinel,ownerAccountId:actor.id}});
   await db.administrativeRouting.create({data:{organizationId:org.id,recordId:record.id,fromUnitId:u.id,toUnitId:u.id,requestedByAccountId:actor.id}});
   await db.administrativeMeeting.create({data:{organizationId:org.id,unitId:u.id,title:sentinel,scheduledAt:new Date(),organizerAccountId:actor.id,participantAccountIds:[ordinary.id]}});
  }
  assert.equal((await call('/admin/agents/department-sources')).status,401);assert.equal((await call('/admin/agents/department-sources',otherToken)).status,403,'An unrelated verified ADMIN cannot preview internal department sources');
  const beforeCalls=providerCalls(),beforeTasks=await db.aiAgentTask.count(),beforeDocuments=await db.managedDocument.findMany({where:{organizationId:organization.id}}),response=await preview();
  assert.equal(response.sourceVersion,3);assert.equal(response.readOnly,true);assert.equal(response.generationTested,false);assert.equal(response.operationalAcceptance,'NOT_ASSESSED');assert.equal(response.departments.length,14);assert.equal(response.departments.filter(d=>d.operationalCountsConnected).length,13);
  const source=code=>response.departments.find(d=>d.department===code).evidence;
  assert.equal(source('HR').documents.documents,1);assert.equal(source('HR').documents.inconsistentLinks,1);assert.equal(source('HR').documents.templateConflicts,1);assert.equal(source('HR').metrics.candidates,1);assert.equal(source('HR').metrics.activeEmployments,1);assert.equal(source('HR').metrics.pendingLeaves,1);
  assert.equal(source('FINANCE').metrics.activeFinanceAccounts,1);assert.equal(source('FINANCE').metrics.pendingFinanceEntries,1);assert.equal(source('FINANCE').metrics.postedFinanceEntries,0,'Cross-organization finance links never become measured own entries');
  assert.equal(source('TRAINING').metrics.courseOffers,1);assert.equal(source('TRAINING').metrics.completedTrainingRecords,1);assert.equal(source('TRAINING').metrics.certificateRecommendations,1);
  assert.equal(source('MARINE_OPERATIONS').metrics.trips,1);assert.equal(source('MARINE_OPERATIONS').metrics.tripBookings,1,'Booking customer ownership cannot expose another provider organization');
  assert.equal(source('SAFETY_COMPLIANCE_RISK').metrics.unresolvedTripIncidents,1);assert.equal(source('CUSTOMER_EXPERIENCE').metrics.customerCases,1);assert.equal(source('ADMIN_AFFAIRS_RECORDS').metrics.administrativeRecords,1);assert.equal(source('EXECUTIVE_GOVERNANCE').metrics.assessmentRevisions,1);assert.equal(source('RND_MARKET_INTELLIGENCE').metrics.researchInitiatives,1);assert.equal(source('LEGAL_CONTRACTS_INSURANCE').metrics.employmentContractVersions,1);
  assert.deepEqual(source('INVENTORY_LOGISTICS').metrics,{storeGoodsProducts:4,activeStoreGoodsProducts:2,draftStoreGoodsProducts:1,unavailableActiveStoreGoodsProducts:1,negativeStockStoreGoodsProducts:1},'Foreign goods, unowned goods and service listings are excluded');
  assert.deepEqual(source('FACILITIES_ASSETS_MAINTENANCE').metrics,{marineAssets:3,activeMarineAssets:1,marineMaintenanceRecords:4,openMarineMaintenanceRecords:1,recordedCompletedMarineMaintenanceRecords:1},'Only related own assets and timestamped recorded completions count');
  for(const code of ['MARKETING_GROWTH','INVENTORY_LOGISTICS','FACILITIES_ASSETS_MAINTENANCE'])assert.equal(source(code).missingSources.length,1);
  assert.deepEqual(source('MARKETING_GROWTH').metrics,{});
  const serialized=JSON.stringify(response);for(const forbidden of [sentinel,'917273',actor.email,actor.id,ordinary.id,organization.id,foreign.id,...productIds,...assetIds])assert(!serialized.includes(forbidden),'Only scalar, allowlisted source counts may leave the database');
  assert.deepEqual(providerCalls(),beforeCalls);assert.equal(await db.aiAgentTask.count(),beforeTasks);assert.deepEqual(await db.managedDocument.findMany({where:{organizationId:organization.id}}),beforeDocuments);
  // Isolated native-type probes exercise the exact compiled aggregate reader.
  // Temp tables shadow only the three count sources on this transaction's
  // connection; public fixtures and concurrent HTTP requests are unaffected.
  for(const identity of ['TEXT','UUID'])await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe(`CREATE TEMP TABLE "StoreProduct" ("id" ${identity} PRIMARY KEY,"organizationId" ${identity},"kind" TEXT,"status" TEXT,"stockQuantity" INTEGER) ON COMMIT DROP`);
   await tx.$executeRawUnsafe(`CREATE TEMP TABLE "MarineAsset" ("id" ${identity} PRIMARY KEY,"organizationId" ${identity},"status" TEXT) ON COMMIT DROP`);
   await tx.$executeRawUnsafe(`CREATE TEMP TABLE "MarineMaintenanceRecord" ("id" ${identity} PRIMARY KEY,"marineAssetId" ${identity},"status" TEXT,"completedAt" TIMESTAMP) ON COMMIT DROP`);
   await tx.$executeRawUnsafe('SET LOCAL search_path=pg_temp,public');
   for(const [org,kind] of [[organization.id,'GOODS'],[foreign.id,'GOODS'],[null,'GOODS'],[organization.id,'SERVICE']])await tx.$executeRawUnsafe(`INSERT INTO "StoreProduct" VALUES ($1::${identity},$2::${identity},$3,'ACTIVE',0)`,randomUUID(),org,kind);
   const ownAsset=randomUUID(),otherAsset=randomUUID();for(const [id,org] of [[ownAsset,organization.id],[otherAsset,foreign.id]]){
    await tx.$executeRawUnsafe(`INSERT INTO "MarineAsset" VALUES ($1::${identity},$2::${identity},'ACTIVE')`,id,org);
    await tx.$executeRawUnsafe(`INSERT INTO "MarineMaintenanceRecord" VALUES ($1::${identity},$2::${identity},'OPEN',NULL)`,randomUUID(),id);
   }
   const probe=await readDepartmentSources(tx,actor.id,['INVENTORY_LOGISTICS','FACILITIES_ASSETS_MAINTENANCE'],3),packet=code=>probe.departments.find(d=>d.department===code).evidence;
   assert.deepEqual(packet('INVENTORY_LOGISTICS').metrics,{storeGoodsProducts:1,activeStoreGoodsProducts:1,draftStoreGoodsProducts:0,unavailableActiveStoreGoodsProducts:1,negativeStockStoreGoodsProducts:0},identity+' goods scope');
   assert.deepEqual(packet('FACILITIES_ASSETS_MAINTENANCE').metrics,{marineAssets:1,activeMarineAssets:1,marineMaintenanceRecords:1,openMarineMaintenanceRecords:1,recordedCompletedMarineMaintenanceRecords:0},identity+' linked marine scope');
  },{isolationLevel:'Serializable'});
  await db.roleAssignment.updateMany({where:{accountId:actor.id,role:'ADMIN',status:'ACTIVE'},data:{status:'SUSPENDED'}});try{assert.equal((await call('/admin/agents/department-sources',token)).status,403);}finally{await db.roleAssignment.updateMany({where:{accountId:actor.id,role:'ADMIN',status:'SUSPENDED'},data:{status:'ACTIVE'}});}
  await db.organization.update({where:{id:organization.id},data:{ownerId:ordinary.id}});try{assert.equal((await call('/admin/agents/department-sources',token)).status,403);}finally{await db.organization.update({where:{id:organization.id},data:{ownerId:actor.id}});}
  await db.orgUnit.update({where:{id:unit.id},data:{active:false}});try{const inactive=await preview();assert.equal(inactive.departments.find(d=>d.department==='HR').evidence,null);assert.equal((await call('/admin/agents/reporting/cycles',token,{requestId:randomUUID(),brief:'Inactive department fixture',sendEmail:false,reviewed:true,reason:'Isolated source preflight'})).status,409);assert.equal(await db.aiAgentTask.count(),beforeTasks);}finally{await db.orgUnit.update({where:{id:unit.id},data:{active:true}});}
  assert.deepEqual(providerCalls(),beforeCalls);
  return{cleanup,afterInventoryCapture:async taskId=>{
   await product(organization.id,'GOODS','ACTIVE',4);const live=await preview();assert.equal(live.departments.find(d=>d.department==='INVENTORY_LOGISTICS').evidence.metrics.storeGoodsProducts,5);
   const historical=await call('/admin/agents/governance-reviews/'+taskId,token);assert.equal(historical.status,200);assert.equal(historical.body.source.operationsEvidence.scope,'DEPARTMENT_AGGREGATE_V3');assert.equal(historical.body.source.operationsEvidence.values.metrics.storeGoodsProducts,4,'A changed goods catalog cannot rewrite the captured inventory input');
  },afterHrCapture:async taskId=>{
   await doc(organization.id,ownHrTemplate.id,'HR','DRAFT');const live=await preview();assert.equal(live.departments.find(d=>d.department==='HR').evidence.documents.documents,2);
   const historical=await call('/admin/agents/governance-reviews/'+taskId,token);assert.equal(historical.status,200);assert.equal(historical.body.source.operationsEvidence.scope,'DEPARTMENT_AGGREGATE_V3');assert.equal(historical.body.source.operationsEvidence.values.documents.documents,1,'A new live source read cannot overwrite the captured report input');
  }};
 }catch(error){await cleanup();throw error;}
}
