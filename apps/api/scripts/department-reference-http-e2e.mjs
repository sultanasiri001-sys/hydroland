import assert from 'node:assert/strict';
import { randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const base = process.env.STAFFING_E2E_BASE_URL || 'http://127.0.0.1:3103/api/v1';
for (const url of [base, process.env.DATABASE_URL || 'postgresql://missing']) assert(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname), 'Reference fixtures require loopback API and database');
assert(process.env.CI === 'true' || process.env.NODE_ENV === 'test', 'Reference fixtures are test-only');
const db = new PrismaClient(), suffix = randomUUID(), accounts = [], people = [];
const organizations = [], platformKey = 'PLATFORM_STAFFING_ORGANIZATION:v1';
const expectedTemplateCounts = { HR:21, TRAINING:13, MARINE_OPERATIONS:11, INVENTORY_LOGISTICS:11, FINANCE:10, SAFETY_COMPLIANCE_RISK:9, CUSTOMER_EXPERIENCE:9, MARKETING_GROWTH:10, TECHNOLOGY_CYBERSECURITY:11, FACILITIES_ASSETS_MAINTENANCE:10, ADMIN_AFFAIRS_RECORDS:10, EXECUTIVE_GOVERNANCE:11, RND_MARKET_INTELLIGENCE:10, LEGAL_CONTRACTS_INSURANCE:11 };
let previousPlatformSetting, platformSettingChanged = false;
const password = 'Isolated-reference-fixture-2026!', salt = 'reference-fixture', passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const call = async (path, token, body) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type':'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json().catch(() => null) };
};
const fixture = async (name, role) => {
  const person = await db.person.create({ data: { firstName:'Reference', lastName:name } }); people.push(person.id);
  const account = await db.account.create({ data: { personId:person.id, email:`reference-${name}-${suffix}@example.invalid`, passwordHash, status:'ACTIVE', emailVerifiedAt:new Date() } }); accounts.push(account.id);
  await db.roleAssignment.create({ data: { accountId:account.id, role, status:'ACTIVE' } }); return account;
};
const login = async account => { const r = await call('/auth/login', null, { email:account.email, password }); assert.equal(r.status,200); return r.body.accessToken; };
const endpoint = '/admin/department-references';
const effects = () => Promise.all([db.policyControl.findMany({orderBy:[{category:'asc'},{ruleKey:'asc'}]}),db.employment.count(),db.organizationMember.count(),db.managedDocument.count(),db.aiAgentTask.count(),db.documentTemplate.findMany({orderBy:{id:'asc'}})]);
try {
  const admin = await fixture('admin','ADMIN'), ordinary = await fixture('ordinary','STAFF'), token = await login(admin), other = await login(ordinary);
  previousPlatformSetting = await db.operationalSetting.findUnique({where:{key:platformKey}});
  for (const name of ['internal','outside']) {
    const organization = await db.organization.create({data:{displayName:'Isolated reference '+name+' '+suffix,ownerId:admin.id,kind:name==='internal'?'HYDROLAND_INTERNAL_PLATFORM':'DIVING_CENTER',status:'ACTIVE'}});
    organizations.push(organization.id);
  }
  await db.orgUnit.create({data:{organizationId:organizations[0],type:'DEPARTMENT',code:'HR',nameAr:'قسم اختبار معزول'}});
  const template = async (organizationId,version,status='ACTIVE') => db.documentTemplate.create({data:{organizationId,code:'HR-EMPLOYEE-REPORT',titleAr:'عنوان خاص لا يعرض',titleEn:'Private fixture title',department:'HR',version,status,fields:[]}});
  const first = await template(organizations[0],1), second = await template(organizations[0],2), outside = await template(organizations[1],1);
  await db.documentTemplate.create({data:{organizationId:organizations[0],code:'HR-LEAVE-REQUEST',titleAr:'نسخة سابقة',titleEn:'Inactive fixture',department:'HR',version:1,status:'INACTIVE',fields:[]}});
  const extension = async (organizationId,department,version,code='TRN-TRAINING-PLAN') => db.documentTemplate.create({data:{organizationId,code,titleAr:'عنوان توسيع خاص لا يعرض',titleEn:'Private extension title',department,version,status:'ACTIVE',fields:[{key:'privateFixtureField',type:'TEXT',labelAr:'لا يعرض',required:false}]}});
  const training = await extension(organizations[0],'TRAINING',1), foreignTraining = await extension(organizations[1],'TRAINING',1), wrongDepartment = await extension(organizations[0],'FINANCE',2), custom = await extension(organizations[0],'TRAINING',1,'CUSTOM-OUTSIDE-ADMINISTRATIVE-CATALOG');
  for (const [index,source] of [first,outside].entries()) await db.managedDocument.create({data:{organizationId:source.organizationId,templateId:source.id,referenceNumber:'ISOLATED-'+suffix+'-'+index,department:'HR',contentHash:'isolated-not-an-approved-document',payload:{privateMarker:'never-return-operational-payload'},createdByAccountId:admin.id,status:index===0?'ARCHIVED':'DRAFT'}});
  for(const [index,[source,department]] of [[training,'TRAINING'],[foreignTraining,'TRAINING'],[wrongDepartment,'TRAINING'],[training,'HR'],[custom,'TRAINING']].entries())await db.managedDocument.create({data:{organizationId:organizations[0],templateId:source.id,referenceNumber:'EXTENSION-'+suffix+'-'+index,department,contentHash:'isolated-not-an-approved-document',payload:{privateMarker:'never-return-extension-payload'},createdByAccountId:admin.id,status:'ARCHIVED'}});
  await db.operationalSetting.upsert({where:{key:platformKey},create:{key:platformKey,value:{organizationId:organizations[0]}},update:{value:{organizationId:organizations[0]}}});
  platformSettingChanged = true;
  const before = await effects();
  assert.equal((await call(endpoint)).status,401); assert.equal((await call(endpoint,other)).status,403);
  const response = await call(endpoint,token); assert.equal(response.status,200); assert.equal(response.cache,'no-store');
  const data = response.body; assert.equal(data.referenceOnly,true); assert.equal(data.canActivate,false); assert.equal(data.canonicalDepartmentCount,14); assert.equal(data.departments.length,14);
  assert.equal(data.authorities.length,19); assert.equal(data.legalReferences.length,15); assert.equal(data.hrSources.length,6); assert.equal(data.hrControlCandidates.length,7);
  assert.equal(data.marineArchives.length,10); for (const source of data.marineArchives) { assert.equal(source.officialSourceByteIdentityVerified,false); assert.equal(source.regulatoryVersion,null); assert.equal(source.legalApprovalReference,null); }
  assert.equal(data.isoReferences.length,11); assert.equal(data.canonicalSourceTemplateCount,157); assert.equal(data.completeDocumentInventoryVerified,false);
  for (const source of data.isoReferences) { assert.equal(source.adoptionDecisionReference,null); assert.equal(source.certificationClaim,false); }
  for (const candidate of data.hrControlCandidates) { assert.equal(candidate.enabled,false); assert.equal(candidate.legalApprovalReference,null); assert.deepEqual(candidate.evidenceIds,[]); }
  for (const department of data.departments) {
    assert.equal(department.canActivate,false); assert.equal(department.operatingCycle.templates.length,expectedTemplateCounts[department.code]); assert.equal(department.operatingCycle.departmentClosed,false);
    assert.equal(department.operatingCycle.closureAssessment,'NOT_ASSESSED'); assert.equal(department.operatingCycle.closureGates.length,7);
    assert(department.operatingCycle.documentCounts.every(row=>Number.isSafeInteger(row.count)&&row.count>=0));
  }
  assert.equal(data.recordedDepartmentCount,1);
  const cycle=data.departments.find(d=>d.code==='HR').operatingCycle;
  const report=cycle.templates.find(t=>t.code==='HR-EMPLOYEE-REPORT');
  assert.equal(report.availability,'MULTIPLE_ACTIVE_VERSIONS'); assert.deepEqual(report.recordedVersions.map(v=>v.version),[2,1]);
  assert.equal(cycle.templates.find(t=>t.code==='HR-LEAVE-REQUEST').availability,'NO_ACTIVE_VERSION_RECORDED');
  assert.equal(cycle.templates.find(t=>t.code==='HR-PERFORMANCE-REVIEW').recordedVersions.length,0);
  assert.deepEqual(cycle.documentCounts,[{status:'ARCHIVED',count:1}],'Only internal-organization source documents are counted');
  const trainingCycle=data.departments.find(d=>d.code==='TRAINING').operatingCycle;
  const trainingPlan=trainingCycle.templates.find(t=>t.code==='TRN-TRAINING-PLAN');
  assert.equal(trainingPlan.availability,'ACTIVE_VERSION_RECORDED');assert.equal(trainingPlan.recordedVersions.length,1);assert.equal(trainingPlan.recordedVersions[0].version,1,'Foreign or wrong-department extension versions are excluded');
  assert.deepEqual(trainingCycle.documentCounts,[{status:'ARCHIVED',count:1}],'Count the handbook extension while excluding foreign-template, mismatched-department and outside-catalog documents');
  assert.equal(trainingCycle.departmentClosed,false);assert(trainingCycle.closureGates.every(g=>g.verificationStatus==='NOT_ASSESSED'));
  assert.equal(cycle.departmentClosed,false,'An archived document never certifies department closure');
  assert(!JSON.stringify(data).includes('never-return-operational-payload')); assert(!JSON.stringify(data).includes('Private fixture title')); assert(!/never-return-extension-payload|Private extension title|privateFixtureField/.test(JSON.stringify(data)));
  const filtered = await call(endpoint+'?department=HR',token); assert.equal(filtered.status,200); assert.equal(filtered.body.departments.length,1); assert.equal(filtered.body.departments[0].code,'HR');
  assert.equal((await call(endpoint+'?department=UNKNOWN',token)).status,400); assert.equal((await call(endpoint+'?department=HR&department=FINANCE',token)).status,400);
  assert.equal((await call(endpoint,token,{activate:true})).status,404);
  assert(!/passwordHash|accessToken|refreshToken|requestedByAccountId|approvedByAccountId/.test(JSON.stringify(data)), 'No private identity or raw policy metadata');
  await db.account.update({where:{id:admin.id},data:{emailVerifiedAt:null}}); assert.equal((await call(endpoint,token)).status,401, 'Unverified accounts are rejected by the existing session guard');
  await db.account.update({where:{id:admin.id},data:{emailVerifiedAt:new Date()}});
  assert.equal((await call(endpoint,token)).status,200, 'Reverified account retains its unchanged valid session and role');
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'SUSPENDED'}}); assert.equal((await call(endpoint,token)).status,403);
  assert.deepEqual(await effects(),before,'Discovery cannot alter policies, employees, memberships, documents, templates or AI tasks');
  console.log('Department reference HTTP/PostgreSQL passed: all 157 administrative templates, handbook-extension version and document counts, foreign-template and department mismatch isolation, real fresh guards, no payload disclosure or false closure, uncached filtering and no business-state changes.');
} finally {
  if(platformSettingChanged){
    const current=await db.operationalSetting.findUnique({where:{key:platformKey}});
    assert.equal(current?.value?.organizationId,organizations[0],'Do not overwrite another test owner');
    if(previousPlatformSetting) await db.operationalSetting.update({where:{key:platformKey},data:{value:previousPlatformSetting.value,updatedAt:previousPlatformSetting.updatedAt}});
    else await db.operationalSetting.delete({where:{key:platformKey}});
  }
  await db.managedDocument.deleteMany({where:{organizationId:{in:organizations}}}); await db.documentTemplate.deleteMany({where:{organizationId:{in:organizations}}}); await db.orgUnit.deleteMany({where:{organizationId:{in:organizations}}}); await db.organization.deleteMany({where:{id:{in:organizations}}});
  await db.auditEvent.deleteMany({where:{actorId:{in:people}}}); await db.notification.deleteMany({where:{accountId:{in:accounts}}}); await db.session.deleteMany({where:{accountId:{in:accounts}}}); await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}}); await db.account.deleteMany({where:{id:{in:accounts}}}); await db.person.deleteMany({where:{id:{in:people}}}); await db.$disconnect();
}
