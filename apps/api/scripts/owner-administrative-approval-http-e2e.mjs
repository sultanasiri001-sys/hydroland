import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
const base = new URL(process.env.FORM_LIBRARY_E2E_BASE_URL || 'http://127.0.0.1:3114/api/v1/');
if (process.env.NODE_ENV !== 'test' || process.env.FORM_LIBRARY_E2E_CONFIRM !== 'ISOLATED_LOOPBACK_DATABASE' || database.pathname !== '/hydroland_form_library_ci' || !['127.0.0.1','localhost','[::1]'].includes(database.hostname) || !['127.0.0.1','localhost','[::1]'].includes(base.hostname)) throw Error('Dedicated loopback database is required.');
const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw Error('Test JWT secret required.');
const db=new PrismaClient(),suffix=randomUUID(),people=[],accounts=[],orgs=[];const settingsKey='PLATFORM_STAFFING_ORGANIZATION:v1';let previous,changed=false,checks=0;
const pass=name=>{checks++;console.log(`PASS ${checks}: ${name}`);};
async function actor(label){const p=await db.person.create({data:{firstName:'OwnerApprovalFixture',lastName:label}});people.push(p.id);const a=await db.account.create({data:{personId:p.id,email:`owner-approval-${label}-${suffix}@example.invalid`,passwordHash:'synthetic-no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a.id);await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE'}});const session=await db.session.create({data:{accountId:a.id,tokenHash:`owner-approval-${label}-${suffix}`,expiresAt:new Date(Date.now()+900000)}});const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000),b=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:a.id,sid:session.id,iat:now,exp:now+900})}`;return {...a,token:`${b}.${createHmac('sha256',secret).update(b).digest('base64url')}`};}
async function call(a,path,method='GET',body){const r=await fetch(new URL(path,base),{method,headers:{...(a?{authorization:`Bearer ${a.token}`} : {}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json(),headers:r.headers};}
async function ok(a,path,method='GET',body){const r=await call(a,path,method,body);assert.ok(r.status>=200&&r.status<300,`${r.status} ${JSON.stringify(r.data)}`);return r.data;}
const path=(org,doc)=>`documents/organizations/${org.id}/documents/${doc.id}/owner-approval`;
const input=p=>({expectedVersion:p.sourceVersion,reviewHash:p.reviewHash,note:'اطلعت على محضر المتابعة الروتينية دون أي التزام مالي أو تعاقدي.',administrativeOnly:true,notIndependentApproval:true});
try{
 const owner=await actor('owner'),other=await actor('other');
 const org=await db.organization.create({data:{displayName:'جهة اصطناعية لاختبار قرارات المالك',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}});orgs.push(org.id);
 previous=await db.operationalSetting.findUnique({where:{key:settingsKey}});await db.operationalSetting.upsert({where:{key:settingsKey},create:{key:settingsKey,value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});changed=true;
 await db.organizationMember.create({data:{organizationId:org.id,accountId:other.id,role:'ADMIN',status:'ACTIVE'}});
 const fields=['meetingNo','subject','decisions'].map(key=>({key,labelAr:({meetingNo:'رقم الاجتماع',subject:'الموضوع',decisions:'بنود المتابعة'})[key],labelEn:key,type:'TEXT',required:true}));
 const template=await ok(owner,'documents/templates','POST',{organizationId:org.id,code:'ADM-MEETING-MINUTES',department:'ADMIN_AFFAIRS_RECORDS',titleAr:'محضر اجتماع متابعة روتينية',titleEn:'Routine Meeting Minutes',fields});
 const create=(payload={meetingNo:'M1',subject:'متابعة الأعمال الروتينية',decisions:'توثيق تقدم البنود دون اعتماد مالي أو تعاقدي'})=>ok(owner,'documents','POST',{organizationId:org.id,templateId:template.id,department:template.department,contentHash:randomUUID(),payload});
 const doc=await create(),endpoint=path(org,doc);
 const snapshot=()=>db.managedDocument.findUniqueOrThrow({where:{id:doc.id},include:{template:true,revisions:{orderBy:{version:'asc'}},lifecycleEvents:{orderBy:{occurredAt:'asc'}}}});
 assert.equal((await call(null,endpoint)).status,401);assert.equal((await call(other,endpoint)).status,403);pass('anonymous and another active administrator cannot inspect or record');
 const before=await snapshot(),counters=await db.documentReferenceCounter.findMany({where:{organizationId:org.id}}),p=await call(owner,endpoint);
 assert.equal(p.status,200);assert.match(p.headers.get('cache-control'),/private.*no-store/);assert.equal(p.data.eligible,true);assert.deepEqual(await snapshot(),before);pass('private preview identifies saved source without changing it');
 const blocked={...input(p.data),administrativeOnly:false};assert.equal((await call(owner,endpoint,'POST',blocked)).status,400);assert.equal((await call(owner,endpoint,'POST',{...input(p.data),actorAccountId:other.id})).status,400);pass('missing attestation and actor injection are rejected');
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await call(owner,endpoint,'POST',input(p.data))).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});pass('fresh role revocation invalidates a previously reviewed plan');
 const fresh=await ok(owner,endpoint);const recorded=await ok(owner,endpoint,'POST',input(fresh));assert.equal(recorded.receipt.status,'ADMINISTRATIVELY_APPROVED');assert.equal(recorded.receipt.actorAccountId,owner.id);assert.equal(recorded.receipt.independentReview,false);assert.equal(recorded.receipt.electronicSignature,false);assert.deepEqual(await snapshot(),before);assert.deepEqual(await db.documentReferenceCounter.findMany({where:{organizationId:org.id}}),counters);
 const audit=await db.auditEvent.findMany({where:{action:'OWNER_ADMINISTRATIVE_APPROVAL_RECORDED',resourceId:recorded.receipt.id}});assert.equal(audit.length,1);assert.equal(audit[0].actorId,owner.personId);pass('one real receipt and attributable audit, zero source lifecycle or counter mutation');
 assert.equal((await call(owner,endpoint,'POST',input(p.data))).status,409);assert.equal((await ok(owner,endpoint)).eligible,false);assert.equal(await db.auditEvent.count({where:{resourceId:recorded.receipt.id}}),1);pass('duplicate receipt cannot be rewritten or audited twice');
 const getPdf=async(a,version)=>fetch(new URL(endpoint+`/pdf?version=${version}`,base),{headers:{authorization:`Bearer ${a.token}`},signal:AbortSignal.timeout(30000)});
 const pdf=await getPdf(owner,1);assert.equal(pdf.status,200);assert.match(pdf.headers.get('cache-control'),/private.*no-store/);assert.match(pdf.headers.get('content-type'),/application\/pdf/);const bytes=Buffer.from(await pdf.arrayBuffer());assert.ok(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));assert.ok(bytes.length>100000);assert.equal((await getPdf(other,1)).status,403);assert.deepEqual(await snapshot(),before);await mkdir('/tmp/form-library-evidence',{recursive:true});await writeFile('/tmp/form-library-evidence/owner-approval-receipt.pdf',bytes);pass('actual Arabic receipt PDF is private and leaves the source unchanged');
 await ok(owner,`documents/${doc.id}/revise`,'POST',{contentHash:'second-source',payload:{meetingNo:'M1',subject:'متابعة لاحقة',decisions:'إصدار جديد لا يعدل القرار السابق'}});const next=await ok(owner,endpoint);assert.equal(next.sourceVersion,2);assert.equal(next.existing,null);assert.equal(next.receipts[0].sourceVersion,1);
 const historical=(await db.operationalSetting.findUniqueOrThrow({where:{key:`OWNER_ADMIN_APPROVAL:v1:${org.id}:${doc.id}:1`}})).value;assert.deepEqual(historical,recorded.receipt);assert.equal((await getPdf(owner,1)).status,200);assert.equal((await call(owner,endpoint,'POST',input(p.data))).status,409);pass('new source revision neither inherits nor overwrites the previous owner decision');
 const concurrent=await Promise.all([call(owner,endpoint,'POST',input(next)),call(owner,endpoint,'POST',input(next))]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);pass('concurrent identical decisions produce exactly one accepted record');
 const staleDoc=await create(),staleEndpoint=path(org,staleDoc),stale=await ok(owner,staleEndpoint);await ok(owner,`documents/${staleDoc.id}/revise`,'POST',{contentHash:'changed-source',payload:{meetingNo:'M2',subject:'تغيير بعد المعاينة',decisions:'إعادة مراجعة'}});assert.equal((await call(owner,staleEndpoint,'POST',input(stale))).status,409);pass('source edits after preview require a fresh explicit review');
 const {DOCUMENT_DEPARTMENTS}=require('../dist/document-forms/document-form.domain.js');
 const controlBefore=await db.policyControl.findMany(),rolesBefore=await db.roleAssignment.findMany(),membersBefore=await db.organizationMember.findMany();
 for(const department of DOCUMENT_DEPARTMENTS){
  const t=await ok(owner,'documents/templates','POST',{organizationId:org.id,code:`ADMIN-${department}`,department,titleAr:'نموذج إداري اصطناعي',titleEn:'Synthetic administrative form',fields});
  const d=await ok(owner,'documents','POST',{organizationId:org.id,templateId:t.id,department,contentHash:'department-source',payload:{meetingNo:'x',subject:'اعتماد إداري دون تنفيذ إجراء',decisions:'تظل الأدلة المتخصصة غير مكتملة'}});
  await ok(owner,`documents/${d.id}/submit`,'POST');const ep=path(org,d),plan=await ok(owner,ep);assert.equal(plan.eligible,true);
  const unchanged=await db.managedDocument.findUniqueOrThrow({where:{id:d.id}});const receipt=await ok(owner,ep,'POST',input(plan));assert.equal(receipt.receipt.actorAccountId,owner.id);assert.equal(receipt.receipt.status,'ADMINISTRATIVELY_APPROVED');assert.deepEqual(await db.managedDocument.findUniqueOrThrow({where:{id:d.id}}),unchanged);
 }pass('owner may administratively approve their own pinned documents in all fourteen departments, preserving independent-review state');
 assert.deepEqual(await db.policyControl.findMany(),controlBefore);assert.deepEqual(await db.roleAssignment.findMany(),rolesBefore);assert.deepEqual(await db.organizationMember.findMany(),membersBefore);pass('administrative approval executes no HR controls, IAM, membership, payment or employee action');
 const summary=await ok(owner,`documents/organizations/${org.id}/owner-approvals`);assert.equal(summary.authority,'CURRENT_PLATFORM_OWNER_ALL_DEPARTMENTS');assert.equal(summary.approvals.length,15);assert.equal(summary.approvals.some(x=>x.documentId===doc.id&&x.sourceVersion===1),false);assert.equal(summary.approvals.some(x=>x.documentId===doc.id&&x.sourceVersion===2),true);assert.equal((await call(other,`documents/organizations/${org.id}/owner-approvals`)).status,403);pass('private overview lists current-version administrative approvals only');
 const restored=await create(),restoredEp=path(org,restored),oldAuthority=await ok(owner,restoredEp);
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});assert.equal((await call(owner,restoredEp,'POST',input(oldAuthority))).status,409);pass('restoring an owner role does not resurrect an old confirmation');
 for(const code of ['CLIB-OWNER-TEST','LEG-DIVE-COOPERATION-V1']){
  const t=await db.documentTemplate.create({data:{organizationId:org.id,code,department:'LEGAL_CONTRACTS_INSURANCE',titleAr:'عقد اصطناعي',titleEn:'Synthetic contract',fields}});
  const d=await db.managedDocument.create({data:{organizationId:org.id,templateId:t.id,referenceNumber:randomUUID(),department:t.department,contentHash:'specialized',payload:{meetingNo:'x',subject:'x',decisions:'x'},createdByAccountId:owner.id}});
  const p=await ok(owner,path(org,d));assert.equal(p.eligible,false);assert.equal((await call(owner,path(org,d),'POST',input(oldAuthority))).status,400);
 }pass('specialized party contracts and contract-library templates retain their own workflows');
 const independent=await create();await ok(owner,`documents/${independent.id}/submit`,'POST');assert.equal((await call(owner,`documents/${independent.id}/approve`,'POST')).status,400);assert.equal((await call(other,`documents/${independent.id}/approve`,'POST')).status,403);pass('generic independent approval and owner-only access remain enforced');
 const center=await db.organization.create({data:{displayName:'Synthetic other tenant',kind:'DIVE_CENTER',status:'ACTIVE',ownerId:other.id}});orgs.push(center.id);await db.organizationMember.create({data:{organizationId:center.id,accountId:other.id,role:'OWNER',status:'ACTIVE'}});assert.equal((await call(other,path(center,doc))).status,403);assert.equal((await call(owner,path(org,{id:randomUUID()}))).status,404);pass('other-tenant owner and unknown documents do not receive private records');
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'SUSPENDED'}});assert.equal((await call(owner,endpoint)).status,403);assert.equal((await getPdf(owner,1)).status,403);await db.organizationMember.delete({where:{organizationId_accountId:{organizationId:org.id,accountId:owner.id}}});pass('explicit membership suspension also blocks saved receipt reads and PDF');
 if(process.env.OWNER_APPROVAL_HTTP_BROWSER==='1'){
  const {chromium}=require('@playwright/test'),{readFileSync}=require('node:fs');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   const d=await create(),ep=path(org,d),page=await context.newPage();page.setDefaultTimeout(10000);
   await page.setContent(`<section id="hl-documents"><select data-doc-org><option value="${org.id}">Synthetic internal platform</option></select></section>`);
   await page.exposeFunction('isolatedRequest',async(path,init={})=>{const r=await fetch(new URL(path.replace(/^\//,''),base),{...init,headers:{...init.headers,authorization:`Bearer ${owner.token}`}});return {status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer()).toString('base64')};});
   await page.evaluate(()=>{window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>1,authorizedFetch:async(path,init)=>{const r=await window.isolatedRequest(path,init);return new Response(Uint8Array.from(atob(r.body),c=>c.charCodeAt(0)),{status:r.status,headers:r.headers});}};});
   await page.addScriptTag({content:readFileSync(new URL('../../web/src/hydroland-owner-approval.js',import.meta.url),'utf8')});
   await page.evaluate(({org,id})=>HydrolandOwnerApproval.open({organizationId:org,documentId:id}),{org:org.id,id:d.id});
   await page.waitForFunction(()=>document.querySelector('[data-hoa-status]').textContent.includes('راجع النسخة'));
   assert.equal(await page.locator('[data-hoa-record]').isDisabled(),true);assert.equal((await ok(owner,ep)).existing,null);
   await page.locator('[data-hoa-note]').fill('اعتماد إداري اصطناعي من المتصفح الحقيقي لهذه النسخة');await page.locator('[data-hoa-admin]').check();await page.locator('[data-hoa-limits]').check();await page.locator('[data-hoa-record]').click();
   await page.waitForFunction(()=>document.querySelector('[data-hoa-existing]').textContent.includes('اعتماد المالك مسجل'));
   assert.equal((await ok(owner,ep)).existing.status,'ADMINISTRATIVELY_APPROVED');assert.equal(await page.locator('#hl-owner-approval').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
   await page.screenshot({path:'/tmp/form-library-evidence/owner-approval-mobile.png',fullPage:true});pass('shipped mobile dialog reads and administratively approves via actual isolated HTTP/PostgreSQL only after separate confirmation');
   const saved=(await ok(owner,ep)).existing;
   await page.locator('[data-hoa-revision-note]').fill('تعديل اصطناعي لاحق مع حفظ اعتماد الإصدار السابق');await page.locator('[data-hoa-revision-confirm]').check();await page.locator('[data-hoa-reopen]').click();await page.waitForFunction(()=>!document.querySelector('#hl-owner-approval').open);
   const edited=await ok(owner,ep);assert.equal(edited.sourceVersion,2);assert.equal(edited.existing,null);assert.equal(edited.source.status,'DRAFT');assert.equal(edited.receipts[0].sourceVersion,1);
   const old=(await db.operationalSetting.findUniqueOrThrow({where:{key:`OWNER_ADMIN_APPROVAL:v1:${org.id}:${d.id}:1`}})).value;assert.deepEqual(old,saved);
   assert.equal((await call(owner,ep+'/reopen','POST',{expectedVersion:1,receiptHash:saved.receiptHash,note:'لا تكرر إنشاء النسخة',confirmed:true})).status,409);
   pass('actual browser opens an editable new version, preserves the prior receipt and prevents stale duplicate reopen');
  }finally{await context.close();await browser.close();}
 }
 const noPrintTemplate=await ok(owner,`documents/templates/${template.id}`,'PUT',{printable:false});
 const noPrintDoc=await ok(owner,'documents','POST',{organizationId:org.id,templateId:noPrintTemplate.id,department:template.department,contentHash:'synthetic-nonprintable',payload:{meetingNo:'NP1',subject:'متابعة دون طباعة',decisions:'توثيق فقط'}}),noPrintEndpoint=path(org,noPrintDoc);
 const noPrintPlan=await ok(owner,noPrintEndpoint);await ok(owner,noPrintEndpoint,'POST',input(noPrintPlan));
 const deniedPdf=await fetch(new URL(noPrintEndpoint+'/pdf?version=1',base),{headers:{authorization:`Bearer ${owner.token}`},signal:AbortSignal.timeout(30000)});assert.equal(deniedPdf.status,400);
 assert.equal((await db.managedDocument.findUniqueOrThrow({where:{id:noPrintDoc.id}})).status,'DRAFT');
 assert.equal((await getPdf(owner,1)).status,200);pass('receipt cannot bypass pinned non-printable source; historical printable receipt remains readable');
 console.log(`${checks} real HTTP/PostgreSQL owner-approval groups passed in an isolated loopback database.`);
}finally{
 try{
  if(changed){if(previous)await db.operationalSetting.update({where:{key:settingsKey},data:{value:previous.value,updatedAt:previous.updatedAt}});else await db.operationalSetting.delete({where:{key:settingsKey}});}
  for(const org of orgs)await db.operationalSetting.deleteMany({where:{key:{startsWith:`OWNER_ADMIN_APPROVAL:v1:${org}:`}}});
  await db.auditEvent.deleteMany({where:{actorId:{in:people}}});
  const ids=(await db.managedDocument.findMany({where:{organizationId:{in:orgs}},select:{id:true}})).map(d=>d.id);
  await db.documentLifecycleEvent.deleteMany({where:{documentId:{in:ids}}});await db.documentRevision.deleteMany({where:{documentId:{in:ids}}});await db.managedDocument.deleteMany({where:{id:{in:ids}}});await db.documentTemplate.deleteMany({where:{organizationId:{in:orgs}}});await db.documentReferenceCounter.deleteMany({where:{organizationId:{in:orgs}}});await db.documentBrandSnapshot.deleteMany({where:{organizationId:{in:orgs}}});await db.organizationMember.deleteMany({where:{organizationId:{in:orgs}}});await db.organization.deleteMany({where:{id:{in:orgs}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});
 }finally{await db.$disconnect();}
}
