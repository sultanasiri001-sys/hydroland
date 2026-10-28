import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFileSync,renameSync} from 'node:fs';
import {normalizeTargetSnapshot,validateBoundary,runtimeEnvironment,verifyNetworkBoundary,verifyApplicationContainer,cleanOwnedBuildOutputs,finishWithReceipt,createReceiptWriter,bounded,assertPreserved,PRIOR,CANDIDATE,SEQUENCE,LIMITS} from './application-version-switch-rehearsal.mjs';

function queueFixture(){
  return [
    {id:'historical',revision:'source-revision',state:'COMPLETED',result:'immutable draft',reservedCostMicroUsd:7,dispatchedAt:new Date('2026-01-01'),executionPolicy:null},
    {id:'queued',revision:'queue-revision',state:'QUEUED',result:null,reservedCostMicroUsd:11,dispatchedAt:null,executionPolicy:{synthetic:true,pinnedSourceId:'historical',pinnedSourceRevision:'source-revision'}},
  ];
}

test('unchanged queue values survive Prisma and JSONB object key reordering',()=>{
  const expected=queueFixture();
  const actual=structuredClone(expected).map(row=>Object.fromEntries(Object.entries(row).reverse()));
  actual[1].executionPolicy={pinnedSourceRevision:'source-revision',pinnedSourceId:'historical',synthetic:true};
  assert.notEqual(JSON.stringify(actual),JSON.stringify(expected),'Exercise different serialization order');
  assertPreserved(actual,expected,'Queue changed');
});

test('queue preservation still rejects changed identity, revision, context, costs, dispatch and row order',()=>{
  const changes=[
    rows=>rows[1].id='replacement',rows=>rows[1].revision='replacement',
    rows=>rows[1].executionPolicy.pinnedSourceId='replacement',
    rows=>rows[1].executionPolicy.pinnedSourceRevision='replacement',
    rows=>rows[1].reservedCostMicroUsd=12,rows=>rows[1].reservedCostMicroUsd='11',
    rows=>rows[1].dispatchedAt=new Date('2026-01-01'),
    rows=>rows[0].dispatchedAt=new Date('2026-01-02'),
    rows=>rows[0].result='rewritten',rows=>rows[1].state='RUNNING',
    rows=>delete rows[1].executionPolicy,rows=>rows.push({...rows[1],id:'extra'}),
    rows=>rows.pop(),rows=>rows.reverse(),
  ];
  for(const change of changes){
    const expected=queueFixture(),actual=structuredClone(expected);change(actual);
    assert.throws(()=>assertPreserved(actual,expected,'Queue changed'),assert.AssertionError);
  }
});

function fixture(){
  return {
    env:{CI:'true',NODE_ENV:'test',RECOVERY_REHEARSAL_CONFIRM:'DISPOSABLE_LOCAL_ONLY',DATABASE_URL:'postgresql://hydroland:synthetic@127.0.0.1:5432/hydroland_rehearsal_source?schema=public'},
    report:{scope:'SYNTHETIC_LOCAL_LOGICAL_RESTORE',status:'PASS',productionRecoveryVerified:false,historicalProductionReplayVerified:false,sourceCommit:CANDIDATE,schemaSha256:'a'.repeat(64),checks:[
      'disposable_source_is_empty','representative_data_and_raw_extensions_seeded','negative_control_detects_corrupted_restored_data','source_unchanged_by_both_restores',
      'hydroland_rehearsal_restore_2:all_table_data_identical','hydroland_rehearsal_restore_2:entire_real_migration_history_identical',
    ].map(name=>({name,status:'PASS'}))},
    inspection:{Name:'/phase11-postgres',Config:{Labels:{'hydroland.recovery':'disposable-local'},Env:['POSTGRES_DB=hydroland_rehearsal_source']},State:{Running:true},HostConfig:{PortBindings:{}}},
  };
}
const validate=f=>validateBoundary(f.env,f.report,f.inspection);

