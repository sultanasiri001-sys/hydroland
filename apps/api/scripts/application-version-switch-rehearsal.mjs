import assert from 'node:assert/strict';
import {verifyLiveRelay} from './recovery-switch-db-relay.mjs';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, readdir, realpath, writeFile, rm, lstat} from 'node:fs/promises';
import {renameSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

// Importing this module performs no I/O. A03 owns the eventual caller/hook.
export const PRIOR = '4f0b6ac663baeb814523d572def8c4cb8d754fbb';
export const CANDIDATE = 'a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d';
export const SEQUENCE = Object.freeze([PRIOR, CANDIDATE, PRIOR, CANDIDATE]);
export const LIMITS = Object.freeze({ready:60_000, http:5_000, shutdown:10_000, overall:600_000});
const SOURCE = 'hydroland_rehearsal_source';
const TARGET = 'hydroland_rehearsal_restore_2';
const UNTOUCHED = 'hydroland_rehearsal_restore_1';
const CONTAINER = 'phase11-postgres';
const LEASES = ['LEASE:CREW_ESCALATION', 'LEASE:OPERATIONAL_CLEARANCE_SCAN'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha256(JSON.stringify(value));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function bounded(operation, timeoutMs, label='operation') {
  assert(Number.isFinite(timeoutMs)&&timeoutMs>0);
  const controller=new AbortController();let timer;
  try {return await Promise.race([Promise.resolve().then(()=>operation(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{
    // Revoke publication authority synchronously BEFORE rejecting the timeout.
    controller.abort();reject(new Error(label+' timed out'));
  },timeoutMs);})]);}
  finally {clearTimeout(timer);controller.abort();}
}

export function createReceiptWriter(file,{stage=writeFile,publish=renameSync}={}) {
  let generation=0;
  return async(value,signal)=>{
    assert(signal instanceof AbortSignal,'Receipt writes require a bounded publication lease');
    signal.throwIfAborted();
    const mine=++generation,temporary=file+'.'+randomUUID()+'.tmp';
    const revoke=()=>{if(generation===mine)generation++;};
    signal.addEventListener('abort',revoke,{once:true});
    try{
      await stage(temporary,JSON.stringify(value,null,2));
      signal.throwIfAborted();
      assert.equal(generation,mine,'Superseded receipt writer');
      // No await between checking authority and atomic publication: an async
      // rename could itself finish after timeout. publish must be synchronous.
      publish(temporary,file);
    }catch(error){revoke();throw error;}
    finally{signal.removeEventListener('abort',revoke);}
  };
}

// Write FAIL before cleanup so a hung disconnect cannot leave a PASS receipt.
// The caller's outer watchdog must kill this helper if a driver keeps handles
// alive after timeout; these Promise deadlines do not cancel Prisma internals.
export async function finishWithReceipt({report,steps,persist,stepTimeout=5000}) {
  const intended=report.status;
  report.status='FAIL';report.cleanup={status:'INCOMPLETE',failedSteps:[]};
  await bounded(signal=>persist(report,signal),stepTimeout,'initial failure receipt');
  for(const [name,operation,timeout=stepTimeout] of steps){
    try{await bounded(operation,timeout,name);}
    catch{report.cleanup.failedSteps.push(name);}
  }
  report.cleanup.status=report.cleanup.failedSteps.length?'FAIL':'PASS';
  report.status=report.cleanup.status==='PASS'?intended:'FAIL';
  await bounded(signal=>persist(report,signal),stepTimeout,'final receipt');
  return report.status;
}

export function verifyNetworkBoundary(network,postgres,networkName,allowedNames=[CONTAINER]) {
  assert.equal(network.Name,networkName);assert.equal(network.Driver,'bridge');assert.equal(network.Internal,true);
  assert.equal(network.Labels?.['hydroland.recovery'],'disposable-local');
  assert.equal(network.EnableIPv6,false,'Use the reviewed IPv4-only boundary');
  assert.deepEqual(Object.keys(postgres.NetworkSettings.Networks),[networkName],'PostgreSQL must not bridge an external network');
  assert.equal(postgres.NetworkSettings.Networks[networkName].NetworkID,network.Id);
  const members=Object.values(network.Containers||{});
  assert(members.some(x=>x.Name===CONTAINER));
  assert(members.every(x=>allowedNames.includes(x.Name)),'Unexpected network peer');
  return network.Id;
}

export function verifyApplicationContainer(container,{networkName,networkId,runLabel,mounts,imageId}) {
  assert.equal(container.Config.Labels?.['hydroland.a02.run'],runLabel);
  assert.equal(container.Image,imageId);assert.equal(container.State.Running,true);
  assert.equal(container.HostConfig.NetworkMode,networkName);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[networkName]);
  assert.equal(container.NetworkSettings.Networks[networkName].NetworkID,networkId);
  assert.equal(container.HostConfig.PublishAllPorts,false);
  assert.equal(Object.keys(container.HostConfig.PortBindings||{}).length,0);
  assert(Object.values(container.NetworkSettings.Ports||{}).every(x=>x===null),'No host bindings');
  assert.equal(container.HostConfig.Privileged,false);assert.equal(container.HostConfig.ReadonlyRootfs,true);
  assert.equal(container.Config.User,'node');
  const actual=container.Mounts.filter(x=>x.Type==='bind').map(x=>({Source:x.Source,Destination:x.Destination,RW:x.RW}));
  const order=(a,b)=>a.Destination.localeCompare(b.Destination);
  assert.deepEqual(actual.sort(order),mounts.map(x=>({...x,RW:false})).sort(order),'Only approved runtime files may be mounted');
  assert(container.Mounts.every(x=>x.Type==='bind'||(x.Type==='tmpfs'&&x.Destination==='/tmp')));
}

