import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {GovernanceReviewInboxService}=require('../dist/agents/governance-review-inbox.service.js');
const {correctionFingerprint,correctionRequestId,DRAFT_CORRECTION_POLICY}=require('../dist/agents/governance-draft-correction.js');

// Runs inside the existing disposable loopback HTTP/PostgreSQL acceptance suite.
// Fixtures never dispatch a task, contact a provider, or authorize an action.
export async function governanceInboxBatchAcceptance({db,runtimeDb,agents,actor,ordinary,token,call,providerCalls}){
 const order=['GOV_QUALITY_AUDIT','GOV_TECH_REVIEW','GOV_SECURITY_RISK','GOV_COMPLIANCE_POLICY','GOV_VERIFICATION','GOV_FINAL_GATE'];
 const pass=JSON.stringify({decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false});
 const tasks=[],events=[],roots=[],chains=[];
 const now=Date.now()+60000;
 for(let i=0;i<21;i++){
  const make=(agentKey,stage)=>({id:randomUUID(),revision:randomUUID(),agentKey,requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'inbox-batch-acceptance',action:stage<0?'DRAFT_REPORT':'READ_OPERATIONS',language:'ar-SA',prompt:'Disposable inbox fixture',state:'COMPLETED',result:stage<0?'Experimental output':pass,createdAt:new Date(now+i),estimatedCostMicroUsd:10,reservedCostMicroUsd:20,attemptCount:1,unknownCostAttempts:0});
  const root=make('SUPPORT',-1),chain=order.map((key,stage)=>make(key,stage));
  roots.push(root);chains.push(chain);tasks.push(root,...chain);
  let parent=root;
  for(const child of chain){events.push({id:randomUUID(),action:'GOVERNANCE_REVIEW_QUEUED',resource:'AiAgentTask',resourceId:child.id,metadata:{sourceTaskId:parent.id,sourceRevision:parent.revision,fromAgentKey:parent.agentKey,toAgentKey:child.agentKey}});parent=child;}
  events.push({id:randomUUID(),action:'GOVERNANCE_FINAL_RECOMMENDATION_READY',resource:'AiAgentTask',resourceId:parent.id,metadata:{agentKey:'GOV_FINAL_GATE',requesterAccountId:actor.id,sourceTaskId:root.id,sourceRevision:root.revision,reviewCount:5,ownerApprovalRequired:true,approved:false}});
 }
 const beforeCalls=providerCalls();
 const snapshot=async()=>JSON.stringify(await Promise.all([db.aiAgentTask.findMany({where:{id:{in:tasks.map(t=>t.id)}},orderBy:{id:'asc'}}),db.auditEvent.findMany({where:{id:{in:events.map(e=>e.id)}},orderBy:{id:'asc'}})]));
 const summary=file=>({status:file.status,reason:file.reason,completedReviews:file.completedReviews,cost:file.cost,ownerApprovalRequired:file.ownerApprovalRequired,approved:false});
 const compare=async response=>{
  assert.equal(response.status,200);assert.equal(response.body.readOnly,true);
  for(const item of response.body.items){const detail=await call('/admin/agents/governance-reviews/'+item.source.id,token);assert.equal(detail.status,200);assert.deepEqual(summary(item),summary(detail.body));}
 };
 try{
  await db.aiAgentTask.createMany({data:tasks});await db.auditEvent.createMany({data:events});
  let queries=0;
  const countedDb={serializable:work=>runtimeDb.serializable(tx=>work(new Proxy(tx,{get(target,key){
   const value=Reflect.get(target,key);if(key==='$queryRaw')return(...args)=>{queries++;return value.apply(target,args);};
   if(value&&typeof value==='object')return new Proxy(value,{get(delegate,method){const fn=Reflect.get(delegate,method);return typeof fn==='function'?(...args)=>{queries++;return fn.apply(delegate,args);}:fn;}});
   return value;
  }})))};
  const page=await new GovernanceReviewInboxService(countedDb,agents).list(actor.id);
  assert.equal(page.items.length,20);assert.equal(page.nextCursor,roots[1].id);assert(page.items.every(item=>item.status==='READY_FOR_OWNER'&&item.completedReviews===6&&item.approved===false));
  assert(queries<=25,`20 six-stage files must use bounded batched reads, observed ${queries} database calls`);
  const beforeRead=await snapshot();await compare(await call('/admin/agents/governance-reviews',token));
  const next=await call('/admin/agents/governance-reviews?cursor='+page.nextCursor,token);assert.equal(next.status,200);assert.equal(next.body.items[0].source.id,roots[0].id);assert(!next.body.items.some(item=>page.items.some(first=>first.source.id===item.source.id)));
  assert.equal(await snapshot(),beforeRead,'Listing and detail must retain every task and receipt unchanged');
  // A duplicate for one parent cannot hide another parent's receipts.
  const duplicate={...events[7],id:randomUUID()};await db.auditEvent.create({data:duplicate});events.push(duplicate);
  const missing=events.find(e=>e.action==='GOVERNANCE_REVIEW_QUEUED'&&e.resourceId===chains[2][3].id);await db.auditEvent.delete({where:{id:missing.id}});
  await db.aiAgentTask.update({where:{id:chains[3][2].id},data:{requestedByAccountId:ordinary.id}});
  const final=events.find(e=>e.action==='GOVERNANCE_FINAL_RECOMMENDATION_READY'&&e.resourceId===chains[4][5].id);await db.auditEvent.delete({where:{id:final.id}});
  await db.aiAgentTask.update({where:{id:chains[5][1].id},data:{estimatedCostMicroUsd:null,unknownCostAttempts:1}});
  const bad=events.find(e=>e.action==='GOVERNANCE_REVIEW_QUEUED'&&e.resourceId===chains[6][0].id);await db.auditEvent.update({where:{id:bad.id},data:{metadata:{...bad.metadata,sourceRevision:randomUUID()}}});
  const changed=await call('/admin/agents/governance-reviews',token);await compare(changed);
  for(const i of [1,2,3,4,6])assert.equal(changed.body.items.find(x=>x.source.id===roots[i].id).status,'INTEGRITY_REVIEW_REQUIRED');
  assert.equal(changed.body.items.find(x=>x.source.id===roots[5].id).cost.estimatedMicroUsd,null);
  assert.equal(changed.body.items.find(x=>x.source.id===roots[7].id).status,'READY_FOR_OWNER');
  // A completed correction also verifies its original non-correction root.
  // Neither a second receipt nor the new draft can confer a reviewed status.
  const source=roots[8],review=chains[8][0];
  await db.aiAgentTask.update({where:{id:review.id},data:{result:JSON.stringify({decision:'RETURN_FOR_CORRECTION',riskLevel:'LOW',findings:['Clarify the draft'],evidenceGaps:[],ownerEscalationRequired:false})}});
  const revised={...source,id:randomUUID(),revision:randomUUID(),requestKey:correctionRequestId(source.id),fingerprint:correctionFingerprint(source,review),createdAt:new Date(now+1000),result:'Revised experimental draft'};
  tasks.push(revised);await db.aiAgentTask.create({data:revised});
  const optIn={id:randomUUID(),action:'AI_TASK_QUEUED',resource:'AiAgentTask',resourceId:source.id,metadata:{correctionPolicy:DRAFT_CORRECTION_POLICY,agentKey:source.agentKey,action:source.action,language:source.language,requesterAccountId:actor.id}};
  const correction={id:randomUUID(),action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',resource:'AiAgentTask',resourceId:revised.id,metadata:{sourceTaskId:source.id,sourceRevision:source.revision,reviewTaskId:review.id,reviewRevision:review.revision,policy:DRAFT_CORRECTION_POLICY,maxRounds:1,agentKey:source.agentKey,requesterAccountId:actor.id}};
  events.push(optIn,correction);await db.auditEvent.createMany({data:[optIn,correction]});
  const corrected=await call('/admin/agents/governance-reviews',token);await compare(corrected);
  assert.equal(corrected.body.items.find(x=>x.source.id===revised.id).status,'NOT_STARTED');
  assert.equal((await call('/admin/agents/governance-reviews/'+source.id,token)).body.draftCorrection.status,'LINKED');
  const conflictingCorrection={...correction,id:randomUUID()};events.push(conflictingCorrection);await db.auditEvent.create({data:conflictingCorrection});
  const conflicted=await call('/admin/agents/governance-reviews',token);await compare(conflicted);
  assert.equal(conflicted.body.items.find(x=>x.source.id===revised.id).reason,'DRAFT_CORRECTION_SOURCE_INVALID');
  assert.deepEqual(providerCalls(),beforeCalls,'Inbox reads cannot count tokens, dispatch, or generate');
  console.log(`Governance inbox batch PostgreSQL/HTTP passed: 20 six-stage files in ${queries} reads; per-parent duplicate detection; missing links/final receipts; requester/revision conflicts; unknown cost; cursor continuity; correction lineage and conflicting receipts; detail parity; immutable evidence; no model traffic.`);
 }finally{
  await db.auditEvent.deleteMany({where:{id:{in:events.map(e=>e.id)}}});await db.aiAgentTask.deleteMany({where:{id:{in:tasks.map(t=>t.id)}}});
 }
 // Compare existing correction and operations-evidence fixtures too. This uses
 // the independent unbatched detail path as the verifier for every listed item.
 await compare(await call('/admin/agents/governance-reviews',token));
}