test('only restore_2 is derived from completed synthetic provenance; report remains unchanged',()=>{
  const f=fixture(),before=structuredClone(f);
  assert.equal(new URL(validate(f)).pathname,'/hydroland_rehearsal_restore_2');
  assert.deepEqual(f,before);
  assert.deepEqual(SEQUENCE,[PRIOR,CANDIDATE,PRIOR,CANDIDATE]);
  assert.deepEqual(LIMITS,{ready:60000,http:5000,shutdown:10000,overall:600000});
});

test('production, remote, wrong DB, incomplete provenance and unlabelled containers fail before execution',()=>{
  const changes=[
    f=>f.env.NODE_ENV='production',f=>f.env.CI='false',f=>delete f.env.RECOVERY_REHEARSAL_CONFIRM,
    f=>f.env.DATABASE_URL=f.env.DATABASE_URL.replace('127.0.0.1','db.example.invalid'),
    f=>f.env.DATABASE_URL=f.env.DATABASE_URL.replace('rehearsal_source','rehearsal_restore_1'),
    f=>f.report.status='RUNNING',f=>f.report.scope='PRODUCTION_BACKUP',
    f=>f.report.productionRecoveryVerified=true,f=>f.report.historicalProductionReplayVerified=true,
    f=>f.report.sourceCommit='main',f=>delete f.report.schemaSha256,
    f=>f.report.checks.pop(),f=>f.report.checks[0].status='FAIL',
    f=>delete f.inspection.Config.Labels['hydroland.recovery'],
    f=>f.inspection.State.Running=false,
    f=>f.inspection.HostConfig.PortBindings={'5432/tcp':[{HostIp:'0.0.0.0',HostPort:'5432'}]},
  ];
  for(const change of changes){const f=fixture();change(f);assert.throws(()=>validate(f));}
});

test('child environment is a strict allowlist; AI flag does not claim scheduler disablement',()=>{
  const databaseUrl=validate(fixture()).replace('127.0.0.1','phase11-postgres');
  const env=runtimeEnvironment({databaseUrl,commit:CANDIDATE,secret:'synthetic-test-only',port:3197,path:'/synthetic/bin',OPENAI_API_KEY:'must-not-copy',NODE_OPTIONS:'must-not-copy'});
  assert.deepEqual(Object.keys(env).sort(),['CI','DATABASE_URL','HYDROLAND_AI_TEST_MANUAL_WORKER','HYDROLAND_INTEGRATION_EMAIL_STATUS','JWT_SECRET','NODE_ENV','PATH','PORT','RENDER_GIT_COMMIT','TZ','WEB_ORIGIN'].sort());
  assert.equal(env.HYDROLAND_AI_TEST_MANUAL_WORKER,'1');assert.equal(env.HYDROLAND_INTEGRATION_EMAIL_STATUS,'DISABLED');
  for(const database of [databaseUrl.replace('restore_2','restore_1'),databaseUrl.replace('phase11-postgres','remote.invalid')])assert.throws(()=>runtimeEnvironment({databaseUrl:database,commit:CANDIDATE}));
});

test('network guard rejects external bridges, dual-homed DB and unknown peers',()=>{
  const network={Name:'a02-rehearsal-test',Id:'network-id',Driver:'bridge',Internal:true,EnableIPv6:false,Labels:{'hydroland.recovery':'disposable-local'},Containers:{db:{Name:'phase11-postgres'}}};
  const pg={NetworkSettings:{Networks:{'a02-rehearsal-test':{NetworkID:'network-id'}}}};
  assert.equal(verifyNetworkBoundary(network,pg,network.Name),'network-id');
  for(const change of [n=>n.Internal=false,n=>n.Driver='host',n=>n.EnableIPv6=true,n=>n.Containers.other={Name:'unrelated'},n=>n.Labels={}]){const n=structuredClone(network);change(n);assert.throws(()=>verifyNetworkBoundary(n,pg,n.Name));}
  assert.throws(()=>verifyNetworkBoundary(network,{NetworkSettings:{Networks:{...pg.NetworkSettings.Networks,bridge:{}}}},network.Name));
});

