const {test}=require('node:test');
const assert=require('node:assert/strict');
const {providerLimits,durationMs,rejectionPlan,providerGateView,readProviderGate,PROVIDER_RECOVERY_WINDOW_MS,taskIntervalMs}=require('../dist/agents/agent-provider-policy');
const now=Date.parse('2026-10-30T20:00:00Z');

test('provider delays preserve the longest exhausted bucket and Retry-After minimum',()=>{
 const limits=providerLimits(new Headers({'retry-after':'56','x-ratelimit-remaining-requests':'0','x-ratelimit-reset-requests':'1s','x-ratelimit-remaining-tokens':'0','x-ratelimit-reset-tokens':'6m0s','x-ratelimit-limit-project-tokens':'60000','x-ratelimit-remaining-project-tokens':'0','x-ratelimit-reset-project-tokens':'7m'}),now);
 assert.equal(limits.minimumDelayMs,420000);assert.equal(Date.parse(limits.retryAt),now+420000);assert.equal(limits.projectTokenLimit,60000);
 assert(Date.parse(rejectionPlan('PROVIDER_RATE_LIMITED',limits,1,now,now,0).notBefore)>=now+420000);
});
test('HTTP-date retry hints use provider Date to tolerate local clock skew',()=>{
 const limits=providerLimits(new Headers({'date':'Fri, 30 Oct 2026 20:00:00 GMT','retry-after':'Fri, 30 Oct 2026 20:02:00 GMT'}),now+3600000);
 assert.equal(limits.minimumDelayMs,120000);
 // A database clock ahead of the request host must still wait the full delay.
 const p=rejectionPlan('PROVIDER_RATE_LIMITED',limits,1,now,now+7200000,0);
 assert(Date.parse(p.notBefore)>=now+7200000+120000);
});
test('daily error classification retains no raw message and never uses minute resets as daily resets',()=>{
 const message='Rate limit for PRIVATE_ORG_IDENTIFIER on tokens per day (TPD).';
 const limits=providerLimits(new Headers({'x-ratelimit-reset-tokens':'5s','x-ratelimit-remaining-tokens':'0'}),now,{message});
 assert.equal(limits.dimension,'TPD');assert.equal(limits.retryAt,undefined);assert(!JSON.stringify(limits).includes('PRIVATE_ORG'));
 assert.equal(rejectionPlan('PROVIDER_RATE_LIMITED',limits,1,now,now,0).automatic,false);
 const explicit=providerLimits(new Headers({'retry-after':'86400','x-ratelimit-reset-tokens':'5s'}),now,{message});
 const p=rejectionPlan('PROVIDER_RATE_LIMITED',explicit,1,now,now,0);assert.equal(p.automatic,true);assert(Date.parse(p.notBefore)>=now+86400000);
});
test('unknown or billing rejection cannot become an automatic paid retry',()=>{
 for(const code of ['PROVIDER_QUOTA_EXHAUSTED','PROVIDER_USAGE_LIMITED','PROVIDER_AUTH_FAILED','PROVIDER_CONNECTION_UNCERTAIN'])assert.equal(rejectionPlan(code,{retryAt:new Date(now+60000).toISOString()},1,now,now,0).automatic,false);
});
test('bad or unrepresentably long delays require review rather than being shortened',()=>{
 for(const hint of ['not-a-delay','999999999999999999999']){
  const limits=providerLimits(new Headers({'retry-after':hint}),now);assert.equal(limits.invalidDelay,true);assert.equal(rejectionPlan('PROVIDER_RATE_LIMITED',limits,1,now,now,0).automatic,false);
 }
 for(const bad of ['','-1s','1fortnight','1s trailing','Infinitys'])assert.equal(durationMs(bad),null);
 assert.equal(durationMs('1h2m3.5s'),3723500);
});
test('positive remaining buckets are not treated as exhaustion',()=>{
 const limits=providerLimits(new Headers({'x-ratelimit-remaining-tokens':'1','x-ratelimit-reset-tokens':'10m','x-ratelimit-remaining-requests':'40','x-ratelimit-reset-requests':'1h'}),now);
 assert.equal(limits.retryAt,undefined);
 const negative=providerLimits(new Headers({'x-ratelimit-remaining-tokens':'-1','x-ratelimit-reset-tokens':'2m'}),now);assert.equal(negative.minimumDelayMs,120000);
 const elapsed=providerLimits(new Headers({'date':'Fri, 30 Oct 2026 20:00:00 GMT','retry-after':'Fri, 30 Oct 2026 19:59:00 GMT'}),now);assert.equal(elapsed.minimumDelayMs,0);assert.equal(elapsed.invalidDelay,undefined);
});
test('fallback backoff, attempt cap and total recovery window are bounded',()=>{
 const first=rejectionPlan('PROVIDER_RATE_LIMITED',undefined,1,now,now,0),second=rejectionPlan('PROVIDER_RATE_LIMITED',undefined,2,now,now,0);
 assert.equal(Date.parse(first.notBefore)-now,30000);assert.equal(Date.parse(second.notBefore)-now,60000);
 assert.equal(rejectionPlan('PROVIDER_RATE_LIMITED',undefined,4,now,now,0).exhausted,true);
 assert.equal(rejectionPlan('PROVIDER_RATE_LIMITED',undefined,4,now,now,0).automatic,false);
 assert.equal(rejectionPlan('PROVIDER_RATE_LIMITED',undefined,2,now,now+PROVIDER_RECOVERY_WINDOW_MS,0).automatic,false);
});
test('persistent gate survives instance replacement, and required review never expires silently',()=>{
 const gate={version:1,revision:'fixture-revision',status:'WAITING',reason:'PROVIDER_RATE_LIMITED',notBefore:new Date(now+60000).toISOString()};
 const restored=readProviderGate(JSON.parse(JSON.stringify(gate)));assert.equal(providerGateView(restored,now).blocked,true);assert.equal(providerGateView(restored,now+60001).blocked,false);
 assert.equal(providerGateView({...restored,status:'ACTION_REQUIRED'},now+86400000).blocked,true);
 assert.throws(()=>readProviderGate({version:1,status:'READY'}),/INVALID/);
});
test('production pacing cannot be disabled by a zero interval',()=>{
 const previous={NODE_ENV:process.env.NODE_ENV,HYDROLAND_AI_MIN_TASK_INTERVAL_MS:process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS};
 try{process.env.NODE_ENV='production';process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS='0';assert.equal(taskIntervalMs(),15000);}finally{for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
