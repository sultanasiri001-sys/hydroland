import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync,mkdirSync,readdirSync,realpathSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanupOwned,cleanupDocker} from './recovery-switch-orchestrator.mjs';
import {terminateRecorded} from './recovery-switch-processes.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const SHAS=['4f0b6ac663baeb814523d572def8c4cb8d754fbb','a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d'];
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const save=(path,value)=>{writeFileSync(path+'.tmp',JSON.stringify(value,null,2));renameSync(path+'.tmp',path);};
const command=args=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:1024*1024});
export function verifyOwnership(item,state,kind){
 assert.match(state.token,UUID);
 const labels=kind==='network'?item.Labels:item.Config.Labels;
 assert.equal(labels?.['hydroland.a03.run'],state.token);
 assert.equal(labels?.['hydroland.recovery'],'disposable-local');
 if(kind==='network'){
  assert.equal(item.Name,state.networkName);assert.equal(item.Driver,'bridge');assert.equal(item.Internal,true);assert.equal(item.EnableIPv6,false);
  if(state.networkId)assert.equal(item.Id,state.networkId);
 }else{
  assert.equal(item.Name,'/'+(kind==='postgres'?'phase11-postgres':state.probeName));
  assert.equal(item.HostConfig.NetworkMode,kind==='postgres'?state.networkName:'none');
  if(kind==='postgres'&&state.postgresId)assert.equal(item.Id,state.postgresId);
 }
}
export function prepare(evidenceDir,artifactWorkspace,docker=command){
 assert.equal(process.env.CI,'true');assert.equal(process.platform,'linux');
 mkdirSync(evidenceDir,{recursive:true});
 const statePath=join(evidenceDir,'ci-ownership.json');
 // Exclusive marker creation forbids stale evidence or repeated provisioning.
 const token=randomUUID(),state={scope:'SYNTHETIC_CI_OWNERSHIP',token,networkName:'a02-rehearsal-'+token,probeName:'a03-runtime-probe-'+token};
 writeFileSync(statePath,JSON.stringify(state,null,2),{flag:'wx'});
 const labels=['--label','hydroland.recovery=disposable-local','--label','hydroland.a03.run='+token];
 const node=JSON.parse(docker(['image','inspect','node:22-bookworm']))[0];
 const postgres=JSON.parse(docker(['image','inspect','postgres:18']))[0];
 for(const image of [node,postgres]){assert.match(image.Id,/^sha256:[a-f0-9]{64}$/);assert.equal(image.Os,'linux');assert.equal(image.Architecture,'amd64');}
 state.runtimeImageId=node.Id;state.postgresImageId=postgres.Id;
 state.runtimeRepoDigests=node.RepoDigests;state.postgresRepoDigests=postgres.RepoDigests;save(statePath,state);
 const base=realpathSync(artifactWorkspace);
 const artifacts=SHAS.map(sha=>({sha,root:realpathSync(join(base,sha))}));
 for(const artifact of artifacts){assert.equal(artifact.root,join(base,artifact.sha));assert.equal(execFileSync('git',['-C',artifact.root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifact.sha);}
 const modules=join(artifacts[1].root,'node_modules');assert.equal(realpathSync(modules),modules);
 const engine=join(modules,'.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node');
 assert(realpathSync(engine).startsWith(modules+'/'),'Generated Linux engine must remain inside artifact');
 // Isolated ABI probe mounts only generated dependency bytes, never a DB or source.
 const probe=JSON.parse(docker(['run','--rm','--pull','never','--name',state.probeName,...labels,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','node','--mount','type=bind,src='+modules+',dst=/modules,readonly',node.Id,'node','-e',"require('/modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node');console.log(JSON.stringify({node:process.versions.node,openssl:process.versions.openssl,arch:process.arch,prismaEngineLoaded:true}))"]));
 assert.match(probe.node,/^22\./);assert.match(probe.openssl,/^3\./);assert.equal(probe.arch,'x64');assert.equal(probe.prismaEngineLoaded,true);state.runtimeProbe=probe;save(statePath,state);
 state.networkId=docker(['network','create','--driver','bridge','--internal',...labels,state.networkName]).trim();save(statePath,state);
 verifyOwnership(JSON.parse(docker(['network','inspect',state.networkName]))[0],state,'network');
 state.postgresId=docker(['create','--pull','never','--name','phase11-postgres',...labels,'--network',state.networkName,'-e','POSTGRES_USER=hydroland','-e','POSTGRES_PASSWORD=hydroland','-e','POSTGRES_DB=hydroland_rehearsal_source','-p','127.0.0.1:5432:5432',postgres.Id]).trim();save(statePath,state);
 verifyOwnership(JSON.parse(docker(['inspect','phase11-postgres']))[0],state,'postgres');
 docker(['start',state.postgresId]);
 save(join(evidenceDir,'switch-config.json'),{artifacts,artifactWorkspace:base,networkName:state.networkName,runtimeImageId:state.runtimeImageId});
}
export async function cleanup(evidenceDir,{docker=cleanupDocker(process.env,{budgetMs:60000}),terminate=terminateRecorded}={}){
 const receiptPath=join(evidenceDir,'ci-cleanup-report.json');
 const report={scope:'SYNTHETIC_CI_CLEANUP',status:'FAIL',productionRollbackVerified:false,providerPitrVerified:false};
 let state;
 try{state=read(join(evidenceDir,'ci-ownership.json'));}catch(error){if(error.code==='ENOENT')return;throw error;}
 save(receiptPath,report);
 try{
  assert.equal(state.scope,'SYNTHETIC_CI_OWNERSHIP');assert.match(state.token,UUID);assert.equal(state.networkName,'a02-rehearsal-'+state.token);assert.equal(state.probeName,'a03-runtime-probe-'+state.token);
  const outputs=readdirSync(evidenceDir).filter(name=>/^application-switch-[a-f0-9-]{36}$/.test(name));assert(outputs.length<=1,'One helper execution per job');
  // Stop the parent first so it cannot race receipt/container cleanup, then child group.
  for(const output of outputs){
   let records;
   try{records=read(join(evidenceDir,output,'processes.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
   if(records){await terminate(records.parent);await terminate(records.child,{group:true});}
   let receipt;
   try{receipt=read(join(evidenceDir,output,'application-version-switch-report.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
   if(receipt){assert(records,'Helper receipt without recorded process ownership; refuse racing cleanup');cleanupOwned(receipt,state.networkName,docker);}
  }
  // List failures are errors; absence alone is safe. Never interpret inspect errors
  // (daemon unavailable, permission failure) as proof that a resource is absent.
  for(const kind of ['probe','postgres']){
   const name=kind==='probe'?state.probeName:'phase11-postgres';
   const ids=docker(['ps','-aq','--filter','name=^/'+name+'$']).trim().split(/\s+/).filter(Boolean);assert(ids.length<=1);
   for(const id of ids){assert.match(id,/^[a-f0-9]{12,64}$/);const item=JSON.parse(docker(['inspect',id]))[0];verifyOwnership(item,state,kind);docker(['rm','-fv',id]);}
   assert.equal(docker(['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
  }
  const networks=docker(['network','ls','-q','--filter','name=^'+state.networkName+'$']).trim().split(/\s+/).filter(Boolean);assert(networks.length<=1);
  for(const id of networks){assert.match(id,/^[a-f0-9]{12,64}$/);const item=JSON.parse(docker(['network','inspect',id]))[0];verifyOwnership(item,state,'network');assert.equal(Object.keys(item.Containers||{}).length,0,'Unknown network peers; refuse teardown');docker(['network','rm',id]);}
  assert.equal(docker(['network','ls','-q','--filter','name=^'+state.networkName+'$']).trim(),'');
  report.status='PASS';
 }finally{save(receiptPath,report);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const evidenceDir=resolve('phase11-recovery-evidence');
 if(process.argv[2]==='prepare')prepare(evidenceDir,resolve('.rehearsal-artifacts'));
 else if(process.argv[2]==='cleanup')await cleanup(evidenceDir);
 else throw new Error('Expected prepare or cleanup');
}