// Only disposable checkouts directly inside the explicitly supplied workspace.
// Never sweep all ignored files or follow a symlinked parent during deletion.
export async function cleanOwnedBuildOutputs(root,workspace,sha) {
  assert([PRIOR,CANDIDATE].includes(sha));
  const base=await realpath(workspace),actual=await realpath(root);
  assert.equal(actual,join(base,sha),'Require a dedicated SHA-named artifact checkout');
  for(const parent of ['apps','apps/api','apps/web'])assert.equal(await realpath(join(actual,parent)),join(actual,parent));
  const config=JSON.parse(await readFile(join(actual,'apps/api/tsconfig.json'),'utf8'));
  assert.equal(config.compilerOptions.outDir,'./dist');
  assert(!config.extends,'Review inherited compiler output paths before use');
  assert(!config.compilerOptions.tsBuildInfoFile||['./tsconfig.tsbuildinfo','./dist/tsconfig.tsbuildinfo'].includes(config.compilerOptions.tsBuildInfoFile));
  const outputs=['apps/api/dist','apps/api/tsconfig.tsbuildinfo','apps/api/tsconfig.build.tsbuildinfo','apps/web/dist'];
  for(const output of outputs){
    const target=join(actual,output);
    // rm on a final symlink removes the link, not the external contents.
    await rm(target,{recursive:true,force:true});
    await assert.rejects(lstat(target),{code:'ENOENT'});
  }
  return outputs;
}

