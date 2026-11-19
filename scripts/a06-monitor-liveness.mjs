import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const REPOSITORY='sultanasiri001-sys/hydroland';
export const WATCH_WORKFLOW='.github/workflows/a06-provider-watch.yml';
export const OBSERVE_STEP='Observe provider failures and manage incident issues';
export const CADENCE_MS=15*60_000;
const WINDOW_MS=24*60*60_000;
const WORKFLOW_REF=REPOSITORY+'/.github/workflows/production-uptime.yml@refs/heads/main';
const LABEL='a06-monitor-liveness';
const TITLE='[A06 MONITOR LIVENESS] Scheduled provider observation missing';
const MARKER='A06_MONITOR_LIVENESS_V1';
const OWNER='sultanasiri001-sys';
const defaultGh=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,timeout:30_000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
const validId=value=>Number.isSafeInteger(value)&&value>0;
const instant=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):NaN;
const runUrl=id=>'https://github.com/'+REPOSITORY+'/actions/runs/'+id;

function watchRun(run){
  return run?.path===WATCH_WORKFLOW&&run.head_branch==='main'
    &&run.head_repository?.full_name===REPOSITORY&&['schedule','workflow_dispatch'].includes(run.event);
}
function observation(run,attempt,jobs,now){
  if(!Array.isArray(jobs))throw new Error('A06_LIVENESS_JOBS_MISSING');
  const candidates=jobs.filter(job=>job.name==='watch');
  if(candidates.length!==1)throw new Error('A06_LIVENESS_WATCH_AMBIGUOUS');
  const job=candidates[0];
  if(job.run_id!==run.id||job.run_attempt!==attempt||job.head_sha!==run.head_sha||!Array.isArray(job.steps))throw new Error('A06_LIVENESS_JOB_IDENTITY_INVALID');
  if(job.status!=='completed'||job.conclusion!=='success')return null;
  const steps=job.steps.filter(step=>step.name===OBSERVE_STEP);
  if(steps.length!==1)throw new Error('A06_LIVENESS_STEP_AMBIGUOUS');
  const step=steps[0];
  if(step.status!=='completed'||step.conclusion!=='success')return null;
  const observed=instant(step.started_at),completed=instant(step.completed_at);
  if(!Number.isFinite(observed)||!Number.isFinite(completed)||observed>completed||observed>now||completed>now+60_000)throw new Error('A06_LIVENESS_TIME_INVALID');
  return {runId:run.id,runAttempt:attempt,source:run.head_sha,observedAt:new Date(observed).toISOString(),completedAt:new Date(completed).toISOString(),runUrl:runUrl(run.id)};
}

// An overall workflow result is not sufficient: the actual production watch
// job and observation step must both have completed successfully. Manual
// dispatches are reported separately and cannot fill scheduled coverage.
export function assessMonitorLiveness({runs,jobsByRun,now=Date.now()}){
  if(!Number.isFinite(now)||!Array.isArray(runs)||!jobsByRun||typeof jobsByRun!=='object')throw new Error('A06_LIVENESS_EVIDENCE_INVALID');
  const end=Math.floor(now/CADENCE_MS)*CADENCE_MS,start=end-WINDOW_MS;
  const scheduled=[],manual=[],reruns=[],seen=new Set();
  for(const run of runs){
    if(!watchRun(run))continue;
    if(!validId(run.id)||!validId(run.run_attempt)||!/^[a-f0-9]{40}$/.test(run.head_sha||'')||seen.has(run.id))throw new Error('A06_LIVENESS_EVIDENCE_INVALID');
    seen.add(run.id);
    // GitHub retains event=schedule on manual reruns. Preserve the original
    // attempt's dated evidence; a later rerun can never refresh the cadence.
    if(run.event==='schedule'&&run.run_attempt>1){
      const first=observation(run,1,jobsByRun[run.id+':1'],now);if(first)scheduled.push(first);
    }
    if(run.status!=='completed'||run.conclusion!=='success')continue;
    const row=observation(run,run.run_attempt,jobsByRun[run.id],now);if(!row)continue;
    if(run.run_attempt>1)reruns.push(row);
    else (run.event==='schedule'?scheduled:manual).push(row);
  }
  scheduled.sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt));
  manual.sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt));
  reruns.sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt));
  const covered=new Set(scheduled.map(row=>Math.floor(Date.parse(row.observedAt)/CADENCE_MS)*CADENCE_MS).filter(slot=>slot>=start&&slot<end));
  const missing=[];for(let slot=start;slot<end;slot+=CADENCE_MS)if(!covered.has(slot))missing.push(new Date(slot).toISOString());
  const latest=scheduled[0]??null,ageMs=latest?now-Date.parse(latest.observedAt):null;
  return {scope:MARKER,checkedAt:new Date(now).toISOString(),status:!latest?'NO_SUCCESSFUL_SCHEDULE':ageMs>CADENCE_MS?'SCHEDULE_LATE':'CURRENT',
    cadenceMinutes:15,escalationAfterMinutes:30,escalate:ageMs===null||ageMs>=2*CADENCE_MS,ageSeconds:ageMs===null?null:Math.floor(ageMs/1000),
    latestScheduledObservation:latest,latestManualObservation:manual[0]??null,latestRerunObservation:reruns[0]??null,
    coverage:{start:new Date(start).toISOString(),endExclusive:new Date(end).toISOString(),expectedSlots:96,observedSlots:covered.size,missingSlots:missing},
    limitation:'A separate workflow on the same GitHub control plane cannot detect a complete GitHub scheduler outage until it runs again. Coverage records execution, not provider availability or human acknowledgement.'};
}

