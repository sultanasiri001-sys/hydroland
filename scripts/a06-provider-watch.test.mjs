import assert from 'node:assert/strict';
import {test} from 'node:test';
import {API_URL,PROVIDERS,REPOSITORY,runProviderWatch} from './a06-provider-watch.mjs';

const workflowRef=REPOSITORY+'/.github/workflows/a06-provider-watch.yml@refs/heads/main';
const baseEnv={
  GITHUB_REPOSITORY:REPOSITORY,GITHUB_EVENT_NAME:'schedule',GITHUB_REF:'refs/heads/main',
  GITHUB_WORKFLOW_REF:workflowRef,GITHUB_RUN_ID:'123456789',GITHUB_SHA:'a'.repeat(40),
  ACTIONS_ID_TOKEN_REQUEST_URL:'https://token.actions.githubusercontent.com/id',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'short-lived-test-only',
};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function dataset(overrides={}){
  return{service:'hydroland-api',cadenceMinutes:15,escalateAfterMinutes:30,providers:PROVIDERS.map(provider=>({
    provider,state:'UNKNOWN',category:null,observedAt:null,...overrides[provider],
  }))};
}
function mockGh(seed=[]){
  const issues=seed.map(issue=>structuredClone(issue));
  const calls=[];
  const comments=new Map();
  let next=Math.max(0,...issues.map(issue=>issue.number))+1;
  const gh=(args,input)=>{
    calls.push({args:[...args],input});
    const command=args[0],sub=args[1];
    if(command==='label')return '';
    if(command==='api'){const number=Number(args[1].split('/issues/')[1]?.split('/')[0]);return JSON.stringify(comments.get(number)||[]);}
    if(command==='issue'&&sub==='list'){
      const label=args[args.indexOf('--label')+1];
      return JSON.stringify(issues.filter(issue=>issue.labels?.some(item=>(typeof item==='string'?item:item.name)===label)).map(({number,title,state,createdAt,labels})=>({number,title,state,createdAt,labels})));
    }
    if(command==='issue'&&sub==='create'){
      const number=next++,title=args[args.indexOf('--title')+1],label=args[args.indexOf('--label')+1];
      issues.push({number,title,state:'OPEN',body:input||'',labels:[{name:label}],assignees:[]});
      return 'https://github.com/'+REPOSITORY+'/issues/'+number;
    }
    if(command==='issue'&&sub==='edit'){
      const number=Number(args[2]),issue=issues.find(item=>item.number===number);
      if(!issue)throw new Error('missing issue');
      if(args.includes('--body-file'))issue.body=input||'';
      const labelIndex=args.indexOf('--add-label');
      if(labelIndex>=0)issue.labels=[...(issue.labels||[]),{name:args[labelIndex+1]}];
      const assigneeIndex=args.indexOf('--add-assignee');
      if(assigneeIndex>=0)issue.assignees=[...(issue.assignees||[]),args[assigneeIndex+1]];
      return '';
    }
    if(command==='issue'&&sub==='view'){
      const issue=issues.find(item=>item.number===Number(args[2]));
      if(!issue)throw new Error('missing issue');
      return JSON.stringify(issue);
    }
    if(command==='issue'&&sub==='comment'){const number=Number(args[2]),body=args[args.indexOf('--body')+1];comments.set(number,[...(comments.get(number)||[]),{body}]);return '';}
    if(command==='issue'&&sub==='close'){issues.find(item=>item.number===Number(args[2])).state='CLOSED';return ''}
    if(command==='issue'&&sub==='reopen'){issues.find(item=>item.number===Number(args[2])).state='OPEN';return ''}
    throw new Error('unexpected gh: '+args.join(' '));
  };
  return{gh,issues,calls,comments};
}
function apiFetch(data,{apiStatus=200}={}){
  return async url=>{
    if(String(url).includes('token.actions.githubusercontent.com'))return response({value:'x'.repeat(250)});
    if(String(url)===API_URL)return response(data,apiStatus);
    throw new Error('unexpected fetch URL');
  };
}
const now=Date.parse('2026-11-13T12:00:00.000Z');

