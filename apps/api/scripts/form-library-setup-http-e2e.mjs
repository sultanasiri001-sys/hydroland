import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
const require=createRequire(import.meta.url);
const {buildDepartmentTemplateCatalog}=require('../dist/document-forms/document-template-catalog');
const {buildOperationalDocumentCatalog}=require('../dist/document-forms/operational-document-catalog');
const {buildHrDocumentCatalog}=require('../dist/document-forms/hr-document-catalog');
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid'),base=new URL(process.env.FORM_LIBRARY_E2E_BASE_URL||'http://127.0.0.1:3114/api/v1/');
if(process.env.FORM_LIBRARY_E2E_CONFIRM!=='ISOLATED_LOOPBACK_DATABASE'||process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1','[::1]'].includes(database.hostname)||database.pathname!=='/hydroland_form_library_ci'||!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Isolated loopback form-library database required.');
const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw Error('Isolated test JWT secret required.');
const db=new PrismaClient(),suffix=randomUUID(),people=[],accounts=[],organizations=[];
const key='PLATFORM_STAFFING_ORGANIZATION:v1';let previous,changed=false,checks=0;
const pass=name=>{checks++;console.log(`PASS ${checks}: ${name}`);};
async function actor(label){const p=await db.person.create({data:{firstName:'SetupFixture',lastName:label}});people.push(p.id);const a=await db.account.create({data:{personId:p.id,email:`setup-${label}-${suffix}@example.invalid`,passwordHash:'synthetic-no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a.id);const session=await db.session.create({data:{accountId:a.id,tokenHash:`setup-${label}-${suffix}`,expiresAt:new Date(Date.now()+900000)}});const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000),b=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:a.id,sid:session.id,iat:now,exp:now+900})}`;return {...a,token:`${b}.${createHmac('sha256',secret).update(b).digest('base64url')}`};}
async function call(a,path,method='GET',body){const r=await fetch(new URL(path,base),{method,headers:{...(a?{authorization:`Bearer ${a.token}`} : {}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json(),headers:r.headers};}
try{
 const owner=await actor('owner'),outsider=await actor('outsider');
 for(const a of [owner,outsider])await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE'}});
 const org=await db.organization.create({data:{displayName:'Synthetic internal setup',kind:'HYDROLAND_INTERNAL_PLATFORM',ownerId:owner.id,status:'ACTIVE'}});organizations.push(org.id);
 const other=await db.organization.create({data:{displayName:'Synthetic independent center',kind:'DIVE_CENTER',ownerId:owner.id,status:'ACTIVE'}});organizations.push(other.id);
 await db.organizationMember.create({data:{organizationId:other.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 previous=await db.operationalSetting.findUnique({where:{key}});await db.operationalSetting.upsert({where:{key},create:{key,value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});changed=true;
 const path=`documents/organizations/${org.id}/template-setup`,plan=async(department='ALL')=>{const r=await call(owner,`${path}?department=${department}`);assert.equal(r.status,200,JSON.stringify(r.data));assert.match(r.headers.get('cache-control'),/no-store/);return r.data;},apply=p=>call(owner,path,'POST',{department:p.department,expectedPlanHash:p.planHash,confirmed:true});
 assert.equal((await call(null,path)).status,401);assert.equal((await call(outsider,path)).status,403);assert.equal((await call(owner,`documents/organizations/${other.id}/template-setup`)).status,403);pass('anonymous, non-owner ADMIN and external-center owner are denied');
 const initial=await plan();assert.equal(initial.summary.source,60);assert.equal(initial.summary.missing,60);assert.equal(new Set(initial.items.map(x=>x.department)).size,14);assert.equal(await db.documentTemplate.count({where:{organizationId:org.id}}),0);assert.equal(await db.auditEvent.count({where:{resourceId:org.id}}),0);pass('60 source definitions in 14 departments; preview has no writes');
 const sources=[...buildDepartmentTemplateCatalog(org.id),...buildOperationalDocumentCatalog(org.id),...buildHrDocumentCatalog(org.id)];
 const data=sources.filter(t=>t.department==='HR'||t.code==='LEG-LEGAL-REPORT').map(t=>({organizationId:org.id,code:t.code,department:t.department,titleAr:t.titleAr,titleEn:t.titleEn,version:1,status:'ACTIVE',fields:t.fields,printable:t.printable}));
 await db.documentTemplate.createMany({data});
 for(const code of ['CLIB-HR-PERMANENT','CLIB-HR-TEMPORARY','CLIB-HR-FLEXIBLE','CLIB-DIVE-COOPERATION'])await db.documentTemplate.create({data:{organizationId:org.id,code,department:'LEGAL_CONTRACTS_INSURANCE',titleAr:'عقد اصطناعي',titleEn:'Synthetic contract',version:2,status:'ACTIVE',fields:[]}});
 const retained=await db.documentTemplate.findMany({where:{organizationId:org.id},orderBy:{id:'asc'}}),retainedIds=retained.map(t=>t.id);
 const template=retained.find(t=>t.code==='HR-EMPLOYEE-REPORT');
 const record=await db.managedDocument.create({data:{organizationId:org.id,templateId:template.id,referenceNumber:`SYNTHETIC-${suffix}`,department:'HR',status:'SIGNED',contentHash:'synthetic-only',payload:{note:'Synthetic preservation fixture, not real approval'},createdByAccountId:owner.id}});
 const p=await plan();assert.equal(p.summary.ready,22);assert.equal(p.summary.missing,38);assert.equal((await plan('MARINE_OPERATIONS')).summary.missing,3);pass('existing HR 21 plus legal report yield 38 missing; contracts are excluded');
 assert.equal((await apply(initial)).status,409);for(const extra of [{confirmed:false},{fields:[]},{department:'INVALID'}])assert.equal((await call(owner,path,'POST',{department:'ALL',expectedPlanHash:p.planHash,confirmed:true,...extra})).status,400);pass('stale plan, absent consent and injected fields are refused');
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await apply(p)).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});pass('revoked authority after preview prevents setup');
 const concurrent=await Promise.all([apply(p),apply(p)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);const success=concurrent.find(r=>r.status===201).data;assert.equal(success.created,38);assert.equal(success.createdCodes.length,38);pass('concurrent setup has one atomic success and one stale-plan conflict');
 assert.equal(await db.documentTemplate.count({where:{organizationId:org.id}}),64);assert.deepEqual(await db.documentTemplate.findMany({where:{id:{in:retainedIds}},orderBy:{id:'asc'}}),retained);assert.deepEqual(await db.managedDocument.findUnique({where:{id:record.id}}),record);assert.equal(await db.documentRevision.count({where:{documentId:record.id}}),0);assert.equal(await db.documentLifecycleEvent.count({where:{documentId:record.id}}),0);assert.equal(await db.documentReferenceCounter.count({where:{organizationId:org.id}}),0);pass('all existing template versions, specialized contracts and synthetic signed record remain unchanged');
 const audit=await db.auditEvent.findMany({where:{resourceId:org.id,action:'DOCUMENT_TEMPLATE_BASELINE_SETUP'}});assert.equal(audit.length,1);assert.equal(audit[0].actorId,owner.personId);assert.deepEqual([...audit[0].metadata.createdCodes].sort(),[...success.createdCodes].sort());pass('one real setup audit with actual actor and created code list');
 const completed=await plan(),repeat=await apply(completed);assert.equal(completed.summary.missing,0);assert.equal(repeat.status,201);assert.equal(repeat.data.created,0);assert.equal(await db.auditEvent.count({where:{resourceId:org.id}}),1);pass('repeated fresh confirmation creates no duplicates or fake change audit');
 await db.documentTemplate.update({where:{id:template.id},data:{status:'INACTIVE'}});const inactive=await plan();assert.equal(inactive.summary.inactive,1);assert.equal((await apply(inactive)).data.created,0);assert.equal((await db.documentTemplate.findUnique({where:{id:template.id}})).status,'INACTIVE');pass('inactive historical definition is never reactivated');
 await db.documentTemplate.update({where:{id:template.id},data:{department:'FINANCE'}});const conflict=await plan();assert.equal(conflict.summary.conflicts,1);assert.equal((await apply(conflict)).status,409);assert.equal(await db.documentTemplate.count({where:{organizationId:org.id}}),64);pass('cross-department code conflict blocks the batch');
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'SUSPENDED'}});assert.equal((await call(owner,path)).status,403);pass('explicit suspended internal membership remains authoritative');
 console.log(`${checks} real HTTP/PostgreSQL setup groups passed; loopback CI only, no production mutation.`);
}finally{
 if(changed){if(previous)await db.operationalSetting.update({where:{key},data:{value:previous.value,updatedAt:previous.updatedAt}});else await db.operationalSetting.delete({where:{key}});}
 await db.auditEvent.deleteMany({where:{actorId:{in:people}}});
 await db.managedDocument.deleteMany({where:{organizationId:{in:organizations}}});
 await db.documentTemplate.deleteMany({where:{organizationId:{in:organizations}}});
 await db.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});
 await db.organization.deleteMany({where:{id:{in:organizations}}});
 await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});
 await db.session.deleteMany({where:{accountId:{in:accounts}}});
 await db.account.deleteMany({where:{id:{in:accounts}}});
 await db.person.deleteMany({where:{id:{in:people}}});
 await db.$disconnect();
}
