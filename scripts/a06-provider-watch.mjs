import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const REPOSITORY='sultanasiri001-sys/hydroland';
export const AUDIENCE='https://hydroland.onrender.com';
export const API_URL='https://hydroland.onrender.com/api/v1/health/integrations/provider-observations';
export const PROVIDERS=Object.freeze(['OBJECT_STORAGE','WEATHER_MARINE','EMAIL','PAYMENT_PSP','AI_MODEL']);
const OWNER='sultanasiri001-sys';
const WATCH_LABEL='a06-provider-watch';
const ESCALATION_LABEL='a06-escalated';
const WATCH_TITLE='[A06 MONITOR ROUTE] Provider status monitor unavailable';
const WORKFLOW_REF=REPOSITORY+'/.github/workflows/a06-provider-watch.yml@refs/heads/main';
const RUN_URL=id=>'https://github.com/'+REPOSITORY+'/actions/runs/'+id;
const defaultGh=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe']}).trim();
const safeObservedAt=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const safeCommit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)?value:'unknown';

function assertContext(env){
  if(env.GITHUB_REPOSITORY!==REPOSITORY||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)
    ||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_WORKFLOW_REF!==WORKFLOW_REF
    ||!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||''))throw new Error('A06_MONITOR_CONTEXT_INVALID');
}
async function requestIdentityToken(env,fetcher){
  const requestUrl=env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('A06_MONITOR_IDENTITY_UNAVAILABLE');
  const url=new URL(requestUrl);url.searchParams.set('audience',AUDIENCE);
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+requestToken},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('A06_MONITOR_IDENTITY_UNAVAILABLE');
  const body=await response.json();
  if(typeof body?.value!=='string'||body.value.length<100||body.value.length>8192)throw new Error('A06_MONITOR_IDENTITY_UNAVAILABLE');
  return body.value;
}
async function readObservations(env,fetcher){
  const token=await requestIdentityToken(env,fetcher);
  const response=await fetcher(API_URL,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('A06_MONITOR_API_UNAVAILABLE');
  const data=await response.json();
  if(data?.service!=='hydroland-api'||data?.cadenceMinutes!==15||data?.escalateAfterMinutes!==30||!Array.isArray(data.providers))throw new Error('A06_MONITOR_RESPONSE_INVALID');
  const entries=new Map();
  for(const row of data.providers){
    if(!row||!PROVIDERS.includes(row.provider)||entries.has(row.provider)||!['UNKNOWN','AVAILABLE','DEGRADED'].includes(row.state))throw new Error('A06_MONITOR_RESPONSE_INVALID');
    const observedAt=safeObservedAt(row.observedAt);
    if(row.state!=='UNKNOWN'&&!observedAt)throw new Error('A06_MONITOR_RESPONSE_INVALID');
    if(row.state!=='UNKNOWN'&&!['SUCCESS','PROVIDER_FAILURE'].includes(row.category))throw new Error('A06_MONITOR_RESPONSE_INVALID');
    if(row.state==='AVAILABLE'&&row.category!=='SUCCESS'||row.state==='DEGRADED'&&row.category!=='PROVIDER_FAILURE')throw new Error('A06_MONITOR_RESPONSE_INVALID');
    entries.set(row.provider,{state:row.state,category:row.category??null,observedAt});
  }
  if(entries.size!==PROVIDERS.length)throw new Error('A06_MONITOR_RESPONSE_INCOMPLETE');
  return entries;
}
function issuePrefix(provider){return '[A06 PROVIDER HEALTH] '+provider;}
function issueTitle(provider,observedAt){return issuePrefix(provider)+' '+observedAt;}
function findOpenProviderIssue(issues,provider){
  const found=issues.filter(issue=>issue.state==='OPEN'&&issue.title.startsWith(issuePrefix(provider)));
  if(found.length>1)throw new Error('A06_MONITOR_DUPLICATE_RECORDS');
  return found[0]??null;
}
function incidentBody(provider,row,env,now){
  const age=Math.max(0,Math.floor((now-Date.parse(row.observedAt))/1000));
  return [
    'A real application operation reported a provider failure. This record contains only an allowlisted status; it has no credentials, payloads, recipient data or raw provider error.',
    '',
    'Provider: '+provider,
    'Observed state: DEGRADED',
    'Sanitized category: '+row.category,
    'First observed at (UTC): '+row.observedAt,
    'Age at this check (seconds): '+age,
    'Source commit: '+safeCommit(env.GITHUB_SHA),
    'Monitor run: '+RUN_URL(env.GITHUB_RUN_ID),
    'Technical owner: platform/security agent',
    'Escalation owner: platform director 001 / repository owner.',
  ].join('\n');
}
function controlBody(env,now){
  return [
    'The scheduled A06 monitor could not authenticate to or read the protected provider-observation endpoint.',
    'This is a monitor/control-path failure, not a claim that a provider is down.',
    '',
    'Detected at (UTC): '+new Date(now).toISOString(),
    'Failure class: MONITOR_ROUTE_UNAVAILABLE',
    'Monitor run: '+RUN_URL(env.GITHUB_RUN_ID),
    'Workflow: '+WORKFLOW_REF,
    'Technical owner: platform/security agent; escalation owner: platform director 001.',
  ].join('\n');
}
function parseIssueList(gh,labels){
  const value=gh(['issue','list','--repo',REPOSITORY,'--state','all','--label',labels,'--limit','100','--json','number,title,state,createdAt,labels']);
  const parsed=JSON.parse(value||'[]');
  if(!Array.isArray(parsed))throw new Error('A06_MONITOR_GITHUB_READ_FAILED');
  return parsed;
}
function matches(issues,title){
  const found=issues.filter(issue=>issue.title===title);
  if(found.length>1)throw new Error('A06_MONITOR_DUPLICATE_RECORDS');
  return found[0]??null;
}
function labelNames(issue){return Array.isArray(issue?.labels)?issue.labels.map(label=>typeof label==='string'?label:label?.name).filter(Boolean):[];}
function readIssue(gh,number){
  const parsed=JSON.parse(gh(['issue','view',String(number),'--repo',REPOSITORY,'--json','number,title,state,body,labels'])||'{}');
  if(!Number.isSafeInteger(parsed.number)||parsed.number!==number)throw new Error('A06_MONITOR_GITHUB_READ_FAILED');
  return parsed;
}
function ensureLabels(gh){
  gh(['label','create',WATCH_LABEL,'--repo',REPOSITORY,'--color','D4C5F9','--description','A06 provider health incident','--force']);
  gh(['label','create',ESCALATION_LABEL,'--repo',REPOSITORY,'--color','B60205','--description','A06 provider failure persisted for 30 minutes','--force']);
  gh(['label','create','a06-monitor-control','--repo',REPOSITORY,'--color','FBCA04','--description','A06 monitoring route unavailable','--force']);
}
function verifyIncident(gh,number,title,stateMarker){
  const record=readIssue(gh,number);
  if(record.title!==title||record.state!=='OPEN'||typeof record.body!=='string'||!record.body.includes(stateMarker))throw new Error('A06_MONITOR_WRITE_NOT_VERIFIED');
  return record;
}
function verifyClosed(gh,number,title,stateMarker){
  const record=readIssue(gh,number);
  if(record.title!==title||record.state!=='CLOSED'||typeof record.body!=='string'||!record.body.includes(stateMarker))throw new Error('A06_MONITOR_RECOVERY_NOT_VERIFIED');
}
function openControlIssue(gh,env,now,records){
  const title=WATCH_TITLE;
  const body=controlBody(env,now);
  let issue=matches(records,title);
  if(!issue){
    const output=gh(['issue','create','--repo',REPOSITORY,'--title',title,'--label','a06-monitor-control','--assignee',OWNER,'--body-file','-'],body);
    const expected='https://github.com/'+REPOSITORY+'/issues/';
    if(!output.startsWith(expected))throw new Error('A06_MONITOR_GITHUB_WRITE_FAILED');
    const number=Number(output.slice(expected.length));
    if(!Number.isSafeInteger(number)||number<1)throw new Error('A06_MONITOR_GITHUB_WRITE_FAILED');
    issue={number,state:'OPEN'};
  }else if(issue.state==='CLOSED'){
    gh(['issue','reopen',String(issue.number),'--repo',REPOSITORY]);
    issue.state='OPEN';
  }
  gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--add-assignee',OWNER,'--body-file','-'],body);
  verifyIncident(gh,issue.number,title,'MONITOR_ROUTE_UNAVAILABLE');
  return issue.number;
}
function closeControlIssue(gh,records){
  const issue=matches(records,WATCH_TITLE);
  if(!issue||issue.state==='CLOSED')return null;
  const body=[
    'A06 monitor route recovered. The GitHub Actions OIDC identity read the authenticated provider-observation endpoint successfully.',
    'This confirms monitor-path recovery only; it does not mark any provider healthy.',
  ].join('\n');
  gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--body-file','-'],body);
  gh(['issue','close',String(issue.number),'--repo',REPOSITORY,'--reason','completed']);
  verifyClosed(gh,issue.number,WATCH_TITLE,'monitor route recovered');
  return issue.number;
}
function recoverProvider(gh,issue,provider,row,env){
  const body=[
    'A later real application operation succeeded for this provider.',
    '',
    'Provider: '+provider,
    'Observed state: AVAILABLE',
    'Recovery observed at (UTC): '+row.observedAt,
    'Recovery source commit: '+safeCommit(env.GITHUB_SHA),
    'Recovery monitor run: '+RUN_URL(env.GITHUB_RUN_ID),
    'This closes the recorded incident after a successful provider operation.',
  ].join('\n');
  if(issue.state==='CLOSED')return false;
  gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--body-file','-'],body);
  gh(['issue','close',String(issue.number),'--repo',REPOSITORY,'--reason','completed']);
  verifyClosed(gh,issue.number,issue.title,'Observed state: AVAILABLE');
  return true;
}
function closeSupersededProvider(gh,issue,provider,row,env){
  const body=[
    'This prior incident is superseded by a newer recorded failure for the same provider.',
    'A real successful provider operation cleared the prior state before the newer failure transition was recorded.',
    '',
    'Provider: '+provider,
    'Prior incident: '+issue.title,
    'New failure observed at (UTC): '+row.observedAt,
    'Source commit: '+safeCommit(env.GITHUB_SHA),
    'Monitor run: '+RUN_URL(env.GITHUB_RUN_ID),
    'The prior issue is closed as recovered; the newer failure is tracked in a separate issue.',
  ].join('\n');
  gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--body-file','-'],body);
  gh(['issue','close',String(issue.number),'--repo',REPOSITORY,'--reason','completed']);
  verifyClosed(gh,issue.number,issue.title,'The prior issue is closed as recovered');
}
function escalateProvider(gh,issue,provider,row,env,now){
  const marker='[A06 provider escalation] '+provider+' '+row.observedAt;
  const comments=JSON.parse(gh(['api','/repos/'+REPOSITORY+'/issues/'+issue.number+'/comments','--paginate'])||'[]');
  if(!Array.isArray(comments))throw new Error('A06_MONITOR_GITHUB_READ_FAILED');
  if(!comments.some(comment=>typeof comment.body==='string'&&comment.body.includes(marker))){
    gh(['issue','comment',String(issue.number),'--repo',REPOSITORY,'--body',[
      marker,
      'The same provider failure has persisted for at least 30 minutes since its first observed application failure.',
      'Escalation owner: platform director 001 / repository owner.',
      'Observed at (UTC): '+new Date(now).toISOString(),
      'Monitor run: '+RUN_URL(env.GITHUB_RUN_ID),
    ].join('\n')]);
  }
  if(!labelNames(issue).includes(ESCALATION_LABEL)){
    gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--add-assignee',OWNER]);
    gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--add-label',ESCALATION_LABEL]);
  }
}
export async function runProviderWatch({env=process.env,fetcher=fetch,gh=defaultGh,now=Date.now()}={}){
  assertContext(env);
  const checkedAt=new Date(now).toISOString();
  ensureLabels(gh);
  let observations;
  try{observations=await readObservations(env,fetcher);}
  catch{
    const controlRecords=parseIssueList(gh,'a06-monitor-control');
    const issue=openControlIssue(gh,env,now,controlRecords);
    return{scope:'A06_PROVIDER_MONITOR',status:'MONITOR_ROUTE_UNAVAILABLE',issue,checkedAt};
  }
  const records=parseIssueList(gh,WATCH_LABEL);
  const controlRecords=parseIssueList(gh,'a06-monitor-control');
  const closedMonitorIssue=closeControlIssue(gh,controlRecords);
  const outcomes=[];
  for(const provider of PROVIDERS){
    const row=observations.get(provider);
    let issue=findOpenProviderIssue(records,provider);
    if(row.state==='UNKNOWN')continue;
    if(row.state==='AVAILABLE'){
      if(issue)outcomes.push({provider,state:'RECOVERED',issue:recoverProvider(gh,issue,provider,row,env)?issue.number:null});
      continue;
    }
    const title=issueTitle(provider,row.observedAt);
    if(issue&&issue.title!==title){closeSupersededProvider(gh,issue,provider,row,env);issue=null;}
    if(!issue){
      const output=gh(['issue','create','--repo',REPOSITORY,'--title',title,'--label',WATCH_LABEL,'--body-file','-'],incidentBody(provider,row,env,now));
      const prefix='https://github.com/'+REPOSITORY+'/issues/';
      if(!output.startsWith(prefix))throw new Error('A06_MONITOR_GITHUB_WRITE_FAILED');
      const number=Number(output.slice(prefix.length));
      if(!Number.isSafeInteger(number)||number<1)throw new Error('A06_MONITOR_GITHUB_WRITE_FAILED');
      issue={number,state:'OPEN',title,labels:[{name:WATCH_LABEL}]};
    }
    gh(['issue','edit',String(issue.number),'--repo',REPOSITORY,'--body-file','-'],incidentBody(provider,row,env,now));
    verifyIncident(gh,issue.number,title,'Observed state: DEGRADED');
    const ageMs=now-Date.parse(row.observedAt);
    let escalated=false;
    if(ageMs>=30*60_000){
      escalateProvider(gh,issue,provider,row,env,now);
      escalated=true;
    }
    outcomes.push({provider,state:'DEGRADED',issue:issue.number,escalated});
  }
  return{scope:'A06_PROVIDER_MONITOR',status:'PASS',checkedAt,providers:outcomes,monitorRouteRecoveredIssue:closedMonitorIssue};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const result=await runProviderWatch();
    console.log(JSON.stringify(result));
    if(result.status!=='PASS')process.exitCode=1;
  }catch{
    console.error('A06_PROVIDER_MONITOR_FAILED');
    process.exitCode=1;
  }
}
