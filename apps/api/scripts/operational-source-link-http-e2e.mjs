import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient, Prisma } from '@prisma/client';

// This suite creates only synthetic, disposable records. It never interprets a
// recorded blocker, a document status or a passing test as operational closure.
const base = new URL((process.env.STAFFING_E2E_BASE_URL || 'http://127.0.0.1:3103/api/v1').replace(/\/$/, '') + '/');
const database = new URL(process.env.DATABASE_URL || 'postgresql://missing');
for (const url of [base, database]) assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Closure fixtures require loopback API and PostgreSQL');
assert(process.env.CI === 'true' || process.env.NODE_ENV === 'test', 'Closure fixtures are test-only');
const secret = process.env.JWT_SECRET;
assert(secret && secret.length >= 32, 'Isolated API signing secret is required');
const require = createRequire(import.meta.url);
const { OPERATING_CYCLE_CLOSURE_GATES } = require('../dist/document-forms/department-operating-cycle.catalog.js');
const { decisionDigest } = require('../dist/document-forms/owner-administrative-decision.domain.js');
const gateIds = OPERATING_CYCLE_CLOSURE_GATES.map(g => g.id);
assert.equal(gateIds.length, 7);
const db = new PrismaClient(), suffix = randomUUID(), people = [], accounts = [], organizations = [];
const platformKey = 'PLATFORM_STAFFING_ORGANIZATION:v1';
const triggerName = 'hl_closure_failure_' + suffix.replaceAll('-', '');
const endpoint = 'admin/operational-source-links';
let previousPlatform, changedPlatform = false, triggerInstalled = false, checks = 0;
let owner, other, staff, org, outside, evidenceDoc;
let oldControls = [];
const pass = message => console.log(`PASS ${++checks}: ${message}`);

