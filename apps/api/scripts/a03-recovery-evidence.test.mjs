import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {mkdtemp,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LIMITS,digestBody,validateObjects,probeReferencedObjects,measureRecoveryTimes,ownerOnlyAcl} from './a03-recovery-evidence.mjs';
import {auditConfig,main} from './a03-object-readback.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const object={key:'credentials/synthetic-account/document/fixture.pdf',sha256:sha('original'),byteSize:8};
const acl={Owner:{ID:'fixture-owner'},Grants:[{Grantee:{Type:'CanonicalUser',ID:'fixture-owner'},Permission:'FULL_CONTROL'}]};
function fixture(){
  const calls=[];
  const storage={
    versioning:async()=>{calls.push('versioning');return{Status:'Enabled'};},
    encryption:async()=>{calls.push('encryption');return{ServerSideEncryptionConfiguration:{Rules:[{ApplyServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}]}};},
    versions:async key=>{calls.push('versions');return{IsTruncated:false,Versions:[{Key:key,VersionId:'prior-version',IsLatest:false},{Key:key,VersionId:'current-version',IsLatest:true}]};},
    object:async(key,versionId,_signal,budget)=>{calls.push('object');budget.remaining-=8;return{sha256:object.sha256,bytes:8,versionId,encryption:'AES256'};},
    acl:async()=>{calls.push('acl');return structuredClone(acl);},
    anonymous:async()=>{calls.push('anonymous');return 403;},
  };
  return{calls,storage};
}
const run=f=>probeReferencedObjects({objects:[object],storage:f.storage});

test('all independent object checks pass for an exact earlier version; no production acceptance is inferred',async()=>{
  const f=fixture(),r=await run(f);
  assert.equal(r.status,'PASS');assert.equal(r.historicalVersionReadbackVerified,true);
  assert.equal(r.objects[0].recordedBytesRecoverable,true);assert.equal(r.bytesRead,8);
  assert.deepEqual(f.calls,['versioning','encryption','versions','object','acl','anonymous']);
  for(const key of ['productionAccepted','providerPitrVerified','ownerAclTransferVerified','applicationAuthorizationVerified'])assert.equal(r[key],false);
  assert.equal(r.productionWrites,0);assert.equal(r.objectWrites,0);
  for(const privateValue of [object.key,object.sha256,'fixture-owner','prior-version'])assert(!JSON.stringify(r).includes(privateValue));
});

test('current-version readback alone remains PARTIAL',async()=>{
  const f=fixture();f.storage.versions=async key=>({IsTruncated:false,Versions:[{Key:key,VersionId:'current',IsLatest:true}]});
  const r=await run(f);assert.equal(r.status,'PARTIAL');assert.equal(r.historicalVersionReadbackVerified,false);
});

test('empty reference inventory cannot claim storage recovery or issue provider calls',async()=>{
  const f=fixture(),r=await probeReferencedObjects({objects:[],storage:f.storage});
  assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'INPUT');assert.deepEqual(f.calls,[]);
});

test('invalid, duplicate, oversized and unrelated database references are refused before I/O',async()=>{
  const cases=[
    [{...object,key:'../customer.pdf'}],[{...object,key:'credentials/account/../customer.pdf'}],
    [{...object,key:'credentials/account/key?secret=hidden'}],[{...object,key:'offline/customer.pdf'}],
    [object,object],[{...object,byteSize:LIMITS.objectBytes+1}],[{...object,sha256:'invalid'}],
    Array.from({length:LIMITS.objects+1},(_,i)=>({...object,key:`credentials/a/${i}.pdf`})),
  ];
  for(const objects of cases){const f=fixture(),r=await probeReferencedObjects({objects,storage:f.storage});assert.equal(r.status,'FAIL');assert.deepEqual(f.calls,[]);}
  assert.doesNotThrow(()=>validateObjects([object]));
});

test('flags or successful object reads cannot substitute for enabled versioning',async()=>{
  const f=fixture();f.storage.versioning=async()=>({Status:'Suspended',privateConfirmed:true,versioningConfirmed:true});
  const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'BUCKET_VERSIONING');assert(!f.calls.includes('object'));
});

test('unimplemented provider capability remains a redacted failure',async()=>{
  const f=fixture();f.storage.versioning=async()=>{throw Object.assign(new Error('secret bucket endpoint'),{name:'NotImplemented'});};
  const r=await run(f);assert.equal(r.failureCode,'NotImplemented');assert(!JSON.stringify(r).includes('secret'));
});

test('bucket encryption and actual version encryption are separately required',async()=>{
  for(const layer of ['bucket','object']){
    const f=fixture();
    if(layer==='bucket')f.storage.encryption=async()=>({ServerSideEncryptionConfiguration:{Rules:[]}});
    else f.storage.object=async(_key,versionId)=>({sha256:object.sha256,bytes:8,versionId});
    const r=await run(f);assert.equal(r.status,'FAIL');assert(!f.calls.includes('anonymous'));
  }
});