test('application inspection rejects published ports, host mode, writable mounts and wrong ownership',()=>{
  const expected={networkName:'a02-rehearsal-test',networkId:'network-id',runLabel:'owned-run',mounts:[{Source:'/owned/artifact/apps/api/dist',Destination:'/workspace/apps/api/dist'}],imageId:'sha256:'+ 'b'.repeat(64)};
  const c={Config:{Labels:{'hydroland.a02.run':'owned-run'},User:'node'},Image:expected.imageId,State:{Running:true},HostConfig:{NetworkMode:expected.networkName,PublishAllPorts:false,PortBindings:{},Privileged:false,ReadonlyRootfs:true},NetworkSettings:{Networks:{[expected.networkName]:{NetworkID:expected.networkId}},Ports:{'3197/tcp':null}},Mounts:[{Type:'bind',...expected.mounts[0],RW:false}]};
  verifyApplicationContainer(c,expected);
  for(const mutate of [x=>x.HostConfig.NetworkMode='host',x=>x.HostConfig.PortBindings={'3197/tcp':[{HostIp:'0.0.0.0',HostPort:'3197'}]},x=>x.NetworkSettings.Ports['3197/tcp']=[{HostIp:'127.0.0.1',HostPort:'3197'}],x=>x.HostConfig.Privileged=true,x=>x.Mounts[0].RW=true,x=>x.Config.Labels={},x=>x.NetworkSettings.Networks.bridge={}]){const changed=structuredClone(c);mutate(changed);assert.throws(()=>verifyApplicationContainer(changed,expected));}
});

test('build cleanup removes only owned stale outputs and never follows an output symlink',async()=>{
  const workspace=await mkdtemp(join(tmpdir(),'a02-owned-build-'));
  const root=join(workspace,PRIOR),external=join(workspace,'unrelated');
  try{
    await mkdir(join(root,'apps/api'),{recursive:true});await mkdir(join(root,'apps/web'),{recursive:true});await mkdir(external);
    await writeFile(join(root,'apps/api/tsconfig.json'),JSON.stringify({compilerOptions:{outDir:'./dist',incremental:true}}));
    await writeFile(join(external,'keep.txt'),'preserve unrelated bytes');
    await symlink(external,join(root,'apps/api/dist'),'dir');
    await mkdir(join(root,'apps/web/dist'));await writeFile(join(root,'apps/web/dist/stale.js'),'stale');
    await writeFile(join(root,'apps/api/tsconfig.tsbuildinfo'),'stale incremental data');
    await writeFile(join(root,'apps/api/source.ts'),'preserve source');
    await assert.rejects(cleanOwnedBuildOutputs(root,workspace,CANDIDATE));
    const removed=await cleanOwnedBuildOutputs(root,workspace,PRIOR);
    for(const file of removed)await assert.rejects(lstat(join(root,file)),{code:'ENOENT'});
    assert.equal(await readFile(join(external,'keep.txt'),'utf8'),'preserve unrelated bytes');
    assert.equal(await readFile(join(root,'apps/api/source.ts'),'utf8'),'preserve source');
  }finally{await rm(workspace,{recursive:true,force:true});}
});

test('hanging disconnect cannot prevent later checks or a durable FAIL receipt',async()=>{
  const receipts=[],events=[],report={status:'PASS',productionRollbackVerified:false,providerPitrVerified:false};
  const result=await finishWithReceipt({report,stepTimeout:15,persist:async value=>receipts.push(structuredClone(value)),steps:[
    ['disconnect',()=>new Promise(()=>{})],['source-proof',async()=>events.push('checked')],
  ]});
  assert.equal(result,'FAIL');assert.deepEqual(events,['checked']);
  assert.equal(receipts[0].status,'FAIL');assert.equal(receipts[0].cleanup.status,'INCOMPLETE');
  assert.deepEqual(receipts.at(-1).cleanup.failedSteps,['disconnect']);
  assert.equal(receipts.at(-1).productionRollbackVerified,false);assert.equal(receipts.at(-1).providerPitrVerified,false);
});