async function actor(label, role) {
  const person = await db.person.create({ data: { firstName: 'SyntheticClosure', lastName: label } });
  people.push(person.id);
  const account = await db.account.create({ data: { personId: person.id, email: `closure-${label}-${suffix}@example.invalid`, passwordHash: 'synthetic-no-login', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  accounts.push(account.id);
  await db.roleAssignment.create({ data: { accountId: account.id, role, status: 'ACTIVE' } });
  const session = await db.session.create({ data: { accountId: account.id, tokenHash: `closure-${label}-${suffix}`, expiresAt: new Date(Date.now() + 3600000) } });
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000), body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: account.id, sid: session.id, iat: now, exp: now + 3600 })}`;
  return { ...account, token: `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}` };
}
async function call(actor, path = endpoint, method = 'GET', body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, headers: response.headers, data: await response.json().catch(() => null) };
}
async function ok(actor, path = endpoint, method = 'GET', body) {
  const result = await call(actor, path, method, body);
  assert(result.status >= 200 && result.status < 300, `${path}: ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
}
const { OPERATIONAL_CONTROLS: catalog } = require('../dist/trips/operational-controls.catalog.js');
const { sourceLinkInput, sourceLinkRows, sourceLinkKey, sourceLinkControlKey, SOURCE_LINK_POLICY: policy } = require('../dist/legal-governance/operational-source-link.domain.js');
const missingKeys=['MARINE.ASSET_READINESS','TRAINING.CAPACITY_LIMIT','TRAINING.SCHEDULE_CONFLICT','TRAINING.SESSION_TIME_WINDOW','TRAINING.ATTENDANCE_REQUIRED'];
const operationalWhere = { OR: catalog.map(c => ({ category:c.category, ruleKey:c.ruleKey })) };
const controls = () => db.policyControl.findMany({ where:operationalWhere, orderBy:{id:'asc'} });
const batches = () => db.operationalSetting.findMany({ where:{key:{startsWith:`OPERATIONAL_SOURCE_REVIEW:v1:${org.id}:`}}, orderBy:{key:'asc'} });
const indices = () => db.operationalSetting.findMany({where:{key:{startsWith:`OPERATIONAL_SOURCE_REVIEW_CONTROL:v1:${org.id}:`}}});
const audits = () => db.auditEvent.findMany({where:{actorId:owner.personId,action:'OPERATIONAL_SOURCE_REVIEW_LINKED'}});
const enforcement = rows => rows.map(c => ({id:c.id,state:c.state,metadata:Object.fromEntries(Object.entries(c.metadata || {}).filter(([k])=>k!=='operationalSourceReview'))}));
const matrixRows = () => catalog.map(c=>({'المتطلب وإصداره':'Synthetic private review source — no legal adoption','الانطباق':'Draft scope only','الضابط':c.id,'المسؤول':'Synthetic accountable owner','بند الفحص':'Synthetic check','دليل القبول':'No actual evidence accepted'}));
const inputFor = doc => ({documentId:doc.id,expectedDocumentVersion:doc.version,reason:'Synthetic source trace only; no mandatory activation'});
const preview = input => ok(owner,endpoint+'/preview','POST',input);
const confirm = (input,plan) => ({...input,expectedPlanHash:plan.expectedPlanHash,confirmed:true});
async function rejected(input,statuses=[400],path=endpoint+'/preview'){
 const r=await call(owner,path,'POST',input);assert(statuses.includes(r.status),`${r.status}: ${JSON.stringify(r.data)}`);
}
async function createDocument(t,payload){return ok(owner,'documents','POST',{organizationId:org.id,templateId:t.id,department:t.department,payload,contentHash:decisionDigest(payload)});}
try {
 owner=await actor('source-owner','ADMIN');other=await actor('source-other','ADMIN');staff=await actor('source-staff','STAFF');
 org=await db.organization.create({data:{displayName:'Synthetic source links '+suffix,kind:'HYDROLAND_INTERNAL_PLATFORM',ownerId:owner.id,status:'ACTIVE'}});organizations.push(org.id);
 outside=await db.organization.create({data:{displayName:'Synthetic outside source '+suffix,kind:'DIVING_CENTER',ownerId:other.id,status:'ACTIVE'}});organizations.push(outside.id);
 previousPlatform=await db.operationalSetting.findUnique({where:{key:platformKey}});
 await db.operationalSetting.upsert({where:{key:platformKey},create:{key:platformKey,value:{organizationId:org.id}},update:{value:{organizationId:org.id},updatedAt:new Date()}});changedPlatform=true;
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 oldControls=await controls();
 assert(!oldControls.some(c=>missingKeys.includes(c.category+'.'+c.ruleKey)),'Isolated fixture starts with five catalog keys absent');
 for(const c of catalog.filter(c=>!missingKeys.includes(c.id)))await db.policyControl.upsert({where:{category_ruleKey:{category:c.category,ruleKey:c.ruleKey}},create:{category:c.category,ruleKey:c.ruleKey,labelAr:c.labelAr,state:'DISABLED',metadata:{syntheticPrivate:'preserved',mandatoryRequirement:{schemaVersion:999}}},update:{metadata:{syntheticPrivate:'preserved',mandatoryRequirement:{schemaVersion:999}}}});
 const fields=[{key:'operatingControlMatrix',labelAr:'مصفوفة اصطناعية',labelEn:'Synthetic matrix',type:'TABLE',required:true,options:['المتطلب وإصداره','الانطباق','الضابط','المسؤول','بند الفحص','دليل القبول']}];
 const t=await ok(owner,'documents/templates','POST',{organizationId:org.id,code:'SAF-OPERATING-CONTROL-MATRIX',titleAr:'مصفوفة اختبار اصطناعية',titleEn:'Synthetic source review matrix',department:'SAFETY_COMPLIANCE_RISK',printable:true,fields});
 evidenceDoc=await createDocument(t,{operatingControlMatrix:matrixRows()});
 assert.equal((await call(null)).status,401);assert.equal((await call(staff)).status,403);assert.equal((await call(other)).status,403);
 const view=await call(owner);assert.equal(view.status,200);assert.match(view.headers.get('cache-control'),/private.*no-store/);assert.equal(view.data.canActivate,false);assert.equal(view.data.documents.length,1);assert.equal(view.data.controls.length,29);
 assert.equal(view.data.controls.filter(c=>!c.policyRecordExists).length,5);assert.equal((await controls()).length,24);
 pass('fresh verified owner alone lists 29 scoped catalog controls including five without policy records; unrelated accounts denied and no missing record created');
 const input=inputFor(evidenceDoc);
 for(const extra of [{organizationId:outside.id},{canActivate:true},{mandatoryRequirement:{}},{state:'ENABLED'}])await rejected({...input,...extra});
 for(const v of [0,1.5,'1',null])await rejected({...input,expectedDocumentVersion:v});
 assert.throws(()=>sourceLinkInput({...input,reason:'bad\u0000reason'}));
 for(const rows of [[],[...matrixRows(),matrixRows()[0]],[{...matrixRows()[0],'الضابط':'ACCESS.ADMIN'}],[{...matrixRows()[0],'دليل القبول':''}]])assert.throws(()=>sourceLinkRows({operatingControlMatrix:rows}));
 await rejected({...input,documentId:randomUUID()},[403,404]);await rejected({...input,expectedDocumentVersion:2},[409]);
 pass('strict input rejects scope/activation injection, unknown and duplicate control IDs, missing cells and obsolete document versions');
 const before=await controls(),docsBefore=await db.managedDocument.findMany({where:{organizationId:org.id}}),plan=await preview(input);
 assert.equal(plan.rows.length,29);assert.equal(plan.canActivate,false);assert.equal(plan.source.referenceNumber,evidenceDoc.referenceNumber);assert.match(plan.expectedPlanHash,/^[a-f0-9]{64}$/);
 assert.deepEqual(await controls(),before);assert.equal((await batches()).length,0);assert.equal((await audits()).length,0);
 for(const extra of [{confirmed:false},{expectedPlanHash:'f'.repeat(64)},{reason:input.reason+' changed'},{actorAccountId:other.id}])await rejected({...confirm(input,plan),...extra},[400,409],endpoint);
 pass('preview performs no writes; confirmation binds exact source, control snapshot, owner, reason and explicit consent');
 await db.policyControl.update({where:{id:before[0].id},data:{state:before[0].state}});
 await rejected(confirm(input,plan),[409],endpoint);
 pass('control ABA edit after preview invalidates the confirmation even when configured state returns to the same value');
 let fresh=await preview(input);
 const original=await db.managedDocument.findUniqueOrThrow({where:{id:evidenceDoc.id}});
 await db.managedDocument.update({where:{id:evidenceDoc.id},data:{payload:{operatingControlMatrix:[]}}});
 await rejected(confirm(input,fresh),[409],endpoint);
 await db.managedDocument.update({where:{id:evidenceDoc.id},data:{payload:original.payload,updatedAt:original.updatedAt}});
 const member=await db.organizationMember.findUniqueOrThrow({where:{organizationId_accountId:{organizationId:org.id,accountId:owner.id}}});
 fresh=await preview(input);await db.organizationMember.update({where:{id:member.id},data:{status:'SUSPENDED'}});
 assert.equal((await call(owner,endpoint,'POST',confirm(input,fresh))).status,403);
 await db.organizationMember.update({where:{id:member.id},data:{status:'ACTIVE'}});
 await rejected(confirm(input,fresh),[409],endpoint);
 pass('source tampering, revoked membership and authority ABA changes invalidate confirmation');
 fresh=await preview(input);const failureBefore=await controls();
 await db.$executeRawUnsafe(`CREATE FUNCTION "${triggerName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='OPERATIONAL_SOURCE_REVIEW_LINKED' AND NEW."actorId"::text='${owner.personId}' THEN RAISE EXCEPTION 'synthetic link audit failure'; END IF; RETURN NEW; END; $$`);
 await db.$executeRawUnsafe(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${triggerName}"()`);triggerInstalled=true;
 assert.equal((await call(owner,endpoint,'POST',confirm(input,fresh))).status,500);assert.deepEqual(await controls(),failureBefore);assert.equal((await batches()).length,0);assert.equal((await indices()).length,0);assert.equal((await audits()).length,0);
 await db.$executeRawUnsafe(`DROP TRIGGER "${triggerName}" ON "AuditEvent"`);triggerInstalled=false;await db.$executeRawUnsafe(`DROP FUNCTION "${triggerName}"()`);
 pass('audit failure rolls back the immutable snapshot and every one of the 29 control pointers atomically');
 fresh=await preview(input);const responses=await Promise.all([call(owner,endpoint,'POST',confirm(input,fresh)),call(owner,endpoint,'POST',confirm(input,fresh))]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);const receipt=responses.find(r=>r.status===201).data;
 assert.equal(receipt.linkedControlCount,29);assert.equal(receipt.canActivate,false);assert.equal((await batches()).length,1);assert.equal((await indices()).length,29);assert.equal((await audits()).length,1);assert.deepEqual(await controls(),failureBefore);assert.deepEqual(enforcement(await controls()),enforcement(before));assert.deepEqual(await db.managedDocument.findMany({where:{organizationId:org.id}}),docsBefore);
 assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW'));
 await rejected(confirm(input,fresh),[409],endpoint);
 pass('concurrent confirmations persist one batch/audit and 29 registry pointers; all 24 policy rows remain byte-for-byte unchanged and five absent rows stay absent');
 const general=await ok(other,'admin/department-references');assert.equal(general.sourceReviewSummary.linkedForReview,24);assert.equal(general.bindingSummary.mandatoryBindings,0);assert.deepEqual(general.sourceReviewCatalogSummary,{schemaVersion:1,total:29,linkedForReview:29,staleLinks:0,unlinked:0,withoutPolicyRecord:5});
 const serialized=JSON.stringify(general);for(const privateValue of [evidenceDoc.id,evidenceDoc.referenceNumber,input.reason,'Synthetic private review source'])assert(!serialized.includes(privateValue));
 pass('general ADMIN sees review-link counts separately from mandatory adoption without owner document IDs, references, notes or source payload');
 const added=catalog.find(c=>c.id===missingKeys[0]);
 await db.policyControl.create({data:{category:added.category,ruleKey:added.ruleKey,labelAr:added.labelAr,state:'ENABLED'}});
 assert.equal((await ok(owner)).controls.filter(c=>c.sourceReviewStatus==='STALE').length,1);
 const newlyRecorded=await controls();await ok(owner,endpoint,'POST',confirm(input,await preview(input)));
 assert.deepEqual(await controls(),newlyRecorded);assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW'));
 pass('a later independent policy-record creation makes its catalog link stale; explicit re-review refreshes the pointer without touching that policy row');
 const branding=await db.documentBrandSnapshot.findFirstOrThrow({where:{organizationId:org.id}});
 await db.documentBrandSnapshot.update({where:{id:branding.id},data:{footerAr:'Changed source branding'}});
 assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='STALE'));
 await db.documentBrandSnapshot.update({where:{id:branding.id},data:{footerAr:branding.footerAr}});
 assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW'));
 const revisedPayload={operatingControlMatrix:matrixRows().map((r,i)=>i?r:{...r,'بند الفحص':'Changed source check'})};
 evidenceDoc=await ok(owner,`documents/${evidenceDoc.id}/revise`,'POST',{payload:revisedPayload,contentHash:decisionDigest(revisedPayload)});
 assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='STALE'));
 const next=inputFor(evidenceDoc);await ok(owner,endpoint,'POST',confirm(next,await preview(next)));assert.equal((await batches()).length,3);assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW'));
 pass('branding/revision changes mark links stale; explicit preview/confirmation relinks the new version and retains the prior immutable history');
 const saved=(await batches())[0];await db.operationalSetting.update({where:{key:saved.key},data:{value:{...saved.value,reason:'tampered'}}});
 // At least one immutable history row may no longer be current; tamper the current pointer's batch explicitly.
 const pointer=(await db.operationalSetting.findUniqueOrThrow({where:{key:sourceLinkControlKey(org.id,catalog[0].id)}})).value,key=sourceLinkKey(org.id,pointer.id),currentBatch=await db.operationalSetting.findUniqueOrThrow({where:{key}});
 await db.operationalSetting.update({where:{key},data:{value:{...currentBatch.value,reason:'tampered'}}});
 assert((await ok(owner)).controls.every(c=>c.sourceReviewStatus==='STALE'));await rejected(inputFor(evidenceDoc),[409]);
 pass('tampered immutable snapshots fail closed as stale and cannot be silently overwritten');
 console.log(`${checks} real HTTP/PostgreSQL source-review groups passed; no regulatory adoption, permit verification or operational activation claimed.`);
} finally {
 if(triggerInstalled)await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "AuditEvent"`);
 await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${triggerName}"()`);
 if(org){await db.operationalSetting.deleteMany({where:{OR:[{key:{startsWith:`OPERATIONAL_SOURCE_REVIEW:v1:${org.id}:`}},{key:{startsWith:`OPERATIONAL_SOURCE_REVIEW_CONTROL:v1:${org.id}:`}}]}});
  for(const row of await controls()){const old=oldControls.find(c=>c.id===row.id);if(old)await db.policyControl.update({where:{id:old.id},data:{metadata:old.metadata??Prisma.DbNull,state:old.state,updatedByAccountId:old.updatedByAccountId,updatedAt:old.updatedAt}});else await db.policyControl.delete({where:{id:row.id}});}
 }
 if(changedPlatform){if(previousPlatform)await db.operationalSetting.update({where:{key:platformKey},data:{value:previousPlatform.value,updatedAt:previousPlatform.updatedAt}});else await db.operationalSetting.delete({where:{key:platformKey}});}
 const ids=(await db.managedDocument.findMany({where:{organizationId:{in:organizations}},select:{id:true}})).map(d=>d.id);
 await db.documentLifecycleEvent.deleteMany({where:{documentId:{in:ids}}});await db.documentRevision.deleteMany({where:{documentId:{in:ids}}});await db.managedDocument.deleteMany({where:{id:{in:ids}}});
 await db.documentTemplate.deleteMany({where:{organizationId:{in:organizations}}});await db.documentReferenceCounter.deleteMany({where:{organizationId:{in:organizations}}});await db.documentBrandSnapshot.deleteMany({where:{organizationId:{in:organizations}}});
 await db.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});await db.organization.deleteMany({where:{id:{in:organizations}}});await db.auditEvent.deleteMany({where:{actorId:{in:people}}});await db.notification.deleteMany({where:{accountId:{in:accounts}}});await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});await db.$disconnect();
}