test('rejects pull request and non-main execution before any GitHub writes',async()=>{
  const {gh,calls}=mockGh();
  await assert.rejects(runProviderWatch({env:{...baseEnv,GITHUB_EVENT_NAME:'pull_request',GITHUB_REF:'refs/pull/8/merge'},fetcher:apiFetch(dataset()),gh,now}),/A06_MONITOR_CONTEXT_INVALID/);
  assert.equal(calls.length,0);
});
test('UNKNOWN provider state does not create an outage issue',async()=>{
  const {gh,issues}=mockGh();
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(dataset()),gh,now});
  assert.equal(result.status,'PASS');
  assert.equal(result.providers.length,0);
  assert.equal(issues.length,0);
});
test('real recorded failure creates an unassigned incident before the 30 minute threshold',async()=>{
  const data=dataset({EMAIL:{state:'DEGRADED',category:'PROVIDER_FAILURE',observedAt:new Date(now-29*60_000).toISOString()}});
  const {gh,issues,calls}=mockGh();
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now});
  const incident=issues.find(issue=>issue.title.startsWith('[A06 PROVIDER HEALTH] EMAIL '));
  assert.equal(result.status,'PASS');
  assert.equal(incident.state,'OPEN');
  assert.equal(incident.assignees.length,0);
  assert.equal(incident.body.includes('payloads'),true);
  assert.equal(calls.some(call=>call.args.includes('--add-assignee')&&!call.args.includes('a06-monitor-control')),false);
});
test('persistent provider failure labels, comments, and assigns the escalation to 001 at 30 minutes',async()=>{
  const data=dataset({PAYMENT_PSP:{state:'DEGRADED',category:'PROVIDER_FAILURE',observedAt:new Date(now-30*60_000).toISOString()}});
  const {gh,issues,calls}=mockGh();
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now});
  const incident=issues.find(issue=>issue.title.startsWith('[A06 PROVIDER HEALTH] PAYMENT_PSP '));
  assert.equal(result.providers[0].escalated,true);
  assert.ok(incident.labels.some(label=>label.name==='a06-escalated'));
  assert.ok(incident.assignees.includes('sultanasiri001-sys'));
  assert.ok(calls.some(call=>call.args[0]==='issue'&&call.args[1]==='comment'));
});
test('repeated checks do not duplicate escalation comments or assignees',async()=>{
  const data=dataset({EMAIL:{state:'DEGRADED',category:'PROVIDER_FAILURE',observedAt:new Date(now-31*60_000).toISOString()}});
  const {gh,issues,comments}=mockGh();
  await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now});
  await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now:now+15*60_000});
  const incident=issues.find(issue=>issue.title.startsWith('[A06 PROVIDER HEALTH] EMAIL '));
  assert.equal(comments.get(incident.number).length,1);
  assert.equal(incident.assignees.filter(name=>name==='sultanasiri001-sys').length,1);
  assert.equal(incident.labels.filter(label=>label.name==='a06-escalated').length,1);
});
test('a new outage after recovery gets a separate unassigned incident',async()=>{
  const start=now-60*60_000;
  const {gh,issues}=mockGh();
  await runProviderWatch({env:baseEnv,fetcher:apiFetch(dataset({EMAIL:{state:'DEGRADED',category:'PROVIDER_FAILURE',observedAt:new Date(start).toISOString()}})),gh,now});
  await runProviderWatch({env:baseEnv,fetcher:apiFetch(dataset({EMAIL:{state:'AVAILABLE',category:'SUCCESS',observedAt:new Date(now-5*60_000).toISOString()}})),gh,now:now+15*60_000});
  await runProviderWatch({env:baseEnv,fetcher:apiFetch(dataset({EMAIL:{state:'DEGRADED',category:'PROVIDER_FAILURE',observedAt:new Date(now+29*60_000).toISOString()}})),gh,now:now+30*60_000});
  const incidents=issues.filter(issue=>issue.title.startsWith('[A06 PROVIDER HEALTH] EMAIL '));
  assert.equal(incidents.length,2);
  assert.equal(incidents[0].state,'CLOSED');
  assert.equal(incidents[1].state,'OPEN');
  assert.equal(incidents[1].assignees.length,0);
  assert.notEqual(incidents[0].title,incidents[1].title);
});
test('a later successful provider operation closes the incident as recovered',async()=>{
  const incident={number:77,title:'[A06 PROVIDER HEALTH] WEATHER_MARINE '+new Date(now-60_000).toISOString(),state:'OPEN',body:'old failure',labels:[{name:'a06-provider-watch'}],assignees:[]};
  const data=dataset({WEATHER_MARINE:{state:'AVAILABLE',category:'SUCCESS',observedAt:new Date(now).toISOString()}});
  const {gh,issues}=mockGh([incident]);
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now});
  const saved=issues.find(issue=>issue.number===77);
  assert.equal(result.providers[0].state,'RECOVERED');
  assert.equal(saved.state,'CLOSED');
  assert.match(saved.body,/Observed state: AVAILABLE/);
});
test('monitor endpoint failure opens only a separate control-path issue',async()=>{
  const {gh,issues}=mockGh();
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(dataset(),{apiStatus:503}),gh,now});
  assert.equal(result.status,'MONITOR_ROUTE_UNAVAILABLE');
  assert.equal(issues.length,1);
  assert.equal(issues[0].title,'[A06 MONITOR ROUTE] Provider status monitor unavailable');
  assert.ok(issues[0].labels.some(label=>label.name==='a06-monitor-control'));
  assert.ok(issues[0].assignees.includes('sultanasiri001-sys'));
  assert.equal(issues.some(issue=>issue.title.startsWith('[A06 PROVIDER HEALTH]')),false);
});
test('rejects inconsistent observations without writing provider outage issues',async()=>{
  const data=dataset({EMAIL:{state:'AVAILABLE',category:'PROVIDER_FAILURE',observedAt:new Date(now).toISOString()}});
  const {gh,issues}=mockGh();
  const result=await runProviderWatch({env:baseEnv,fetcher:apiFetch(data),gh,now});
  assert.equal(result.status,'MONITOR_ROUTE_UNAVAILABLE');
  assert.equal(issues.length,1);
  assert.equal(issues[0].title,'[A06 MONITOR ROUTE] Provider status monitor unavailable');
});
