import assert from 'node:assert/strict';
import {test} from 'node:test';
import {REPOSITORY,WATCH_WORKFLOW,OBSERVE_STEP,CADENCE_MS,assessMonitorLiveness,collectMonitorLiveness,runMonitorLiveness} from './a06-monitor-liveness.mjs';

const now=Date.parse('2026-11-19T12:00:00Z');
const env={GITHUB_REPOSITORY:REPOSITORY,GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW_REF:REPOSITORY+'/.github/workflows/production-uptime.yml@refs/heads/main',GITHUB_EVENT_NAME:'schedule',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40)};
function evidence(minutes=1,{id=1,event='schedule',attempt=1}={}){
  const started_at=new Date(now-minutes*60_000).toISOString(),completed_at=new Date(now-minutes*60_000+1000).toISOString();
  const run={id,run_attempt:attempt,path:WATCH_WORKFLOW,head_branch:'main',head_repository:{full_name:REPOSITORY},head_sha:'b'.repeat(40),event,status:'completed',conclusion:'success'};
  const job={name:'watch',run_id:id,run_attempt:attempt,head_sha:run.head_sha,status:'completed',conclusion:'success',steps:[{name:OBSERVE_STEP,status:'completed',conclusion:'success',started_at,completed_at}]};
  return{runs:[run],jobsByRun:{[id]:[job]},now};
}
const assess=(minutes,options)=>assessMonitorLiveness(evidence(minutes,options));
test('a successful observation is current only within the adopted 15 minute cadence',()=>{
  assert.equal(assess(1).status,'CURRENT');assert.equal(assess(15).status,'CURRENT');
  assert.equal(assess(15.01).status,'SCHEDULE_LATE');assert.equal(assess(29).escalate,false);assert.equal(assess(30).escalate,true);
});
test('manual success is visible but cannot hide a missing scheduled observation',()=>{
  const result=assess(1,{event:'workflow_dispatch'});assert.equal(result.status,'NO_SUCCESSFUL_SCHEDULE');
  assert.equal(result.coverage.observedSlots,0);assert.equal(result.latestManualObservation.runId,1);
});
test('queued, failed, cancelled, skipped and contract-only runs do not prove observation',()=>{
  for(const [status,conclusion] of [['queued',null],['in_progress',null],['completed','failure'],['completed','cancelled']]){
    const data=evidence();Object.assign(data.runs[0],{status,conclusion});assert.equal(assessMonitorLiveness(data).status,'NO_SUCCESSFUL_SCHEDULE');
  }
  const skipped=evidence();skipped.jobsByRun[1][0].steps[0].conclusion='skipped';assert.equal(assessMonitorLiveness(skipped).status,'NO_SUCCESSFUL_SCHEDULE');
  const contract=evidence();contract.jobsByRun[1][0].name='contract';assert.throws(()=>assessMonitorLiveness(contract),/WATCH_AMBIGUOUS/);
});
test('foreign repositories, branches, workflows and pull request events cannot count',()=>{
  for(const patch of [{head_repository:{full_name:'other/hydroland'}},{head_branch:'feature'},{path:'.github/workflows/other.yml'},{event:'pull_request'}]){
    const data=evidence();Object.assign(data.runs[0],patch);assert.equal(assessMonitorLiveness(data).coverage.observedSlots,0);
  }
});
test('the latest attempt, source, run and exact observation step must match',()=>{
  for(const patch of [{run_id:2},{run_attempt:2},{head_sha:'c'.repeat(40)}]){
    const data=evidence();Object.assign(data.jobsByRun[1][0],patch);assert.throws(()=>assessMonitorLiveness(data),/JOB_IDENTITY_INVALID/);
  }
  const data=evidence();data.jobsByRun[1][0].steps.push({...data.jobsByRun[1][0].steps[0]});assert.throws(()=>assessMonitorLiveness(data),/STEP_AMBIGUOUS/);
});
test('future, malformed and reversed timestamps cannot create recent evidence',()=>{
  for(const patch of [{started_at:'invalid'},{started_at:new Date(now+1000).toISOString()},{completed_at:new Date(now+61_000).toISOString()},{completed_at:new Date(now-120_000).toISOString()}]){
    const data=evidence();Object.assign(data.jobsByRun[1][0].steps[0],patch);assert.throws(()=>assessMonitorLiveness(data),/TIME_INVALID/);
  }
});
test('completion time cannot refresh an old observation',()=>{
  const data=evidence(40);data.jobsByRun[1][0].steps[0].completed_at=new Date(now-1000).toISOString();
  const result=assessMonitorLiveness(data);assert.equal(result.status,'SCHEDULE_LATE');assert.equal(result.ageSeconds,2400);
});
test('24 hour coverage has exactly 96 completed UTC slots, not a total run count',()=>{
  const data={runs:[],jobsByRun:{},now};
  for(let i=0;i<96;i++){const next=evidence((i+1)*15-1,{id:i+1});data.runs.push(...next.runs);Object.assign(data.jobsByRun,next.jobsByRun);}
  const duplicateSlot=evidence(14.5,{id:97});data.runs.push(...duplicateSlot.runs);Object.assign(data.jobsByRun,duplicateSlot.jobsByRun);
  let result=assessMonitorLiveness(data);assert.equal(result.coverage.observedSlots,96);assert.deepEqual(result.coverage.missingSlots,[]);
  data.runs=data.runs.filter(run=>run.id!==50);result=assessMonitorLiveness(data);assert.equal(result.status,'CURRENT');assert.equal(result.coverage.observedSlots,95);assert.equal(result.coverage.missingSlots.length,1);
});
test('only completed slots count; a new current-quarter observation does not fill history',()=>{
  const data=evidence(0);data.jobsByRun[1][0].steps[0].completed_at=new Date(now).toISOString();
  const result=assessMonitorLiveness({...data,now:now+5000});assert.equal(result.status,'CURRENT');assert.equal(result.coverage.observedSlots,0);
});
test('duplicate run identities and absent job evidence fail closed',()=>{
  const data=evidence();data.runs.push({...data.runs[0]});assert.throws(()=>assessMonitorLiveness(data),/EVIDENCE_INVALID/);
  assert.throws(()=>assessMonitorLiveness({...evidence(),jobsByRun:{}}),/JOBS_MISSING/);
});

