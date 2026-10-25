import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Deliberately refuses production, non-loopback services and reused databases.
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
const base = new URL(process.env.FORM_LIBRARY_E2E_BASE_URL || 'http://127.0.0.1:3114/api/v1/');
if (process.env.FORM_LIBRARY_E2E_CONFIRM !== 'ISOLATED_LOOPBACK_DATABASE' || process.env.NODE_ENV !== 'test' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/hydroland_form_library_ci' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Isolated form-library database and HTTP confirmation required.');
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('An isolated JWT signing secret is required.');
const db = new PrismaClient();
const suffix = randomUUID();
const people = [], accounts = [], organizations = [];
let checks = 0;
const pass = name => { checks++; console.log(`PASS ${checks}: ${name}`); };
const token = id => {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+1200})}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
async function actor(label) {
  const p = await db.person.create({data:{firstName:'FormLibrary',lastName:label}}); people.push(p.id);
  const a = await db.account.create({data:{personId:p.id,email:`fl-${label}-${suffix}@example.invalid`,passwordHash:'not-a-login-password',status:'ACTIVE',emailVerifiedAt:new Date()}}); accounts.push(a.id);
  return {id:a.id,token:token(a.id)};
}
async function call(who, path, method='GET', body) {
  const response = await fetch(new URL(path.replace(/^\//,''), base.href.endsWith('/') ? base : `${base.href}/`), {
    method, headers:{authorization:`Bearer ${who.token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}), signal:AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data; try { data=JSON.parse(text); } catch { data=text; }
  return {status:response.status,ok:response.ok,data,headers:response.headers};
}
async function ok(who,path,method,body) {
  const r=await call(who,path,method,body);
  assert.ok(r.ok, `${method||'GET'} ${path}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}
const field = {key:'name',labelAr:'الاسم',labelEn:'Name',type:'TEXT',required:true};
try {
  const owner=await actor('owner'), staff=await actor('staff'), approver=await actor('approver'), signer=await actor('signer'), outsider=await actor('outsider');
  const org=await db.organization.create({data:{displayName:`Form library CI ${suffix}`,kind:'DIVE_CENTER',regionCode:'ASIR',status:'ACTIVE',ownerId:owner.id}}); organizations.push(org.id);
  const other=await db.organization.create({data:{displayName:`Other form CI ${suffix}`,kind:'DIVE_CENTER',regionCode:'ASIR',status:'ACTIVE',ownerId:outsider.id}}); organizations.push(other.id);
  await db.organizationMember.createMany({data:[
    {organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'},
    {organizationId:org.id,accountId:staff.id,role:'STAFF',status:'ACTIVE'},
    {organizationId:org.id,accountId:approver.id,role:'ADMIN',status:'ACTIVE'},
    {organizationId:org.id,accountId:signer.id,role:'ADMIN',status:'ACTIVE'},
    {organizationId:other.id,accountId:outsider.id,role:'OWNER',status:'ACTIVE'}
  ]});
  const workspace=await ok(owner,'documents/workspace');
  assert.ok(workspace.some(x=>x.organization?.id===org.id));
  assert.ok(!workspace.some(x=>x.organization?.id===other.id)); pass('real workspace separates organizations');
  const code=`CI-FORM-${suffix.slice(0,8).toUpperCase()}`;
  const original=await ok(owner,'documents/templates','POST',{organizationId:org.id,code,titleAr:'النموذج الأول',titleEn:'First form',department:'HR',fields:[field],printable:true});
  assert.equal(original.version,1); pass('authorized owner creates a versioned template');
  const deniedTemplate=await call(staff,`documents/templates/${original.id}`,'PUT',{titleAr:'Unauthorized'});
  assert.equal(deniedTemplate.status,403); assert.equal(await db.documentTemplate.count({where:{organizationId:org.id,code}}),1); pass('staff cannot publish and denial creates no version');
  const document=await ok(staff,'documents','POST',{organizationId:org.id,templateId:original.id,department:'HR',contentHash:'ci-original-content',payload:{name:'Synthetic person'}});
  assert.equal(document.templateId,original.id); pass('active staff can create their organization document');
  await ok(staff,`documents/${document.id}/submit`,'POST');
  assert.equal((await call(staff,`documents/${document.id}/approve`,'POST')).status,403);
  await ok(approver,`documents/${document.id}/approve`,'POST');
  assert.equal((await call(approver,`documents/${document.id}/sign`,'POST')).status,400);
  await ok(signer,`documents/${document.id}/sign`,'POST'); pass('independent creator, approver and signer are enforced over HTTP');
  const pinnedBefore=await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:true,lifecycleEvents:true}});
  const revised=await ok(owner,`documents/templates/${original.id}`,'PUT',{titleAr:'النموذج الثاني',titleEn:'Second form',fields:[{...field,labelAr:'الاسم المحدث'}],printable:true});
  assert.equal(revised.version,2); assert.notEqual(revised.id,original.id);
  assert.equal((await db.documentTemplate.findUniqueOrThrow({where:{id:original.id}})).status,'INACTIVE'); pass('publication creates a new row and retires only the template');
  const historyResponse=await call(owner,`documents/organizations/${org.id}/templates/${code}/history`);
  assert.equal(historyResponse.status,200); assert.match(historyResponse.headers.get('cache-control')||'',/no-store/);
  assert.deepEqual(historyResponse.data.items.map(x=>x.version),[2,1]); pass('history endpoint uses real persisted revisions and private reads');
  const older=await ok(owner,`documents/organizations/${org.id}/templates/${code}/history?beforeVersion=2`);
  assert.deepEqual(older.items.map(x=>x.version),[1]); assert.equal(older.nextBeforeVersion,null); pass('history cursor does not repeat the boundary');
  const restored=await ok(owner,`documents/templates/${revised.id}`,'PUT',{titleAr:original.titleAr,titleEn:original.titleEn,fields:original.fields,printable:original.printable});
  assert.equal(restored.version,3); assert.notEqual(restored.id,original.id); pass('restoration publishes a new version rather than reactivating history');
  const pinnedAfter=await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:true,lifecycleEvents:true}});
  assert.deepEqual(pinnedAfter,pinnedBefore); pass('signed document, revisions and approval evidence stay byte-for-byte unchanged in database');
  const stale=await call(owner,`documents/templates/${original.id}`,'PUT',{titleAr:'stale'});
  assert.ok([400,409].includes(stale.status)); assert.equal(await db.documentTemplate.count({where:{organizationId:org.id,code}}),3); pass('retired template cannot be republished');
  const staleDocument=await call(staff,'documents','POST',{organizationId:org.id,templateId:original.id,department:'HR',contentHash:'stale-ci',payload:{name:'Synthetic'}});
  assert.equal(staleDocument.status,404); pass('new documents cannot use an inactive template');
  const fresh=await ok(staff,'documents','POST',{organizationId:org.id,templateId:restored.id,department:'HR',contentHash:'fresh-ci',payload:{name:'Synthetic'}});
  assert.equal(fresh.templateId,restored.id); pass('new document uses the latest restored version');
  await db.roleAssignment.create({data:{accountId:outsider.id,role:'HR_EXECUTIVE',status:'ACTIVE',scope:{organizationIds:[org.id]}}});
  const noMembership=await call(outsider,'documents','POST',{organizationId:org.id,templateId:restored.id,department:'HR',contentHash:'outside-ci',payload:{name:'Synthetic'}});
  assert.equal(noMembership.status,403);
  assert.equal((await call(outsider,`documents/organizations/${org.id}/templates/${code}/history`)).status,403); pass('HR role without organization membership does not bypass document authorization');
  await db.organizationMember.update({where:{organizationId_accountId:{organizationId:org.id,accountId:staff.id}},data:{status:'INACTIVE'}});
  assert.equal((await call(staff,`documents/${document.id}`)).status,403);
  assert.equal((await call(staff,'documents','POST',{organizationId:org.id,templateId:restored.id,department:'HR',contentHash:'revoked-ci',payload:{name:'Synthetic'}})).status,403); pass('revoked member loses read and creation access immediately');
  console.log(`${checks} HTTP/PostgreSQL form-library checks passed on isolated loopback services; no production acceptance inferred.`);
} finally {
  try {
    const docs=await db.managedDocument.findMany({where:{organizationId:{in:organizations}},select:{id:true}});
    const ids=docs.map(x=>x.id);
    await db.documentLifecycleEvent.deleteMany({where:{documentId:{in:ids}}});
    await db.documentRevision.deleteMany({where:{documentId:{in:ids}}});
    await db.managedDocument.deleteMany({where:{id:{in:ids}}});
    await db.documentTemplate.deleteMany({where:{organizationId:{in:organizations}}});
    await db.documentReferenceCounter.deleteMany({where:{organizationId:{in:organizations}}});
    await db.documentBrandSnapshot.deleteMany({where:{organizationId:{in:organizations}}});
    await db.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});
    await db.organization.deleteMany({where:{id:{in:organizations}}});
    await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});
    await db.account.deleteMany({where:{id:{in:accounts}}});
    await db.person.deleteMany({where:{id:{in:people}}});
  } finally { await db.$disconnect(); }
}
