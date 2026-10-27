import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Runs only inside the existing disposable HTTP/PostgreSQL/loopback-model
// acceptance harness. There are no external providers or production writes.
export async function governanceCorrectionAcceptance({db,service,runtime,audit,provider,actor,token,call,catalog,control,enqueue,setModelText,payloads,providerCalls}){
 const policy='ONE_DRAFT_REVISION_V1',order=['GOV_QUALITY_AUDIT','GOV_TECH_REVIEW','GOV_SECURITY_RISK','GOV_COMPLIANCE_POLICY','GOV_VERIFICATION','GOV_FINAL_GATE'];
 const pass={decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false};
 const fix={...pass,decision:'RETURN_FOR_CORRECTION',riskLevel:'MEDIUM',findings:['Shorten the draft within the original brief.']};
 const events=(id,action)=>db.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:id,action}});
 const child=async(id,action)=>{const links=await db.auditEvent.findMany({where:{resource:'AiAgentTask',action,metadata:{path:['sourceTaskId'],equals:id}}});assert.equal(links.length,1);return db.aiAgentTask.findUniqueOrThrow({where:{id:links[0].resourceId}});};
 const file=async id=>{const r=await call('/admin/agents/governance-reviews/'+id,token);assert.equal(r.status,200);return r.body;};
 const business=async()=>Promise.all([db.managedDocument.count(),db.documentTemplate.count(),db.policyControl.count(),db.roleAssignment.count()]);
 const beforeBusiness=await business();
 const isolate=async()=>{
  for(const key of ['SUPPORT',...order])assert.equal((await control('PAUSED',key)).status,200);
  for(const t of await db.aiAgentTask.findMany({where:{state:'QUEUED'}}))assert.equal((await call('/admin/agents/tasks/'+t.id+'/decision',token,{action:'CANCEL',expectedRevision:t.revision,reason:'Isolate bounded correction acceptance',reviewed:true},'PATCH')).status,200);
 };
 const run=async(key,text)=>{setModelText(text);await service.heartbeat();assert.equal((await control('ENABLED',key)).status,200);const claim=await service.claim();assert.equal(claim?.task.agentKey,key);await service.runClaim(claim);assert.equal((await control('PAUSED',key)).status,200);return db.aiAgentTask.findUniqueOrThrow({where:{id:claim.task.id}});};
 const start=async(opt=true)=>{await isolate();const r=await enqueue('Write a brief draft from the supplied public facts only.','SUPPORT',opt?{correctionPolicy:policy}:{});assert.equal(r.status,201);const source=await run('SUPPORT','Original draft remains unchanged.');assert.equal(source.id,r.body.id);return{source,review:await child(source.id,'GOVERNANCE_REVIEW_QUEUED')};};
 try{
  await isolate();
  for(const [key,action,correctionPolicy] of [['SUPPORT','READ_OPERATIONS',policy],['GOV_QUALITY_AUDIT','DRAFT_REPORT',policy],['LEGAL_RISK','DRAFT_REPORT',policy],['CYBER_SECURITY','DRAFT_REPORT',policy],['SUPPORT','DRAFT_MESSAGE',true],['SUPPORT','DRAFT_MESSAGE','TWO_ROUNDS']])assert.equal((await enqueue('Reject an unsupported correction grant',key,{action,correctionPolicy})).status,400);
  const requestId=randomUUID(),first=await enqueue('Stable correction opt in','SUPPORT',{requestId,correctionPolicy:policy});assert.equal(first.status,201);assert.equal((await enqueue('Stable correction opt in','SUPPORT',{requestId,correctionPolicy:policy})).body.id,first.body.id);assert.equal((await enqueue('Stable correction opt in','SUPPORT',{requestId})).status,409);

  // One revision, immutable original, paused/budget-held queue, exact linked
  // input and all six reviews restarted on the new source.
  const normal=await start(),original=normal.source;
  const stopped=await run(order[0],JSON.stringify(fix)),correction=await child(original.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED');
  assert.equal(correction.agentKey,'SUPPORT');assert.equal(correction.action,original.action);assert.equal(correction.prompt,original.prompt);assert.equal(correction.state,'QUEUED');assert.equal(await service.claim(),null);
  const limited=runtime(audit,{configuration:()=>({...provider.configuration(),dailyBudgetMicroUsd:0})});assert.equal(await limited.claim(),null);
  const calls=providerCalls();await Promise.all([service.finish(stopped.id,stopped.claimId,{text:stopped.result,inputTokens:1,outputTokens:1,estimatedCostMicroUsd:1}),service.finish(stopped.id,stopped.claimId,{text:stopped.result,inputTokens:1,outputTokens:1,estimatedCostMicroUsd:1})]);assert.deepEqual(providerCalls(),calls);assert.equal((await db.auditEvent.findMany({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:original.id}}})).length,1);
  const originalFile=await file(original.id);assert.equal(originalFile.status,'CORRECTION_REQUIRED');assert.equal(originalFile.draftCorrection.taskId,correction.id);assert.equal(originalFile.draftCorrection.state,'QUEUED');
  await run('SUPPORT','Revised brief draft.');const sent=JSON.parse(payloads.at(-1).input[1].content);assert.equal(sent.draftCorrection.source.result,original.result);assert.equal(sent.draftCorrection.source.prompt,original.prompt);assert.equal(sent.draftCorrection.reviews.at(-1).id,stopped.id);assert.equal(sent.draftCorrection.maxRounds,1);assert.equal(sent.draftCorrection.round,1);
  for(const key of order)await run(key,JSON.stringify(pass));
  const ready=await file(correction.id);assert.equal(ready.status,'READY_FOR_OWNER');assert.equal(ready.completedReviews,6);assert.equal(ready.approved,false);assert.equal(ready.ownerApprovalRequired,true);assert.deepEqual(await db.aiAgentTask.findUniqueOrThrow({where:{id:original.id}}),original);assert.equal((await file(original.id)).status,'CORRECTION_REQUIRED');assert.equal((await file(original.id)).draftCorrection.taskId,correction.id);


  const grant=(await events(original.id,'AI_TASK_QUEUED'))[0];await db.auditEvent.update({where:{id:grant.id},data:{metadata:{...grant.metadata,correctionPolicy:'INVALID'}}});
  const brokenReady=await file(correction.id);assert.equal(brokenReady.status,'INTEGRITY_REVIEW_REQUIRED');assert.equal(brokenReady.reason,'DRAFT_CORRECTION_SOURCE_INVALID');assert.equal(brokenReady.ownerApprovalRequired,false);assert.equal(brokenReady.approved,false);await db.auditEvent.update({where:{id:grant.id},data:{metadata:grant.metadata}});assert.equal((await file(correction.id)).status,'READY_FOR_OWNER');

  // Legacy tasks, evidence gaps, escalation and a second correction are never
  // turned into another model request or a fabricated source.
  for(const [opt,review] of [[false,fix],[true,{...fix,evidenceGaps:['Missing original evidence']}],[true,{...fix,riskLevel:'HIGH'}],[true,{...fix,ownerEscalationRequired:true}],[true,{...fix,findings:[]}]]){
   const t=await start(opt),r=await run(order[0],JSON.stringify(review));assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:t.source.id}}}),0);assert.equal((await call('/admin/agents/tasks/'+r.id+'/draft-correction',token,{expectedRevision:r.revision,reason:'Refuse an ineligible correction retry',reviewed:true})).status,409);
  }
  const once=await start();await run(order[0],JSON.stringify(fix));const onceChild=await child(once.source.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED');await run('SUPPORT','One revised draft');await run(order[0],JSON.stringify(fix));assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:onceChild.id}}}),0);

  // A forged or stale source cannot reach token counting or generation.
  for(const kind of ['source-revision','review-revision','duplicate-link','source-policy','wrong-action','wrong-request-key','wrong-link-requester']){
   const t=await start();const r=await run(order[0],JSON.stringify(fix)),c=await child(t.source.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED');
   if(kind==='source-revision')await db.aiAgentTask.update({where:{id:t.source.id},data:{revision:randomUUID()}});
   if(kind==='review-revision')await db.aiAgentTask.update({where:{id:r.id},data:{revision:randomUUID()}});
   if(kind==='wrong-request-key')await db.aiAgentTask.update({where:{id:c.id},data:{requestKey:randomUUID()}});
   if(kind==='wrong-link-requester'){const e=(await events(c.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED'))[0];await db.auditEvent.update({where:{id:e.id},data:{metadata:{...e.metadata,requesterAccountId:randomUUID()}}});}
   if(kind==='wrong-action')await db.aiAgentTask.update({where:{id:c.id},data:{action:'READ_OPERATIONS'}});
   if(kind==='duplicate-link'){const e=(await events(c.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED'))[0];await audit.record({action:e.action,resource:'AiAgentTask',resourceId:c.id,metadata:e.metadata});}
   if(kind==='source-policy'){const e=(await events(t.source.id,'AI_TASK_QUEUED'))[0];await db.auditEvent.update({where:{id:e.id},data:{metadata:{...e.metadata,correctionPolicy:'INVALID'}}});}
   const unsafeFile=await file(t.source.id);assert.equal(unsafeFile.draftCorrection.status,'INTEGRITY_REVIEW_REQUIRED');assert.equal(unsafeFile.draftCorrection.taskId,undefined);
   const callsBefore=providerCalls();const failed=await run('SUPPORT','This must never be generated');assert.equal(failed.id,c.id);assert.equal(failed.state,'FAILED');assert.equal(failed.errorCode,'DRAFT_CORRECTION_SOURCE_INVALID');assert.deepEqual(providerCalls(),callsBefore);assert.equal(failed.result,null);
  }

  // Completion, the new queue entry and its audit receipt must commit
  // together. Retrying persistence never repeats the model request.
  const atomic=await start();await service.heartbeat();assert.equal((await control('ENABLED',order[0])).status,200);const atomicClaim=await service.claim();assert.equal(atomicClaim.task.id,atomic.review.id);
  const atomicResult={text:JSON.stringify(fix),inputTokens:64,outputTokens:32,estimatedCostMicroUsd:96},atomicCalls=providerCalls();
  const failingCompletion=runtime({record:async(...args)=>{if(args[0].action==='GOVERNANCE_DRAFT_CORRECTION_QUEUED')throw new Error('Injected automatic correction audit failure');return audit.record(...args);}});
  await assert.rejects(()=>failingCompletion.finish(atomicClaim.task.id,atomicClaim.task.claimId,atomicResult),/Injected automatic correction audit/);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:atomic.review.id}})).state,'RUNNING');assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:atomic.source.id}}}),0);
  await service.finish(atomicClaim.task.id,atomicClaim.task.claimId,atomicResult);assert.equal((await child(atomic.source.id,'GOVERNANCE_DRAFT_CORRECTION_QUEUED')).state,'QUEUED');assert.deepEqual(providerCalls(),atomicCalls);assert.equal((await control('PAUSED',order[0])).status,200);

  // Revocation while a review is in flight retains its result but cannot
  // authorize a follow-up draft. It also cannot be manually resumed while revoked.
  const revoked=await start();await service.heartbeat();assert.equal((await control('ENABLED',order[0])).status,200);const revokedClaim=await service.claim();assert.equal(revokedClaim.task.id,revoked.review.id);
  await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
  try{await service.finish(revokedClaim.task.id,revokedClaim.task.claimId,atomicResult);assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:revoked.source.id}}}),0);assert.equal((await events(revoked.review.id,'GOVERNANCE_REVIEW_STOPPED'))[0].metadata.draftCorrection.status,'REQUESTER_AUTH_REVOKED');}finally{await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});}
  assert.equal((await control('PAUSED',order[0])).status,200);

  // A full queue retains the source and permits one explicit, idempotent retry
  // after capacity returns. Fresh authority and version checks apply.
  const full=await start(),fillers=Array.from({length:100},()=>({id:randomUUID(),agentKey:'SUPPORT',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'correction-pressure-fixture',action:'DRAFT_MESSAGE',language:'ar-SA',prompt:'Disposable queue fixture'}));await db.aiAgentTask.createMany({data:fillers});const deferred=await run(order[0],JSON.stringify(fix));assert.equal((await events(deferred.id,'GOVERNANCE_REVIEW_STOPPED'))[0].metadata.draftCorrection.status,'QUEUE_FULL');
  const path='/admin/agents/tasks/'+deferred.id+'/draft-correction',body={expectedRevision:deferred.revision,reason:'Resume one explicitly authorized draft revision',reviewed:true};assert.equal((await call(path,token,body)).status,409);assert.equal((await call(path,null,body)).status,401);assert.equal((await call(path,token,{...body,reviewed:false})).status,400);assert.equal((await call(path,token,{...body,expectedRevision:randomUUID()})).status,409);
  await db.aiAgentTask.deleteMany({where:{id:{in:fillers.map(x=>x.id)}}});
  const broken=runtime({record:async(...args)=>{if(args[0].action==='GOVERNANCE_DRAFT_CORRECTION_QUEUED')throw new Error('Injected correction audit failure');return audit.record(...args);}});
  await assert.rejects(()=>broken.resumeDraftCorrection(actor.id,deferred.id,body),/Injected correction audit/);assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:full.source.id}}}),0);
  const beforeResume=providerCalls(),replies=await Promise.all([call(path,token,body),call(path,token,body)]);assert(replies.every(r=>r.status===201));assert.equal(replies[0].body.correctionTaskId,replies[1].body.correctionTaskId);assert.equal((await events(deferred.id,'GOVERNANCE_DRAFT_CORRECTION_RESUMED')).length,1);assert.deepEqual(providerCalls(),beforeResume);assert.deepEqual(await db.aiAgentTask.findUniqueOrThrow({where:{id:full.source.id}}),full.source);
  await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await call(path,token,body)).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  assert.deepEqual(await business(),beforeBusiness);
  console.log('Bounded draft correction HTTP/PostgreSQL passed: explicit one-round opt-in; immutable source and reviews; exact linked provider input; six restarted reviews; no legacy/evidence-gap/high-risk/second-round correction; invalid source blocks counting and generation; paused and budget-held queues; full-queue recovery; concurrent idempotency; audit rollback; fresh authority; no business writes. Model traffic was loopback only.');
 }finally{setModelText(null);await isolate();}
}
