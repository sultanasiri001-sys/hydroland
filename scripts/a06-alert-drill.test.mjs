import assert from 'node:assert/strict';
import test from 'node:test';
import {runAlertDrill,providers} from './a06-alert-drill.mjs';
const env={GITHUB_REPOSITORY:'sultanasiri001-sys/hydroland',GITHUB_EVENT_NAME:'workflow_dispatch',A06_CONFIRM:'A06_SYNTHETIC_ROUTE_ONLY',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40)};
function fixture(){
 let record=null,created=0;const calls=[];
 const execute=(args,input)=>{
  assert.deepEqual(args.slice(-2),['--repo',env.GITHUB_REPOSITORY]);calls.push(args.slice(0,2).join(' '));
  const [kind,action]=args;
  if(kind==='label')return '';
  if(action==='list')return JSON.stringify(record?[{number:7,title:record.title}]:[]);
  if(action==='create'){created++;record={number:7,title:args[args.indexOf('--title')+1],body:input,state:'OPEN',url:'https://github.com/'+env.GITHUB_REPOSITORY+'/issues/7'};return record.url;}
  if(action==='view')return JSON.stringify(record);
  if(action==='edit'){record.body=input;return '';}
  if(action==='close'){record.state='CLOSED';return '';}
  if(action==='reopen'){record.state='OPEN';return '';}
  throw new Error('Unexpected fixture command');
 };
 return {execute,calls,get record(){return record;},get created(){return created;}};
}
test('six provider route markers are read back before recovery and close',()=>{
 const f=fixture();const receipt=runAlertDrill(env,f.execute);
 assert.equal(receipt.status,'PASS');assert.deepEqual(receipt.providers,providers);
 assert.equal(receipt.productionProviderOutageVerified,false);assert.equal(receipt.humanAcknowledgementVerified,false);
 assert.equal(f.created,1);assert.equal(f.record.state,'CLOSED');
 assert(f.record.body.includes('No real provider outage is asserted'));
 assert.equal(f.calls.filter(x=>x==='issue view').length,4);
});
test('same run reuses its closed synthetic record instead of duplicating it',()=>{
 const f=fixture();runAlertDrill(env,f.execute);runAlertDrill(env,f.execute);
 assert.equal(f.created,1);assert.equal(f.record.state,'CLOSED');assert(f.calls.includes('issue reopen'));
});
for(const [key,value] of [['GITHUB_REPOSITORY','other/repo'],['GITHUB_EVENT_NAME','pull_request'],['A06_CONFIRM',''],['GITHUB_RUN_ID','x'],['GITHUB_SHA','x']]){
 test('refuses invalid '+key+' before sending anything',()=>{let calls=0;assert.throws(()=>runAlertDrill({...env,[key]:value},()=>{calls++;}),/A06_/);assert.equal(calls,0);});
}
test('provider or credential details in command errors are not printed',()=>assert.throws(()=>runAlertDrill(env,()=>{throw new Error('secret fixture token');}),e=>e.message==='A06_GITHUB_ROUTE_FAILED'));
test('an unconfirmed alert is not closed as recovered',()=>{
 const f=fixture();const exec=(a,input)=>{const out=f.execute(a,input);if(a[0]==='issue'&&a[1]==='view'){const x=JSON.parse(out);x.body='Missing alert markers';return JSON.stringify(x);}return out;};
 assert.throws(()=>runAlertDrill(env,exec),/A06_ALERT_DELIVERY_NOT_VERIFIED/);assert.equal(f.record.state,'OPEN');
});
test('an unrelated issue is never edited or closed',()=>{
 const f=fixture();const exec=(a,input)=>{const out=f.execute(a,input);if(a[0]==='issue'&&a[1]==='view'){const x=JSON.parse(out);x.title='Unrelated';return JSON.stringify(x);}return out;};
 assert.throws(()=>runAlertDrill(env,exec),/A06_WRONG_DRILL_RECORD/);assert(!f.calls.includes('issue edit'));assert(!f.calls.includes('issue close'));
});