export function validateBoundary(env, report, inspection) {
  assert.equal(env.CI, 'true');
  assert.equal(env.NODE_ENV, 'test');
  assert.equal(env.RECOVERY_REHEARSAL_CONFIRM, 'DISPOSABLE_LOCAL_ONLY');
  const url = new URL(env.DATABASE_URL);
  assert.equal(url.protocol, 'postgresql:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '5432');
  assert.equal(url.username, 'hydroland');
  assert.equal(url.pathname, '/' + SOURCE);
  assert.equal(url.search, '?schema=public');
  assert.equal(report.scope, 'SYNTHETIC_LOCAL_LOGICAL_RESTORE');
  assert.equal(report.status, 'PASS');
  assert.equal(report.productionRecoveryVerified, false);
  assert.equal(report.historicalProductionReplayVerified, false);
  assert.match(report.sourceCommit, /^[a-f0-9]{40}$/, 'Require recorded fixture checkout provenance');
  assert.match(report.schemaSha256, /^[a-f0-9]{64}$/);
  for (const name of ['disposable_source_is_empty', 'representative_data_and_raw_extensions_seeded',
    'negative_control_detects_corrupted_restored_data', 'source_unchanged_by_both_restores',
    TARGET + ':all_table_data_identical', TARGET + ':entire_real_migration_history_identical']) {
    assert(report.checks.some(check => check.name === name && check.status === 'PASS'), name);
  }
  assert.equal(inspection.Name, '/' + CONTAINER);
  assert.equal(inspection.Config.Labels?.['hydroland.recovery'], 'disposable-local');
  assert.equal(inspection.State.Running, true);
  assert(inspection.Config.Env.includes('POSTGRES_DB=' + SOURCE));
  assert.deepEqual(inspection.HostConfig.PortBindings||{},{});
  const targetUrl = new URL(url); targetUrl.pathname = '/' + TARGET;
  return targetUrl.href;
}

// Never inherit provider credentials, NODE_OPTIONS, npm hooks or sessionless access.
export function runtimeEnvironment({databaseUrl, commit, secret, port, path}) {
  assert(SEQUENCE.includes(commit));
  assert.equal(new URL(databaseUrl).pathname, '/' + TARGET);
  assert.equal(new URL(databaseUrl).hostname, CONTAINER);
  assert.equal(new URL(databaseUrl).protocol, 'postgresql:');
  assert.equal(new URL(databaseUrl).port, '5432');
  return {PATH:path, NODE_ENV:'test', CI:'true', DATABASE_URL:databaseUrl,
    JWT_SECRET:secret, PORT:String(port), WEB_ORIGIN:'http://127.0.0.1:3198',
    RENDER_GIT_COMMIT:commit, HYDROLAND_AI_TEST_MANUAL_WORKER:'1',
    HYDROLAND_INTEGRATION_EMAIL_STATUS:'DISABLED', TZ:'UTC'};
}

export function assertPreserved(actual, expected, label) {
  assert.equal(digest(actual), digest(expected), label);
}

async function outputDigest(root) {
  const entries = [];
  async function walk(path, prefix='') {
    for (const entry of (await readdir(path, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      const relative = prefix + entry.name;
      assert(!entry.isSymbolicLink(), 'Artifact symlinks are not accepted');
      if (entry.isDirectory()) await walk(join(path,entry.name), relative + '/');
      else {assert(entry.isFile()); entries.push([relative,sha256(await readFile(join(path,entry.name)))]);}
    }
  }
  await walk(root); assert(entries.length > 0); return digest(entries);
}

/**
 * LOCAL PREPARATION ONLY until explicitly authorized for CI execution.
 * artifacts: two separately prepared, clean Git checkouts with locked dependencies
 * installed and Prisma generated; this helper NEVER fetches/installs/seeds an app.
 * recoveryReport: completed A03 report (never mutated by this helper).
 * Artifacts are built here from their verified sources, not trusted from labels.
 */
export async function applicationVersionSwitchRehearsal({artifacts,artifactWorkspace,recoveryReport,evidenceDir,networkName,runtimeImageId}) {
  const started = Date.now(), deadline = started + LIMITS.overall;
  const owned = new Set(),mountSets=new Map(); let db, sourceBefore, untouchedBefore, failure, targetUrl,networkId;
  const runLabel=randomUUID();
  const report = {scope:'SYNTHETIC_APPLICATION_SWITCH', status:'RUNNING',runLabel,
    productionRollbackVerified:false, providerPitrVerified:false, workerProcessingVerified:false,
    limitsMs:LIMITS, phases:[], artifacts:[], checks:[],
    expectedDifference:'Prior predates PR533 calendar NOT_READY correction. Calendar equivalence is NOT asserted; this is never approval to roll production back.',
    workers:{ai:'manual test mode', email:'disabled integration', crew:'active; lease writes allowed; no pending crew fixture', clearance:'active; lease writes allowed; only DRAFT trips'},
    queueScope:'Synthetic persistence sentinels; not valid governance routing/processing or model execution proof'};
  const writer=createReceiptWriter(join(evidenceDir,'application-version-switch-report.json'));
  async function persist(value,signal){
    value.durationMs=Date.now()-started;
    if(value.durationMs>LIMITS.overall)value.status='FAIL';
    await writer(value,signal);
  }
  // Durable fail-closed receipt exists before any Docker/build/database work.
  await bounded(signal=>persist({...report,status:'FAIL',failureCode:'EXECUTION_OR_CLEANUP_INCOMPLETE'},signal),5000,'write-ahead receipt');
  let cleanup=false,cleanupCommandDeadline=Infinity;
  // Reserve 45 seconds for cleanup and final unchanged-state evidence.
  const remaining = cap => {const value = Math.min(cap,cleanupCommandDeadline-Date.now(),deadline-Date.now()-(cleanup?3000:45_000)); assert(value > 0, 'Overall CI deadline exceeded'); return value;};
  const command = (exe,args,options={}) => execFileSync(exe,args,{encoding:'utf8',timeout:remaining(120_000),killSignal:'SIGKILL',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe'],...options});
  const docker = (args,options={}) => command('docker',args,options);
  const sql = (database, query) => {
    assert([SOURCE,TARGET,UNTOUCHED].includes(database));
    return docker(['exec',CONTAINER,'psql','-X','-U','hydroland','-d',database,'-v','ON_ERROR_STOP=1','-At','-c',query]).trim();
  };
  const rows=(database,query)=>JSON.parse(sql(database,`SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM (${query}) t`));
  // Same snapshot representation as the A03 receipt, with every subprocess
  // bounded by the remaining overall deadline. No callback can hide unbounded I/O.
  const schemaQueries={
    tables:`SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.relreplident FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')`,
    columns:`SELECT table_name,column_name,ordinal_position,is_nullable,data_type,udt_schema,udt_name,column_default,character_maximum_length,numeric_precision,numeric_scale,datetime_precision,is_identity,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public'`,
    constraints:`SELECT c.relname AS table_name,co.conname,co.contype,co.convalidated,pg_get_constraintdef(co.oid,true) AS definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`,
    indexes:`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'`,
    enums:`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'`,
    sequences:`SELECT sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public'`,
    triggers:`SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`,
    functions:`SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')`,
    views:`SELECT viewname,definition FROM pg_views WHERE schemaname='public'`,
    policies:`SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public'`,
  };
  function snapshot(database){
    const schema=Object.fromEntries(Object.entries(schemaQueries).map(([name,query])=>[name,rows(database,query)]));
    const tables=rows(database,"SELECT tablename FROM pg_tables WHERE schemaname='public'").map(row=>row.tablename);
    assert(tables.length>0);
    const contents=rows(database,tables.map(table=>`SELECT '${table.replaceAll("'","''")}' AS table_name,COUNT(*)::int AS row_count,md5(COALESCE(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY to_jsonb(r)::text),'')) AS content_digest FROM "${table.replaceAll('"','""')}" r`).join(' UNION ALL '));
    return{schema,contents,history:rows(database,'SELECT * FROM "_prisma_migrations"')};
  }
  const check = (name, condition=true) => {assert(condition,name); report.checks.push(name);};
  let activePhaseStep='INITIALIZATION';
  function inspect(name){return JSON.parse(docker(['inspect',name],{timeout:remaining(2000)}))[0];}
  function verifyNetwork(){
    const network=JSON.parse(docker(['network','inspect',networkName],{timeout:remaining(2000)}))[0];
    assert.equal(verifyNetworkBoundary(network,inspect(CONTAINER),networkName,[CONTAINER,...owned]),networkId);
  }
  function stop(name) {
    if(!owned.has(name))return;
    const startedStop=Date.now();
    const previousDeadline=cleanupCommandDeadline;
    cleanupCommandDeadline=Math.min(previousDeadline,startedStop+LIMITS.shutdown);
    try {
    const state=inspect(name);assert.equal(state.Config.Labels?.['hydroland.a02.run'],runLabel,'Refuse cleanup of unowned container');
    let stopError;
    try{
      docker(['stop','--time','6',name],{timeout:remaining(7000)});
      const stopped=inspect(name);
      assert.equal(stopped.State.Running,false);
      assert.notEqual(stopped.State.ExitCode,137,'Forced shutdown is not graceful completion');
      assert.equal(stopped.State.OOMKilled,false);
    }catch(error){stopError=error;}
    // Always attempt bounded force-removal of this verified owned container.
    docker(['rm','--force',name],{timeout:remaining(Math.max(1,LIMITS.shutdown-(Date.now()-startedStop)))});
    owned.delete(name);
    if(stopError||Date.now()-startedStop>LIMITS.shutdown)throw new Error('Owned container shutdown bound failed');
    }finally{cleanupCommandDeadline=previousDeadline;}
  }
  function launch(root,args,env,kind,index) {
    const name=`a02-${runLabel}-${index}-${kind}`;
    assert(!root.includes(','),'Mount source contains an unsupported delimiter');
    // Record ownership before create: an interrupted docker response can leave
    // a created container. Final cleanup checks the random label before removal.
    owned.add(name);
    const mounts=mountSets.get(root);assert(mounts?.length);
    docker(['create','--pull','never','--name',name,'--label',`hydroland.a02.run=${runLabel}`,
      '--network',networkName,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=64m',
      '--cap-drop','ALL','--security-opt','no-new-privileges','--user','node',
      ...mounts.flatMap(x=>['--mount',`type=bind,src=${x.Source},dst=${x.Destination},readonly`]),'--workdir','/workspace',
      '--entrypoint','node',...Object.entries(env).flatMap(([key,value])=>['--env',`${key}=${value}`]),runtimeImageId,...args],{timeout:remaining(5000)});
    docker(['start',name],{timeout:remaining(5000)});
    verifyApplicationContainer(inspect(name),{networkName,networkId,runLabel,mounts,imageId:runtimeImageId});
    verifyNetwork();return name;
  }
  async function http(container,path,token,port=3197) {
    // Probe INSIDE the same network namespace; no host listener or published port.
    const probe=`let input='';for await(const chunk of process.stdin)input+=chunk;const {path,token,port}=JSON.parse(input);const r=await fetch('http://127.0.0.1:'+port+path,{headers:token?{authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(4000),redirect:'error'});const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{};console.log(JSON.stringify({status:r.status,text,body}));`;
    return JSON.parse(docker(['exec','-i',container,'node','--input-type=module','-e',probe],{input:JSON.stringify({path,token,port}),stdio:['pipe','pipe','pipe'],timeout:remaining(LIMITS.http)}));
  }
  function listener(container,port){
    const script=`const fs=require('node:fs');const port=${port};const rows=['/proc/net/tcp','/proc/net/tcp6'].flatMap(p=>fs.readFileSync(p,'utf8').trim().split('\\n').slice(1).map(l=>l.trim().split(/\\s+/)).filter(x=>x[3]==='0A'&&parseInt(x[1].split(':')[1],16)===port).map(x=>x[1]));if(!rows.length)process.exit(1);console.log(JSON.stringify(rows));`;
    return JSON.parse(docker(['exec',container,'node','-e',script],{timeout:remaining(2000)}));
  }
  // The full snapshot still protects all table contents except the two named
  // scheduler lease rows. Those rows are validated and recorded separately.
  function targetSnapshot() {
    const full=snapshot(TARGET);
    const filtered=JSON.parse(sql(TARGET,`SELECT json_build_object('table_name','OperationalSetting','row_count',COUNT(*)::int,'content_digest',md5(COALESCE(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY to_jsonb(r)::text),''))) FROM "OperationalSetting" r WHERE "key" NOT IN ('LEASE:CREW_ESCALATION','LEASE:OPERATIONAL_CLEARANCE_SCAN')`));
    return {...full,contents:full.contents.map(row=>row.table_name==='OperationalSetting'?filtered:row)};
  }
  function verifyUntouched() {
    assertPreserved(snapshot(SOURCE),sourceBefore,'Source changed');
    assertPreserved(snapshot(UNTOUCHED),untouchedBefore,'Untouched negative-control target changed');
  }
  try {
    assert.match(networkName,/^a02-rehearsal-[a-z0-9-]{1,64}$/);
    assert.match(runtimeImageId,/^sha256:[a-f0-9]{64}$/,'Preloaded immutable Linux image required; helper never pulls');
    verifyLiveRelay(join(evidenceDir,'..','ci-ownership.json'));
    const postgres=inspect(CONTAINER);
    targetUrl=validateBoundary(process.env,recoveryReport,postgres);
    networkId=verifyNetworkBoundary(JSON.parse(docker(['network','inspect',networkName]))[0],postgres,networkName);
    const image=JSON.parse(docker(['image','inspect',runtimeImageId]))[0];
    assert.equal(image.Id,runtimeImageId);assert.equal(image.Os,'linux');
    assert.equal(Object.keys(image.Config.Volumes||{}).length,0,'No implicit image volumes');
    assert((image.Config.Env||[]).every(x=>['PATH','NODE_VERSION','YARN_VERSION','NODE_ENV'].includes(x.split('=')[0])),'Runtime image must not contain provider configuration');
    report.isolation={networkName,networkId,runtimeImageId,publishedApplicationPorts:false,applicationHostListenerCreated:false,databaseAccess:'owned-loopback-relay'};
    assert.equal(artifacts.length,2);
    assert.deepEqual(artifacts.map(x=>x.sha),[PRIOR,CANDIDATE]);
    assert.equal(Number(process.versions.node.split('.')[0]),22);
    sourceBefore=snapshot(SOURCE); untouchedBefore=snapshot(UNTOUCHED);
    const originalTarget=snapshot(TARGET), receipt=recoveryReport.targets.find(x=>x.name===TARGET);
    assert.equal(receipt?.status,'PASS');
    assert.equal(digest(originalTarget.contents),receipt.dataDigest,'Restored bytes must match A03 synthetic receipt');
    assert.equal(digest(originalTarget.schema),receipt.schemaDigest);
    assertPreserved(originalTarget,sourceBefore,'Target must still equal synthetic source before additions');
    assert.notEqual(digest(untouchedBefore.contents),digest(sourceBefore.contents),'Negative-control target must remain corrupted');
    check('synthetic_restore_provenance_verified');
    const roots=[];
    for (const artifact of artifacts) {
      const root=await realpath(artifact.root); roots.push(root);
      assert.equal(root,join(await realpath(artifactWorkspace),artifact.sha));
      assert.equal(command('git',['-C',root,'rev-parse','HEAD']).trim(),artifact.sha);
      assert.equal(command('git',['-C',root,'status','--porcelain','--untracked-files=all']).trim(),'','Artifact checkout must be clean');
      const rootLock=await readFile(join(root,'package-lock.json'));
      assert.equal(sha256(rootLock),sha256(await readFile(join(artifacts[1].root,'package-lock.json'))),'Pair must share locked dependencies');
      assert.equal(sha256(await readFile(join(root,'apps/api/prisma/schema.prisma'))),sha256(await readFile(join(artifacts[1].root,'apps/api/prisma/schema.prisma'))),'Code-only pair requires identical schema');
      assert.equal(sha256(await readFile(join(root,'apps/api/prisma/schema.prisma'))),recoveryReport.schemaSha256,'Fixture schema must match both artifacts');
      const worker=await readFile(join(root,'apps/api/src/agents/agent-runtime.worker.ts'),'utf8');
      assert(worker.includes("process.env.NODE_ENV==='test'&&process.env.HYDROLAND_AI_TEST_MANUAL_WORKER==='1'"),'Required AI pause guard missing');
      const require=createRequire(join(root,'apps/api/package.json'));
      const buildEnv={PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',DATABASE_URL:targetUrl};
      const removedOutputs=await bounded(()=>cleanOwnedBuildOutputs(root,artifactWorkspace,artifact.sha),remaining(5000),'owned build cleanup');
      command(process.execPath,[require.resolve('@nestjs/cli/bin/nest.js'),'build'],{cwd:join(root,'apps/api'),env:buildEnv});
      command(process.execPath,[join(root,'apps/web/scripts/build.mjs')],{cwd:root,env:buildEnv});
      // Never expose .git/config checkout credentials, .env files or arbitrary
      // source files by mounting the entire checkout into the application.
      const runtimePaths=['package.json','node_modules','apps/api/package.json','apps/api/dist','apps/web/package.json','apps/web/scripts/serve.mjs','apps/web/dist'];
      try{await lstat(join(root,'apps/api/node_modules'));runtimePaths.push('apps/api/node_modules');}catch(error){if(error.code!=='ENOENT')throw error;}
      const mounts=[];
      for(const relative of runtimePaths){const source=join(root,relative);assert.equal(await realpath(source),source,'Runtime mount must not escape owned checkout');mounts.push({Source:source,Destination:'/workspace/'+relative});}
      mountSets.set(root,mounts);
      report.artifacts.push({sha:artifact.sha,removedOutputs,tree:command('git',['-C',root,'rev-parse','HEAD^{tree}']).trim(),lockSha256:sha256(rootLock),apiDigest:await outputDigest(join(root,'apps/api/dist')),webDigest:await outputDigest(join(root,'apps/web/dist'))});
    }
    assert.notEqual(roots[0],roots[1],'Distinct artifact directories required');
    const require=createRequire(join(roots[1],'apps/api/package.json'));
    const {PrismaClient}=require('@prisma/client');
    const boundedUrl=new URL(targetUrl);boundedUrl.searchParams.set('connect_timeout','5');boundedUrl.searchParams.set('pool_timeout','5');
    const client=new PrismaClient({datasourceUrl:boundedUrl.href});
    // Each fixture operation uses an interactive transaction with bounded wait
    // and execution; no unbounded ORM operation may consume the whole CI budget.
    db=new Proxy(client,{get(target,key){
      if(key==='$disconnect')return target.$disconnect.bind(target);
      assert(typeof key==='string'&&!key.startsWith('$'),'Only bounded model operations allowed');
      return new Proxy({}, {get(_model,method){return(...args)=>target.$transaction(tx=>tx[key][method](...args),{maxWait:remaining(5_000),timeout:remaining(5_000)});}});
    }});
    // No app seed, private archive or copied production data. These are newly
    // generated synthetic persistence records, prepared ONCE before any phase.
    assert.equal(await db.aiAgentTask.count(),0); assert.equal(await db.aiAgentRuntime.count(),0);
    assert.equal(await db.crewAssignment.count(),0);
    assert.equal(await db.trip.count({where:{status:{in:['OPEN','CLOSED']}}}),0);
    assert.equal(await db.operationalSetting.count({where:{key:{in:LEASES}}}),0,'No pre-existing scheduler leases in fixture');
    const person=await db.person.create({data:{firstName:'A02 synthetic',lastName:'switch fixture'}});
    const account=await db.account.create({data:{personId:person.id,email:`a02-${randomUUID()}@example.invalid`,passwordHash:'NON_LOGIN_SYNTHETIC',status:'ACTIVE',emailVerifiedAt:new Date()}});
    const sessions=await Promise.all([0,1].map(()=>db.session.create({data:{accountId:account.id,tokenHash:sha256(randomUUID()),expiresAt:new Date(Date.now()+30*60_000)}})));
    await db.aiAgentRuntime.create({data:{key:'SUPPORT',state:'PAUSED',lastAdminAccountId:account.id}});
    const historical=await db.aiAgentTask.create({data:{agentKey:'SUPPORT',requestedByAccountId:account.id,requestKey:randomUUID(),fingerprint:'A02_SYNTHETIC_HISTORY',action:'DRAFT_MESSAGE',language:'en',prompt:'Synthetic historical draft',state:'COMPLETED',result:'Synthetic immutable result',dispatchedAt:new Date('2026-01-01'),finishedAt:new Date('2026-01-01'),reservedCostMicroUsd:7}});
    const queued=await db.aiAgentTask.create({data:{agentKey:'SUPPORT',requestedByAccountId:account.id,requestKey:randomUUID(),fingerprint:'A02_SYNTHETIC_QUEUE',action:'DRAFT_MESSAGE',language:'en',prompt:'Synthetic queued correction persistence sentinel',reservedCostMicroUsd:11,executionPolicy:{synthetic:true,pinnedSourceId:historical.id,pinnedSourceRevision:historical.revision}}});
    await db.auditEvent.create({data:{actorId:person.id,action:'A02_SYNTHETIC_PINNED_CONTEXT',resource:'AiAgentTask',resourceId:queued.id,metadata:{synthetic:true,sourceTaskId:historical.id,sourceRevision:historical.revision,queuedRevision:queued.revision}}});
    const pinned=await db.aiAgentTask.findMany({orderBy:{id:'asc'}});
    let expected=targetSnapshot(),previousLeases=[]; const secret=randomUUID()+randomUUID();
    const token=session=>{const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:account.id,sid:session.id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
    const valid=token(sessions[0]),revoke=token(sessions[1]);
    for (const [index,sha] of SEQUENCE.entries()) {
      const artifact=artifacts.find(x=>x.sha===sha),root=await realpath(artifact.root),phaseStart=Date.now();
      const containerUrl=new URL(targetUrl);containerUrl.hostname=CONTAINER;
      const env=runtimeEnvironment({databaseUrl:containerUrl.href,commit:sha,secret,port:3197,path:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'});
      const api=launch(root,['apps/api/dist/main.js'],env,'api',index);
      // Run the real static server CLI too; its all-interface listener is scoped
      // to its isolated namespace, with no host port publication.
      const web=launch(root,['apps/web/scripts/serve.mjs'],{NODE_ENV:'test',PORT:'3198'},'web',index);
      let listenerState;
      try {
        let ready=false;
        while(Date.now()-phaseStart<LIMITS.ready) {
          assert(inspect(api).State.Running&&inspect(web).State.Running,'Application exited before readiness');
          try {const r=await http(api,'/api/v1/health/ready'); if(r.status===200&&r.body?.database==='ok'&&r.body?.status==='ready'&&r.body?.commit===sha){ready=true;break;}} catch { /* bounded startup only */ }
          await delay(Math.min(200,remaining(200)));
        }
        check(`phase_${index}:ready_within_bound`,ready&&Date.now()-phaseStart<=LIMITS.ready);
        activePhaseStep='NETWORK_OWNERSHIP';verifyNetwork();for(const name of [api,web])verifyApplicationContainer(inspect(name),{networkName,networkId,runLabel,mounts:mountSets.get(root),imageId:runtimeImageId});
        activePhaseStep='LISTENER_INSPECTION';listenerState={api:listener(api,3197),web:listener(web,3198)};
        activePhaseStep='API_LIVENESS';const live=await http(api,'/api/v1/health'); assert.equal(live.body?.status,'ok');assert.equal(live.body?.database,undefined);assert.equal(live.body?.commit,sha);
        activePhaseStep='WEB_ROOT';const webResponse=await http(web,'/',null,3198);assert.equal(webResponse.status,200);assert.equal(sha256(webResponse.text),sha256(await readFile(join(root,'apps/web/dist/index.html'))));
        activePhaseStep='WEB_ASSET';const asset=await http(web,'/hydroland-auth.js',null,3198);assert.equal(asset.status,200);assert.equal(sha256(asset.text),sha256(await readFile(join(root,'apps/web/dist/hydroland-auth.js'))));
        activePhaseStep='UNAUTHENTICATED_ACCESS';assert.equal((await http(api,'/api/v1/me')).status,401);
        activePhaseStep='AUTHENTICATED_ACCESS';const authorized=await http(api,'/api/v1/me',valid);assert.equal(authorized.status,200);assert.equal(authorized.body?.id,account.id);
        activePhaseStep='SESSION_REVOCATION';assert.equal((await http(api,'/api/v1/me',revoke)).status,index<2?200:401);
        activePhaseStep='QUEUE_PRESERVATION';assertPreserved(await db.aiAgentTask.findMany({orderBy:{id:'asc'}}),pinned,'Queue IDs/revisions/context/reservations/dispatch changed');
      } finally {const stopped=await Promise.allSettled([Promise.resolve().then(()=>stop(api)),Promise.resolve().then(()=>stop(web))]);assert(stopped.every(x=>x.status==='fulfilled'),'Container cleanup failed');}
      assertPreserved(targetSnapshot(),expected,'Unexpected persisted state or schema change');
      const leases=await db.operationalSetting.findMany({where:{key:{in:LEASES}},orderBy:{key:'asc'}});
      assert.equal(leases.length,2);for(const lease of leases){assert.deepEqual(lease.value,{type:'SCHEDULER_LEASE'});assert(lease.updatedAt.getTime()>=started&&lease.updatedAt.getTime()<=Date.now());}
      verifyUntouched();
      const leaseState=leases.map(x=>({key:x.key,updatedAt:x.updatedAt.toISOString()}));
      report.phases.push({index,sha,durationMs:Date.now()-phaseStart,listenerState,dataDigest:digest(expected),leaseState,changedLeaseKeys:leaseState.filter(x=>!previousLeases.some(old=>old.key===x.key&&old.updatedAt===x.updatedAt)).map(x=>x.key)});
      previousLeases=leaseState;
      if(index===1){await db.session.update({where:{id:sessions[1].id},data:{revokedAt:new Date()}});expected=targetSnapshot();}
    }
    for(const [index,root] of roots.entries()){
      assert.equal(await outputDigest(join(root,'apps/api/dist')),report.artifacts[index].apiDigest,'API artifact changed during rehearsal');
      assert.equal(await outputDigest(join(root,'apps/web/dist')),report.artifacts[index].webDigest,'Web artifact changed during rehearsal');
    }
    check('all_four_versions_verified_same_database_without_restore_or_reseed');
    report.status='PASS';
  } catch(error) {failure=error;report.status='FAIL';report.failureCode='REHEARSAL_ASSERTION_OR_EXECUTION_FAILED';report.failureStage=report.phases.length===0?'BEFORE_FIRST_COMPLETED_PHASE':`AFTER_PHASE_${report.phases.length}`;report.failureType=error instanceof assert.AssertionError?'ASSERTION':'EXECUTION';report.failureCheck=activePhaseStep;}
  finally {
    cleanup=true;
    const commandStep=(fn,ms)=>()=>{cleanupCommandDeadline=Date.now()+ms;try{return fn();}finally{cleanupCommandDeadline=Infinity;}};
    const steps=[...owned].map(name=>['owned_container_'+name,commandStep(()=>stop(name),LIMITS.shutdown),LIMITS.shutdown]);
    if(db)steps.push(['prisma_disconnect',()=>db.$disconnect(),2000]);
    if(sourceBefore&&untouchedBefore)steps.push(['source_and_negative_target',commandStep(()=>{verifyUntouched();report.checks.push('source_and_untouched_target_preserved_at_exit');},10000),10000]);
    try{await finishWithReceipt({report,steps,persist,stepTimeout:2000});}
    catch{report.status='FAIL';failure??=new Error('Receipt finalization failed; write-ahead failure receipt retained');}
    if(report.status!=='PASS')failure??=new Error('Cleanup or overall bound failed');
  }
  if(failure)throw new Error('Application version-switch rehearsal failed; see sanitized receipt');
  return report;
}