test('hung final writer leaves the earlier FAIL receipt; successful cleanup alone can finalize PASS',async()=>{
  const receipts=[];let calls=0;
  await assert.rejects(finishWithReceipt({report:{status:'PASS'},stepTimeout:15,steps:[],persist:async value=>{if(++calls===1)receipts.push(structuredClone(value));else await new Promise(()=>{});}}),/timed out/);
  assert.equal(receipts[0].status,'FAIL');
  const success=[];
  assert.equal(await finishWithReceipt({report:{status:'PASS'},steps:[['cleanup',async()=>{}]],persist:async value=>success.push(structuredClone(value))}),'PASS');
  assert.deepEqual(success.map(x=>x.status),['FAIL','PASS']);
});

test('a timed-out PASS stage that later completes cannot replace the on-disk FAIL receipt',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'a02-late-receipt-')),file=join(directory,'receipt.json');
  let release,stageDone,passSignal;
  const gate=new Promise(resolve=>{release=resolve;}),done=new Promise(resolve=>{stageDone=resolve;});
  const writer=createReceiptWriter(file,{stage:async(path,text)=>{
    if(JSON.parse(text).status==='PASS'){await gate;await writeFile(path,text);stageDone();}
    else await writeFile(path,text);
  }});
  try{
    await assert.rejects(finishWithReceipt({report:{status:'PASS'},steps:[],stepTimeout:30,persist:(value,signal)=>{
      if(value.status==='PASS')passSignal=signal;
      return writer(value,signal);
    }}),/final receipt timed out/);
    assert.equal(passSignal.aborted,true,'Timeout revokes authority before returning');
    assert.equal(JSON.parse(await readFile(file,'utf8')).status,'FAIL');
    release();await done;await new Promise(setImmediate);
    assert.equal(JSON.parse(await readFile(file,'utf8')).status,'FAIL','Late successful disk write must never publish');
  }finally{release();await rm(directory,{recursive:true,force:true});}
});

test('a superseded delayed PASS cannot overwrite a newer failure receipt',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'a02-racing-receipt-')),file=join(directory,'receipt.json');
  let release,entered;
  const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
  const writer=createReceiptWriter(file,{stage:async(path,text)=>{
    if(JSON.parse(text).status==='PASS'){entered();await gate;}
    await writeFile(path,text);
  }});
  try{
    const older=bounded(signal=>writer({status:'PASS',attempt:'old'},signal),1000);
    const rejected=assert.rejects(older,/Superseded receipt writer/);
    await started;
    await bounded(signal=>writer({status:'FAIL',attempt:'new'},signal),1000);
    release();await rejected;
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{status:'FAIL',attempt:'new'});
  }finally{release();await rm(directory,{recursive:true,force:true});}
});

test('staging and atomic-publication errors preserve the previous failure receipt',async()=>{
  for(const fault of ['stage','publish']){
    const directory=await mkdtemp(join(tmpdir(),'a02-receipt-error-')),file=join(directory,'receipt.json');
    const writer=createReceiptWriter(file,{
      stage:async(path,text)=>{if(fault==='stage'&&JSON.parse(text).status==='PASS')throw new Error('injected stage failure');await writeFile(path,text);},
      publish:(temporary,target)=>{if(fault==='publish'&&JSON.parse(readFileSync(temporary,'utf8')).status==='PASS')throw new Error('injected publish failure');renameSync(temporary,target);},
    });
    try{
      await bounded(signal=>writer({status:'FAIL'},signal),1000);
      await assert.rejects(bounded(signal=>writer({status:'PASS'},signal),1000),/injected/);
      assert.equal(JSON.parse(await readFile(file,'utf8')).status,'FAIL');
    }finally{await rm(directory,{recursive:true,force:true});}
  }
});

function snapshotFixture(){
  return {schema:{tables:[{relname:'Account'}]},history:[{migration_name:'synthetic-baseline'}],contents:[
    {row_count:0,table_name:'OperationalSetting',content_digest:'a'.repeat(32)},
    {row_count:1,table_name:'Account',content_digest:'b'.repeat(32)},
    {row_count:2,table_name:'AiAgentTask',content_digest:'c'.repeat(32)},
  ]};
}