test('truncated listings, null versions and prefix collisions cannot prove recovery',async()=>{
  for(const listing of [
    {IsTruncated:true,Versions:[{Key:object.key,VersionId:'old',IsLatest:false}]},
    {IsTruncated:false,Versions:[{Key:object.key,VersionId:'null',IsLatest:false}]},
    {IsTruncated:false,Versions:[{Key:object.key+'-other',VersionId:'old',IsLatest:false}]},
  ]){const f=fixture();f.storage.versions=async()=>listing;const r=await run(f);assert.equal(r.status,'FAIL');assert(!f.calls.includes('object'));}
});

test('a wrong returned version cannot borrow the expected object hash',async()=>{
  const f=fixture();f.storage.object=async()=>({sha256:object.sha256,bytes:8,versionId:'different',encryption:'AES256'});
  const r=await run(f);assert.equal(r.status,'FAIL');assert(!f.calls.includes('acl'));
});

test('hash mismatch or wrong byte count cannot borrow an anonymous 404',async()=>{
  for(const field of ['sha256','bytes']){
    const f=fixture();f.storage.object=async(_key,versionId)=>({sha256:field==='sha256'?sha('corrupt'):object.sha256,bytes:field==='bytes'?7:8,versionId,encryption:'AES256'});
    f.storage.anonymous=async()=>{throw new Error('Must not probe until authenticated content is verified');};
    const r=await run(f);assert.equal(r.status,'FAIL');assert(!f.calls.includes('acl'));
  }
});

test('anonymous probes target the exact authenticated version and reject public access',async()=>{
  const f=fixture();let target;
  f.storage.object=async(key,versionId)=>{target=[key,versionId];return{sha256:object.sha256,bytes:8,versionId,encryption:'AES256'};};
  f.storage.anonymous=async(key,versionId)=>{assert.deepEqual([key,versionId],target);return 200;};
  const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'ANONYMOUS_VERSION');
});

test('owner-only ACL requires an explicit owner grant; public and unknown grants remain blocked',async()=>{
  assert(ownerOnlyAcl(acl));
  for(const change of [x=>x.Grants=[],x=>delete x.Owner,x=>x.Grants.push({Grantee:{Type:'Group',URI:'http://acs.amazonaws.com/groups/global/AllUsers'},Permission:'READ'}),x=>x.Grants[0].Grantee.ID='different']){
    const value=structuredClone(acl);change(value);assert.equal(ownerOnlyAcl(value),false);
    const f=fixture();f.storage.acl=async()=>value;const r=await run(f);assert.equal(r.status,'FAIL');assert(!f.calls.includes('anonymous'));
  }
});

test('hung provider calls are bounded, aborted and cannot publish a late PASS',async()=>{
  const f=fixture();let release,signal;
  f.storage.versioning=s=>{signal=s;return new Promise(resolve=>{release=()=>resolve({Status:'Enabled'});});};
  const r=await probeReferencedObjects({objects:[object],storage:f.storage,requestMs:10});
  assert.equal(r.status,'FAIL');assert.equal(r.failureCode,'TimeoutError');assert(signal.aborted);
  release();await new Promise(setImmediate);assert.equal(r.status,'FAIL');assert(!f.calls.includes('encryption'));
});

test('unknown provider errors cannot leak bucket, key, URL or credential details',async()=>{
  const f=fixture();f.storage.acl=async()=>{throw Object.assign(new Error('https://private.test/secret?token=hidden'),{name:'SECRET_TOKEN_VALUE'});};
  const r=await run(f);assert.equal(r.failureCode,'UNKNOWN');assert(!JSON.stringify(r).includes('hidden'));assert(!JSON.stringify(r).includes('SECRET_TOKEN'));
});

test('actual stream bytes are hashed without retaining payloads',async()=>{
  const body=Readable.from([Buffer.from('orig'),Buffer.from('inal')]);
  const r=await digestBody(body,{signal:new AbortController().signal,maxBytes:8,budget:{remaining:8}});
  assert.deepEqual(r,{bytes:8,sha256:object.sha256});assert(body.destroyed);
});

test('per-object and aggregate byte ceilings destroy overlong streams',async()=>{
  for(const [maxBytes,remaining] of [[7,100],[100,7]]){
    const body=Readable.from([Buffer.from('original')]);
    await assert.rejects(digestBody(body,{signal:new AbortController().signal,maxBytes,budget:{remaining}}),{code:'A03_LIMIT'});assert(body.destroyed);
  }
});

test('an aborted body read releases an idle network stream',async()=>{
  const controller=new AbortController(),body=new Readable({read(){}});
  const result=digestBody(body,{signal:controller.signal,maxBytes:8,budget:{remaining:8}});
  controller.abort();await assert.rejects(result);assert(body.destroyed);
});

test('a response arriving after timeout is destroyed before any payload is consumed',async()=>{
  const controller=new AbortController();controller.abort();
  const body=Readable.from([Buffer.from('original')]),budget={remaining:8};
  await assert.rejects(digestBody(body,{signal:controller.signal,maxBytes:8,budget}));
  assert(body.destroyed);assert.equal(budget.remaining,8);
});

