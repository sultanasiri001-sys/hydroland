import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const self=fileURLToPath(import.meta.url);

async function fixture(){
  const {Module,Global}=require('@nestjs/common');
  const {NestFactory}=require('@nestjs/core');
  const {DatabaseService}=require('../dist/database/database.service.js');
  const {AgentRuntimeWorker}=require('../dist/agents/agent-runtime.worker.js');
  const root=process.env.HYDROLAND_SHUTDOWN_CHECK_ROOT;
  const record=event=>appendFileSync(join(root,'events.jsonl'),JSON.stringify({event,pid:process.pid})+'\n');
  let connected=true,claims=0,release,started;
  const provider=new Promise(resolve=>{release=resolve;});
  const hasStarted=new Promise(resolve=>{started=resolve;});
  const keepAlive=setInterval(()=>{},1000);
  const db={$disconnect:async()=>{connected=false;record('database_disconnected');}};
  for(const hook of ['onModuleDestroy','onApplicationShutdown']){
    if(typeof DatabaseService.prototype[hook]==='function')db[hook]=()=>DatabaseService.prototype[hook].call(db);
  }
  const runtime={
    heartbeat:async()=>assert(connected),
    claim:async()=>{claims++;assert.equal(claims,1,'no new claim during shutdown');return {id:'fixture'};},
    runClaim:async()=>{record('task_started');started();await provider;assert(connected,'database must stay available until the receipt is saved');record('task_completed');await writeFile(join(root,'receipt.json'),JSON.stringify({claims,completed:1}));},
  };
  class DbModule{}
  Global()(DbModule);Module({providers:[{provide:DatabaseService,useValue:db}],exports:[DatabaseService]})(DbModule);
  class WorkersModule{}
  Module({imports:[DbModule],providers:[{provide:AgentRuntimeWorker,useFactory:()=>{
    const worker=new AgentRuntimeWorker(runtime),destroy=worker.onModuleDestroy.bind(worker);
    worker.onModuleDestroy=()=>{
      record('drain_started');const pending=destroy();
      worker.poll(); // the real stopping guard must refuse a new claim
      setTimeout(release,100);
      return pending.finally(()=>{clearInterval(keepAlive);record('drain_finished');});
    };
    return worker;
  }}]})(WorkersModule);
  class RootModule{}
  Module({imports:[DbModule,WorkersModule]})(RootModule);
  const app=await NestFactory.createApplicationContext(RootModule,{logger:false});
  app.enableShutdownHooks(['SIGTERM']);
  await hasStarted;
  process.stdout.write('SHUTDOWN_FIXTURE_READY '+JSON.stringify({pid:process.pid})+'\n');
}
async function run(command,{legacy=false}={}){
  const root=await mkdtemp(join(tmpdir(),'hydroland-shutdown-'));
  let child,exit,output='';
  try{
    await mkdir(join(root,'dist'));
    await writeFile(join(root,'package.json'),JSON.stringify({scripts:{'db:deploy':'node migration.cjs',start:'node dist/main.js'}}));
    await writeFile(join(root,'migration.cjs'),'require("node:fs").writeFileSync("migration-ran","yes");');
    await writeFile(join(root,'dist/main.js'),'import('+JSON.stringify(new URL(import.meta.url).href)+');');
    child=spawn('/bin/sh',['-c',command],{cwd:root,detached:true,env:{...process.env,NODE_ENV:'test',HYDROLAND_AI_TEST_MANUAL_WORKER:'0',HYDROLAND_SHUTDOWN_CHECK_ROOT:root},stdio:['ignore','pipe','pipe']});
    exit=new Promise((resolve,reject)=>{child.once('exit',(code,signal)=>resolve({code,signal}));child.once('error',reject);});
    const ready=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('fixture startup timeout: '+output)),8000);
      function inspect(chunk){output+=chunk;const match=output.match(/SHUTDOWN_FIXTURE_READY (\{[^\n]+\})/);if(match){clearTimeout(timer);resolve(JSON.parse(match[1]));}}
      child.stdout.on('data',inspect);child.stderr.on('data',chunk=>{output+=chunk;});
      child.once('exit',()=>{clearTimeout(timer);reject(new Error('fixture exited before ready: '+output));});
    });
    assert.equal(await readFile(join(root,'migration-ran'),'utf8'),'yes','migration remains before server startup');
    if(legacy)assert.notEqual(ready.pid,child.pid,'legacy npm wrapper is not the application process');
    else assert.equal(ready.pid,child.pid,'exec must make the application the signalled process');
    child.kill('SIGTERM');
    if(legacy){
      await new Promise(resolve=>setTimeout(resolve,300));
      const events=(await readFile(join(root,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
      assert(!events.some(e=>e.event==='drain_started'),'negative control must reproduce missing signal delivery through the legacy wrapper');
      return;
    }
    const outcome=await Promise.race([exit,new Promise((_,reject)=>setTimeout(()=>reject(new Error('shutdown did not drain: '+output)),5000))]);
    assert(outcome.code===0||outcome.signal==='SIGTERM',JSON.stringify(outcome));
    assert.deepEqual(JSON.parse(await readFile(join(root,'receipt.json'),'utf8')),{claims:1,completed:1});
    const events=(await readFile(join(root,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).map(e=>e.event);
    assert.equal(events.filter(e=>e==='task_completed').length,1);
    assert(events.indexOf('drain_started')<events.indexOf('task_completed'));
    assert(events.indexOf('task_completed')<events.indexOf('database_disconnected'),'persist before disconnect');
  }finally{
    if(child?.pid)try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}
    if(exit)await exit;
    await rm(root,{recursive:true,force:true});
  }
}
if(process.env.HYDROLAND_SHUTDOWN_CHECK_ROOT)await fixture();
else{
  await run('npm run db:deploy && npm start',{legacy:true});
  await run('npm run db:deploy && exec node dist/main.js');
  console.log('Shutdown checks passed: legacy signal-delivery failure reproduced; direct application process receives SIGTERM, stops claims, persists once before database disconnect, and retains migrations.');
}