export function collectMonitorLiveness({gh=defaultGh,now=Date.now()}={}){
  const since=new Date(Math.floor(now/CADENCE_MS)*CADENCE_MS-WINDOW_MS-2*CADENCE_MS).toISOString();
  const runs=[];let complete=false;
  for(let page=1;page<=10;page++){
    const endpoint='repos/'+REPOSITORY+'/actions/workflows/a06-provider-watch.yml/runs?branch=main&created='+encodeURIComponent('>='+since)+'&per_page=100&page='+page;
    const body=JSON.parse(gh(['api',endpoint]));
    if(!Array.isArray(body.workflow_runs)||!Number.isSafeInteger(body.total_count)||body.total_count<0)throw new Error('A06_LIVENESS_RUNS_INVALID');
    runs.push(...body.workflow_runs);
    if(body.workflow_runs.length<100||runs.length>=body.total_count){complete=true;break;}
  }
  if(!complete)throw new Error('A06_LIVENESS_RUNS_TRUNCATED');
  const jobsByRun={};
  for(const run of runs.filter(run=>watchRun(run)&&(run.event==='schedule'&&run.run_attempt>1||run.status==='completed'&&run.conclusion==='success'))){
    if(!validId(run.id)||!validId(run.run_attempt))throw new Error('A06_LIVENESS_RUN_ID_INVALID');
    const attempts=[];
    if(run.event==='schedule'&&run.run_attempt>1)attempts.push(1);
    if(run.status==='completed'&&run.conclusion==='success')attempts.push(run.run_attempt);
    for(const attempt of attempts){
      const body=JSON.parse(gh(['api','repos/'+REPOSITORY+'/actions/runs/'+run.id+'/attempts/'+attempt+'/jobs?per_page=100']));
      if(!Array.isArray(body.jobs)||!Number.isSafeInteger(body.total_count)||body.total_count!==body.jobs.length)throw new Error('A06_LIVENESS_JOBS_TRUNCATED');
      jobsByRun[attempt===run.run_attempt?run.id:run.id+':'+attempt]=body.jobs;
    }
  }
  return assessMonitorLiveness({runs,jobsByRun,now});
}

