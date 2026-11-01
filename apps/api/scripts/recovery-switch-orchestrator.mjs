import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, renameSync, mkdirSync} from 'node:fs';
import {randomUUID, createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {identity} from './recovery-switch-processes.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => { const tmp=path+'.tmp'; writeFileSync(tmp,JSON.stringify(value,null,2)); renameSync(tmp,path); };

// POSIX CI only. Kill the entire child process group, including build descendants.
export function runChild(args, env, {timeoutMs=600000, terminationMs=5000, pollMs=25, onSpawn=()=>{}, spawnFn=spawn, kill=process.kill.bind(process)}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawnFn(process.execPath,args,{env,detached:true,stdio:['ignore','ignore','ignore','ipc']});
    let timer,poll,stopping=false,exited=false,settled=false;
    const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(poll);error?reject(error):resolve();};
    const unsafe=()=>Object.assign(new Error('Child/group termination unconfirmed; cleanup prohibited'),{unsafeToCleanup:true});
    const stop=error=>{
      if(stopping)return;stopping=true;clearTimeout(timer);
      const deadline=Date.now()+terminationMs;
      try{kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')return finish(unsafe());}
      const confirm=()=>{
        let gone=false;
        try{kill(-child.pid,0);}catch(e){if(e.code==='ESRCH')gone=true;else return finish(unsafe());}
        if(exited&&gone)return finish(error);
        if(Date.now()>=deadline)return finish(unsafe());
        poll=setTimeout(confirm,Math.min(pollMs,deadline-Date.now()));
      };
      confirm();
    };
    child.once('error',error=>{if(!child.pid)finish(error);else stop(error);});
    child.once('exit',(code,signal)=>{exited=true;stop(code===0&&!signal?null:new Error('Switch child failed'));});
    timer=setTimeout(()=>stop(new Error('Switch hard watchdog expired')),timeoutMs);
    child.once('spawn',()=>{
      try{onSpawn(child.pid);child.send('START');}
      catch(error){stop(error);}
    });
  });
}

// One budget for ALL list/inspect/remove/verify calls, not five seconds per call
// multiplied by the number of containers. SIGKILL avoids SIGTERM-resistant CLIs.
export function cleanupDocker(env,{execute=execFileSync,now=Date.now,budgetMs=30000}={}) {
  const deadline=now()+budgetMs;
  return args=>{
    const remaining=deadline-now();assert(remaining>0,'Aggregate cleanup deadline exceeded');
    const output=execute('docker',args,{encoding:'utf8',timeout:Math.min(5000,remaining),killSignal:'SIGKILL',env,maxBuffer:1024*1024});
    assert(now()<deadline,'Aggregate cleanup deadline exceeded');
    return output;
  };
}

export function cleanupOwned(receipt,networkName,docker) {
  assert.equal(receipt.scope,'SYNTHETIC_APPLICATION_SWITCH');
  assert.match(receipt.runLabel,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  const label='hydroland.a02.run='+receipt.runLabel;
  const ids=docker(['ps','-aq','--filter','label='+label]).trim().split(/\s+/).filter(Boolean);
  assert(ids.length<=8,'Unexpected number of owned containers');
  for(const id of ids){
    assert.match(id,/^[a-f0-9]{12,64}$/);
    const item=JSON.parse(docker(['inspect',id]))[0];
    assert.equal(item.Config.Labels?.['hydroland.a02.run'],receipt.runLabel);
    assert.match(item.Name,new RegExp('^/a02-'+receipt.runLabel+'-[0-3]-(api|web)$'));
    assert.equal(item.HostConfig.NetworkMode,networkName);
    docker(['rm','-f',id]);
  }
  assert.equal(docker(['ps','-aq','--filter','label='+label]).trim(),'','Owned containers remain');
}

export async function orchestrate({configPath,evidenceDir},deps={}) {
  const original=join(evidenceDir,'recovery-drill-report.json');
  const before=hash(readFileSync(original)),recoveryReport=json(original);
  assert.equal(recoveryReport.status,'PASS','Hook requires persisted successful recovery receipt');
  const config=json(configPath);
  assert.match(config.networkName,/^a02-rehearsal-[a-z0-9-]{1,64}$/);
  assert.match(config.runtimeImageId,/^sha256:[a-f0-9]{64}$/);
  // A fresh directory prevents stale receipts from authorizing cleanup.
  const output=join(evidenceDir,'application-switch-'+randomUUID());mkdirSync(output);
  const receiptPath=join(output,'orchestration-report.json');
  const result={status:'FAIL',scope:'SYNTHETIC_SWITCH_ORCHESTRATION',originalReceiptSha256:before,productionRollbackVerified:false,providerPitrVerified:false};
  save(receiptPath,result);
  const input=join(output,'input.json');
  save(input,{artifacts:config.artifacts,artifactWorkspace:config.artifactWorkspace,networkName:config.networkName,runtimeImageId:config.runtimeImageId,recoveryReport,evidenceDir:output});
  const env={PATH:process.env.PATH,CI:'true',NODE_ENV:'test',RECOVERY_REHEARSAL_CONFIRM:'DISPOSABLE_LOCAL_ONLY',DATABASE_URL:'postgresql://hydroland:hydroland@127.0.0.1:5432/hydroland_rehearsal_source?schema=public'};
  let failed=false,unsafeToCleanup=false;
  try{
    await (deps.runChild||runChild)([fileURLToPath(new URL('./recovery-switch-child.mjs',import.meta.url)),input],env,{onSpawn:pid=>{
      save(join(output,'processes.json'),{parent:identity(process.pid),child:identity(pid)});
    }});
    assert.equal(json(join(output,'application-version-switch-report.json')).status,'PASS');
  }catch(error){failed=true;result.childFailed=true;unsafeToCleanup=error.unsafeToCleanup===true;}
  finally{
    try{
      if(unsafeToCleanup){result.terminationUnconfirmed=true;throw new Error('Unsafe to race cleanup');}
      const docker=deps.docker||cleanupDocker(env);
      let receipt;
      try{receipt=json(join(output,'application-version-switch-report.json'));}
      catch(error){if(error.code!=='ENOENT')throw error;}
      // Helper persists its run label before any Docker operation. No receipt means
      // no authorized resource identifier; never fall back to a broad label sweep.
      if(receipt)cleanupOwned(receipt,config.networkName,docker);
      else {failed=true;result.missingHelperReceipt=true;}
      result.cleanup='PASS';
    }catch{failed=true;result.cleanup='FAIL';}
    result.originalReceiptUnchanged=hash(readFileSync(original))===before;
    if(!result.originalReceiptUnchanged)failed=true;
    result.status=failed?'FAIL':'PASS';save(receiptPath,result);
  }
  assert.equal(result.status,'PASS','Switch orchestration failed; retain both receipts');
  return result;
}
