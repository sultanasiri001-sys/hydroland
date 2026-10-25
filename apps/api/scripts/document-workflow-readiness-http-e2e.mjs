import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid'),base=new URL(process.env.FORM_LIBRARY_E2E_BASE_URL||'http://127.0.0.1:3114/api/v1/');
if(process.env.FORM_LIBRARY_E2E_CONFIRM!=='ISOLATED_LOOPBACK_DATABASE'||process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1','[::1]'].includes(database.hostname)||database.pathname!=='/hydroland_form_library_ci'||!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Isolated loopback form-library database required.');
const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw Error('Isolated test JWT secret required.');
const db=new PrismaClient(),suffix=randomUUID(),people=[],accounts=[],organizations=[];
const key='PLATFORM_STAFFING_ORGANIZATION:v1';let previous,changed=false,checks=0;
const pass=name=>{checks++;console.log(`PASS ${checks}: ${name}`);};
async function actor(label){const p=await db.person.create({data:{firstName:'ReadinessFixture',lastName:label}});people.push(p.id);const a=await db.account.create({data:{personId:p.id,email:`readiness-${label}-${suffix}@example.invalid`,passwordHash:'synthetic-no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a.id);const session=await db.session.create({data:{accountId:a.id,tokenHash:`readiness-${label}-${suffix}`,expiresAt:new Date(Date.now()+900000)}});const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000),b=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:a.id,sid:session.id,iat:now,exp:now+900})}`;return {...a,token:`${b}.${createHmac('sha256',secret).update(b).digest('base64url')}`};}
async function call(a,path,method='GET',body){const r=await fetch(new URL(path,base),{method,headers:{...(a?{authorization:`Bearer ${a.token}`} : {}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json(),headers:r.headers};}

async function ok(a,path,method='GET',body){const r=await call(a,path,method,body);assert.ok(r.status>=200&&r.status<300,`${r.status} ${JSON.stringify(r.data)}`);return r.data;}
const field={key:'note',labelAr:'ملاحظة',labelEn:'Note',type:'TEXT',required:true};
const endpoint=(org,doc)=>`documents/organizations/${org.id}/documents/${doc.id}/workflow-readiness`;
try{
 const owner=await actor('owner'),reviewer=await actor('reviewer'),signer=await actor('signer');
 for(const a of [owner,reviewer,signer])await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE'}});
 const org=await db.organization.create({data:{displayName:'Synthetic private workflow',kind:'HYDROLAND_INTERNAL_PLATFORM',ownerId:owner.id,status:'ACTIVE'}});organizations.push(org.id);
 previous=await db.operationalSetting.findUnique({where:{key}});await db.operationalSetting.upsert({where:{key},create:{key,value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});changed=true;
 await db.organizationMember.create({data:{organizationId:org.id,accountId:reviewer.id,role:'ADMIN',status:'ACTIVE'}});
 const template=await ok(owner,'documents/templates','POST',{organizationId:org.id,code:'CI-WORKFLOW',titleAr:'اختبار مسار داخلي',titleEn:'Internal workflow fixture',department:'HR',fields:[field]});
 const doc=await ok(owner,'documents','POST',{organizationId:org.id,templateId:template.id,department:'HR',contentHash:'synthetic-readiness',payload:{note:'Synthetic, not a real approval'}});
 const inspect=()=>call(owner,endpoint(org,doc));
 assert.equal((await call(null,endpoint(org,doc))).status,401);
 assert.equal((await call(reviewer,endpoint(org,doc))).status,403);pass('diagnostics retain anonymous and non-owner ADMIN denial');
 const snapshot=()=>db.managedDocument.findUniqueOrThrow({where:{id:doc.id},include:{revisions:{orderBy:{version:'asc'}},lifecycleEvents:{orderBy:{occurredAt:'asc'}}}});
 const before=await snapshot(),beforeCounter=await db.documentReferenceCounter.findMany({where:{organizationId:org.id}});
 const r=await inspect();assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/private.*no-store/);assert.equal(r.data.assessment,'BLOCKED');assert.equal(r.data.scope,'INTERNAL_OWNER_ONLY');assert.equal(r.data.observationOnly,true);assert.equal(r.data.policyDecisionRequired,true);assert.equal(r.data.actorActions.approve,false);assert.equal('createdByAccountId' in r.data,false);assert.equal('payload' in r.data,false);assert.deepEqual(await snapshot(),before);assert.deepEqual(await db.documentReferenceCounter.findMany({where:{organizationId:org.id}}),beforeCounter);pass('owner gets a private truthful read-only combined-policy diagnosis');
 await ok(owner,`documents/${doc.id}/submit`,'POST');
 const pending=await snapshot();assert.equal((await inspect()).data.status,'PENDING_APPROVAL');
 assert.equal((await call(owner,`documents/${doc.id}/approve`,'POST')).status,400);
 assert.equal((await call(reviewer,`documents/${doc.id}/approve`,'POST')).status,403);assert.deepEqual(await snapshot(),pending);pass('both real approval refusals remain enforced and pending record is unchanged');
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await inspect()).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});pass('role revocation is rechecked on each diagnostic read');
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'SUSPENDED'}});assert.equal((await inspect()).status,403);await db.organizationMember.delete({where:{organizationId_accountId:{organizationId:org.id,accountId:owner.id}}});pass('suspended explicit membership denies the internal owner');
 assert.equal((await call(owner,endpoint(org,{id:randomUUID()}))).status,404);pass('unknown document ID does not yield readiness');
 const contract=await db.documentTemplate.create({data:{organizationId:org.id,code:'CLIB-HR-PERMANENT',titleAr:'عقد اختبار',titleEn:'Synthetic contract',department:'LEGAL_CONTRACTS_INSURANCE',fields:[]}});
 const contractDoc=await db.managedDocument.create({data:{organizationId:org.id,templateId:contract.id,referenceNumber:`CONTRACT-${suffix}`,department:'LEGAL_CONTRACTS_INSURANCE',contentHash:'synthetic',payload:{},createdByAccountId:owner.id}});
 assert.equal((await call(owner,endpoint(org,contractDoc))).status,403);pass('specialized contracts stay outside the generic diagnostic');
 const center=await db.organization.create({data:{displayName:'Synthetic center independent cycle',kind:'DIVE_CENTER',ownerId:signer.id,status:'ACTIVE'}});organizations.push(center.id);
 for(const [a,role] of [[owner,'STAFF'],[reviewer,'ADMIN'],[signer,'OWNER']])await db.organizationMember.create({data:{organizationId:center.id,accountId:a.id,role,status:'ACTIVE'}});
 const ct=await ok(signer,'documents/templates','POST',{organizationId:center.id,code:'CI-CENTER-FLOW',titleAr:'اختبار مسار مركز',titleEn:'Center workflow fixture',department:'HR',fields:[field]});
 const cd=await ok(owner,'documents','POST',{organizationId:center.id,templateId:ct.id,department:'HR',contentHash:'synthetic-center',payload:{note:'Synthetic independent actors'}});
 assert.equal((await call(owner,endpoint(org,cd))).status,404);pass('a known document in a different organization cannot leak through the scoped route');
 await ok(owner,`documents/${cd.id}/submit`,'POST');
 const centerReview=await ok(reviewer,endpoint(center,cd));assert.equal(centerReview.scope,'ORGANIZATION_MEMBERSHIP');assert.equal(centerReview.actorActions.approve,true);assert.equal(centerReview.policyDecisionRequired,false);assert.equal(centerReview.assessment,'ACTOR_CHECK_ONLY');
 await ok(reviewer,`documents/${cd.id}/approve`,'POST');
 assert.equal((await ok(reviewer,endpoint(center,cd))).actorActions.sign,false);
 assert.equal((await ok(signer,endpoint(center,cd))).actorActions.sign,true);await ok(signer,`documents/${cd.id}/sign`,'POST');pass('existing center independent creator-reviewer-signer lifecycle remains functional');
 const signed=await db.managedDocument.findUniqueOrThrow({where:{id:cd.id},include:{lifecycleEvents:true,revisions:true}});
 for(let i=0;i<3;i++)assert.equal((await ok(signer,endpoint(center,cd))).assessment,'SIGNED_ARCHIVE_REMAINS');
 assert.deepEqual(await db.managedDocument.findUniqueOrThrow({where:{id:cd.id},include:{lifecycleEvents:true,revisions:true}}),signed);pass('repeated diagnostics do not modify signed documents or evidence');
 console.log(`${checks} real HTTP/PostgreSQL readiness groups passed. The internal workflow blocker is intentionally not bypassed.`);
}finally{
 try{
  if(changed){if(previous)await db.operationalSetting.update({where:{key},data:{value:previous.value,updatedAt:previous.updatedAt}});else await db.operationalSetting.delete({where:{key}});}
  const docs=await db.managedDocument.findMany({where:{organizationId:{in:organizations}},select:{id:true}}),ids=docs.map(d=>d.id);
  await db.documentLifecycleEvent.deleteMany({where:{documentId:{in:ids}}});await db.documentRevision.deleteMany({where:{documentId:{in:ids}}});
  await db.managedDocument.deleteMany({where:{id:{in:ids}}});await db.documentTemplate.deleteMany({where:{organizationId:{in:organizations}}});
  await db.documentReferenceCounter.deleteMany({where:{organizationId:{in:organizations}}});await db.documentBrandSnapshot.deleteMany({where:{organizationId:{in:organizations}}});
  await db.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});await db.organization.deleteMany({where:{id:{in:organizations}}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.session.deleteMany({where:{accountId:{in:accounts}}});
  await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});
 }finally{await db.$disconnect();}
}
