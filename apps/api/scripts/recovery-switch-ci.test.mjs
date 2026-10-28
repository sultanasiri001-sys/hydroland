import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyOwnership,cleanup,SHAS} from './recovery-switch-ci.mjs';
import {identity,terminateRecorded} from './recovery-switch-processes.mjs';
const token='12345678-1234-4123-8123-123456789abc';
const state={scope:'SYNTHETIC_CI_OWNERSHIP',token,networkName:'a02-rehearsal-'+token,probeName:'a03-runtime-probe-'+token,networkId:'b'.repeat(64),postgresId:'c'.repeat(64)};
const labels={'hydroland.a03.run':token,'hydroland.recovery':'disposable-local'};
const record={pid:123,group:123,session:123,start:'999',boot:'boot-test'};
const absent=()=>{throw Object.assign(Error(),{code:'ESRCH'});};
test('process identity uses Linux group, session, start ticks and boot',()=>{
 const fields=['S','10','123','123',...Array(15).fill('0'),'999'];
 assert.deepEqual(identity(123,path=>path.endsWith('/stat')?'123 (name with spaces) '+fields.join(' '):'boot-test\n'),record);
});
test('PID reuse or changed boot cannot authorize signalling',async()=>{
 for(const variant of ['pid','boot']){
  let calls=0;
  await assert.rejects(terminateRecorded(record,{readBoot:()=>variant==='boot'?'other':'boot-test',readIdentity:()=>({...record,start:'1000'}),kill:()=>calls++}));
  assert.equal(calls,0);
 }
});
test('recorded group shutdown waits for absence and times out if still present',async()=>{
 for(const vanishes of [true,false]){
  let clock=0,signalled=false;
  const promise=terminateRecorded(record,{group:true,readBoot:()=>record.boot,readIdentity:()=>record,timeoutMs:50,now:()=>clock,wait:async ms=>{clock+=ms;},kill:(pid,signal)=>{
   assert.equal(pid,-123);if(signal==='SIGKILL')signalled=true;
   else if(vanishes&&clock>=25)absent();
  }});
  if(vanishes)await promise;else await assert.rejects(promise,/unconfirmed/);
  assert(signalled);assert(clock>=25);
 }
});
test('exact pair and resource identity reject foreign labels, IDs or networks',()=>{
 assert.deepEqual(SHAS,['4f0b6ac663baeb814523d572def8c4cb8d754fbb','a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d']);
 const pg={Id:state.postgresId,Name:'/phase11-postgres',Config:{Labels:labels},HostConfig:{NetworkMode:state.networkName}};
 verifyOwnership(pg,state,'postgres');
 for(const item of [{...pg,Id:'different'},{...pg,Config:{Labels:{...labels,'hydroland.a03.run':'foreign'}}},{...pg,HostConfig:{NetworkMode:'bridge'}}])assert.throws(()=>verifyOwnership(item,state,'postgres'));
});
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'a03-ci-'));writeFileSync(join(dir,'ci-ownership.json'),JSON.stringify(state));
 const sub=join(dir,'application-switch-'+token);mkdirSync(sub);writeFileSync(join(sub,'processes.json'),JSON.stringify({parent:{...record,pid:120},child:record}));
 return dir;
}
test('absent recorded leader and absent group return without SIGKILL',async()=>{
 const signals=[];
 await terminateRecorded(record,{group:true,readBoot:()=>record.boot,readIdentity:absent,kill:(pid,signal)=>{
  signals.push([pid,signal]);absent();
 }});
 assert.deepEqual(signals,[[-record.pid,0]]);
});
test('absent leader with present reused group refuses SIGKILL and Docker cleanup',async()=>{
 const dir=fixture(),signals=[];let dockerCalls=0;
 try{
  await assert.rejects(cleanup(dir,{terminate:(item,options)=>terminateRecorded(item,{
   ...options,readBoot:()=>record.boot,readIdentity:absent,kill:(pid,signal)=>{
    signals.push([pid,signal]);if(pid===120)absent();
   }
  }),docker:()=>{dockerCalls++;return '';}}),/termination unconfirmed: leader absent/);
  assert.deepEqual(signals,[[120,0],[-record.pid,0]]);
  assert.equal(dockerCalls,0);
  assert.equal(JSON.parse(readFileSync(join(dir,'ci-cleanup-report.json'))).status,'FAIL');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('cancellation cleanup refuses Docker until process termination is confirmed',async()=>{
 const dir=fixture();let calls=0;
 try{
  await assert.rejects(cleanup(dir,{terminate:async()=>{throw Error('unconfirmed');},docker:()=>{calls++;return '';}}));
  assert.equal(calls,0);assert.equal(JSON.parse(readFileSync(join(dir,'ci-cleanup-report.json'))).status,'FAIL');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('cleanup stops parent then child before verified database and empty network teardown',async()=>{
 const dir=fixture(),order=[];let pg=true,net=true;
 try{
  await cleanup(dir,{terminate:async(item,options)=>{order.push(options?.group?'child':'parent');},docker:args=>{
   order.push(args.join(' '));
   if(args[0]==='ps')return pg&&args.at(-1).includes('phase11-postgres')?state.postgresId:'';
   if(args[0]==='inspect')return JSON.stringify([{Id:state.postgresId,Name:'/phase11-postgres',Config:{Labels:labels},HostConfig:{NetworkMode:state.networkName}}]);
   if(args[0]==='rm'){assert.equal(args[2],state.postgresId);pg=false;return '';}
   if(args[1]==='ls')return net?state.networkId:'';
   if(args[1]==='inspect')return JSON.stringify([{Id:state.networkId,Name:state.networkName,Driver:'bridge',Internal:true,EnableIPv6:false,Labels:labels,Containers:{}}]);
   if(args[1]==='rm'){assert(!pg);net=false;return '';}
   assert.fail('Unexpected command');
  }});
  assert.deepEqual(order.slice(0,2),['parent','child']);assert(!pg&&!net);
  assert.equal(JSON.parse(readFileSync(join(dir,'ci-cleanup-report.json'))).status,'PASS');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('network peers fail closed without removal',async()=>{
 const dir=fixture();let removed=false;
 try{
  await assert.rejects(cleanup(dir,{terminate:async()=>{},docker:args=>{
   if(args[0]==='ps')return '';
   if(args[1]==='ls')return state.networkId;
   if(args[1]==='inspect')return JSON.stringify([{Id:state.networkId,Name:state.networkName,Driver:'bridge',Internal:true,EnableIPv6:false,Labels:labels,Containers:{foreign:{}}}]);
   removed=true;return '';
  }}),/Unknown network peers/);assert(!removed);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('helper receipt without process record cannot authorize cancellation cleanup',async()=>{
 const dir=fixture();let calls=0;
 try{
  const output=join(dir,'application-switch-'+token);rmSync(join(output,'processes.json'));
  writeFileSync(join(output,'application-version-switch-report.json'),JSON.stringify({scope:'SYNTHETIC_APPLICATION_SWITCH',runLabel:token,status:'FAIL'}));
  await assert.rejects(cleanup(dir,{terminate:async()=>{},docker:()=>{calls++;return '';}}),/without recorded/);
  assert.equal(calls,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
