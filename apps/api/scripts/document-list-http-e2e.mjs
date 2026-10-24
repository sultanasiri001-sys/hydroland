import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';

const db=new PrismaClient();
const base=process.env.DOCUMENT_LIST_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const sessions=new Map();
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,sid:sessions.get(id),iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const auth=t=>({authorization:`Bearer ${t}`});
const people=[],accounts=[],extraTemplates=[],extraDocuments=[];let org,other,template,document,previousSetting,settingChanged=false;
const staffingKey='PLATFORM_STAFFING_ORGANIZATION:v1';
const mk=async label=>{const p=await db.person.create({data:{firstName:'DocumentList',lastName:label}});people.push(p);const a=await db.account.create({data:{personId:p.id,email:`doc-list-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a);const session=await db.session.create({data:{accountId:a.id,tokenHash:'document-inventory-fixture-'+suffix+'-'+label,expiresAt:new Date(Date.now()+900000)}});sessions.set(a.id,session.id);return a};
try{
  const owner=await mk('Owner'),viewer=await mk('Viewer'),outsider=await mk('Outsider');
  org=await db.organization.create({data:{displayName:'Document List E2E '+suffix,kind:'DIVE_CENTER',ownerId:owner.id,status:'ACTIVE'}});
  other=await db.organization.create({data:{displayName:'Other Document List E2E '+suffix,kind:'DIVE_CENTER',ownerId:outsider.id,status:'ACTIVE'}});
  await db.organizationMember.createMany({data:[{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'},{organizationId:org.id,accountId:viewer.id,role:'VIEWER',status:'ACTIVE'},{organizationId:other.id,accountId:outsider.id,role:'OWNER',status:'ACTIVE'}]});
  template=await db.documentTemplate.create({data:{organizationId:org.id,code:'LIST-'+suffix,titleAr:'نموذج قائمة',titleEn:'List Template',department:'OPERATIONS',fields:[{key:'summary',labelAr:'الملخص',labelEn:'Summary',type:'TEXT',required:true}]}});
  document=await db.managedDocument.create({data:{organizationId:org.id,templateId:template.id,referenceNumber:'HYD-OPERATIONS-2026-999999',department:'OPERATIONS',contentHash:'sha256:list-'+suffix,payload:{summary:'list-e2e'},createdByAccountId:owner.id}});

  let r=await fetch(`${base}/documents/organizations/${org.id}/list`);if(r.status!==401)throw new Error('Anonymous document list expected 401, got '+r.status);
  r=await fetch(`${base}/documents/organizations/${org.id}/list`,{headers:auth(tokenFor(viewer.id))});if(!r.ok)throw new Error('VIEWER document list failed '+r.status+' '+await r.text());const rows=await r.json();
  if(rows.length!==1||rows[0].id!==document.id||rows[0].template?.id!==template.id||rows[0].payload?.summary!=='list-e2e')throw new Error('Organization document list payload mismatch');
  r=await fetch(`${base}/documents/organizations/${org.id}/list`,{headers:auth(tokenFor(outsider.id))});if(r.status!==403)throw new Error('Cross-organization document list expected 403, got '+r.status);
  console.log('Organization Document List HTTP/DB E2E passed: auth guard, viewer read, template payload, cross-organization denial.');

  const url=`${base}/documents/organizations/${org.id}/inventory`;
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers:auth(tokenFor(outsider.id))})).status,403);
  const read=async()=>{const response=await fetch(url,{headers:auth(tokenFor(viewer.id))});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);return response.json();};
  let inventory=await read();assert.equal(inventory.baselineTemplateCount,0,'Center must not inherit internal department obligations');
  assert.equal(inventory.departments.find(d=>d.code==='OPERATIONS').summary.total,1);
  assert.equal(inventory.departments.find(d=>d.code==='HR').items.length,0);

  // These are synthetic fixtures in the ephemeral CI database. Restore the
  // previous staffing pointer exactly; never populate real platform documents.
  const host=new URL(process.env.DATABASE_URL).hostname;
  if(!['localhost','127.0.0.1','[::1]'].includes(host))throw new Error('Inventory fixtures require a loopback-only test database.');
  previousSetting=await db.operationalSetting.findUnique({where:{key:staffingKey}});
  await db.organization.update({where:{id:org.id},data:{kind:'HYDROLAND_INTERNAL_PLATFORM'}});
  await db.operationalSetting.upsert({where:{key:staffingKey},create:{key:staffingKey,value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});settingChanged=true;
  inventory=await read();assert.equal(inventory.baselineTemplateCount,42);
  for(const d of inventory.departments.filter(d=>d.code!=='OPERATIONS')){assert.equal(d.items.length,3);assert.equal(d.summary.noRecord,3);assert.equal(d.summary.notConfigured,3);}
  const source=inventory.departments.find(d=>d.code==='HR').items.find(t=>t.code==='HR-EMPLOYEE-REPORT');
  assert.equal(source.setup,null,'Viewer must not receive setup payload');
  const ownerRead=await fetch(url,{headers:auth(tokenFor(owner.id))});assert.equal(ownerRead.status,200);
  const ownerInventory=await ownerRead.json(),setup=ownerInventory.departments.find(d=>d.code==='TRAINING').items.find(t=>t.code==='TRN-COURSE-REPORT').setup;
  assert.equal(setup.organizationId,org.id);assert.equal(setup.department,'TRAINING');
  const setupResponse=await fetch(`${base}/documents/templates`,{method:'POST',headers:{...auth(tokenFor(owner.id)),'content-type':'application/json'},body:JSON.stringify(setup)});assert.equal(setupResponse.status,201);extraTemplates.push(await setupResponse.json());
  assert.equal((await fetch(`${base}/documents/templates`,{method:'POST',headers:{...auth(tokenFor(viewer.id)),'content-type':'application/json'},body:JSON.stringify(setup)})).status,403);
  const afterSetup=(await read()).departments.find(d=>d.code==='TRAINING').items.find(t=>t.code===setup.code);assert.equal(afterSetup.templateStatus,'READY');assert.equal(afterSetup.recordStatus,'NO_RECORD','Template setup must not fabricate a completed document');
  const makeTemplate=async(code,department,version,status='ACTIVE',organizationId=org.id)=>{const t=await db.documentTemplate.create({data:{organizationId,code,department,version,status,titleAr:'اختبار حصر '+code,titleEn:'Inventory Fixture',fields:[]}});extraTemplates.push(t);return t;};
  const makeDocument=async(t,status,department=t.department)=>{const d=await db.managedDocument.create({data:{organizationId:t.organizationId,templateId:t.id,department,status,referenceNumber:'INV-E2E-'+suffix+'-'+extraDocuments.length,contentHash:'synthetic',payload:{privateEmployeeData:'DO-NOT-DISCLOSE'},createdByAccountId:owner.id}});extraDocuments.push(d);return d;};
  const old=await makeTemplate('HR-EMPLOYEE-REPORT','HR',1,'INACTIVE');await makeDocument(old,'DRAFT');
  const fresh=await makeTemplate('HR-EMPLOYEE-REPORT','HR',2);await makeDocument(fresh,'PENDING_APPROVAL');
  const leave=await makeTemplate('HR-LEAVE-REQUEST','HR',1);await makeDocument(leave,'ARCHIVED');
  await makeTemplate('HR-PERFORMANCE-REVIEW','HR',1);await makeTemplate('HR-PERFORMANCE-REVIEW','HR',2);
  const privateContract=await makeTemplate('CLIB-PRIVATE-'+suffix,'LEGAL_CONTRACTS_INSURANCE',1);await makeDocument(privateContract,'APPROVED');
  const outside=await makeTemplate('HR-EMPLOYEE-REPORT','HR',1,'ACTIVE',other.id);await makeDocument(outside,'SIGNED');
  const mismatch=await makeTemplate('INV-MISMATCH-'+suffix,'FINANCE',1);await makeDocument(mismatch,'DRAFT','HR');
  await makeTemplate('FIN-RECEIPT-VOUCHER','HR',1);
  inventory=await read();const hr=inventory.departments.find(d=>d.code==='HR');
  const employee=hr.items.find(t=>t.code==='HR-EMPLOYEE-REPORT');assert.equal(employee.activeTemplateId,fresh.id);assert.equal(employee.total,2);assert.equal(employee.counts.DRAFT,1);assert.equal(employee.counts.PENDING_APPROVAL,1);assert.equal(employee.counts.SIGNED,0);
  assert.equal(hr.items.find(t=>t.code==='HR-LEAVE-REQUEST').recordStatus,'ARCHIVE_ONLY');
  const conflict=hr.items.find(t=>t.code==='HR-PERFORMANCE-REVIEW');assert.equal(conflict.templateStatus,'ACTIVE_VERSION_CONFLICT');assert.equal(conflict.activeTemplateId,null);assert.equal(conflict.setup,null);
  for(const code of ['HR','FINANCE'])assert.equal(inventory.departments.find(d=>d.code===code).items.find(t=>t.code==='FIN-RECEIPT-VOUCHER').templateStatus,'DEPARTMENT_CONFLICT');
  assert.equal(inventory.inconsistentRecordCount,1);assert.equal(inventory.completeDocumentInventoryVerified,false);assert.equal(inventory.specializedContractsIncluded,false);
  assert.doesNotMatch(JSON.stringify(inventory),/DO-NOT-DISCLOSE|CLIB-PRIVATE|createdByAccountId|contentHash/);
  const before=await db.managedDocument.count({where:{organizationId:org.id}});await read();assert.equal(await db.managedDocument.count({where:{organizationId:org.id}}),before,'Inventory read must not create or approve documents');
  await db.organizationMember.update({where:{organizationId_accountId:{organizationId:org.id,accountId:viewer.id}},data:{status:'SUSPENDED'}});
  assert.equal((await fetch(url,{headers:auth(tokenFor(viewer.id))})).status,403,'Fresh membership revocation must take effect');
  console.log('Department inventory HTTP/PostgreSQL passed: 14 departments/42 source types, scoped all-version counts, archive-only/missing/conflict states, no contract or payload disclosure, read-only behavior and fresh revocation.');
} finally {
  if(settingChanged){if(previousSetting)await db.operationalSetting.update({where:{key:staffingKey},data:{value:previousSetting.value,updatedAt:previousSetting.updatedAt}});else await db.operationalSetting.delete({where:{key:staffingKey}});}
  for(const d of extraDocuments.reverse())await db.managedDocument.delete({where:{id:d.id}});
  for(const t of extraTemplates.reverse())await db.documentTemplate.delete({where:{id:t.id}});
  if(document)await db.managedDocument.delete({where:{id:document.id}}).catch(()=>{});
  if(template)await db.documentTemplate.delete({where:{id:template.id}}).catch(()=>{});
  for(const organization of [org,other].filter(Boolean)){await db.organizationMember.deleteMany({where:{organizationId:organization.id}}).catch(()=>{});await db.organization.delete({where:{id:organization.id}}).catch(()=>{})}
  for(const account of accounts.reverse()){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{})}
  for(const person of people.reverse())await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
