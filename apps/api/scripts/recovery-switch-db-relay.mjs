import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createServer,connect,isIPv4} from 'node:net';
import {readFileSync,writeFileSync,renameSync,readdirSync,readlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {identity} from './recovery-switch-processes.mjs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const save=(path,value)=>{writeFileSync(path+'.tmp',JSON.stringify(value,null,2));renameSync(path+'.tmp',path);};
const docker=args=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',timeout:5000,killSignal:'SIGKILL',maxBuffer:1024*1024}))[0];
export function relayTarget(state,pg,network){
 assert.match(state.token,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.equal(state.networkName,'a02-rehearsal-'+state.token);
 assert.equal(network.Name,state.networkName);assert.equal(network.Id,state.networkId);
 assert.equal(network.Internal,true);assert.equal(network.Driver,'bridge');assert.equal(network.EnableIPv6,false);
 for(const labels of [network.Labels,pg.Config.Labels]){
  assert.equal(labels?.['hydroland.a03.run'],state.token);assert.equal(labels?.['hydroland.recovery'],'disposable-local');
 }
 assert.equal(pg.Id,state.postgresId);assert.equal(pg.Name,'/phase11-postgres');assert.equal(pg.State.Running,true);
 assert.equal(pg.HostConfig.NetworkMode,state.networkName);
 assert.deepEqual(Object.keys(pg.NetworkSettings.Networks),[state.networkName]);
 assert.equal(pg.HostConfig.PublishAllPorts,false);assert.deepEqual(pg.HostConfig.PortBindings||{},{});
 assert(Object.values(pg.NetworkSettings.Ports||{}).every(value=>value===null));
 const endpoint=pg.NetworkSettings.Networks[state.networkName];assert.equal(endpoint.NetworkID,network.Id);
 const ip=endpoint.IPAddress;assert(isIPv4(ip));
 const parts=ip.split('.').map(Number);assert(parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168),'Private bridge IP required');
 assert.equal(network.Containers?.[pg.Id]?.Name,'phase11-postgres');
 assert.equal(network.Containers[pg.Id].IPv4Address.split('/')[0],ip);
 return {host:ip,port:5432};
}
export function assertOwnedListener(tcp,ownedInodes){
 const listeners=tcp.trim().split('\n').slice(1).map(line=>line.trim().split(/\s+/)).filter(fields=>fields[3]==='0A'&&fields[1].endsWith(':1538'));
 assert.equal(listeners.length,1,'Exactly one IPv4 database listener required');
 assert.equal(listeners[0][1],'0100007F:1538','Only IPv4 loopback allowed');
 assert(ownedInodes.has(listeners[0][9]),'Listener must belong to recorded relay');
}
export function verifyLiveRelay(statePath){
 const state=read(statePath),target=relayTarget(state,docker(['inspect','phase11-postgres']),docker(['network','inspect',state.networkName]));
 assert.deepEqual(state.relay?.target,target);assert.deepEqual(state.relay?.listen,{host:'127.0.0.1',port:5432});
 const processRecord=state.relay.process;assert.deepEqual(identity(processRecord.pid),processRecord);
 const inodes=new Set(readdirSync(`/proc/${processRecord.pid}/fd`).flatMap(fd=>{
  try{const match=readlinkSync(`/proc/${processRecord.pid}/fd/${fd}`).match(/^socket:\[(\d+)\]$/);return match?[match[1]]:[];}catch(error){if(error.code==='ENOENT')return [];throw error;}
 }));
 assertOwnedListener(readFileSync(`/proc/${processRecord.pid}/net/tcp`,'utf8'),inodes);
 assert(!readFileSync(`/proc/${processRecord.pid}/net/tcp6`,'utf8').split('\n').some(line=>{const f=line.trim().split(/\s+/);return f[3]==='0A'&&f[1]?.endsWith(':1538');}),'No IPv6 database listener');
 return target;
}
export function createRelay(target,{serverFactory=createServer,connectFn=connect}={}){
 let active=0;
 const server=serverFactory(client=>{
  if(active>=32){client.destroy();return;}active++;
  const upstream=connectFn({host:target.host,port:5432});
  let closed=false;const close=()=>{if(closed)return;closed=true;active--;client.destroy();upstream.destroy();};
  client.setTimeout(120000,close);upstream.setTimeout(5000,close);
  upstream.once('connect',()=>upstream.setTimeout(120000,close));
  for(const socket of [client,upstream]){socket.on('error',close);socket.on('close',close);}
  client.pipe(upstream);upstream.pipe(client);
 });
 return server;
}
async function serve(statePath){
 await new Promise((resolve,reject)=>{process.once('message',m=>m==='START'?resolve():reject(Error('Invalid gate')));process.once('disconnect',()=>reject(Error('Parent vanished before start')));});
 const state=read(statePath),target=relayTarget(state,docker(['inspect','phase11-postgres']),docker(['network','inspect',state.networkName]));
 assert.deepEqual(identity(process.pid),state.relay.process);assert.deepEqual(state.relay.target,target);
 const server=createRelay(target);server.on('error',()=>process.exit(1));
 await new Promise(resolve=>server.listen({host:'127.0.0.1',port:5432,exclusive:true},resolve));
 assert.equal(server.address().address,'127.0.0.1');assert.equal(server.address().port,5432);
 process.send('READY');process.disconnect();
 setTimeout(()=>process.exit(1),30*60*1000); // independently bounded lifetime
}
async function start(statePath){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');assert.equal(process.env.RECOVERY_REHEARSAL_CONFIRM,'DISPOSABLE_LOCAL_ONLY');
 const state=read(statePath);assert(!state.relay,'No duplicate relay');
 const target=relayTarget(state,docker(['inspect','phase11-postgres']),docker(['network','inspect',state.networkName]));
 const receiptPath=join(dirname(statePath),'host-database-preflight.json');
 const receipt={scope:'SYNTHETIC_HOST_DATABASE_PREFLIGHT',status:'FAIL',productionRollbackVerified:false,providerPitrVerified:false};save(receiptPath,receipt);
 const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'serve',statePath],{detached:true,stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH}});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Relay startup timed out; owned cleanup required')),10000);
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('exit',()=>{clearTimeout(timer);reject(Error('Relay exited during startup'));});
  child.once('spawn',()=>{try{state.relay={target,listen:{host:'127.0.0.1',port:5432},process:identity(child.pid)};save(statePath,state);child.send('START');}catch(error){child.kill('SIGKILL');clearTimeout(timer);reject(error);}});
  child.once('message',message=>{clearTimeout(timer);message==='READY'?resolve():reject(Error('Invalid relay readiness'));});
 }).finally(()=>{child.unref();if(child.connected)child.disconnect();});
 verifyLiveRelay(statePath);
 const expectedSystem=execFileSync('docker',['exec','phase11-postgres','psql','-U','hydroland','-d','hydroland_rehearsal_source','-At','-c','SELECT system_identifier::text FROM pg_control_system()'],{encoding:'utf8',timeout:5000,killSignal:'SIGKILL'}).trim();
 assert.match(expectedSystem,/^\d+$/);
 hostPreflight({target,expectedSystem,verify:()=>verifyLiveRelay(statePath),persist:value=>save(receiptPath,value),probe:()=>runProbeChild(()=>execFileSync(process.execPath,[fileURLToPath(import.meta.url),'probe',statePath],{encoding:'utf8',timeout:8000,killSignal:'SIGKILL',env:{PATH:process.env.PATH},stdio:['ignore','pipe','ignore']}))});
}
export const IDENTITY_SQL='SELECT current_database()::text AS database, current_user::text AS username, inet_server_addr()::text AS address, system_identifier::text AS system_id FROM pg_control_system()';
const stages=new Set(['BOUNDARY','CLIENT_INITIALIZATION','CONNECT','QUERY','DISCONNECT']);
const codes=new Set(['P1000','P1001','P1002','P1010','P2010','P2024','ECONNREFUSED','ETIMEDOUT','ECONNRESET','ENOENT','ERR_ASSERTION','UNKNOWN']);
const sqlStates=new Set(['42501','42601','42883','08001','08006','28P01']);
export function sanitizedError(error){
 const result={code:codes.has(error?.code)?error.code:'UNKNOWN'};
 if(sqlStates.has(error?.meta?.code))result.sqlState=error.meta.code;
 return result;
}
// All failures become a small allowlisted envelope. No stderr/message/stack/URL.
export async function probeDatabase({verify,createClient}){
 let db,stage='BOUNDARY',outcome;
 try{
  verify();stage='CLIENT_INITIALIZATION';db=await createClient();
  stage='CONNECT';await db.$connect();
  stage='QUERY';const rows=await db.$queryRawUnsafe(IDENTITY_SQL);
  outcome={ok:true,rows};
 }catch(error){outcome={ok:false,stage,...sanitizedError(error)};}
 finally{
  if(db)try{await db.$disconnect();}catch(error){
   if(outcome?.ok)outcome={ok:false,stage:'DISCONNECT',...sanitizedError(error)};
   else outcome.disconnectCode=sanitizedError(error).code;
  }
 }
 return outcome;
}
export function runProbeChild(execute){
 let text;
 try{text=execute();}catch(error){
  throw Object.assign(new Error('HOST_DATABASE_PROBE_PROCESS_FAILED'),{diagnostic:{stage:'CHILD_PROCESS',code:error.code==='ETIMEDOUT'?'ETIMEDOUT':'CHILD_EXIT',...(error.signal==='SIGKILL'?{signal:'SIGKILL'}:{})}});
 }
 let result;
 try{result=JSON.parse(text);}catch{throw Object.assign(new Error('HOST_DATABASE_PROBE_PROTOCOL_FAILED'),{diagnostic:{stage:'CHILD_PROTOCOL',code:'INVALID_JSON'}});}
 if(result?.ok===false){
  const diagnostic={stage:stages.has(result.stage)?result.stage:'CHILD_PROTOCOL',code:codes.has(result.code)?result.code:'UNKNOWN'};
  if(sqlStates.has(result.sqlState))diagnostic.sqlState=result.sqlState;
  if(codes.has(result.disconnectCode))diagnostic.disconnectCode=result.disconnectCode;
  throw Object.assign(new Error('HOST_DATABASE_PROBE_FAILED'),{diagnostic});
 }
 if(result?.ok!==true||!Array.isArray(result.rows))throw Object.assign(new Error('HOST_DATABASE_PROBE_PROTOCOL_FAILED'),{diagnostic:{stage:'CHILD_PROTOCOL',code:'INVALID_ENVELOPE'}});
 return result.rows;
}
export function hostPreflight({target,expectedSystem,verify,persist,probe}){
 const receipt={scope:'SYNTHETIC_HOST_DATABASE_PREFLIGHT',status:'FAIL',productionRollbackVerified:false,providerPitrVerified:false};persist(receipt);
 let stage='BOUNDARY_BEFORE';
 try{
  verify();stage='CHILD_PROBE';const rows=probe();stage='IDENTITY';
  assert.deepEqual(rows,[{database:'hydroland_rehearsal_source',username:'hydroland',address:target.host,system_id:expectedSystem}]);
  stage='BOUNDARY_AFTER';verify();receipt.status='PASS';receipt.serverIdentityVerified=true;persist(receipt);return receipt;
 }catch(error){
  receipt.failureCode='HOST_DATABASE_PREFLIGHT_FAILED';
  // A child diagnostic has already passed the strict decoder; stage otherwise
  // identifies the local check without storing actual/expected identity values.
  const d=error.diagnostic;
  const allowedStages=new Set([...stages,'CHILD_PROCESS','CHILD_PROTOCOL']);
  receipt.failureStage=stage==='CHILD_PROBE'&&allowedStages.has(d?.stage)?d.stage:stage;
  const allowedCodes=new Set([...codes,'CHILD_EXIT','INVALID_JSON','INVALID_ENVELOPE']);
  receipt.errorCode=stage==='CHILD_PROBE'&&allowedCodes.has(d?.code)?d.code:sanitizedError(error).code;
  if(sqlStates.has(d?.sqlState))receipt.sqlState=d.sqlState;
  if(codes.has(d?.disconnectCode))receipt.disconnectCode=d.disconnectCode;
  if(d?.signal==='SIGKILL')receipt.childSignal='SIGKILL';
  persist(receipt);throw new Error(receipt.failureCode);
 }
}
async function probe(statePath){
 const result=await probeDatabase({verify:()=>verifyLiveRelay(statePath),createClient:async()=>{
  const {PrismaClient}=await import('@prisma/client');
  return new PrismaClient({datasourceUrl:'postgresql://hydroland:hydroland@127.0.0.1:5432/hydroland_rehearsal_source?schema=public&connect_timeout=5&pool_timeout=5'});
 }});
 console.log(JSON.stringify(result));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const statePath=resolve(process.argv[3]||'phase11-recovery-evidence/ci-ownership.json');
 if(process.argv[2]==='serve')await serve(statePath);else if(process.argv[2]==='probe')await probe(statePath);else if(process.argv[2]==='start')await start(statePath);else throw Error('Expected start or serve');
}
