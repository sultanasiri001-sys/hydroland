import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);

// Called only by the existing guarded, isolated HTTP/PostgreSQL acceptance test.
export async function checkPlatformDocumentSources({db,owner,other,worker,org,employment,foreignEmployment,commencement,call,ok,base,pass}){
 const route=`documents/organizations/${org.id}`;
 const references=[{kind:'EMPLOYMENT',id:employment.id}];
 const preview=async t=>ok(owner,route+'/platform-source-preview','POST',{templateId:t.id,references});
 const {reviewedAdministrativeTemplates}=require('../dist/document-forms/administrative-form-catalog.js');
 const {validateDocumentPayload}=require('../dist/document-forms/document-payload.js');
 const {sourceSnapshot,sourcePrintFields}=require('../dist/document-forms/platform-document-source.domain.js');
 const makePayload=t=>Object.fromEntries(t.fields.map(f=>[f.key,f.type==='DATE'?'2026-10-31':f.type==='NUMBER'?0:f.type==='BOOLEAN'?true:f.type==='SELECT'?f.options[0]:f.type==='TABLE'?[{fixture:'isolated compatibility test'}]:'بيانات اختبار في قاعدة معزولة']));
 const first=await preview(commencement),nameField=first.snapshot.records.find(r=>r.kind==='EMPLOYMENT').fields.find(f=>f.key==='employee.fullName');
 assert.equal(nameField.value,'HrSourceFixture worker');
 assert.notEqual(nameField.value,first.snapshot.records.find(r=>r.kind==='AUTHOR').fields.find(f=>f.key==='fullName').value);
 assert.equal(first.snapshot.bindings.employeeReference,employment.id);
 assert.ok(!JSON.stringify(first).includes('passwordHash'));
 const nativeBefore=await db.employment.findUniqueOrThrow({where:{id:employment.id}});
 assert.equal((await call(null,route+'/platform-source-preview','POST',{templateId:commencement.id,references})).status,401);
 assert.equal((await call(other,route+'/platform-source-preview','POST',{templateId:commencement.id,references})).status,403);
 assert.equal((await call(owner,route+'/platform-source-preview','POST',{templateId:commencement.id,references:[{kind:'EMPLOYMENT',id:foreignEmployment.id}]})).status,404);
 assert.equal((await call(owner,route+'/platform-source-preview','POST',{templateId:commencement.id,references:[{kind:'ACCOUNT',id:other.id}]})).status,404);
 assert.equal((await call(owner,route+'/platform-source-preview','POST',{templateId:commencement.id,references,values:{name:'forged'}})).status,400);
 assert.equal((await call(owner,route+'/platform-sources/UnknownModel')).status,400);
 const candidates=await ok(owner,route+'/platform-sources/EMPLOYMENT');
 assert.ok(candidates.items.some(r=>r.id===employment.id));assert.ok(!candidates.items.some(r=>r.id===foreignEmployment.id));
 assert.match((await call(owner,route+'/platform-sources/EMPLOYMENT')).headers.get('cache-control'),/no-store/);
 pass('platform source lookup reads real scoped rows, distinguishes author from beneficiary, and rejects forged and foreign inputs');

 const input={organizationId:org.id,templateId:commencement.id,department:commencement.department,contentHash:randomUUID(),payload:makePayload(commencement),sourceBinding:{references,expectedFingerprint:first.snapshot.fingerprint}};
 input.payload.employeeReference='manual value must be replaced';
 const doc=await ok(owner,'documents','POST',input);
 assert.equal(doc.payload.employeeReference,employment.id);assert.equal(doc.payload._platformSources.fingerprint,first.snapshot.fingerprint);
 assert.match(doc.contentHash,/^sha256:[a-f0-9]{64}$/);
 validateDocumentPayload(commencement.fields,doc.payload);
 const printed=await ok(owner,`documents/${doc.id}/print-contract`);
 assert.ok(printed.fields.some(f=>f.labelAr.includes('اسم الموظف')&&f.value==='HrSourceFixture worker'));
 const pdf=await fetch(new URL(`documents/${doc.id}/pdf`,base),{headers:{authorization:`Bearer ${owner.token}`}});
 assert.equal(pdf.status,200);const pdfBytes=Buffer.from(await pdf.arrayBuffer());assert.equal(pdfBytes.subarray(0,5).toString(),'%PDF-');
 await mkdir('/tmp/form-library-evidence',{recursive:true});await writeFile('/tmp/form-library-evidence/platform-source-native.pdf',pdfBytes);
 assert.deepEqual(await db.employment.findUniqueOrThrow({where:{id:employment.id}}),nativeBefore);
 pass('saved source values are server written, included in the revision hash, printed with names, and do not execute employment actions');

 const originalPerson=await db.person.findUniqueOrThrow({where:{id:worker.personId}});
 try{
  await db.person.update({where:{id:worker.personId},data:{firstName:'اسم مصدر محدث'}});
  const before=await db.managedDocument.count({where:{organizationId:org.id}});
  assert.equal((await call(owner,'documents','POST',input)).status,409);
  assert.equal(await db.managedDocument.count({where:{organizationId:org.id}}),before);
  const old=await ok(owner,`documents/${doc.id}/print-contract`);
  assert.ok(old.fields.some(f=>f.value==='HrSourceFixture worker'));assert.ok(!old.fields.some(f=>f.value==='اسم مصدر محدث worker'));
  const fresh=await preview(commencement);
  assert.notEqual(fresh.snapshot.fingerprint,first.snapshot.fingerprint);
  assert.equal((await call(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'bad',payload:makePayload(commencement),sourceBinding:{references,expectedFingerprint:fresh.snapshot.fingerprint},expectedDocumentVersion:99})).status,400);
  const revised=await ok(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'not-trusted',payload:makePayload(commencement),sourceBinding:{references,expectedFingerprint:fresh.snapshot.fingerprint},expectedDocumentVersion:doc.version});
  assert.equal(revised.version,2);
  const history=await ok(owner,`documents/${doc.id}/revisions/1`);
  assert.equal(sourceSnapshot(history.payload).records.find(r=>r.kind==='EMPLOYMENT').fields.find(f=>f.key==='employee.fullName').value,'HrSourceFixture worker');
  assert.ok((await ok(owner,`documents/${doc.id}/print-contract`)).fields.some(f=>f.value==='اسم مصدر محدث worker'));
  assert.equal((await call(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'forged',payload:{...revised.payload}})).status,400);
  const clean={...revised.payload};delete clean._platformSources;
  const changed=await ok(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'ignored',payload:{...clean,supportingEvidence:'تعديل توثيق دون تغيير صاحب المعاملة'}});
  assert.equal(changed.version,3);assert.deepEqual(changed.payload._platformSources,revised.payload._platformSources);
  assert.equal((await call(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'bad',payload:{...clean,employeeReference:other.id}})).status,409);
 }finally{await db.person.update({where:{id:worker.personId},data:{firstName:originalPerson.firstName,lastName:originalPerson.lastName,updatedAt:originalPerson.updatedAt}});}
 assert.equal((await call(owner,'documents','POST',{...input,payload:{...input.payload,_platformSources:first.snapshot}})).status,400);
 pass('source changes require a fresh preview, old revisions retain their names, client snapshots are rejected, and bound identities cannot drift');

 const extra={};
 try{
  extra.leave=await db.leaveRequest.create({data:{employmentId:employment.id,type:'ANNUAL',startsAt:new Date('2026-10-31T00:00:00Z'),endsAt:new Date('2026-11-01T00:00:00Z'),requestedByAccountId:owner.id}});
  extra.training=await db.trainingEnrollment.create({data:{studentAccountId:worker.id,instructorAccountId:other.id,centerOrganizationId:org.id,courseCode:'ISOLATED-SOURCE-COURSE'}});
  extra.trip=await db.trip.create({data:{organizationId:org.id,title:'رحلة مصدر معزولة',type:'SHORE',startsAt:new Date('2026-11-01T08:00:00Z'),endsAt:new Date('2026-11-01T10:00:00Z'),capacity:2}});
  extra.booking=await db.booking.create({data:{organizationId:org.id,tripId:extra.trip.id,accountId:worker.id}});
  extra.participant=await db.bookingParticipant.create({data:{bookingId:extra.booking.id,accountId:worker.id,fullName:'اسم المشارك المحفوظ في الحجز'}});
  extra.dive=await db.diveLog.create({data:{accountId:worker.id,sourceTripId:extra.trip.id,sourceParticipantId:extra.participant.id,siteName:'موقع مصدر معزول',diveDate:new Date('2026-11-01T08:00:00Z'),maxDepthM:0,durationMin:0}});
  extra.customer=await db.customerCase.create({data:{organizationId:org.id,customerId:worker.id,type:'COMPLAINT',subject:'حالة مصدر معزولة',description:'وصف محفوظ في سجل الحالة'}});
  extra.asset=await db.marineAsset.create({data:{organizationId:org.id,name:'وسيلة مصدر معزولة',assetType:'BOAT',registrationNumber:'SOURCE-'+randomUUID()}});
  extra.financeAccount=await db.financeAccount.create({data:{organizationId:org.id,name:'حساب مصدر معزول'}});
  extra.finance=await db.financeEntry.create({data:{organizationId:org.id,financeAccountId:extra.financeAccount.id,type:'REVENUE',amountMinor:0,referenceType:'SOURCE_ACCEPTANCE',referenceId:extra.booking.id,requestedByAccountId:owner.id}});
  extra.admin=await db.administrativeRecord.create({data:{organizationId:org.id,unitId:employment.orgUnitId,type:'INCOMING',referenceNumber:'SOURCE-'+randomUUID(),subject:'معاملة مصدر معزولة',ownerAccountId:owner.id}});
  const ids={ACCOUNT:owner.id,EMPLOYMENT:employment.id,LEAVE_REQUEST:extra.leave.id,TRAINING_ENROLLMENT:extra.training.id,DIVE_LOG:extra.dive.id,BOOKING_PARTICIPANT:extra.participant.id,CUSTOMER_CASE:extra.customer.id,MARINE_ASSET:extra.asset.id,TRIP:extra.trip.id,BOOKING:extra.booking.id,FINANCE_ENTRY:extra.finance.id,ADMINISTRATIVE_RECORD:extra.admin.id};
  for(const [kind,id] of Object.entries(ids)){
   const v=await ok(owner,route+'/platform-source-preview','POST',{templateId:commencement.id,references:[{kind,id}]});
   const record=v.snapshot.records.find(r=>r.kind===kind);assert.equal(record.id,id);
   const list=await ok(owner,route+'/platform-sources/'+kind);assert.ok(list.items.some(r=>r.id===id));
   if(kind==='TRAINING_ENROLLMENT'){
    assert.equal(record.fields.find(f=>f.key==='student.fullName').value,'HrSourceFixture worker');
    assert.equal(record.fields.find(f=>f.key==='instructor.fullName').value,'HrSourceFixture other');
   }
   if(kind==='MARINE_ASSET')assert.ok(!record.fields.some(f=>f.key==='owner.fullName'));
   if(kind==='DIVE_LOG'){assert.equal(record.fields.find(f=>f.key==='maxDepthM').value,0);assert.equal(record.fields.find(f=>f.key==='durationMin').value,0);}
   if(kind==='FINANCE_ENTRY')assert.equal(record.fields.find(f=>f.key==='amountMinor').value,0);
  }
  await db.trainingEnrollment.update({where:{id:extra.training.id},data:{instructorAccountId:null}});
  const missing=await ok(owner,route+'/platform-source-preview','POST',{templateId:commencement.id,references:[{kind:'TRAINING_ENROLLMENT',id:extra.training.id}]});
  assert.equal(missing.snapshot.records.find(r=>r.kind==='TRAINING_ENROLLMENT').fields.find(f=>f.key==='instructor.fullName').value,null);
  pass('all 12 source providers use native rows; trainee, instructor and participant names remain distinct; missing instructors and vessel owners are not invented');
 }finally{
  for(const [key,delegate] of [['admin','administrativeRecord'],['finance','financeEntry'],['financeAccount','financeAccount'],['dive','diveLog'],['participant','bookingParticipant'],['booking','booking'],['trip','trip'],['asset','marineAsset'],['training','trainingEnrollment'],['leave','leaveRequest']])if(extra[key])await db[delegate].delete({where:{id:extra[key].id}});
 }

 // Same source mechanism and unchanged field schema for every catalog template.
 const all=reviewedAdministrativeTemplates(org.id);assert.equal(all.length,157);
 let count=0;
 for(const t of all){
  const saved=await ok(owner,'documents/templates','POST',{organizationId:org.id,code:'E2E-SRC-'+t.code,department:t.department,titleAr:t.titleAr,titleEn:t.titleEn,fields:t.fields,printable:true});
  const p=await preview(saved);
  const created=await ok(owner,'documents','POST',{organizationId:org.id,templateId:saved.id,department:t.department,contentHash:'computed-by-server',payload:makePayload(t),sourceBinding:{references,expectedFingerprint:p.snapshot.fingerprint}});
  validateDocumentPayload(t.fields,created.payload);
  assert.equal(sourceSnapshot(created.payload,org.id).records.find(r=>r.kind==='EMPLOYMENT').id,employment.id);
  assert.ok(sourcePrintFields(sourceSnapshot(created.payload)).some(f=>f.value==='HrSourceFixture worker'));
  count++;
 }
 assert.equal(count,157);assert.equal(new Set(all.map(t=>t.department)).size,14);
 const audit=await ok(owner,route+'/platform-source-audit');assert.ok(audit.linked>=158);assert.ok(audit.items.some(r=>r.documentId===doc.id&&r.sourceStatus==='LINKED'));assert.ok(audit.sourceNotSelected>0);
 assert.equal((await call(other,route+'/platform-source-audit')).status,403);
 pass('all 157 actual catalog definitions across 14 departments save and read source evidence without invented fields');

 if(process.env.HR_SOURCE_HTTP_BROWSER==='1'){
  const {chromium}=require('@playwright/test');const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1100,height:850}});
  try{
   const page=await context.newPage();page.setDefaultTimeout(20000);await page.setContent('<div id="role-console"></div>');
   await page.exposeFunction('platformHttp',async(path,init={})=>{const r=await fetch(new URL(path.replace(/^\//,''),base),{...init,headers:{...init.headers,authorization:`Bearer ${owner.token}`}});return {status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer()).toString('base64')};});
   await page.evaluate(owner=>{window.sourceUi={session:1,hold:false,release:null};window.HydrolandProfileData={profile:{id:owner}};window.HydrolandPortalAccess={getCurrentRole:()=> 'admin'};window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>sourceUi.session,authorizedFetch:async(path,init)=>{const r=await platformHttp(path,init);if(sourceUi.hold&&path.endsWith('/platform-source-preview'))await new Promise(resolve=>sourceUi.release=resolve);return new Response(Uint8Array.from(atob(r.body),c=>c.charCodeAt(0)),{status:r.status,headers:r.headers});}};},owner.id);
   await page.addScriptTag({content:await readFile(new URL('../../web/src/hydroland-documents.js',import.meta.url),'utf8')});
   await page.evaluate(()=>HydrolandDocuments.open({internal:true,department:'HR'}));
   await page.locator(`[data-doc-template] option[value="${commencement.id}"]`).waitFor({state:'attached'});await page.locator('[data-doc-template]').selectOption(commencement.id);
   await page.locator('[data-platform-source-kind]').selectOption('EMPLOYMENT');await page.locator('[data-platform-source-load]').click();
   await page.locator(`[data-platform-source-record] option[value="${employment.id}"]`).waitFor({state:'attached'});await page.locator('[data-platform-source-record]').selectOption(employment.id);await page.locator('[data-platform-source-add]').click();await page.locator('[data-platform-source-preview]').click();
   await page.waitForFunction(()=>document.querySelector('[data-platform-source-values]').textContent.includes('HrSourceFixture worker'));
   assert.equal(await page.locator('[name="employeeReference"]').inputValue(),employment.id);assert.equal(await page.locator('[name="employeeReference"]').getAttribute('readonly'),'');
   await page.evaluate(()=>sourceUi.hold=true);await page.locator('[data-platform-source-preview]').click();await page.waitForFunction(()=>!!sourceUi.release);
   await page.locator('[data-doc-template]').selectOption(commencement.id);await page.evaluate(()=>{sourceUi.hold=false;sourceUi.release();});await page.waitForTimeout(40);
   assert.equal(await page.locator('[data-platform-source-values]').innerText(),'');
   await page.locator('[data-platform-source-kind]').selectOption('EMPLOYMENT');await page.locator('[data-platform-source-load]').click();await page.locator(`[data-platform-source-record] option[value="${employment.id}"]`).waitFor({state:'attached'});await page.locator('[data-platform-source-record]').selectOption(employment.id);await page.locator('[data-platform-source-add]').click();await page.locator('[data-platform-source-preview]').click();await page.waitForFunction(()=>document.querySelector('[data-platform-source-values]').textContent.includes('HrSourceFixture worker'));
   await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
   try{await page.locator('[data-platform-source-load]').click();await page.waitForFunction(()=>document.querySelector('[data-platform-source-values]').textContent==='');assert.equal(await page.locator('[data-platform-source-selection]').innerText(),'');}finally{await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});}
   await page.evaluate(()=>{sourceUi.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));});assert.equal(await page.locator('[data-platform-source-values]').innerText(),'');
   pass('shipped source picker reads native rows, fills identities, and clears stale and revoked private previews');
  }finally{await context.close();await browser.close();}
 }
}