test('the caller cannot expand fixed provider time limits',async()=>{
  for(const limits of [{requestMs:LIMITS.requestMs+1},{overallMs:LIMITS.overallMs+1},{requestMs:Infinity}]){
    const f=fixture(),r=await probeReferencedObjects({objects:[object],storage:f.storage,...limits});
    assert.equal(r.status,'FAIL');assert.deepEqual(f.calls,[]);
  }
});

test('the aggregate deadline prevents the next provider request after budget exhaustion',async()=>{
  const f=fixture();let clock=0;
  f.storage.versioning=async()=>{clock=21;return{Status:'Enabled'};};
  const r=await probeReferencedObjects({objects:[object],storage:f.storage,overallMs:20,now:()=>clock});
  assert.equal(r.status,'FAIL');assert(!f.calls.includes('encryption'));assert.equal(r.failureStage,'OVERALL_DEADLINE');
});

const events={incidentAt:'2026-10-28T12:00:00Z',recoveryRequestedAt:'2026-10-28T12:01:00Z',databaseReadyAt:'2026-10-28T12:03:00Z',objectsReadyAt:'2026-10-28T12:05:00Z',accessReadyAt:'2026-10-28T12:06:00Z',applicationReadyAt:'2026-10-28T12:04:00Z',readyForCutoverAt:'2026-10-28T12:07:00Z',recoveredCommitAt:'2026-10-28T11:59:00Z'};

test('RTO includes declaration, files, permissions and application readiness; unknown targets stay null',()=>{
  const r=measureRecoveryTimes({events});assert.equal(r.rtoObservedSeconds,420);assert.equal(r.rpoObservedSeconds,60);assert.equal(r.status,'POLICY_PENDING');
  assert.equal(r.rtoTargetSeconds,null);assert.equal(r.rpoTargetSeconds,null);assert.equal(r.withinTargets,null);assert.equal(r.productionAccepted,false);
});

test('missing measurements cannot become zero-second recovery evidence',()=>{
  const r=measureRecoveryTimes();assert.equal(r.status,'MEASUREMENT_PENDING');assert.equal(r.missing.length,8);assert.equal(r.rtoObservedSeconds,null);assert.equal(r.rpoObservedSeconds,null);
});

test('clock inversions, impossible dates and recovery points after the incident are refused',()=>{
  for(const patch of [{readyForCutoverAt:'2026-10-28T12:02:00Z'},{recoveredCommitAt:'2026-10-28T12:01:00Z'},{incidentAt:'2026-02-30T12:00:00Z'},{objectsReadyAt:'2026-10-28T12:08:00Z'}])assert.throws(()=>measureRecoveryTimes({events:{...events,...patch}}));
});

test('targets distinguish a breach while a supplied approval reference cannot grant production acceptance',()=>{
  for(const [rtoSeconds,rpoSeconds,expected] of [[500,120,true],[100,30,false]]){
    const r=measureRecoveryTimes({events,policy:{rtoSeconds,rpoSeconds,approvalReference:'fixture-reference-only'}});
    assert.equal(r.withinTargets,expected);assert.equal(r.productionAccepted,false);assert(r.status.endsWith('REVIEW_REQUIRED'));
  }
  assert.throws(()=>measureRecoveryTimes({events,policy:{rtoSeconds:500,rpoSeconds:60,approvalReference:''}}));
});

const config={HYDROLAND_OBJECT_STORAGE_ENDPOINT:'https://s3.example.invalid',HYDROLAND_OBJECT_STORAGE_BUCKET:'private-fixture',HYDROLAND_OBJECT_STORAGE_REGION:'us-east-1',HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID:'fixture-only-access',HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY:'fixture-only-secret'};
test('audit configuration is separate from unverified activation flags and refuses insecure endpoints',()=>{
  assert.equal(auditConfig({...config,HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED:'false'}).bucket,'private-fixture');
  for(const endpoint of ['http://s3.example.invalid','https://secret@s3.example.invalid','https://s3.example.invalid/?secret=x','https://localhost'])assert.throws(()=>auditConfig({...config,HYDROLAND_OBJECT_STORAGE_ENDPOINT:endpoint}));
  assert.throws(()=>auditConfig({...config,HYDROLAND_OBJECT_STORAGE_REGION:''}));
});

test('CLI confirmation and exact existing service are checked before reading secrets or loading clients',async()=>{
  await assert.rejects(main([],new Proxy({}, {get(){throw new Error('Must not read environment');}})),assert.AssertionError);
  await assert.rejects(main(['--confirmed-read-only'],{RENDER_SERVICE_ID:'another-service'}),assert.AssertionError);
});

test('a symlinked CLI invocation fails closed rather than silently exiting successfully',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'a03-cli-'));
  try{
    const link=join(directory,'probe.mjs');await symlink(fileURLToPath(new URL('./a03-object-readback.mjs',import.meta.url)),link);
    const r=spawnSync(process.execPath,[link],{encoding:'utf8',env:{PATH:process.env.PATH},timeout:5000});
    assert.equal(r.status,2);assert(!r.stdout.includes('secret'));assert.match(r.stderr,/probe refused/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