function assertContext(env){
  if(env.GITHUB_REPOSITORY!==REPOSITORY||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_WORKFLOW_REF!==WORKFLOW_REF
    ||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||!/^\d+$/.test(env.GITHUB_RUN_ID||'')
    ||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))throw new Error('A06_LIVENESS_CONTEXT_INVALID');
}
function currentIssues(gh){
  const body=JSON.parse(gh(['issue','list','--repo',REPOSITORY,'--state','open','--label',LABEL,'--limit','100','--json','number,title,body,createdAt,labels,assignees']));
  if(!Array.isArray(body)||body.length>=100||body.some(issue=>!validId(issue.number)))throw new Error('A06_LIVENESS_ISSUES_INVALID');
  const found=body.filter(issue=>issue.title===TITLE);
  if(found.length>1||found.some(issue=>!issue.body?.includes(MARKER)))throw new Error('A06_LIVENESS_ISSUE_AMBIGUOUS');
  return found[0]??null;
}
function alertBody(result,env,firstDetectedAt){
  return [MARKER,'A scheduled provider observation is missing or its execution evidence is unavailable. This is a monitor-control incident, not evidence that a provider is down.',
    'First detected: '+firstDetectedAt,'Checked at: '+result.checkedAt,'State: '+result.status,
    'Last verified scheduled observation: '+(result.latestScheduledObservation?.observedAt??'none in the bounded lookback'),
    'Last verified scheduled run: '+(result.latestScheduledObservation?.runUrl??'unavailable'),
    'Complete 15-minute slots with successful scheduled observations: '+(result.coverage?result.coverage.observedSlots+'/96':'unavailable'),
    'Manual runs and reruns do not fill scheduled coverage. Original first-attempt observations retain their original slots. Missed historical slots remain missing after recovery.',
    'Observer run: '+runUrl(env.GITHUB_RUN_ID),'Observer source: '+env.GITHUB_SHA,
    'No provider request, credential change, payment, email or business action is executed by this observer.',
    'Both workflows depend on GitHub Actions; an independent monitoring service is still needed to observe a complete control-plane outage.'].join('\n\n');
}
export function runMonitorLiveness({env=process.env,gh=defaultGh,now=Date.now()}={}){
  assertContext(env);
  let result;
  try{result=collectMonitorLiveness({gh,now});}
  catch{result={scope:MARKER,status:'EVIDENCE_UNAVAILABLE',checkedAt:new Date(now).toISOString(),escalate:true};}
  gh(['label','create',LABEL,'--repo',REPOSITORY,'--color','B60205','--description','Provider monitor schedule liveness; separate from provider outages','--force']);
  const issue=currentIssues(gh);
  if(result.status==='CURRENT'){
    // A later successful scheduled observation is required. A manual run or
    // a clock rollback cannot close an existing liveness incident.
    if(issue&&Number.isFinite(instant(issue.createdAt))&&Date.parse(result.latestScheduledObservation.observedAt)>instant(issue.createdAt)){
      gh(['issue','comment',String(issue.number),'--repo',REPOSITORY,'--body-file','-'],
        'A later scheduled observation completed successfully: '+result.latestScheduledObservation.runUrl+' at '+result.latestScheduledObservation.observedAt+'. Historical missed slots remain in the execution evidence. This does not assert provider recovery or human acknowledgement.');
      gh(['issue','close',String(issue.number),'--repo',REPOSITORY,'--reason','completed']);
      const saved=JSON.parse(gh(['issue','view',String(issue.number),'--repo',REPOSITORY,'--json','number,title,state,body']));
      if(saved.number!==issue.number||saved.title!==TITLE||saved.state!=='CLOSED'||!saved.body?.includes(MARKER))throw new Error('A06_LIVENESS_RECOVERY_NOT_SAVED');
      result.recoveredIssue=issue.number;
    }
    return result;
  }
  let number=issue?.number;
  const first=issue?.body?.match(/First detected: ([^\n]+)/)?.[1]??result.checkedAt;
  const body=alertBody(result,env,first);
  if(number)gh(['issue','edit',String(number),'--repo',REPOSITORY,'--body-file','-'],body);
  else{
    const url=gh(['issue','create','--repo',REPOSITORY,'--title',TITLE,'--label',LABEL,'--body-file','-'],body);
    const match=url.match(/^https:\/\/github\.com\/sultanasiri001-sys\/hydroland\/issues\/([1-9]\d*)$/);
    if(!match||!validId(Number(match[1])))throw new Error('A06_LIVENESS_ALERT_NOT_SAVED');number=Number(match[1]);
  }
  if(result.escalate&&!issue?.assignees?.some(value=>value.login===OWNER))gh(['issue','edit',String(number),'--repo',REPOSITORY,'--add-assignee',OWNER]);
  const saved=JSON.parse(gh(['issue','view',String(number),'--repo',REPOSITORY,'--json','number,title,state,body,assignees']));
  if(saved.number!==number||saved.title!==TITLE||saved.state!=='OPEN'||saved.body!==body||result.escalate&&!saved.assignees?.some(value=>value.login===OWNER))throw new Error('A06_LIVENESS_ALERT_NOT_SAVED');
  return {...result,incident:number};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const result=runMonitorLiveness();console.log(JSON.stringify(result));}
  catch{console.error('A06_MONITOR_LIVENESS_CHECK_FAILED');process.exitCode=1;}
}
