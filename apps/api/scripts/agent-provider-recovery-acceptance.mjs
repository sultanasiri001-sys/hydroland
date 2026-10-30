import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function providerRecoveryAcceptance(ctx){
 const {db,service,runtime,audit,provider,actor,token,otherToken,call,catalog,control,enqueue,setFailure,setModelText,calls}=ctx;
 const key='AI_PROVIDER_GATE:v1',previous=process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS;
 const row=id=>db.aiAgentTask.findUniqueOrThrow({where:{id}});
 const gate=async()=>(await db.operationalSetting.findUnique({where:{key}}))?.value;
 // This fixture can only run in the pre-checked isolated loopback database.
 const isolate=async()=>{
  await db.aiAgentRuntime.updateMany({data:{state:'PAUSED',revision:randomUUID()}});
  await db.aiAgentTask.updateMany({where:{requestedByAccountId:actor.id,state:'QUEUED'},data:{state:'CANCELLED',revision:randomUUID()}});
  await db.operationalSetting.deleteMany({where:{key}});await service.heartbeat();assert.equal((await control('ENABLED')).status,200);
 };
 const due=async id=>{
  const g=await gate();if(g)await db.operationalSetting.update({where:{key},data:{value:{...g,notBefore:new Date(0).toISOString()}}});
  if(id)await db.aiAgentTask.update({where:{id},data:{retryNotBefore:new Date(0)}});
 };
 const recover=async extra=>{const g=await gate();return call('/admin/agents/provider-recovery',token,{expectedRevision:g.revision,reason:'Reviewed isolated provider limit fixture',reviewed:true,...extra});};
 const execute=async(expectedId,instance=service)=>{const claim=await instance.claim();assert(claim);assert.equal(claim.task.id,expectedId);await instance.runClaim(claim);return claim;};
 const temporary={stage:'GENERATION',code:'rate_limit_exceeded',message:'Fixture tokens per min (TPM), PRIVATE_PROVIDER_ACCOUNT_ID',headers:{'retry-after':'120','x-ratelimit-limit-tokens':'60000','x-ratelimit-remaining-tokens':'0','x-ratelimit-reset-tokens':'1s'}};
 try{
  process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS='0';await isolate();
  assert.equal((await call('/admin/agents/provider-recovery',null,{})).status,401);
  assert.equal((await call('/admin/agents/provider-recovery',otherToken,{})).status,403);
  setModelText('قراءة مجمعة محدودة؛ لا تتوافر أدلة تخصصية إضافية.');
  const first=(await enqueue('Read snapshot must survive a rejected attempt','SUPPORT',{action:'READ_OPERATIONS'})).body,before=calls();setFailure(temporary);
  const started=Date.now();await execute(first.id);const deferred=await row(first.id),waiting=await gate();
  assert.equal(deferred.state,'QUEUED');assert.equal(deferred.attemptCount,1);assert.equal(deferred.result,null);assert.equal(deferred.unknownCostAttempts,1);assert(deferred.retryNotBefore.getTime()>=started+120000);
  assert.equal(waiting.status,'WAITING');assert.equal(waiting.limits.dimension,'TPM');assert.equal(waiting.limits.tokenLimit,60000);assert(!JSON.stringify(waiting).includes('PRIVATE_PROVIDER_ACCOUNT_ID'));
  assert.equal((await catalog()).provider.reason,'PROVIDER_WAITING');assert.equal((await catalog()).items.find(x=>x.key==='SUPPORT').state,'ENABLED');
  assert.equal(await service.claim(),null);assert.equal(await runtime().claim(),null,'A new runtime instance honors the durable cooldown');
  const blocked=(await enqueue('Other agent must share the same cooldown','INVENTORY',{action:'READ_OPERATIONS'})).body;assert.equal((await control('ENABLED','INVENTORY')).status,200);assert.equal(await runtime().claim(),null);
  assert.equal((await control('PAUSED')).status,200);await due(first.id);assert.equal(await runtime().claim(),null,'An owner pause survives the cooldown');assert.equal((await control('ENABLED')).status,200);
  setFailure(null);const claims=await Promise.all([service.claim(),runtime().claim()]);assert.equal(claims.filter(Boolean).length,1);const claimed=claims.find(Boolean);assert.equal(claimed.task.id,first.id);
  await Promise.all([service.runClaim(claimed),runtime().runClaim(claimed)]);
  const completed=await row(first.id),attempts=await db.aiAgentTaskAttempt.findMany({where:{taskId:first.id},orderBy:{attemptNumber:'asc'}});
  assert.equal(completed.state,'COMPLETED');assert.equal(completed.attemptCount,2);assert.equal(completed.unknownCostAttempts,1);assert.equal(attempts.length,2);assert.deepEqual(attempts.map(x=>x.state),['REJECTED','COMPLETED']);assert.equal(completed.reservedCostMicroUsd,attempts.reduce((n,a)=>n+a.reservedCostMicroUsd,0));
  assert.equal(calls().generation-before.generation,2,'One rejected request and exactly one successful generation');
  const file=await call('/admin/agents/governance-reviews/'+first.id,token);assert.equal(file.status,200);assert.equal(file.body.source.operationsEvidence.status,'RECORDED');assert.equal(file.body.cost.unknownAttempts,1);assert.equal(file.body.cost.estimatedMicroUsd,null);
  assert.equal(await db.auditEvent.count({where:{resourceId:first.id,action:'AI_TASK_OPERATIONS_CAPTURED'}}),2,'Both per-attempt snapshots remain auditable');
  assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:first.id}}}),1,'A rejected attempt never creates a second review chain');
  assert.equal((await call('/admin/agents/tasks/'+first.id+'/provider-retry',token,{expectedRevision:completed.revision,reason:'Must not replay completed output',reviewed:true})).status,409);
  assert.equal((await row(blocked.id)).state,'QUEUED');

  await isolate();setFailure({stage:'INPUT_TOKENS',code:'rate_limit_exceeded',message:'Temporary fixture throttle'});
  const bounded=(await enqueue('Bound every rejection')).body,counts=calls();
  for(let number=1;number<=4;number++){
   await execute(bounded.id);const t=await row(bounded.id);assert.equal(t.attemptCount,number);
   if(number<4){assert.equal(t.state,'QUEUED');await due(t.id);}else{assert.equal(t.state,'FAILED');assert.equal(t.errorCode,'PROVIDER_RETRY_EXHAUSTED');}
  }
  assert.equal(calls().generation,counts.generation,'Rejected token counts never reach generation');assert.equal(calls().count-counts.count,4);assert.equal((await gate()).status,'ACTION_REQUIRED');assert.equal(await runtime().claim(),null);
  assert.equal((await call('/admin/agents/tasks/'+bounded.id+'/provider-retry',token,{expectedRevision:(await row(bounded.id)).revision,reason:'Cannot bypass attempt cap',reviewed:true})).status,409);

  await isolate();setFailure({stage:'GENERATION',code:'insufficient_quota',message:'PRIVATE_BILLING_DETAIL',headers:{'retry-after':'60'}});
  const quota=(await enqueue('Quota requires explicit operator review')).body;await execute(quota.id);assert.equal((await row(quota.id)).state,'QUEUED');assert.equal((await gate()).status,'ACTION_REQUIRED');const quotaCalls=calls();
  assert.equal((await recover()).status,409,'Operator cannot clear a future provider minimum delay');await due(quota.id);assert.equal(await runtime().claim(),null,'Required review does not expire automatically');assert.deepEqual(calls(),quotaCalls);
  const beforeReview=await gate();assert.equal((await recover({expectedRevision:randomUUID()})).status,409);assert.equal((await recover({reviewed:false})).status,400);assert.equal((await recover({dailyBudgetMicroUsd:99999999})).status,400);
  setFailure(null);const approved={expectedRevision:beforeReview.revision,reason:'Reviewed resolved quota fixture',reviewed:true};const reviews=await Promise.all([call('/admin/agents/provider-recovery',token,approved),call('/admin/agents/provider-recovery',token,approved)]);assert.deepEqual(reviews.map(x=>x.status).sort(),[201,409]);
  await execute(quota.id);assert.equal((await row(quota.id)).state,'COMPLETED');assert.equal(calls().generation-quotaCalls.generation,1);

  await isolate();setFailure({stage:'GENERATION',code:'rate_limit_exceeded',message:'Fixture requests per day (RPD)',headers:{'x-ratelimit-reset-requests':'1s'}});
  const daily=(await enqueue('Daily limits must not be guessed')).body;await execute(daily.id);assert.equal((await gate()).reason,'PROVIDER_DAILY_RESET_UNKNOWN');assert.equal((await gate()).notBefore,null);const dailyCalls=calls();assert.equal(await runtime().claim(),null);assert.deepEqual(calls(),dailyCalls);
  await isolate();setFailure({stage:'GENERATION',code:'unknown_error',message:'PRIVATE_UNKNOWN_REJECTION'});
  const unknown=(await enqueue('Unknown 429 requires review')).body;await execute(unknown.id);assert.equal((await gate()).status,'ACTION_REQUIRED');assert.equal((await row(unknown.id)).errorCode,'PROVIDER_USAGE_LIMITED');assert.equal(await runtime().claim(),null);

  // An explicit legacy 429 recovery reuses the logical task and keeps its receipt.
  await isolate();setFailure(null);
  const legacy=await db.aiAgentTask.create({data:{agentKey:'SUPPORT',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'legacy-definite-rejection',action:'DRAFT_MESSAGE',language:'ar-SA',prompt:'Legacy rejected task',state:'FAILED',errorCode:'PROVIDER_RATE_LIMITED',claimId:randomUUID(),startedAt:new Date(),finishedAt:new Date(),dispatchedAt:new Date(),reservedCostMicroUsd:7,reservationDate:new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z')}});
  await audit.record({action:'AI_TASK_EXECUTION_FAILED',resource:'AiAgentTask',resourceId:legacy.id,metadata:{claimId:legacy.claimId,errorCode:legacy.errorCode}});
  assert.equal((await call('/admin/agents/tasks/'+legacy.id+'/provider-retry',otherToken,{expectedRevision:legacy.revision,reason:'Denied non-admin retry',reviewed:true})).status,403);
  assert.equal((await call('/admin/agents/tasks/'+legacy.id+'/provider-retry',token,{expectedRevision:legacy.revision,reason:'Reviewed definite legacy 429 fixture',reviewed:true})).status,201);
  assert.equal((await row(legacy.id)).attemptCount,1);assert.equal(await db.aiAgentTaskAttempt.count({where:{taskId:legacy.id}}),1);await execute(legacy.id);assert.equal((await row(legacy.id)).attemptCount,2);assert((await row(legacy.id)).reservedCostMicroUsd>7);
  const uncertain=await db.aiAgentTask.findFirst({where:{requestedByAccountId:actor.id,state:'INTERRUPTED'}});assert(uncertain);
  assert.equal((await call('/admin/agents/tasks/'+uncertain.id+'/provider-retry',token,{expectedRevision:uncertain.revision,reason:'Uncertain requests must never replay',reviewed:true})).status,409);

  // Every attempt has its own UTC-day reservation; a retry cannot reuse money.
  await isolate();const baseline=(await catalog()).budget.reservedMicroUsd,reserve=provider.configuration().reserveMicroUsd;
  const boundedProvider={configuration:()=>({...provider.configuration(),dailyBudgetMicroUsd:baseline+reserve}),execute:provider.execute.bind(provider)};
  const limited=runtime(audit,boundedProvider);setFailure({stage:'GENERATION',code:'rate_limit_exceeded',message:'Temporary budget fixture'});
  const budget=(await enqueue('Retry reserves again, including across UTC midnight')).body;const firstBudgetClaim=await execute(budget.id,limited);await due(budget.id);const budgetCalls=calls();assert.equal(await limited.claim(),null);assert.deepEqual(calls(),budgetCalls);
  const yesterday=new Date(firstBudgetClaim.task.reservationDate.getTime()-86400000);
  await db.aiAgentTaskAttempt.update({where:{claimId:firstBudgetClaim.task.claimId},data:{reservationDate:yesterday}});
  setFailure(null);await execute(budget.id,limited);const budgetTask=await row(budget.id);assert.equal(budgetTask.reservedCostMicroUsd,reserve*2);assert.equal(await db.aiAgentTaskAttempt.count({where:{taskId:budget.id}}),2);

  await isolate();process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS='15000';setFailure(null);
  const paced=(await enqueue('Global spacing survives worker replacement')).body;await execute(paced.id);const other=(await enqueue('A second task must wait')).body;assert.equal(await runtime().claim(),null);await due(other.id);process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS='0';await execute(other.id);
  await isolate();setFailure(temporary);const revoked=(await enqueue('Revocation while waiting')).body;await execute(revoked.id);await due(revoked.id);setFailure(null);const revokedCalls=calls();
  await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal(await runtime().claim(),null);assert.equal((await row(revoked.id)).errorCode,'REQUESTER_AUTH_REVOKED');assert.deepEqual(calls(),revokedCalls);await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  console.log('Provider recovery HTTP/PostgreSQL passed: shared persistent Retry-After, restart/concurrency fences, snapshot integrity across retries, attempt cap, unknown and daily holds, quota review with revision lease, uncertain/completed no-replay, legacy receipt preservation, per-attempt UTC-day budgets, pacing and revoked requesters. All provider traffic was loopback.');
 }finally{
  setFailure(null);setModelText(null);if(previous===undefined)delete process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS;else process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS=previous;
  await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  await db.operationalSetting.deleteMany({where:{key}});
 }
}
