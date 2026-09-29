import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'postgresql://missing').hostname),'Credential integrity E2E requires a local test database');
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {AuditService}=require('../dist/audit/audit.service.js');
const {NotificationsService}=require('../dist/notifications/notifications.service.js');
const {PolicyControlService}=require('../dist/trips/policy-control.service.js');
const {CredentialsService}=require('../dist/credentials/credentials.service.js');
const db=new DatabaseService(),audit=new AuditService(db),notifications=new NotificationsService(db),policies=new PolicyControlService(db,audit);
const people=[],accounts=[],credentialIds=[],objects=new Map();
// Storage is isolated and controllable; lifecycle, audit, notifications and transactions use PostgreSQL.
const storage={
  key:(accountId,credentialId)=>`credentials/${accountId}/${credentialId}/${randomUUID()}.pdf`,
  put:async(key,bytes)=>{objects.set(key,bytes)},
  exists:async key=>objects.has(key),
  delete:async key=>{objects.delete(key)},
};
const service=new CredentialsService(db,policies,audit,notifications,storage);
const failingAudit={record:async(input,tx)=>{await audit.record(input,tx);throw new Error('Injected audit failure')}};
const failing=new CredentialsService(db,policies,failingAudit,notifications,storage);
const fixture=async()=>{
  const person=await db.person.create({data:{firstName:'Credential',lastName:'Integrity fixture'}});people.push(person.id);
  const account=await db.account.create({data:{personId:person.id,email:`credential-integrity-${randomUUID()}@example.invalid`,passwordHash:'local-fixture-only',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account.id);
  return account;
};
const payload=()=>({originalName:'evidence.pdf',mimeType:'application/pdf',base64:Buffer.from(`%PDF-1.7\nlocal fixture ${randomUUID()}`).toString('base64')});
const gate=()=>{
  let enter,release;
  const entered=new Promise(resolve=>{enter=resolve}),released=new Promise(resolve=>{release=resolve});
  return{entered,release,block:async()=>{enter();await released}};
};
const events=(id,action)=>db.auditEvent.findMany({where:{resourceId:id,action}});
const row=id=>db.credential.findUniqueOrThrow({where:{id},include:{documents:true}});
const success=results=>results.filter(result=>result.status==='fulfilled');
const rejectsWith=status=>error=>error.getStatus?.()===status;
const oneWinner=results=>{
  assert.equal(success(results).length,1);
  for(const result of results.filter(result=>result.status==='rejected'))assert([404,409].includes(result.reason.getStatus?.()),String(result.reason));
};

try{
  const owner=await fixture(),reviewer=await fixture(),outsider=await fixture();
  const create=async()=>{
    const credential=await service.create(owner.id,{issuer:'LOCAL E2E',title:'Credential integrity'});credentialIds.push(credential.id);return credential.id;
  };
  const upload=id=>service.attachDocument(owner.id,id,payload());
  const decide=(id,outcome='VERIFIED',instance=service)=>instance.decide(reviewer.id,id,{outcome,reason:outcome==='REJECTED'?'Local test rejection':undefined});

  await assert.rejects(()=>failing.create(owner.id,{issuer:'LOCAL E2E',title:'Rollback creation'}),/Injected audit failure/);
  assert.equal(await db.credential.count({where:{personId:owner.personId}}),0,'Failed audit rolls back credential creation');
  assert.equal(await db.auditEvent.count({where:{actorId:owner.personId}}),0);

  const rollback=await create(),retryPayload=payload();
  await assert.rejects(()=>failing.attachDocument(owner.id,rollback,retryPayload),/Injected audit failure/);
  assert.equal((await row(rollback)).documents.length,0,'Failed audit must not leave document metadata without bytes');
  assert.equal(objects.size,0,'Uncommitted upload bytes are removed');
  assert.equal((await events(rollback,'CREDENTIAL_DOCUMENT_ATTACHED')).length,0);
  const attached=await service.attachDocument(owner.id,rollback,retryPayload);
  assert(!('storageKey' in attached));assert.equal(objects.size,1);
  assert.equal((await events(rollback,'CREDENTIAL_DOCUMENT_ATTACHED'))[0].actorId,owner.personId);
  await assert.rejects(()=>service.attachDocument(outsider.id,rollback,payload()),rejectsWith(404));
  await assert.rejects(()=>service.submit(outsider.id,rollback),rejectsWith(404));
  assert.equal((await row(rollback)).documents.length,1);

  await assert.rejects(()=>failing.submit(owner.id,rollback),/Injected audit failure/);
  assert.equal((await row(rollback)).verificationStatus,'UNVERIFIED');
  assert.equal((await events(rollback,'CREDENTIAL_SUBMITTED')).length,0);
  const submissions=await Promise.allSettled([service.submit(owner.id,rollback),service.submit(owner.id,rollback)]);
  oneWinner(submissions);assert.equal((await events(rollback,'CREDENTIAL_SUBMITTED')).length,1);
  await assert.rejects(()=>service.decide(owner.id,rollback,{outcome:'VERIFIED'}),rejectsWith(403));
  await assert.rejects(()=>decide(rollback,'VERIFIED',failing),/Injected audit failure/);
  assert.equal((await row(rollback)).verificationStatus,'PENDING');
  assert.equal((await row(rollback)).documents[0].status,'UPLOADED');
  assert.equal((await events(rollback,'CREDENTIAL_REVIEWED')).length,0);
  assert.equal(await db.notification.count({where:{accountId:owner.id}}),0,'Failed decisions do not notify');
  const decisions=await Promise.allSettled([decide(rollback),decide(rollback,'REJECTED')]);oneWinner(decisions);
  const reviewed=await row(rollback),decisionEvents=await events(rollback,'CREDENTIAL_REVIEWED');
  assert.equal(reviewed.verificationStatus,success(decisions)[0].value.verificationStatus);
  assert.equal(reviewed.documents[0].status,reviewed.verificationStatus==='VERIFIED'?'AVAILABLE':'REJECTED');
  assert.equal(decisionEvents.length,1);assert.equal(decisionEvents[0].actorId,reviewer.personId);
  assert.equal((await notifications.list(owner.id)).length,1,'Only the winning decision notifies the owner');

  // Both uploads pass their early duplicate check before either writes metadata.
  const duplicateIds=await Promise.all([create(),create()]),duplicate=payload(),bothUploaded=gate();let putCount=0;
  const duplicateStorage={...storage,put:async(...args)=>{await storage.put(...args);putCount++;if(putCount===2)bothUploaded.release();await bothUploaded.block()}};
  const duplicateService=new CredentialsService(db,policies,audit,notifications,duplicateStorage);
  const priorObjects=objects.size;
  const uploads=await Promise.allSettled(duplicateIds.map(id=>duplicateService.attachDocument(owner.id,id,duplicate)));oneWinner(uploads);
  assert.equal(uploads.find(result=>result.status==='rejected').reason.getStatus(),409,'Concurrent duplicate returns a conflict');
  assert.equal(objects.size,priorObjects+1,'Losing duplicate only deletes its own bytes');
  const duplicateDocuments=await db.document.findMany({where:{credentialId:{in:duplicateIds}}});
  assert.equal(duplicateDocuments.length,1);assert(objects.has(duplicateDocuments[0].storageKey));

  // Finish a slow upload only after the original evidence has been submitted and approved.
  const late=await create();await upload(late);const uploadGate=gate();let lateKey;
  const slowUpload=new CredentialsService(db,policies,audit,notifications,{...storage,put:async(...args)=>{lateKey=args[0];await storage.put(...args);await uploadGate.block()}});
  const lateUpload=slowUpload.attachDocument(owner.id,late,payload());await uploadGate.entered;
  await service.submit(owner.id,late);await decide(late);uploadGate.release();
  await assert.rejects(()=>lateUpload,rejectsWith(404));
  assert.equal((await row(late)).verificationStatus,'VERIFIED');assert.equal((await row(late)).documents.length,1);
  assert.equal((await events(late,'CREDENTIAL_DOCUMENT_ATTACHED')).length,1);assert(!objects.has(lateKey),'Late upload is removed without changing approved evidence');

  // A stale submission must never reopen a completed review.
  const stale=await create();await upload(stale);const submitGate=gate();
  const slowSubmit=new CredentialsService(db,policies,audit,notifications,{...storage,exists:async key=>{const exists=await storage.exists(key);await submitGate.block();return exists}});
  const staleSubmission=slowSubmit.submit(owner.id,stale);await submitGate.entered;
  await service.submit(owner.id,stale);await decide(stale,'REJECTED');submitGate.release();
  await assert.rejects(()=>staleSubmission,rejectsWith(404));assert.equal((await row(stale)).verificationStatus,'REJECTED');
  assert.equal((await events(stale,'CREDENTIAL_SUBMITTED')).length,1);

  // Submission cannot silently accept a different evidence set from the one it checked.
  const changed=await create();await upload(changed);const evidenceGate=gate();
  const slowEvidence=new CredentialsService(db,policies,audit,notifications,{...storage,exists:async key=>{const exists=await storage.exists(key);await evidenceGate.block();return exists}});
  const changedSubmission=slowEvidence.submit(owner.id,changed);await evidenceGate.entered;
  const archived=await upload(changed);evidenceGate.release();
  await assert.rejects(()=>changedSubmission,rejectsWith(409));assert.equal((await row(changed)).verificationStatus,'UNVERIFIED');
  await db.document.update({where:{id:archived.id},data:{status:'ARCHIVED',archivedAt:new Date()}});
  await service.submit(owner.id,changed);await decide(changed);
  assert.equal((await db.document.findUniqueOrThrow({where:{id:archived.id}})).status,'ARCHIVED','Review must not revive archived evidence');

  const bypass=await create();
  const bypassService=new CredentialsService(db,{decision:async()=>({state:'DISABLED',bypass:true,enforce:false,review:false})},audit,notifications,storage);
  const bypassed=await bypassService.submit(owner.id,bypass);
  assert.equal(bypassed.verificationBypassed,true);assert.equal(bypassed.status,'UNVERIFIED');assert.equal(bypassed.policyReview.required,false);
  assert.equal((await events(bypass,'CREDENTIAL_VERIFICATION_BYPASSED')).length,1);
  console.log('Credential integrity PostgreSQL E2E passed: atomic creation/upload/submit/review audit, retry after rollback, ownership, single concurrent submission/decision, duplicate cleanup, late upload rejection, stale submit protection, evidence snapshot conflict, archive preservation and policy bypass.');
}finally{
  await db.notification.deleteMany({where:{accountId:{in:accounts}}});
  await db.auditEvent.deleteMany({where:{OR:[{resourceId:{in:credentialIds}},{actorId:{in:people}}]}});
  await db.document.deleteMany({where:{ownerId:{in:people}}});
  await db.credential.deleteMany({where:{personId:{in:people}}});
  await db.account.deleteMany({where:{id:{in:accounts}}});
  await db.person.deleteMany({where:{id:{in:people}}});
  await db.$disconnect();
}