test('permitted lease inserts cannot reorder the protected table snapshot',()=>{
  const before=snapshotFixture(),filtered=before.contents[0];
  const after=structuredClone(before);
  after.contents=[after.contents[1],after.contents[2],{...after.contents[0],row_count:2,content_digest:'d'.repeat(32)}];
  // Reproduce the old map-only normalization: unchanged protected rows, false FAIL.
  const oldNormalize=full=>({...full,contents:full.contents.map(row=>row.table_name==='OperationalSetting'?filtered:row)});
  assert.throws(()=>assertPreserved(oldNormalize(after),oldNormalize(before),'old ordering'));
  assertPreserved(normalizeTargetSnapshot(after,filtered),normalizeTargetSnapshot(before,filtered),'stable table identity');
});

test('normalization does not mutate the original recovery snapshot or receipt',()=>{
  const full=snapshotFixture(),filtered={...full.contents[0]},original=structuredClone(full),saved=JSON.stringify(full);
  const normalized=normalizeTargetSnapshot(full,filtered);
  assert.deepEqual(full,original);assert.equal(JSON.stringify(full),saved);
  assert.deepEqual(normalized.contents.map(x=>x.table_name),['Account','AiAgentTask','OperationalSetting']);
  assert.strictEqual(normalized.schema,full.schema);assert.strictEqual(normalized.history,full.history);
});

test('queue contents, row counts, schemas and migration-history changes still fail',()=>{
  const before=snapshotFixture(),filtered=before.contents[0],expected=normalizeTargetSnapshot(before,filtered);
  for(const mutate of [
    x=>x.contents[2].content_digest='f'.repeat(32),x=>x.contents[2].row_count++,
    x=>x.schema.tables[0].relname='Changed',x=>x.history[0].migration_name='changed-history',
  ]){const after=structuredClone(before);mutate(after);assert.throws(()=>assertPreserved(normalizeTargetSnapshot(after,filtered),expected,'protected state changed'));}
});

test('non-lease OperationalSetting changes remain protected by the filtered digest',()=>{
  const full=snapshotFixture(),filtered=full.contents[0],expected=normalizeTargetSnapshot(full,filtered);
  for(const changed of [{...filtered,row_count:1},{...filtered,content_digest:'e'.repeat(32)}]){
    assert.throws(()=>assertPreserved(normalizeTargetSnapshot(full,changed),expected,'non-lease settings changed'));
  }
});

test('added or removed tables cannot disappear during normalization',()=>{
  const full=snapshotFixture(),filtered=full.contents[0],expected=normalizeTargetSnapshot(full,filtered);
  for(const contents of [full.contents.slice(0,2),[...full.contents,{table_name:'Unexpected',row_count:0,content_digest:'f'.repeat(32)}]]){
    assert.throws(()=>assertPreserved(normalizeTargetSnapshot({...full,contents},filtered),expected,'table set changed'));
  }
});

test('missing or duplicate identities and malformed summaries fail closed',()=>{
  const full=snapshotFixture(),filtered=full.contents[0];
  for(const contents of [[],full.contents.slice(1),[...full.contents,full.contents[0]],[...full.contents,full.contents[1]],
    full.contents.map((x,i)=>i===1?{...x,table_name:''}:x),
    full.contents.map((x,i)=>i===1?{...x,row_count:-1}:x),
    full.contents.map((x,i)=>i===1?{...x,content_digest:'invalid'}:x)]){
    assert.throws(()=>normalizeTargetSnapshot({...full,contents},filtered));
  }
  for(const changed of [{...filtered,table_name:'Account'},{...filtered,row_count:1.5},{...filtered,content_digest:'invalid'}])assert.throws(()=>normalizeTargetSnapshot(full,changed));
});

test('queue revisions, reservations, pinned context and dispatch changes are not ignored',()=>{
  const task={id:'synthetic-task',revision:1,reservedCostMicroUsd:11,dispatchedAt:null,result:null,executionPolicy:{pinnedSourceId:'synthetic-source',pinnedSourceRevision:1}};
  for(const mutate of [x=>x.revision++,x=>x.reservedCostMicroUsd++,x=>x.dispatchedAt='2026-01-01',x=>x.result='changed',x=>x.executionPolicy.pinnedSourceRevision++,x=>x.id='replaced']){
    const changed=structuredClone(task);mutate(changed);assert.throws(()=>assertPreserved([changed],[task],'queue changed'));
  }
});