function mockGh(data=evidence(),seed=[]){
  const issues=structuredClone(seed),calls=[];let next=10;
  const gh=(args,input)=>{
    calls.push({args:[...args],input});
    if(args[0]==='api'){
      if(args[1].includes('/workflows/'))return JSON.stringify({total_count:data.runs.length,workflow_runs:data.runs});
      const id=Number(args[1].match(/\/runs\/(\d+)\//)?.[1]),attempt=Number(args[1].match(/\/attempts\/(\d+)\//)?.[1]);
      const run=data.runs.find(row=>row.id===id),jobs=data.jobsByRun[attempt===run?.run_attempt?id:id+':'+attempt]??[];return JSON.stringify({total_count:jobs.length,jobs});
    }
    if(args[0]==='label')return '';
    if(args[1]==='list')return JSON.stringify(issues.filter(issue=>issue.state==='OPEN'));
    if(args[1]==='create'){
      const issue={number:next++,title:args[args.indexOf('--title')+1],body:input,state:'OPEN',createdAt:new Date(now).toISOString(),assignees:[]};issues.push(issue);return 'https://github.com/'+REPOSITORY+'/issues/'+issue.number;
    }
    const issue=issues.find(row=>row.number===Number(args[2]));if(!issue)throw new Error('Missing fixture issue');
    if(args[1]==='edit'){if(args.includes('--body-file'))issue.body=input;if(args.includes('--add-assignee'))issue.assignees.push({login:args[args.indexOf('--add-assignee')+1]});return '';}
    if(args[1]==='view')return JSON.stringify(issue);
    if(args[1]==='comment'){issue.comments=[...(issue.comments??[]),input];return '';}
    if(args[1]==='close'){issue.state='CLOSED';return '';}
    throw new Error('Unexpected fixture command');
  };return {gh,calls,issues};
}
test('collector reads bounded run lists and the exact successful first-attempt jobs',()=>{
  const mock=mockGh(evidence());assert.equal(collectMonitorLiveness({gh:mock.gh,now}).status,'CURRENT');
  assert.match(mock.calls[1].args[1],/\/attempts\/1\/jobs/);assert.equal(mock.calls.every(call=>call.args[0]==='api'),true);
});
test('a fresh manual rerun of a scheduled run cannot fill cron coverage or refresh its age',()=>{
  const data=evidence(1,{attempt:2});data.jobsByRun['1:1']=evidence(40).jobsByRun[1];
  const mock=mockGh(data),result=collectMonitorLiveness({gh:mock.gh,now});
  assert.equal(result.status,'SCHEDULE_LATE');assert.equal(result.latestScheduledObservation.runAttempt,1);assert.equal(result.ageSeconds,2400);
  assert.equal(result.latestRerunObservation.runAttempt,2);assert.equal(result.coverage.observedSlots,1);
  assert.equal(result.coverage.missingSlots.includes('2026-11-19T11:45:00.000Z'),true);
  assert.equal(mock.calls.filter(call=>call.args[1].includes('/jobs?')).length,2);
});
test('a failed original cron attempt plus a successful rerun still has no successful schedule',()=>{
  const data=evidence(1,{attempt:2});data.jobsByRun['1:1']=evidence(40).jobsByRun[1];data.jobsByRun['1:1'][0].conclusion='failure';
  const result=assessMonitorLiveness(data);assert.equal(result.status,'NO_SUCCESSFUL_SCHEDULE');assert.equal(result.coverage.observedSlots,0);assert.equal(result.latestRerunObservation.runAttempt,2);
});
test('missing original-attempt evidence is unavailable, never replaced with the successful rerun',()=>{
  assert.throws(()=>assessMonitorLiveness(evidence(1,{attempt:2})),/JOBS_MISSING/);
});
test('truncated and invalid API responses never report coverage success',()=>{
  assert.throws(()=>collectMonitorLiveness({now,gh:()=>JSON.stringify({total_count:1,workflow_runs:null})}),/RUNS_INVALID/);
  const mock=mockGh();assert.throws(()=>collectMonitorLiveness({now,gh:args=>args[1].includes('/jobs?')?JSON.stringify({total_count:101,jobs:[]}):mock.gh(args)}),/JOBS_TRUNCATED/);
  const runs=Array.from({length:100},(_,i)=>evidence(1,{id:i+1}).runs[0]);assert.throws(()=>collectMonitorLiveness({now,gh:()=>JSON.stringify({total_count:1001,workflow_runs:runs})}),/RUNS_TRUNCATED/);
});
test('PR, push, foreign workflow and wrong repository are rejected before reads or writes',()=>{
  for(const patch of [{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_EVENT_NAME:'push'},{GITHUB_WORKFLOW_REF:'wrong'},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_REF:'refs/heads/feature'}]){
    const mock=mockGh();assert.throws(()=>runMonitorLiveness({env:{...env,...patch},gh:mock.gh,now}),/CONTEXT_INVALID/);assert.equal(mock.calls.length,0);
  }
});
test('a missed cadence creates only the separate liveness issue and escalates after 30 minutes',()=>{
  const mock=mockGh(evidence(20));let result=runMonitorLiveness({env,gh:mock.gh,now});assert.equal(result.status,'SCHEDULE_LATE');assert.equal(mock.issues.length,1);assert.equal(mock.issues[0].assignees.length,0);
  result=runMonitorLiveness({env,gh:mock.gh,now:now+10*60_000});assert.equal(result.escalate,true);assert.equal(mock.issues.length,1);assert.deepEqual(mock.issues[0].assignees,[{login:'sultanasiri001-sys'}]);
  runMonitorLiveness({env,gh:mock.gh,now:now+15*60_000});assert.equal(mock.issues[0].assignees.length,1);assert.equal(mock.calls.some(call=>call.args.includes('a06-provider-watch')||call.args.includes('production-uptime')),false);
});
test('manual success cannot close a liveness incident; a later scheduled success can',()=>{
  const mock=mockGh(evidence(40));runMonitorLiveness({env,gh:mock.gh,now});
  const manual=mockGh(evidence(-5,{event:'workflow_dispatch'}),mock.issues);runMonitorLiveness({env,gh:manual.gh,now:now+6*60_000});assert.equal(manual.issues[0].state,'OPEN');
  const recovered=mockGh(evidence(-10),manual.issues);const result=runMonitorLiveness({env,gh:recovered.gh,now:now+11*60_000});assert.equal(result.status,'CURRENT');assert.equal(recovered.issues[0].state,'CLOSED');assert.equal(result.coverage.missingSlots.length,96);
});
test('a current observation predating the incident cannot claim recovery',()=>{
  const seed=mockGh(evidence(40));runMonitorLiveness({env,gh:seed.gh,now});const mock=mockGh(evidence(1),seed.issues);runMonitorLiveness({env,gh:mock.gh,now});assert.equal(mock.issues[0].state,'OPEN');
});
test('a scheduled-event rerun cannot close an incident created after the original observation',()=>{
  const seed=mockGh(evidence(40));runMonitorLiveness({env,gh:seed.gh,now});
  const data=evidence(-5,{attempt:2});data.jobsByRun['1:1']=evidence(40).jobsByRun[1];
  const mock=mockGh(data,seed.issues),result=runMonitorLiveness({env,gh:mock.gh,now:now+6*60_000});assert.equal(result.status,'SCHEDULE_LATE');assert.equal(mock.issues[0].state,'OPEN');
});
test('unreadable GitHub evidence raises a control incident without fabricating provider state',()=>{
  const mock=mockGh();const gh=(args,input)=>{if(args[0]==='api')throw new Error('synthetic transport failure');return mock.gh(args,input);};
  const result=runMonitorLiveness({env,gh,now});assert.equal(result.status,'EVIDENCE_UNAVAILABLE');assert.equal(mock.issues[0].assignees.length,1);assert.match(mock.issues[0].body,/not evidence that a provider is down/);assert.equal(result.coverage,undefined);
});
test('a mismatched persisted alert is not reported as delivered',()=>{
  const mock=mockGh(evidence(40));const gh=(args,input)=>{const result=mock.gh(args,input);return args[1]==='view'?JSON.stringify({...JSON.parse(result),body:'not saved'}):result;};
  assert.throws(()=>runMonitorLiveness({env,gh,now}),/ALERT_NOT_SAVED/);
});
