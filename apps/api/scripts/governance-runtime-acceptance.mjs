import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Called only from the loopback HTTP/PostgreSQL/model fixture; never production.
export async function governanceRuntimeAcceptance({db,service,runtime,audit,provider,actor,ordinary,token,call,catalog,control,enqueue,setModelText,payloads,providerCalls}){
 const order=['GOV_QUALITY_AUDIT','GOV_TECH_REVIEW','GOV_SECURITY_RISK','GOV_COMPLIANCE_POLICY','GOV_VERIFICATION','GOV_FINAL_GATE'];
 const pass={decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false};
 const business=async()=>Promise.all([db.managedDocument.count(),db.documentTemplate.count(),db.policyControl.count(),db.roleAssignment.count()]);
 const beforeBusiness=await business();
 assert.equal((await control('PAUSED')).status,200);
 for(const task of await db.aiAgentTask.findMany({where:{agentKey:{in:order},state:'QUEUED'}})){
  assert.equal((await call('/admin/agents/tasks/'+task.id+'/decision',token,{action:'CANCEL',expectedRevision:task.revision,reason:'Isolate governance acceptance queue',reviewed:true},'PATCH')).status,200);
 }
 const existing=(await catalog()).items.find(x=>x.key==='SUPPORT');
 const retainedTasks=await db.aiAgentTask.count();
 await db.aiAgentRuntime.delete({where:{key:'GOV_FINAL_GATE'}});
 await db.aiAgentRuntime.create({data:{key:'LEGACY_UNKNOWN_FIXTURE',lastAdminAccountId:actor.id}});
 assert.equal((await catalog()).initialized,false);
 assert.equal((await call('/admin/agents/initialize',token,{reason:'Additive setup preserves controls and tasks',reviewed:true})).status,201);
 assert.equal((await catalog()).items.find(x=>x.key==='SUPPORT').revision,existing.revision);
 assert.equal(await db.aiAgentTask.count(),retainedTasks);assert.equal(await db.aiAgentRuntime.count(),15);assert.equal((await catalog()).initialized,true);
 await db.aiAgentRuntime.delete({where:{key:'LEGACY_UNKNOWN_FIXTURE'}});
 for(const item of (await catalog()).items.filter(x=>order.includes(x.key))){assert.equal(item.state,'PAUSED');assert.deepEqual(item.allowedActions,['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL']);}
 const audits=async(id,action)=>db.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:id,action}});
 const readFile=async id=>{const response=await call('/admin/agents/governance-reviews/'+id,token);assert.equal(response.status,200);assert.equal(response.cacheControl,'no-store');return response.body;};
 const ledgerSnapshot=async()=>JSON.stringify(await Promise.all([db.aiAgentRuntime.findMany({orderBy:{key:'asc'}}),db.aiAgentTask.findMany({orderBy:{id:'asc'}}),db.auditEvent.findMany({orderBy:{id:'asc'}}),db.operationalSetting.findMany({orderBy:{key:'asc'}})]));
 const childOf=async id=>{const events=await db.auditEvent.findMany({where:{action:'GOVERNANCE_REVIEW_QUEUED',resource:'AiAgentTask'}});const matches=events.filter(x=>x.metadata?.sourceTaskId===id);assert.equal(matches.length,1);return db.aiAgentTask.findUniqueOrThrow({where:{id:matches[0].resourceId}});};
 const run=async(key,text)=>{await service.heartbeat();assert.equal((await control('ENABLED',key)).status,200);setModelText(text);const claim=await service.claim();assert.equal(claim?.task.agentKey,key);await service.runClaim(claim);assert.equal((await control('PAUSED',key)).status,200);return claim;};
 const start=async()=>{const created=await enqueue('متطلبات أصلية يجب أن تراها جميع البوابات','SUPPORT',{action:'READ_OPERATIONS'});assert.equal(created.status,201);await run('SUPPORT','مخرج أصلي كامل '+'.'.repeat(1300)+' نهاية الدليل الأصلي');return{root:created.body,review:await childOf(created.body.id),input:JSON.parse(payloads.at(-1).input[1].content).aggregateOperations};};
 try{
  // The six agents must see the original brief/output and all prior reviews,
  // rather than reviewing a truncated review of a review.
  const chain=await start();let current=chain.review;
  const queuedFile=await readFile(chain.root.id);assert.equal(queuedFile.status,'WAITING_FOR_REVIEW');assert.equal(queuedFile.reviews[0].state,'QUEUED');assert.equal(queuedFile.ownerApprovalRequired,false);
  for(let index=0;index<order.length;index++){
   assert.equal(current.agentKey,order[index]);assert.equal(await service.claim(),null,'Paused reviews never dispatch');
   const claim=await run(order[index],JSON.stringify(index===1?{...pass,decision:'PASS_WITH_NOTES',findings:['ملاحظة غير حاجبة']}:pass));
   const body=JSON.parse(payloads.at(-1).input[1].content),context=body.governanceReview;
   assert.equal(context.source.id,chain.root.id);assert.equal(context.source.prompt,chain.root.prompt);assert(context.source.result.endsWith('نهاية الدليل الأصلي'));assert(context.source.result.length>1200);assert.equal(context.reviews.length,index);assert.deepEqual(context.reviews.map(x=>x.agentKey),order.slice(0,index));assert.equal(body.aggregateOperations,undefined);assert.equal(context.source.operationsEvidence.status,'RECORDED');assert.deepEqual(context.source.operationsEvidence.values,chain.input);assert(payloads.at(-1).input[0].content.includes('Your stage is '+(index+1)+' of 6'));assert(!JSON.stringify(context).includes('claimId'));assert(!JSON.stringify(context).includes('digest'));
   await runtime().runClaim(claim); // ambiguous completion retry must not fan out
   if(index<order.length-1)current=await childOf(current.id);
  }
  const finalEvents=await audits(current.id,'GOVERNANCE_FINAL_RECOMMENDATION_READY');assert.equal(finalEvents.length,1);assert.equal(finalEvents[0].metadata.reviewCount,5);assert.equal(finalEvents[0].metadata.ownerApprovalRequired,true);assert.equal(finalEvents[0].metadata.approved,false);
  const finalList=await call('/admin/agents/GOV_FINAL_GATE/tasks',token);assert.equal(finalList.status,200);assert.equal(finalList.body.items.find(x=>x.id===current.id).approvalRequired,true);
  assert.deepEqual(finalList.body.items.find(x=>x.id===current.id).governanceRouting,{status:'OWNER_RECOMMENDATION_READY',ownerApprovalRequired:true,approved:false});
  const beforeRead=await ledgerSnapshot(),readyFile=await readFile(chain.root.id);
  assert.equal(readyFile.status,'READY_FOR_OWNER');assert.equal(readyFile.completedReviews,6);assert.equal(readyFile.ownerApprovalRequired,true);assert.equal(readyFile.approved,false);assert.equal(readyFile.source.prompt,chain.root.prompt);assert(readyFile.source.result.endsWith('نهاية الدليل الأصلي'));assert.deepEqual(readyFile.reviews.map(x=>x.agentKey),order);assert.equal(readyFile.cost.taskCount,7);
  const readySummary=await call('/admin/agents/governance-reviews',token);assert.equal(readySummary.status,200);assert.equal(readySummary.body.items.find(x=>x.source.id===chain.root.id).status,'READY_FOR_OWNER');assert(!JSON.stringify(readySummary.body).includes('متطلبات أصلية'));assert(!JSON.stringify(readyFile).includes('requestedByAccountId'));assert(!JSON.stringify(readyFile).includes('requestKey'));assert.equal(await ledgerSnapshot(),beforeRead,'Inbox reads must not write or dispatch');
  const captured=await audits(chain.root.id,'AI_TASK_OPERATIONS_CAPTURED');assert.equal(captured.length,1);
  assert.deepEqual(readyFile.source.operationsEvidence.values,chain.input);assert.equal(readyFile.source.operationsEvidence.status,'RECORDED');assert(!JSON.stringify(readyFile).includes('claimId'));assert(!JSON.stringify(readyFile).includes('digest'));assert(!JSON.stringify(readySummary.body).includes('operationsEvidence'));
  const savedSource=await db.aiAgentTask.findUniqueOrThrow({where:{id:chain.root.id}});
  await db.aiAgentTask.update({where:{id:chain.root.id},data:{claimId:randomUUID()}});
  const invalidEvidence=await readFile(chain.root.id);assert.equal(invalidEvidence.status,'EVIDENCE_REQUIRED');assert.equal(invalidEvidence.source.operationsEvidence.status,'INVALID');assert.equal(invalidEvidence.reviews.filter(r=>r.state==='COMPLETED').length,6);assert.equal(invalidEvidence.approved,false);
  await db.aiAgentTask.update({where:{id:chain.root.id},data:{claimId:savedSource.claimId}});
  const legacy=await db.aiAgentTask.create({data:{agentKey:'SUPPORT',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'legacy-no-aggregate-evidence',action:'READ_OPERATIONS',language:'ar-SA',prompt:'Historical read',state:'COMPLETED',result:'Historical output without a recorded input'}});
  const legacyBefore=await ledgerSnapshot(),legacyFile=await readFile(legacy.id);assert.equal(legacyFile.status,'EVIDENCE_REQUIRED');assert.equal(legacyFile.source.operationsEvidence.status,'NOT_RECORDED');assert.equal(await ledgerSnapshot(),legacyBefore,'Never backfill missing historical input');
  const failedCapture=await enqueue('Snapshot audit failure must prevent any model call','SUPPORT',{action:'READ_OPERATIONS'});await service.heartbeat();assert.equal((await control('ENABLED')).status,200);const captureClaim=await service.claim();assert.equal(captureClaim.task.id,failedCapture.body.id);const callsBeforeCaptureFailure=payloads.length;
  const failCapture=runtime({record:async(...args)=>{if(args[0].action==='AI_TASK_OPERATIONS_CAPTURED')throw new Error('Injected snapshot audit failure');return audit.record(...args);}});
  await failCapture.runClaim(captureClaim);assert.equal(payloads.length,callsBeforeCaptureFailure);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:failedCapture.body.id}})).state,'FAILED');assert.equal((await audits(failedCapture.body.id,'AI_TASK_OPERATIONS_CAPTURED')).length,0);assert.equal((await catalog()).items.find(x=>x.key==='SUPPORT').state,'PAUSED');
  // A correction, missing evidence, invalid output and owner escalation each
  // stop routing, with no business mutation or fabricated approval.
  for(const [text,outcome] of [
   [JSON.stringify({...pass,decision:'RETURN_FOR_CORRECTION',findings:['تحتاج مراجعة']}),'CORRECTION_REQUIRED'],
   [JSON.stringify({...pass,evidenceGaps:['لا يوجد إثبات اختبار']}),'CORRECTION_REQUIRED'],
   ['PASS','INVALID_REVIEW'],
   [JSON.stringify({...pass,riskLevel:'HIGH'}),'OWNER_ESCALATION_REQUIRED'],
   [JSON.stringify({...pass,ownerEscalationRequired:true}),'OWNER_ESCALATION_REQUIRED'],
  ]){
   const test=await start();await run('GOV_QUALITY_AUDIT',text);
   const stopped=await audits(test.review.id,'GOVERNANCE_REVIEW_STOPPED');assert.equal(stopped.length,1);assert.equal(stopped[0].metadata.outcome,outcome);
   const viewed=await readFile(test.root.id);assert.equal(viewed.status,outcome==='OWNER_ESCALATION_REQUIRED'?'OWNER_ESCALATION_REQUIRED':outcome==='INVALID_REVIEW'?'EVIDENCE_REQUIRED':'CORRECTION_REQUIRED');assert.equal(viewed.approved,false);
   if(outcome==='OWNER_ESCALATION_REQUIRED'){
    const source=await db.aiAgentTask.findUniqueOrThrow({where:{id:test.root.id}});await db.aiAgentTask.update({where:{id:source.id},data:{claimId:randomUUID()}});const escalated=await readFile(source.id);assert.equal(escalated.source.operationsEvidence.status,'INVALID');assert.equal(escalated.status,'OWNER_ESCALATION_REQUIRED');assert.equal(escalated.ownerApprovalRequired,true);assert.equal(escalated.reviews[0].state,'COMPLETED');await db.aiAgentTask.update({where:{id:source.id},data:{claimId:source.claimId}});
   }
   const next=await db.auditEvent.findMany({where:{action:'GOVERNANCE_REVIEW_QUEUED'}});assert(!next.some(x=>x.metadata?.sourceTaskId===test.review.id));const stoppedTask=await db.aiAgentTask.findUniqueOrThrow({where:{id:test.review.id}});assert.equal((await call('/admin/agents/tasks/'+stoppedTask.id+'/governance-resume',token,{expectedRevision:stoppedTask.revision,reason:'Do not bypass correction or owner escalation',reviewed:true})).status,409);
  }
  // Directly asking the final agent cannot forge the five earlier gates.
  const assertBlockedSource=async(id,key)=>{const before=providerCalls();await run(key,JSON.stringify(pass));assert.deepEqual(providerCalls(),before,'Invalid source must prevent token counting and generation');const task=await db.aiAgentTask.findUniqueOrThrow({where:{id}});assert.equal(task.state,'FAILED');assert.equal(task.errorCode,'GOVERNANCE_SOURCE_INVALID');assert.equal(task.result,null);assert.equal((await audits(id,'AI_TASK_EXECUTION_FAILED')).length,1);assert.equal((await audits(id,'GOVERNANCE_REVIEW_STOPPED')).length,0);assert.equal((await audits(id,'GOVERNANCE_FINAL_RECOMMENDATION_READY')).length,0);assert.equal((await catalog()).items.find(x=>x.key===key).state,'PAUSED');assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:id}}}),0);};
  const standalone=await enqueue('لا تعتمد بوابات لم تراجع','GOV_FINAL_GATE',{action:'READ_OPERATIONS'});assert.equal(standalone.status,201);await assertBlockedSource(standalone.body.id,'GOV_FINAL_GATE');
  assert.equal((await call('/admin/agents/governance-reviews/'+standalone.body.id,token)).status,404);
  // Invalid lineage is never replaced by model-supplied IDs or another actor.
  const tampered=await start();await db.aiAgentTask.update({where:{id:tampered.root.id},data:{revision:randomUUID()}});await assertBlockedSource(tampered.review.id,'GOV_QUALITY_AUDIT');
  assert.equal((await readFile(tampered.root.id)).status,'INTEGRITY_REVIEW_REQUIRED');
  // The worker applies the same receipt and scope checks as the read-only inbox.
  for(const kind of ['duplicate','wrong-from','wrong-to','wrong-requester','wrong-language','missing-source']){
   const test=await start(),source=await db.aiAgentTask.findUniqueOrThrow({where:{id:test.root.id}}),link=(await audits(test.review.id,'GOVERNANCE_REVIEW_QUEUED'))[0];
   if(kind==='duplicate')await audit.record({action:link.action,resource:'AiAgentTask',resourceId:test.review.id,metadata:link.metadata});
   else if(kind==='wrong-from'||kind==='wrong-to'||kind==='missing-source')await db.auditEvent.update({where:{id:link.id},data:{metadata:{...link.metadata,...(kind==='wrong-from'?{fromAgentKey:'SALES'}:kind==='wrong-to'?{toAgentKey:'GOV_FINAL_GATE'}:{sourceTaskId:randomUUID()})}}});
   else await db.aiAgentTask.update({where:{id:source.id},data:kind==='wrong-requester'?{requestedByAccountId:ordinary.id}:{language:'en'}});
   const preserved=await db.aiAgentTask.findUniqueOrThrow({where:{id:source.id}});await assertBlockedSource(test.review.id,'GOV_QUALITY_AUDIT');assert.deepEqual(await db.aiAgentTask.findUniqueOrThrow({where:{id:source.id}}),preserved,'Blocked review must retain original source');
  }
  for(const kind of ['wrong-action','noncontinuing-review']){
   const test=await start();await run('GOV_QUALITY_AUDIT',JSON.stringify(pass));const technical=await childOf(test.review.id);
   await db.aiAgentTask.update({where:{id:test.review.id},data:kind==='wrong-action'?{action:'DRAFT_REPORT'}:{result:JSON.stringify({...pass,decision:'RETURN_FOR_CORRECTION',findings:['Late invalid prior review fixture']})}});
   const retained=await db.aiAgentTask.findUniqueOrThrow({where:{id:test.review.id}});await assertBlockedSource(technical.id,'GOV_TECH_REVIEW');assert.deepEqual(await db.aiAgentTask.findUniqueOrThrow({where:{id:test.review.id}}),retained,'A later invalid chain keeps its prior review');
  }
  // Queue pressure defers routing without losing the completed source result.
  const fillers=[];for(let i=0;i<100;i++)fillers.push({agentKey:order[0],requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'isolated-pressure',action:'READ_OPERATIONS',language:'ar-SA',prompt:'Isolated pressure fixture'});
  await db.aiAgentTask.createMany({data:fillers});const full=await enqueue('حفظ المصدر عند امتلاء الطابور');await run('SUPPORT','مخرج محفوظ رغم امتلاء الطابور');assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:full.body.id}})).state,'COMPLETED');assert.equal((await audits(full.body.id,'GOVERNANCE_ROUTE_DEFERRED'))[0].metadata.reason,'GOVERNANCE_QUEUE_FULL');assert.equal((await readFile(full.body.id)).status,'ROUTE_DEFERRED');assert.equal(await db.aiAgentTask.count({where:{agentKey:order[0],state:'QUEUED'}}),100);const stillFull=await db.aiAgentTask.findUniqueOrThrow({where:{id:full.body.id}}),beforeFullResume=providerCalls();assert.equal((await call('/admin/agents/tasks/'+full.body.id+'/governance-resume',token,{expectedRevision:stillFull.revision,reason:'Review route still has no capacity',reviewed:true})).status,409);assert.equal((await audits(full.body.id,'GOVERNANCE_ROUTE_DEFERRED')).length,1);assert.deepEqual(providerCalls(),beforeFullResume);await db.aiAgentTask.deleteMany({where:{requestKey:{in:fillers.map(x=>x.requestKey)}}});
  // A human can resume only an operationally deferred route. The original
  // output remains immutable and concurrent requests create one linked review.
  const resumeBody={expectedRevision:full.body.revision,reason:'Resume the retained output after queue capacity returns',reviewed:true};
  const fullSource=await db.aiAgentTask.findUniqueOrThrow({where:{id:full.body.id}});resumeBody.expectedRevision=fullSource.revision;
  const resumePath='/admin/agents/tasks/'+full.body.id+'/governance-resume',resumeCalls=providerCalls();
  assert.equal((await call(resumePath,null,resumeBody)).status,401);
  const ordinaryLogin=await call('/auth/login',null,{email:ordinary.email,password:'Ai-runtime-fixture-only-2026!'});assert.equal(ordinaryLogin.status,200);
  assert.equal((await call(resumePath,ordinaryLogin.body.accessToken,resumeBody)).status,403);
  assert.equal((await call(resumePath,token,{...resumeBody,reviewed:false})).status,400);
  assert.equal((await call(resumePath,token,{...resumeBody,expectedRevision:randomUUID()})).status,409);
  const failResume=runtime({record:async(...args)=>{if(args[0].action==='GOVERNANCE_ROUTE_RESUMED')throw new Error('Injected resume audit failure');return audit.record(...args);}});
  await assert.rejects(()=>failResume.resumeGovernance(actor.id,full.body.id,resumeBody),/Injected resume audit failure/);
  assert.equal((await audits(full.body.id,'GOVERNANCE_ROUTE_RESUMED')).length,0);
  assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:full.body.id}}}),0);
  const resumed=await Promise.all([call(resumePath,token,resumeBody),call(resumePath,token,resumeBody)]);assert(resumed.every(r=>r.status===201));assert.equal(resumed[0].body.reviewTaskId,resumed[1].body.reviewTaskId);assert.deepEqual(resumed.map(r=>r.body.resumed).sort(),[false,true]);
  const resumedChild=await childOf(full.body.id);assert.equal(resumedChild.state,'QUEUED');assert.equal(resumedChild.agentKey,order[0]);assert.equal((await audits(full.body.id,'GOVERNANCE_ROUTE_RESUMED')).length,1);assert.deepEqual(providerCalls(),resumeCalls);assert.deepEqual(await db.aiAgentTask.findUniqueOrThrow({where:{id:full.body.id}}),fullSource);
  assert.equal((await readFile(full.body.id)).status,'WAITING_FOR_REVIEW');const sourceList=await call('/admin/agents/SUPPORT/tasks',token);assert.equal(sourceList.body.items.find(t=>t.id===full.body.id).governanceRouting.status,'MANUAL_ROUTE_RESUMED');
  assert.equal((await call('/admin/agents/tasks/'+resumedChild.id+'/decision',token,{action:'CANCEL',expectedRevision:resumedChild.revision,reason:'Isolate the resumed review fixture without dispatch',reviewed:true},'PATCH')).status,200);
  const unlinkedDraft=await db.aiAgentTask.create({data:{agentKey:'SUPPORT',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'isolated-no-deferred-route',action:'DRAFT_REPORT',language:'ar-SA',prompt:'Not deferred',state:'COMPLETED',result:'Retained output'}});assert.equal((await call('/admin/agents/tasks/'+unlinkedDraft.id+'/governance-resume',token,{...resumeBody,expectedRevision:unlinkedDraft.revision})).status,409);
  assert.equal((await call('/admin/agents/tasks/'+legacy.id+'/governance-resume',token,{...resumeBody,expectedRevision:legacy.revision})).status,409);
  const pausedFailure=await db.aiAgentTask.findUniqueOrThrow({where:{id:standalone.body.id}});assert.equal((await call('/admin/agents/tasks/'+pausedFailure.id+'/governance-resume',token,{...resumeBody,expectedRevision:pausedFailure.revision})).status,409);
  // Audit failure rolls back both completion and the next review. Persistence
  // can then retry once without repeating the provider request.
  const rollback=await enqueue('اكتمال مترابط مع إثبات التدقيق');await service.heartbeat();assert.equal((await control('ENABLED')).status,200);const claim=await service.claim();
  const fail=runtime({record:async(...args)=>{if(args[0].action==='GOVERNANCE_REVIEW_QUEUED')throw new Error('Injected governance audit failure');return audit.record(...args);}});
  setModelText('مخرج محفوظ بعد إعادة محاولة الحفظ');await assert.rejects(()=>fail.runClaim(claim),/Injected governance audit/);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:rollback.body.id}})).state,'RUNNING');
  await service.finish(claim.task.id,claim.task.claimId,{text:'نتيجة إعادة حفظ فقط',inputTokens:1,outputTokens:1,estimatedCostMicroUsd:1});await childOf(rollback.body.id);assert.equal((await control('PAUSED')).status,200);
  // Duplicate receipts and cross-requester links are quarantined, not combined
  // into a quorum; unrelated review payloads never enter the detail response.
  const link=(await audits(chain.review.id,'GOVERNANCE_REVIEW_QUEUED'))[0];
  await audit.record({action:'GOVERNANCE_REVIEW_QUEUED',resource:'AiAgentTask',resourceId:chain.review.id,metadata:link.metadata});assert.equal((await readFile(chain.root.id)).status,'INTEGRITY_REVIEW_REQUIRED');
  const rootSnapshot=await db.aiAgentTask.findUniqueOrThrow({where:{id:rollback.body.id}}),child=await childOf(rollback.body.id);
  await db.aiAgentTask.update({where:{id:child.id},data:{requestedByAccountId:ordinary.id,result:'UNRELATED_PRIVATE_REVIEW'}});const cross=await readFile(rootSnapshot.id);assert.equal(cross.status,'INTEGRITY_REVIEW_REQUIRED');assert(!JSON.stringify(cross).includes('UNRELATED_PRIVATE_REVIEW'));await db.aiAgentTask.update({where:{id:child.id},data:{requestedByAccountId:actor.id,result:null}});
  const pageRows=Array.from({length:25},()=>({id:randomUUID(),agentKey:'SUPPORT',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'isolated-inbox-page',action:'DRAFT_MESSAGE',language:'ar-SA',prompt:'Isolated old output',state:'COMPLETED',result:'Old source',createdAt:new Date('2000-01-01T00:00:00Z')}));await db.aiAgentTask.createMany({data:pageRows});
  const firstPage=await call('/admin/agents/governance-reviews',token);assert.equal(firstPage.body.items.length,20);assert(firstPage.body.nextCursor);const secondPage=await call('/admin/agents/governance-reviews?cursor='+firstPage.body.nextCursor,token);assert.equal(secondPage.status,200);assert(!secondPage.body.items.some(x=>firstPage.body.items.some(y=>x.source.id===y.source.id)));assert.equal((await call('/admin/agents/governance-reviews?cursor='+current.id,token)).status,400);assert.equal((await call('/admin/agents/governance-reviews?cursor=invalid',token)).status,400);await db.aiAgentTask.deleteMany({where:{id:{in:pageRows.map(x=>x.id)}}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await call('/admin/agents/governance-reviews',token)).status,403);assert.equal((await call('/admin/agents/governance-reviews/'+chain.root.id,token)).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  console.log('Operations evidence HTTP/PostgreSQL passed: exact aggregate input retained across six reviews; provenance-bound private receipt; historical and conflicting evidence blocked with reviews preserved; snapshot audit failure prevents generation; no historical backfill.');
  console.log('Governance source guard passed: standalone and stale links, duplicate receipts, wrong agent endpoints, requester and language mismatch, and missing source refuse both token-count and generation calls; failed task and paused control retained without retries or approval.');
  console.log('Governance deferred resume passed: fresh admin and version checks, explicit acknowledgement, atomic audit rollback, two concurrent requests create exactly one review, source and provider call counts unchanged, paused reviewer queue retained, failed tasks not replayed.');
  console.log('Governance review inbox HTTP/PostgreSQL passed: fresh admin-only/no-store reads; empty catalogue; six-stage detail and final owner receipt; original evidence; correction/escalation/deferral; revision and duplicate-link quarantine; cross-requester payload isolation; bounded distinct pagination and invalid cursors; revoked-role refusal; no ledger writes or model dispatch.');
  assert.deepEqual(await business(),beforeBusiness);
  console.log('Governance office HTTP/PostgreSQL passed: 14 bounded agents; full six-gate route with original evidence and five reviews; exactly-once final recommendation requiring owner approval; correction, evidence-gap, invalid-output, high-risk and policy escalation stops; unlinked/revision-conflict isolation; paused controls; queue cap; atomic audit rollback; no business writes. Model traffic was loopback only.');
 }finally{
  setModelText(null);for(const key of order)assert.equal((await control('PAUSED',key)).status,200);
 }
}
