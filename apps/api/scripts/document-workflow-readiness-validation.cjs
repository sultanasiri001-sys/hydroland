'use strict';
const assert=require('node:assert/strict');
const {documentWorkflowReadiness:assess}=require('../dist/document-forms/document-workflow-readiness');
const {DocumentWorkflowReadinessController}=require('../dist/document-forms/document-workflow-readiness.controller');
const {DocumentAuthorizationService}=require('../dist/document-forms/document-authorization.service');
let checks=0;
const record={id:'document-a',organizationId:'internal-a',version:2,status:'DRAFT',createdByAccountId:'owner-a',approvedByAccountId:null};
const owner={accountId:'owner-a',role:'OWNER',internalOwnerOnly:true};
const inspect=(changes={},actor={})=>assess({...record,...changes},{...owner,...actor});
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
function fixture(options={}){
 const calls=[],doc={...record,template:{code:'HR-EMPLOYEE-REPORT'},...options.record};
 const before=structuredClone(doc);
 const tx={
  operationalSetting:{findUnique:async q=>q.where.key==='PLATFORM_STAFFING_ORGANIZATION:v1'?({value:{organizationId:'internal-a'}}):null},
  organization:{findUnique:async()=>({ownerId:'owner-a',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE'})},
  account:{findFirst:async q=>options.revoked?null:{id:q.where.id}},
  organizationMember:{findUnique:async q=>options.suspended?{status:'SUSPENDED',role:'OWNER'}:q.where.organizationId_accountId.accountId==='owner-a'?null:{status:'ACTIVE',role:'ADMIN'}},
  managedDocument:{findFirst:async q=>{calls.push(q);assert.equal(q.select.payload,undefined);assert.equal(q.select.lifecycleEvents,undefined);return q.where.id===doc.id&&q.where.organizationId===doc.organizationId?doc:null;}},
 };
 const db={...tx,serializable:async fn=>fn(tx)};
 const ctl=new DocumentWorkflowReadinessController(db,new DocumentAuthorizationService(db));
 return {calls,ctl,read:(actor='owner-a',org='internal-a',id='document-a')=>ctl.inspect({auth:{accountId:actor}},org,id),unchanged:()=>assert.deepEqual(doc,before)};
}
(async()=>{
 await check('internal owner-created draft explains both unavailable independent stages',()=>{const r=inspect();assert.deepEqual(r.blockers.map(x=>x.reason),['OWNER_IS_CREATOR','OWNER_WOULD_APPROVE_AND_SIGN']);assert.equal(r.policyDecisionRequired,true);assert.equal(r.actorActions.approve,false);assert.equal(r.observationOnly,true);});
 await check('pending owner document stays blocked, never self-approved',()=>{const r=inspect({status:'PENDING_APPROVAL'});assert.equal(r.actorActions.approve,false);assert.equal(r.assessment,'BLOCKED');});
 await check('a historical different creator does not imply a complete single-owner cycle',()=>{const r=inspect({status:'PENDING_APPROVAL',createdByAccountId:'previous-preparer'});assert.equal(r.actorActions.approve,false);assert.ok(r.blockers.some(b=>b.reason==='USE_ASSIGNED_REVIEW_WORKFLOW'));});
 await check('existing owner approval cannot become independent signing',()=>{const r=inspect({status:'APPROVED',createdByAccountId:'another',approvedByAccountId:'owner-a'});assert.equal(r.actorActions.sign,false);assert.equal(r.blockers[0].reason,'OWNER_IS_APPROVER');});
 await check('historical independent creator and approver are not misclassified',()=>{const r=inspect({status:'APPROVED',createdByAccountId:'creator',approvedByAccountId:'reviewer'});assert.equal(r.actorActions.sign,false);assert.equal(r.assignmentRequired,true);assert.equal(r.assessment,'BLOCKED');});
 await check('missing approval attribution never appears ready for signing',()=>{const r=inspect({status:'APPROVED',createdByAccountId:'other'});assert.equal(r.actorActions.sign,false);assert.ok(r.blockers.some(b=>b.reason==='APPROVAL_EVIDENCE_MISSING'));});
 await check('signed and archived records retain their separate meanings',()=>{const signed=inspect({status:'SIGNED'}),archived=inspect({status:'ARCHIVED'});assert.equal(signed.assessment,'SIGNED_ARCHIVE_REMAINS');assert.equal(signed.actorActions.archive,true);assert.equal(archived.assessment,'ARCHIVED_READ_ONLY');assert.ok(Object.values(archived.actorActions).every(x=>x===false));});
 await check('center roles remain local actor checks, not internal policy claims',()=>{const r=inspect({status:'PENDING_APPROVAL',createdByAccountId:'maker'},{role:'ADMIN',internalOwnerOnly:false});assert.equal(r.actorActions.approve,true);assert.equal(r.policyDecisionRequired,false);assert.deepEqual(r.blockers,[]);assert.equal(r.assessment,'ACTOR_CHECK_ONLY');});
 await check('staff can prepare but cannot approve, sign or archive',()=>{for(const status of ['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED']){const r=inspect({status,createdByAccountId:'another',approvedByAccountId:'third'},{role:'STAFF',internalOwnerOnly:false});assert.equal(r.actorActions.approve,false);assert.equal(r.actorActions.sign,false);assert.equal(r.actorActions.archive,false);}});
 await check('viewer and unknown roles never gain write actions',()=>{for(const role of ['VIEWER','UNKNOWN'])for(const status of ['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED'])assert.ok(Object.values(inspect({status},{role,internalOwnerOnly:false}).actorActions).every(x=>x===false));});
 await check('diagnostic omits payload and creator/approver identifiers',()=>{const r=inspect();assert.equal('payload' in r,false);assert.equal('createdByAccountId' in r,false);assert.equal('approvedByAccountId' in r,false);});
 await check('actual owner authorization composes with the controller without writes',async()=>{const f=fixture(),r=await f.read();assert.equal(r.scope,'INTERNAL_OWNER_ONLY');assert.equal(r.assessment,'BLOCKED');assert.equal(f.calls.length,1);assert.equal(r.organizationId,'internal-a');f.unchanged();});
 await check('another ADMIN with membership is refused before a document read',async()=>{const f=fixture();await assert.rejects(f.read('other-admin'),/المتحقق/);assert.equal(f.calls.length,0);f.unchanged();});
 await check('fresh revocation and suspended membership preserve the owner boundary',async()=>{for(const opts of [{revoked:true},{suspended:true}]){const f=fixture(opts);await assert.rejects(f.read(),/المتحقق/);assert.equal(f.calls.length,0);}});
 await check('a missing or foreign document yields no diagnostic',async()=>{for(const changed of [{id:'other-document'},{organizationId:'another-org'}]){const f=fixture({record:changed});await assert.rejects(f.read(),/organization scope/);f.unchanged();}});
 await check('specialized contract records do not use generic diagnostics',async()=>{const f=fixture({record:{template:{code:'CLIB-HR-PERMANENT'}}});await assert.rejects(f.read(),/specialized/);f.unchanged();});
 await check('malformed IDs never query the document table',async()=>{const f=fixture();await assert.rejects(f.read('owner-a','../internal','document-a'),/Invalid/);assert.equal(f.calls.length,0);});
 console.log(`${checks} read-only workflow diagnostic checks passed; no policy, role or document mutation.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
