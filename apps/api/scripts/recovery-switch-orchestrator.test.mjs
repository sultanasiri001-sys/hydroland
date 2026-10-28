import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {runChild,cleanupOwned,cleanupDocker,orchestrate} from './recovery-switch-orchestrator.mjs';
const label='12345678-1234-4123-8123-123456789abc';
const receipt={scope:'SYNTHETIC_APPLICATION_SWITCH',runLabel:label,status:'PASS'};
test('watchdog waits for delayed exit AND group disappearance',async()=>{
 const child=new EventEmitter();child.pid=321;let gone=false,settled=false,killed=false;
 const promise=runChild([],{}, {timeoutMs:5,terminationMs:200,pollMs:2,spawnFn:()=>child,kill:(pid,signal)=>{
  assert.equal(pid,-321);if(signal==='SIGKILL')killed=true;
  if(signal===0&&gone)throw Object.assign(Error(),{code:'ESRCH'});
 }});
 const outcome=assert.rejects(promise,/watchdog/).then(()=>{settled=true;});
 await new Promise(resolve=>setTimeout(resolve,15));assert(killed);assert(!settled);
 child.emit('exit',null,'SIGKILL');
 await new Promise(resolve=>setTimeout(resolve,10));assert(!settled,'Descendant group still exists');
 gone=true;await outcome;
});
test('unconfirmed termination rejects with cleanup prohibition',async()=>{
 const child=new EventEmitter();child.pid=123;
 await assert.rejects(runChild([],{}, {timeoutMs:2,terminationMs:10,pollMs:2,spawnFn:()=>child,kill:()=>{}}),error=>error.unsafeToCleanup===true);
});
test('normal and failing exits confirm group absence',async()=>{
 for(const code of [0,1]){
  const child=new EventEmitter();child.pid=123;let killed=false;
  const promise=runChild([],{}, {spawnFn:()=>child,kill:(pid,signal)=>{if(signal==='SIGKILL')killed=true;else throw Object.assign(Error(),{code:'ESRCH'});}});
  child.emit('exit',code,null);
  if(code)await assert.rejects(promise);else await promise;
  assert(killed);
 }
});
test('Docker cleanup uses SIGKILL and one aggregate deadline',()=>{
 let time=0;const calls=[];
 const docker=cleanupDocker({}, {budgetMs:6000,now:()=>time,execute:(cmd,args,options)=>{calls.push(options);time+=4000;return '';}});
 docker(['ps']);assert.throws(()=>docker(['inspect']),/Aggregate/);
 assert.deepEqual(calls.map(x=>[x.timeout,x.killSignal]),[[5000,'SIGKILL'],[2000,'SIGKILL']]);
 assert.throws(()=>docker(['rm']),/Aggregate/);assert.equal(calls.length,2);
});
test('cleanup refuses mismatched ownership before removal',()=>{
 const calls=[];
 assert.throws(()=>cleanupOwned(receipt,'a02-rehearsal-test',args=>{
  calls.push(args);return args[0]==='ps'?'abcdefabcdef':JSON.stringify([{Config:{Labels:{'hydroland.a02.run':'wrong'}}}]);
 }));
 assert(!calls.some(x=>x[0]==='rm'));
});
test('orchestration preserves recovery receipt, cleans after failure, and records independent result',async()=>{
 for(const fail of [false,true,'unsafe']){
  const dir=mkdtempSync(join(tmpdir(),'a03-orchestrator-'));
  try{
   const original=join(dir,'recovery-drill-report.json');writeFileSync(original,'{"status":"PASS","sentinel":"untouched"}');
   const before=readFileSync(original,'utf8'),configPath=join(dir,'config.json');
   writeFileSync(configPath,JSON.stringify({networkName:'a02-rehearsal-test',runtimeImageId:'sha256:'+'a'.repeat(64)}));
   let cleaned=0;
   const execution=orchestrate({configPath,evidenceDir:dir},{runChild:async(args,env)=>{
    assert(!('HOME' in env));assert(!('NODE_OPTIONS' in env));
    writeFileSync(join(dirname(args[1]),'application-version-switch-report.json'),JSON.stringify(receipt));
    if(fail)throw Object.assign(Error('watchdog'),{unsafeToCleanup:fail==='unsafe'});
   },docker:args=>{assert.equal(args[0],'ps');cleaned++;return '';}});
   if(fail)await assert.rejects(execution);else await execution;
   assert.equal(cleaned,fail==='unsafe'?0:2);assert.equal(readFileSync(original,'utf8'),before);
   const output=readdirSync(dir).find(x=>x.startsWith('application-switch-'));
   const report=JSON.parse(readFileSync(join(dir,output,'orchestration-report.json')));
   assert.equal(report.status,fail?'FAIL':'PASS');assert.equal(report.originalReceiptUnchanged,true);
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
});
test('failed original receipt never launches child',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'a03-failed-'));
 try{writeFileSync(join(dir,'recovery-drill-report.json'),'{"status":"FAIL"}');
 await assert.rejects(orchestrate({evidenceDir:dir,configPath:'missing'},{runChild:()=>assert.fail('must not launch')}),/persisted successful/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('child start gate opens only after ownership persistence',async()=>{
 const child=new EventEmitter();child.pid=123;const order=[];child.send=message=>order.push(message);
 const promise=runChild([],{}, {spawnFn:()=>child,onSpawn:pid=>{assert.equal(pid,123);order.push('persist');},kill:(pid,signal)=>{if(signal===0)throw Object.assign(Error(),{code:'ESRCH'});}});
 assert.deepEqual(order,[]);child.emit('spawn');assert.deepEqual(order,['persist','START']);
 child.emit('exit',0,null);await promise;
});

test('failed ownership persistence never releases the child start gate',async()=>{
 const child=new EventEmitter();child.pid=123;let sent=false;child.send=()=>{sent=true;};
 const promise=runChild([],{}, {spawnFn:()=>child,terminationMs:100,pollMs:1,onSpawn:()=>{throw Error('disk failure');},kill:(pid,signal)=>{if(signal===0)throw Object.assign(Error(),{code:'ESRCH'});}});
 child.emit('spawn');child.emit('exit',null,'SIGKILL');
 await assert.rejects(promise,/disk failure/);assert.equal(sent,false);
});
