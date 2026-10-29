import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const LIMITS=Object.freeze({objects:4,versions:4,objectBytes:8*1024*1024,totalBytes:32*1024*1024,requests:30,requestMs:8000,overallMs:120000});
const encryption=new Set(['AES256','aws:kms','aws:kms:dsse']);
const codes=new Set(['AccessDenied','NoSuchKey','NoSuchVersion','NotImplemented','NotFound','AbortError','TimeoutError']);
export const safeCode=error=>codes.has(error?.name)?error.name:error?.code==='A03_LIMIT'?'LIMIT_EXCEEDED':error?.code==='ERR_ASSERTION'?'CONTRACT_MISMATCH':'UNKNOWN';
const limit=condition=>{if(!condition)throw Object.assign(new Error('A03 limit exceeded'),{code:'A03_LIMIT'});};

// The body is consumed only for a streaming digest. No document bytes are saved.
export async function digestBody(body,{signal,maxBytes,budget}){
  assert(body&&typeof body[Symbol.asyncIterator]==='function'&&typeof body.destroy==='function');
  const abort=()=>body.destroy(Object.assign(new Error('Read aborted'),{name:'AbortError'}));
  if(signal.aborted){body.destroy();signal.throwIfAborted();}
  signal.addEventListener('abort',abort,{once:true});
  const hash=createHash('sha256');let bytes=0;
  try{
    for await(const part of body){
      signal.throwIfAborted();const chunk=Buffer.from(part);bytes+=chunk.length;budget.remaining-=chunk.length;
      limit(bytes<=maxBytes&&budget.remaining>=0);hash.update(chunk);
    }
    signal.throwIfAborted();return{bytes,sha256:hash.digest('hex')};
  }finally{signal.removeEventListener('abort',abort);body.destroy();}
}

async function bounded(operation,ms){
  limit(ms>0);const controller=new AbortController();let timer;
  try{return await Promise.race([Promise.resolve().then(()=>operation(controller.signal)),new Promise((_,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(Object.assign(new Error('Deadline exceeded'),{name:'TimeoutError'}));},ms);
  })]);}finally{clearTimeout(timer);controller.abort();}
}

