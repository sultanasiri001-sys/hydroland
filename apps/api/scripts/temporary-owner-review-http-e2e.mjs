import assert from 'node:assert/strict';
import {randomUUID,scryptSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
const base=process.env.STAFFING_E2E_BASE_URL||'http://127.0.0.1:3103/api/v1';
for(const value of [base,process.env.DATABASE_URL||'postgresql://missing'])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname),'Temporary owner fixtures require loopback API and database');
assert(process.env.CI==='true'||process.env.NODE_ENV==='test','Temporary owner fixtures are test-only');
const require=createRequire(import.meta.url),{DatabaseService}=require('../dist/database/database.service.js'),{AuditService}=require('../dist/audit/audit.service.js'),{TemporaryOwnerReviewService}=require('../dist/hr/temporary-owner-review.service.js'),{HrControlReviewService}=require('../dist/hr/hr-control-review.service.js'),{ownerReviewKey,ownerReviewLive,validOwnerReviewEvidence}=require('../dist/hr/temporary-owner-review.js');
const db=new PrismaClient(),runtime=new DatabaseService(),service=new TemporaryOwnerReviewService(runtime,new AuditService(runtime));
const suffix=randomUUID(),key='PLATFORM_STAFFING_ORGANIZATION:v1',mode='/admin/employees/temporary-owner-review',controls='/admin/employees/compliance-controls';
const accounts=[],people=[],controlKeys=[],proposalIds=[];let org,unit;
const password='Isolated-owner-review-2026!',salt='owner-review-fixture',passwordHash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
let checks=0;const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++};
const call=async(path,token,body,method=body?'POST':'GET')=>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json().catch(()=>null)}};
const fixture=async(name,role)=>{const p=await db.person.create({data:{firstName:'Isolated owner review',lastName:name}});people.push(p.id);const a=await db.account.create({data:{personId:p.id,email:`owner-review-${name}-${suffix}@example.invalid`,passwordHash,status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a.id);await db.roleAssignment.create({data:{accountId:a.id,role,status:'ACTIVE'}});return a};
const login=async a=>{const r=await call('/auth/login',null,{email:a.email,password});eq(r.status,200);return r.body.accessToken};
const change=(action,revision,extra={})=>({action,expectedRevision:revision,reason:'إعداد مؤقت في قاعدة اختبار معزولة',reviewed:true,...(action==='ENABLE'?{durationMinutes:60}:{}),...extra});
const controlInput=()=>{const id=randomUUID(),ruleKey='HR-OWNER-TEST-'+randomUUID().toUpperCase();proposalIds.push(id);controlKeys.push(ruleKey);return {requestId:id,baseRevision:null,reviewed:true,reason:'مراجع صناعية في اختبار معزول وليست اعتمادًا قانونيًا',control:{ruleKey,labelAr:'ضابط معزول لمراجعة المالك',regulatoryRequirementId:'isolated-only-requirement',regulatoryVersion:'isolated-v1',legalApprovalReference:'isolated-only-approval',evidenceIds:['isolated-only-evidence']}}};
const controlDecision=(p,action)=>({action,expectedRevision:p.revision,reason:'اختبار معزول لحدود صلاحية المالك',reviewed:true});
const libraryDecision=(p,action)=>({action,expectedVersion:p.version,expectedContentHash:p.contentHash,reason:'اختبار معزول لمراجعة المالك المؤقتة',reference:'isolated-only-review',reviewed:true});
const effects=()=>Promise.all([db.account.count(),db.roleAssignment.count(),db.employment.count(),db.organizationMember.count()]);
try{
 eq(await db.operationalSetting.count({where:{key}}),0,'Use an isolated canonical organization');
 const owner=await fixture('owner','ADMIN'),other=await fixture('other-admin','ADMIN'),ordinary=await fixture('ordinary','DIVER');
 org=await db.organization.create({data:{displayName:'Isolated temporary owner review',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}});
 await db.operationalSetting.create({data:{key,value:{version:1,organizationId:org.id}}});
 unit=await db.orgUnit.create({data:{organizationId:org.id,type:'DEPARTMENT',code:'TRAINING',nameAr:'تدريب معزول'}});
 const ot=await login(owner),at=await login(other),ut=await login(ordinary);
 eq((await call(mode)).status,401);eq((await call(mode,at)).status,403);eq((await call(mode,ut)).status,403);
 const initial=await call(mode,ot);eq(initial.status,200);eq(initial.cache,'no-store');eq(initial.body.active,false);eq(initial.body.revision,null);
 eq(await db.operationalSetting.count({where:{key:ownerReviewKey(org.id)}}),0,'Reading cannot create a grant');
 for(const extra of [{durationMinutes:0},{durationMinutes:1441},{durationMinutes:'60'},{reviewed:false},{ownerId:other.id},{expectedRevision:undefined},{durationMinutes:1.5}])eq((await call(mode,ot,change('ENABLE',null,extra))).status,400);
 eq((await call(mode,at,change('ENABLE',null))).status,403);
 const broken=new TemporaryOwnerReviewService(runtime,{record:async()=>{throw new Error('Isolated owner grant audit failure')}});
 await assert.rejects(()=>broken.change(owner.id,change('ENABLE',null)),/Isolated owner grant audit failure/);checks++;
 eq(await db.operationalSetting.count({where:{key:ownerReviewKey(org.id)}}),0);
 const ownAppointment=await call('/admin/employees',ot,{mode:'LINK',accountId:owner.id,departmentCode:'TRAINING',jobTitle:'اختبار تعيين المالك المعزول',profile:'STAFF',reason:'طلب معزول للتحقق من منع اعتماد النفس',reviewed:true,requestId:randomUUID()});eq(ownAppointment.status,201);
 eq((await call('/contracts/library/initialize',ot,{reviewed:true})).status,201);
 const templates=(await call('/contracts/library',ot)).body.items;let template=templates.find(x=>x.code==='CLIB-HR-PERMANENT');
 template=(await call(`/contracts/library/${template.id}/decision`,ot,libraryDecision(template,'SUBMIT'))).body;
 eq((await call(`/contracts/library/${template.id}/decision`,ot,libraryDecision(template,'LEGAL_REVIEW'))).status,403);
 let first=(await call(controls,ot,controlInput())).body;
 eq((await call(`${controls}/${first.id}/decision`,ot,controlDecision(first,'REVIEW'))).status,403);
 const before=await effects();let active=await call(mode,ot,change('ENABLE',null));eq(active.status,201);active=active.body;eq(active.active,true);assert(Date.parse(active.expiresAt)-Date.now()<=3600000);checks++;
 eq((await call(mode,ot,change('ENABLE',null))).status,409,'A stale retry cannot renew the grant');
 const late=(await call(controls,ot,controlInput())).body,clock=Date.now;
 const expiredDuringAudit=new HrControlReviewService(runtime,{record:async(event,tx)=>{await new AuditService(runtime).record(event,tx);Date.now=()=>Date.parse(active.expiresAt)+1;}});
 try{await assert.rejects(()=>expiredDuringAudit.decide(owner.id,late.id,controlDecision(late,'REVIEW')),e=>e.getStatus?.()===409);checks++;}finally{Date.now=clock;}
 eq((await db.operationalSetting.findUniqueOrThrow({where:{key:'HR_CONTROL_REVIEW:v1:'+late.id}})).value.status,'PROPOSED','Expiry during audit rolls back the entire decision');
 eq(await db.auditEvent.count({where:{resourceId:late.control.ruleKey,action:'HR_CONTROL_REVIEWED'}}),0);
 eq((await call('/contracts/library/workspace',ot)).body.temporaryOwnerReview.active,true);
 for(const invalid of [{legalApprovalReference:''},{evidenceIds:[]}]){const input=controlInput();input.control={...input.control,...invalid};eq((await call(controls,ot,input)).status,400,'The temporary grant cannot bypass required legal references or evidence');}
 const capabilities=(await call('/contracts/library/'+template.id,ot)).body.capabilities;eq(capabilities.legalReview,true);eq(capabilities.hrReview,true);
 eq((await call(controls,at)).body.temporaryOwnerReview,{canManage:false,active:false,revision:null,expiresAt:null,scopes:[]});
 const otherProposal=(await call(controls,at,controlInput())).body;eq(otherProposal.canReview,false);eq((await call(`${controls}/${otherProposal.id}/decision`,at,controlDecision(otherProposal,'REVIEW'))).status,403,'Another administrator cannot use the owner exception');
 eq((await call(`/admin/employees/${ownAppointment.body.id}/decision`,ot,{action:'REVIEW',reason:'اختبار منع مراجعة التعيين الشخصي',reviewed:true,expectedUpdatedAt:ownAppointment.body.updatedAt},'PATCH')).status,403);
 eq((await call(`/admin/employees/${ownAppointment.body.id}/decision`,ot,{action:'APPROVE',reason:'اختبار منع اعتماد التعيين الشخصي',reviewed:true,expectedUpdatedAt:ownAppointment.body.updatedAt},'PATCH')).status,403);
 for(const action of ['LEGAL_REVIEW','HR_REVIEW','PUBLISH']){const r=await call(`/contracts/library/${template.id}/decision`,ot,libraryDecision(template,action));eq(r.status,201);template=r.body;}
 eq(template.state,'PUBLISHED');eq(template.reviews.legal.temporaryOwnerReview.grantId,active.revision);eq(template.reviews.hr.temporaryOwnerReview.grantId,active.revision);
 let r=await call(`${controls}/${first.id}/decision`,ot,controlDecision(first,'REVIEW'));eq(r.status,201);first=r.body;r=await call(`${controls}/${first.id}/decision`,ot,controlDecision(first,'APPROVE'));eq(r.status,201);
 const applied=await db.policyControl.findUniqueOrThrow({where:{category_ruleKey:{category:'HR_COMPLIANCE',ruleKey:first.control.ruleKey}}});eq(applied.metadata.temporaryOwnerReview.grantId,active.revision);eq(applied.metadata.approval.requestedByAccountId,owner.id);eq(applied.metadata.approval.reviewedByAccountId,owner.id);eq(applied.metadata.approval.approvedByAccountId,owner.id);
 eq(await effects(),before,'The grant and review decisions cannot create employment or role assignments');
 await assert.rejects(()=>broken.change(owner.id,change('DISABLE',active.revision)),/Isolated owner grant audit failure/);checks++;eq((await call(mode,ot)).body.active,true);
 const edit={expectedVersion:template.version,expectedContentHash:template.contentHash,titleAr:template.titleAr,titleEn:template.titleEn,clauses:template.content.clauses,usageNotes:template.content.usageNotes+' اختبار مراجعة لاحقة',reason:'إصدار لاحق في قاعدة اختبار معزولة'};
 let pending=(await call(`/contracts/library/${template.id}/revise`,ot,edit)).body;
 for(const action of ['SUBMIT','LEGAL_REVIEW','HR_REVIEW']){const response=await call(`/contracts/library/${pending.id}/decision`,ot,libraryDecision(pending,action));eq(response.status,201);pending=response.body;}
 let pendingControl=(await call(controls,ot,controlInput())).body;pendingControl=(await call(`${controls}/${pendingControl.id}/decision`,ot,controlDecision(pendingControl,'REVIEW'))).body;
 const original=(await db.operationalSetting.findUniqueOrThrow({where:{key:ownerReviewKey(org.id)}})).value;
 assert(validOwnerReviewEvidence(original));checks++;eq(ownerReviewLive(original,Date.parse(original.expiresAt)),false,'The expiry boundary is exclusive');eq(ownerReviewLive(original,Date.parse(original.issuedAt)-1),false);eq(validOwnerReviewEvidence({...original,expiresAt:new Date(Date.parse(original.issuedAt)+86400001).toISOString()}),false);
 await db.operationalSetting.update({where:{key:ownerReviewKey(org.id)},data:{value:{...original,issuedAt:new Date(Date.now()-7200000).toISOString(),expiresAt:new Date(Date.now()-3600000).toISOString()}}});
 eq((await call(mode,ot)).body.active,false);eq((await call('/contracts/library/'+pending.id,ot)).body.capabilities.publish,false);
 assert([403,409].includes((await call(`/contracts/library/${pending.id}/decision`,ot,libraryDecision(pending,'PUBLISH'))).status));checks++;
 assert([403,409].includes((await call(`${controls}/${pendingControl.id}/decision`,ot,controlDecision(pendingControl,'APPROVE'))).status));checks++;
 eq((await db.policyControl.findMany({where:{category:'HR_COMPLIANCE',ruleKey:pendingControl.control.ruleKey}})).length,0);
 let disabled=(await call(mode,ot,change('DISABLE',active.revision))).body;eq(disabled.active,false);
 active=(await call(mode,ot,change('ENABLE',disabled.revision))).body;eq(active.active,true);
 eq((await call('/contracts/library/'+pending.id,ot)).body.capabilities.publish,false,'A new grant cannot resurrect reviews from an older grant');
 eq((await call(`${controls}/${pendingControl.id}/decision`,ot,controlDecision(pendingControl,'APPROVE'))).status,409);
 await db.account.update({where:{id:owner.id},data:{emailVerifiedAt:null}});eq((await call(mode,ot)).status,401);eq((await call('/contracts/library/'+pending.id,ot)).status,401);await db.account.update({where:{id:owner.id},data:{emailVerifiedAt:new Date()}});
 await db.account.update({where:{id:owner.id},data:{status:'SUSPENDED'}});eq((await call(mode,ot)).status,401);await db.account.update({where:{id:owner.id},data:{status:'ACTIVE'}});
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});eq((await call(mode,ot)).status,403);eq((await call('/contracts/library/'+pending.id,ot)).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
 await db.organization.update({where:{id:org.id},data:{ownerId:other.id,updatedAt:new Date(Date.now()+1)}});eq((await call(mode,ot)).status,403);eq((await call(mode,at)).body.active,false);
 await db.organization.update({where:{id:org.id},data:{ownerId:owner.id,updatedAt:new Date(Date.now()+10)}});eq((await call(mode,ot)).body.active,false,'Transferring ownership back does not reactivate an earlier grant');
 disabled=(await call(mode,ot,change('DISABLE',active.revision))).body;
 const concurrent=await Promise.all([call(mode,ot,change('ENABLE',disabled.revision)),call(mode,ot,change('ENABLE',disabled.revision))]);eq(concurrent.map(x=>x.status).sort(),[201,409]);active=concurrent.find(x=>x.status===201).body;
 const grantAudits=await db.auditEvent.findMany({where:{resourceId:org.id,action:'TEMPORARY_OWNER_REVIEW_ENABLED'}});assert(grantAudits.length>=3);checks++;assert(grantAudits.every(e=>e.metadata.permissionsApplied===false&&e.metadata.scopes.length===2));checks++;
 for(const action of ['RETURN','SUBMIT','LEGAL_REVIEW','HR_REVIEW','PUBLISH']){const response=await call(`/contracts/library/${pending.id}/decision`,ot,libraryDecision(pending,action));eq(response.status,201);pending=response.body;}
 eq(pending.reviews.legal.temporaryOwnerReview.grantId,active.revision,'A regrant needs fresh reviews before publication');
 eq((await call(mode,ot,change('DISABLE',active.revision))).body.active,false);
 eq((await db.documentTemplate.findUniqueOrThrow({where:{id:pending.id}})).status,'ACTIVE','Expiration and revocation preserve already completed historical decisions');
 eq((await db.documentTemplate.findUniqueOrThrow({where:{id:template.id}})).fields.state,'RETIRED','The replaced publication remains in history');
 await db.organization.update({where:{id:org.id},data:{status:'SUSPENDED'}});
 eq((await call(controls,at)).status,200,'An unavailable canonical organization disables the optional exception without changing the ordinary independent HR-control workflow');
 eq((await call(controls,at)).body.temporaryOwnerReview.active,false);
 console.log(`Temporary owner review HTTP/PostgreSQL: ${checks} checks passed; bounded owner-only grant, rollback, stale/concurrent changes, scoped decisions, self-appointment denial, expiry, revocation, transfer/regrant fencing, history and zero implicit identity grants.`);
}finally{
 if(org){
  const employments=await db.employment.findMany({where:{organizationId:org.id},select:{id:true}}),ids=employments.map(e=>e.id),moves=await db.employmentMovement.findMany({where:{employmentId:{in:ids}},select:{id:true}});
  await db.auditEvent.deleteMany({where:{actorId:{in:people}}});
  await db.operationalSetting.deleteMany({where:{OR:[{key:{in:[key,ownerReviewKey(org.id),...moves.map(m=>'STAFFING_APPOINTMENT:'+m.id),...proposalIds.map(id=>'HR_CONTROL_REVIEW:v1:'+id)]}},...accounts.map(id=>({key:{startsWith:'STAFFING_REQUEST:'+id+':'}}))]}});
  await db.employmentMovement.deleteMany({where:{employmentId:{in:ids}}});await db.employment.deleteMany({where:{id:{in:ids}}});await db.hrCandidate.deleteMany({where:{organizationId:org.id}});await db.position.deleteMany({where:{orgUnit:{organizationId:org.id}}});await db.orgUnit.deleteMany({where:{organizationId:org.id}});await db.documentTemplate.deleteMany({where:{organizationId:org.id}});await db.organizationMember.deleteMany({where:{organizationId:org.id}});await db.organization.delete({where:{id:org.id}});
 }
 await db.policyControl.deleteMany({where:{category:'HR_COMPLIANCE',ruleKey:{in:controlKeys}}});await db.notification.deleteMany({where:{accountId:{in:accounts}}});await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});await runtime.$disconnect();await db.$disconnect();
}
