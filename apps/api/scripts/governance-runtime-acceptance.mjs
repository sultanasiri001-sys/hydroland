import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Called only from the loopback HTTP/PostgreSQL/model fixture; never production.
export async function governanceRuntimeAcceptance({db,service,runtime,audit,provider,actor,token,call,catalog,control,enqueue,setModelText,payloads}){
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
 const childOf=async id=>{const events=await db.auditEvent.findMany({where:{action:'GOVERNANCE_REVIEW_QUEUED',resource:'AiAgentTask'}});const matches=events.filter(x=>x.metadata?.sourceTaskId===id);assert.equal(matches.length,1);return db.aiAgentTask.findUniqueOrThrow({where:{id:matches[0].resourceId}});};
 const run=async(key,text)=>{await service.heartbeat();assert.equal((await control('ENABLED',key)).status,200);setModelText(text);const claim=await service.claim();assert.equal(claim?.task.agentKey,key);await service.runClaim(claim);assert.equal((await control('PAUSED',key)).status,200);return claim;};
 const start=async()=>{const created=await enqueue('متطلبات أصلية يجب أن تراها جميع البوابات','SUPPORT');assert.equal(created.status,201);await run('SUPPORT','مخرج أصلي كامل '+'.'.repeat(1300)+' نهاية الدليل الأصلي');return{root:created.body,review:await childOf(created.body.id)};};
 try{
  // The six agents must see the original brief/output and all prior reviews,
  // rather than reviewing a truncated review of a review.
  const chain=await start();let current=chain.review;
  for(let index=0;index<order.length;index++){
   assert.equal(current.agentKey,order[index]);assert.equal(await service.claim(),null,'Paused reviews never dispatch');
   const claim=await run(order[index],JSON.stringify(index===1?{...pass,decision:'PASS_WITH_NOTES',findings:['ملاحظة غير حاجبة']}:pass));
   const body=JSON.parse(payloads.at(-1).input[1].content),context=body.governanceReview;
   assert.equal(context.source.id,chain.root.id);assert.equal(context.source.prompt,chain.root.prompt);assert(context.source.result.endsWith('نهاية الدليل الأصلي'));assert(context.source.result.length>1200);assert.equal(context.reviews.length,index);assert.deepEqual(context.reviews.map(x=>x.agentKey),order.slice(0,index));assert.equal(body.aggregateOperations,undefined);
   await runtime().runClaim(claim); // ambiguous completion retry must not fan out
   if(index<order.length-1)current=await childOf(current.id);
  }
  const finalEvents=await audits(current.id,'GOVERNANCE_FINAL_RECOMMENDATION_READY');assert.equal(finalEvents.length,1);assert.equal(finalEvents[0].metadata.reviewCount,5);assert.equal(finalEvents[0].metadata.ownerApprovalRequired,true);assert.equal(finalEvents[0].metadata.approved,false);
  const finalList=await call('/admin/agents/GOV_FINAL_GATE/tasks',token);assert.equal(finalList.status,200);assert.equal(finalList.body.items.find(x=>x.id===current.id).approvalRequired,true);
  assert.deepEqual(finalList.body.items.find(x=>x.id===current.id).governanceRouting,{status:'OWNER_RECOMMENDATION_READY',ownerApprovalRequired:true,approved:false});
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
   const next=await db.auditEvent.findMany({where:{action:'GOVERNANCE_REVIEW_QUEUED'}});assert(!next.some(x=>x.metadata?.sourceTaskId===test.review.id));
  }
  // Directly asking the final agent cannot forge the five earlier gates.
  const standalone=await enqueue('لا تعتمد بوابات لم تراجع','GOV_FINAL_GATE',{action:'READ_OPERATIONS'});assert.equal(standalone.status,201);await run('GOV_FINAL_GATE',JSON.stringify(pass));assert.equal((await audits(standalone.body.id,'GOVERNANCE_REVIEW_STOPPED'))[0].metadata.outcome,'UNLINKED_REVIEW');assert.equal((await audits(standalone.body.id,'GOVERNANCE_FINAL_RECOMMENDATION_READY')).length,0);
  // Invalid lineage is never replaced by model-supplied IDs or another actor.
  const tampered=await start();await db.aiAgentTask.update({where:{id:tampered.root.id},data:{revision:randomUUID()}});await run('GOV_QUALITY_AUDIT',JSON.stringify(pass));assert.equal((await audits(tampered.review.id,'GOVERNANCE_REVIEW_STOPPED'))[0].metadata.outcome,'UNLINKED_REVIEW');
  // Queue pressure defers routing without losing the completed source result.
  const fillers=[];for(let i=0;i<100;i++)fillers.push({agentKey:order[0],requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'isolated-pressure',action:'READ_OPERATIONS',language:'ar-SA',prompt:'Isolated pressure fixture'});
  await db.aiAgentTask.createMany({data:fillers});const full=await enqueue('حفظ المصدر عند امتلاء الطابور');await run('SUPPORT','مخرج محفوظ رغم امتلاء الطابور');assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:full.body.id}})).state,'COMPLETED');assert.equal((await audits(full.body.id,'GOVERNANCE_ROUTE_DEFERRED'))[0].metadata.reason,'GOVERNANCE_QUEUE_FULL');assert.equal(await db.aiAgentTask.count({where:{agentKey:order[0],state:'QUEUED'}}),100);await db.aiAgentTask.deleteMany({where:{requestKey:{in:fillers.map(x=>x.requestKey)}}});
  // Audit failure rolls back both completion and the next review. Persistence
  // can then retry once without repeating the provider request.
  const rollback=await enqueue('اكتمال مترابط مع إثبات التدقيق');await service.heartbeat();assert.equal((await control('ENABLED')).status,200);const claim=await service.claim();
  const fail=runtime({record:async(...args)=>{if(args[0].action==='GOVERNANCE_REVIEW_QUEUED')throw new Error('Injected governance audit failure');return audit.record(...args);}});
  setModelText('مخرج محفوظ بعد إعادة محاولة الحفظ');await assert.rejects(()=>fail.runClaim(claim),/Injected governance audit/);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:rollback.body.id}})).state,'RUNNING');
  await service.finish(claim.task.id,claim.task.claimId,{text:'نتيجة إعادة حفظ فقط',inputTokens:1,outputTokens:1,estimatedCostMicroUsd:1});await childOf(rollback.body.id);assert.equal((await control('PAUSED')).status,200);
  assert.deepEqual(await business(),beforeBusiness);
  console.log('Governance office HTTP/PostgreSQL passed: 14 bounded agents; full six-gate route with original evidence and five reviews; exactly-once final recommendation requiring owner approval; correction, evidence-gap, invalid-output, high-risk and policy escalation stops; unlinked/revision-conflict isolation; paused controls; queue cap; atomic audit rollback; no business writes. Model traffic was loopback only.');
 }finally{
  setModelText(null);for(const key of order)assert.equal((await control('PAUSED',key)).status,200);
 }
}