export function validateObjects(objects){
  assert(Array.isArray(objects)&&objects.length>0);limit(objects.length<=LIMITS.objects);
  const seen=new Set();let total=0;
  for(const object of objects){
    assert(object&&typeof object.key==='string'&&/^(credentials|marine-assets)\//.test(object.key));
    assert(object.key.length<=1024&&!object.key.split('/').some(x=>!x||x==='.'||x==='..')&&!/[\u0000-\u001f\u007f?#]/u.test(object.key));
    assert(!seen.has(object.key));seen.add(object.key);
    assert(/^[a-f0-9]{64}$/.test(object.sha256));
    assert(Number.isSafeInteger(object.byteSize)&&object.byteSize>=0);limit(object.byteSize<=LIMITS.objectBytes);
    total+=object.byteSize;
  }
  limit(total<=LIMITS.totalBytes);
}

export function validExpectedOwner(value){
  return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{0,255}$/.test(value);
}

export function ownerOnlyAcl(acl,expectedOwnerId){
  const owner=acl?.Owner?.ID,grants=acl?.Grants;
  return validExpectedOwner(expectedOwnerId)&&owner===expectedOwnerId&&Array.isArray(grants)&&grants.length>0&&grants.every(g=>g?.Grantee?.Type==='CanonicalUser'&&g.Grantee.ID===owner&&g.Permission==='FULL_CONTROL');
}

// Adapter methods are read-only; no object upload/delete, policy mutation or
// restore-instance operation is present. Mock acceptance never proves a provider.
export async function probeReferencedObjects({objects,storage,expectedOwnerId,requestMs=LIMITS.requestMs,overallMs=LIMITS.overallMs,now=()=>performance.now()}){
  const start=now(),report={scope:'A03_REFERENCED_OBJECT_VERSION_READBACK',status:'FAIL',objects:[],requests:0,
    productionWrites:0,objectWrites:0,ownerApprovalVerified:false,providerPitrVerified:false,ownerAclTransferVerified:false,applicationAuthorizationVerified:false,productionAccepted:false};
  const budget={remaining:LIMITS.totalBytes};let stage='INPUT';
  const read=async(name,fn)=>{stage=name;limit(++report.requests<=LIMITS.requests);return bounded(fn,Math.min(requestMs,overallMs-(now()-start)));};
  try{
    assert(Number.isFinite(requestMs)&&requestMs>0&&requestMs<=LIMITS.requestMs);
    assert(Number.isFinite(overallMs)&&overallMs>0&&overallMs<=LIMITS.overallMs);
    assert(validExpectedOwner(expectedOwnerId),'An independently supplied expected object owner is required');
    validateObjects(objects);
    const versioning=await read('BUCKET_VERSIONING',signal=>storage.versioning(signal));
    assert.equal(versioning.Status,'Enabled');report.versioningEnabled=true;
    const config=await read('BUCKET_ENCRYPTION',signal=>storage.encryption(signal));
    const rules=config?.ServerSideEncryptionConfiguration?.Rules;
    assert(Array.isArray(rules)&&rules.length>0&&rules.every(r=>encryption.has(r.ApplyServerSideEncryptionByDefault?.SSEAlgorithm)));
    report.bucketEncryptionVerified=true;
    for(const [index,object] of objects.entries()){
      const item={index,status:'FAIL',versionsChecked:0,recordedBytesRecoverable:false,historicalVersionReadback:false};report.objects.push(item);
      const listing=await read('VERSION_LIST',signal=>storage.versions(object.key,signal));
      assert.equal(listing.IsTruncated,false,'A partial listing cannot prove version coverage');
      assert(Array.isArray(listing.Versions));
      const versions=listing.Versions.filter(v=>v.Key===object.key);
      assert(versions.length>0);limit(versions.length<=LIMITS.versions);
      const ids=versions.map(v=>v.VersionId);assert(ids.every(id=>typeof id==='string'&&id.length>0&&id!=='null')&&new Set(ids).size===ids.length);
      // Prefer an older version so matching only the current object is explicit.
      versions.sort((a,b)=>Number(a.IsLatest===true)-Number(b.IsLatest===true));let matched;
      for(const version of versions){
        assert(typeof version.IsLatest==='boolean');item.versionsChecked++;
        const result=await read('VERSION_BYTES',signal=>storage.object(object.key,version.VersionId,signal,budget));
        assert.equal(result.versionId,version.VersionId);
        if(result.sha256===object.sha256&&result.bytes===object.byteSize){
          assert(encryption.has(result.encryption));matched=version;break;
        }
      }
      assert(matched,'No version matches the database byte count and SHA-256');
      item.recordedBytesRecoverable=true;item.historicalVersionReadback=matched.IsLatest===false;
      const acl=await read('VERSION_ACL',signal=>storage.acl(object.key,matched.VersionId,signal));
      assert(ownerOnlyAcl(acl,expectedOwnerId),'ACL must belong exclusively to the independently expected owner');item.ownerOnlyAcl=true;item.expectedOwnerMatched=true;
      // Probe the SAME authenticated, hash-verified version. A random 404 is
      // never used as evidence that a real stored object is private.
      const status=await read('ANONYMOUS_VERSION',signal=>storage.anonymous(object.key,matched.VersionId,signal));
      assert([401,403,404].includes(status));item.anonymousDenied=true;item.status='PASS';
    }
    report.historicalVersionReadbackVerified=report.objects.every(x=>x.historicalVersionReadback);
    report.status=report.historicalVersionReadbackVerified?'PASS':'PARTIAL';
    if(report.status==='PARTIAL')report.remaining='HISTORICAL_VERSION_EXERCISE_REQUIRED';
  }catch(error){report.failureStage=stage;report.failureCode=safeCode(error);}
  report.durationMs=now()-start;report.bytesRead=LIMITS.totalBytes-budget.remaining;
  if(report.durationMs>overallMs){report.status='FAIL';report.failureStage='OVERALL_DEADLINE';report.failureCode='LIMIT_EXCEEDED';}
  return report;
}

const eventNames=['incidentAt','recoveryRequestedAt','databaseReadyAt','objectsReadyAt','accessReadyAt','applicationReadyAt','readyForCutoverAt','recoveredCommitAt'];
const timestamp=value=>{
  assert(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value));
  const parsed=Date.parse(value);assert(Number.isFinite(parsed));
  assert.equal(new Date(parsed).toISOString().replace('.000Z','Z'),value.replace(/\.0{1,3}Z$/,'Z'),'Require a real canonical UTC timestamp');return parsed;
};

export function measureRecoveryTimes({events={},policy=null}={}){
  const missing=eventNames.filter(key=>events[key]==null);
  const result={scope:'RECOVERY_TIME_EVIDENCE_ONLY',productionAccepted:false,missing,rtoObservedSeconds:null,rpoObservedSeconds:null,rtoTargetSeconds:null,rpoTargetSeconds:null,withinTargets:null};
  if(missing.length)return{...result,status:'MEASUREMENT_PENDING'};
  const t=Object.fromEntries(eventNames.map(key=>[key,timestamp(events[key])]));
  assert(t.incidentAt<=t.recoveryRequestedAt&&t.recoveryRequestedAt<=t.databaseReadyAt&&t.databaseReadyAt<=t.applicationReadyAt);
  for(const key of ['databaseReadyAt','objectsReadyAt','accessReadyAt','applicationReadyAt'])assert(t[key]>=t.recoveryRequestedAt&&t[key]<=t.readyForCutoverAt);
  assert(t.recoveredCommitAt<=t.incidentAt);
  result.rtoObservedSeconds=(t.readyForCutoverAt-t.incidentAt)/1000;
  result.rpoObservedSeconds=(t.incidentAt-t.recoveredCommitAt)/1000;
  if(!policy)return{...result,status:'POLICY_PENDING'};
  assert(Number.isFinite(policy.rtoSeconds)&&policy.rtoSeconds>0&&Number.isFinite(policy.rpoSeconds)&&policy.rpoSeconds>=0);
  assert(typeof policy.approvalReference==='string'&&policy.approvalReference.trim().length>0);
  result.rtoTargetSeconds=policy.rtoSeconds;result.rpoTargetSeconds=policy.rpoSeconds;
  result.withinTargets=result.rtoObservedSeconds<=policy.rtoSeconds&&result.rpoObservedSeconds<=policy.rpoSeconds;
  // A supplied approval reference is input evidence, not an authenticated owner decision.
  return{...result,status:result.withinTargets?'WITHIN_TARGETS_REVIEW_REQUIRED':'TARGET_BREACH_REVIEW_REQUIRED'};
}
