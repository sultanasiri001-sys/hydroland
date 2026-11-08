import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
const base=new URL((process.env.STAFFING_E2E_BASE_URL||'http://127.0.0.1:3103/api/v1').replace(/\/$/,'')+'/');
const database=new URL(process.env.DATABASE_URL||'postgresql://missing');
for(const u of [base,database])assert(['localhost','127.0.0.1','[::1]'].includes(u.hostname),'Synthetic registration fixtures require loopback API and database');
assert(process.env.CI==='true'||process.env.NODE_ENV==='test');const secret=process.env.JWT_SECRET;assert(secret?.length>=32);
const db=new PrismaClient(),suffix=randomUUID(),people=[],accounts=[],organizations=[],assets=[],platformKey='PLATFORM_STAFFING_ORGANIZATION:v1';
const trigger='hl_registration_failure_'+suffix.replaceAll('-','');let previousPlatform,platformChanged=false,triggerInstalled=false,checks=0;
const pass=text=>console.log(`PASS ${++checks}: ${text}`);
async function actor(label,role){
 const p=await db.person.create({data:{firstName:'SyntheticRegistration',lastName:label}});people.push(p.id);
 const a=await db.account.create({data:{personId:p.id,email:`registration-${label}-${suffix}@example.invalid`,passwordHash:'no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a.id);
 await db.roleAssignment.create({data:{accountId:a.id,role,status:'ACTIVE'}});
 const s=await db.session.create({data:{accountId:a.id,tokenHash:`registration-${label}-${suffix}`,expiresAt:new Date(Date.now()+3600000)}});
 const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:a.id,sid:s.id,iat:now,exp:now+3600});
 return {...a,token:body+'.'+createHmac('sha256',secret).update(body).digest('base64url')};
}
async function call(a,path,method='GET',body){const r=await fetch(new URL(path,base),{method,headers:{...(a?{authorization:'Bearer '+a.token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});return {status:r.status,headers:r.headers,data:await r.json().catch(()=>null)};}
async function ok(a,path,method='GET',body){const r=await call(a,path,method,body);assert(r.status>=200&&r.status<300,`${r.status}: ${JSON.stringify(r.data)}`);return r.data;}
const path=id=>'marine-operations/admin/assets/'+id+'/registration';
const data=(v,n)=>({registrationNumber:n,reason:'Synthetic data-entry correction, not activation',expectedRevision:v.revision,confirmed:true});
const audit=id=>db.auditEvent.findMany({where:{action:'MARINE_REGISTRATION_CORRECTED',resourceId:id}});
const state=id=>db.marineAsset.findUnique({where:{id},include:{documents:{orderBy:{id:'asc'}},readiness:{orderBy:{checkedAt:'desc'}}}});
async function asset(org,label,status='DRAFT'){const a=await db.marineAsset.create({data:{organizationId:org.id,name:'Synthetic vessel '+label,assetType:'DIVE_BOAT',registrationNumber:`${label}-${suffix}`,status}});assets.push(a.id);return a;}
try{
 const owner=await actor('owner','ADMIN'),other=await actor('other','ADMIN'),staff=await actor('staff','BOAT_OWNER');
 const platform=await db.organization.create({data:{displayName:'Synthetic registration platform '+suffix,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}});organizations.push(platform.id);
 const org=await db.organization.create({data:{displayName:'Synthetic registration operator '+suffix,kind:'MARINE_OPERATOR',status:'ACTIVE',ownerId:other.id}});organizations.push(org.id);
 previousPlatform=await db.operationalSetting.findUnique({where:{key:platformKey}});await db.operationalSetting.upsert({where:{key:platformKey},create:{key:platformKey,value:{organizationId:platform.id}},update:{value:{organizationId:platform.id},updatedAt:new Date()}});platformChanged=true;
 await db.organizationMember.create({data:{organizationId:platform.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 const a=await asset(org,'OLD');
 const verified=await db.marineAssetDocument.create({data:{marineAssetId:a.id,documentType:'NAVIGATION_LICENSE',status:'VERIFIED',verifiedAt:new Date(),referenceNumber:'Synthetic reference',storageKey:'synthetic-registration/'+suffix,sha256:suffix.replaceAll('-','').repeat(2),expiresAt:new Date('2030-01-01')}});
 const pending=await db.marineAssetDocument.create({data:{marineAssetId:a.id,documentType:'REGISTRATION',status:'PENDING'}});
 const before=await state(a.id),view=await call(owner,path(a.id));assert.equal(view.status,200);assert.match(view.headers.get('cache-control'),/private.*no-store/);assert.equal(view.data.verifiedDocumentCount,1);assert.deepEqual(await state(a.id),before);
 for(const who of [null,other,staff])assert([401,403].includes((await call(who,path(a.id))).status));
 assert.equal((await call(owner,path(randomUUID()))).status,404);pass('only fresh verified platform owner reads a private no-store snapshot, without mutations or unrelated record disclosure');
 for(const extra of [{status:'ACTIVE'},{organizationId:platform.id},{documents:[]},{confirmed:false},{expectedRevision:'old'},{reason:'x'}])assert.equal((await call(owner,path(a.id),'POST',{...data(view.data,'NEW-'+suffix),...extra})).status,400);
 assert.deepEqual(await state(a.id),before);pass('strict input rejects injected activation, ownership, documents, absent confirmation and invalid version or reason');
 await db.marineAssetDocument.update({where:{id:pending.id},data:{referenceNumber:'Changed after read'}});
 assert.equal((await call(owner,path(a.id),'POST',data(view.data,'STALE-'+suffix))).status,409);assert.equal((await audit(a.id)).length,0);pass('changed document rejects the old asset read before any mutation');
 const oldReview=(await ok(other,'marine-operations/admin/documents/pending')).find(d=>d.id===pending.id);assert.match(oldReview.reviewRevision,/^[a-f0-9]{64}$/);
 const fresh=await ok(owner,path(a.id)),newNumber=('NEW-'+suffix).toUpperCase();
 const competing=await Promise.all([call(owner,path(a.id),'POST',data(fresh,newNumber)),call(owner,path(a.id),'POST',data(fresh,newNumber))]);assert.deepEqual(competing.map(r=>r.status).sort(),[201,409]);
 const receipt=competing.find(r=>r.status===201).data,after=await state(a.id);assert.match(receipt.reference,/^MRC-/);assert.equal(receipt.activated,false);assert.equal(after.registrationNumber,newNumber);assert.equal(after.status,'DRAFT');assert.equal((await audit(a.id)).length,1);assert.equal(after.readiness.length,1);assert.equal(after.readiness[0].status,'NOT_READY');
 const reopened=after.documents.find(d=>d.id===verified.id);assert.equal(reopened.status,'PENDING');assert.equal(reopened.verifiedAt,null);
 for(const key of ['storageKey','sha256','referenceNumber','expiresAt','createdAt'])assert.deepEqual(reopened[key],verified[key]);
 const reread=await ok(owner,path(a.id));assert.equal(reread.registrationNumber,newNumber);assert.equal(reread.latestCorrectionReference,receipt.reference);assert.equal(reread.verifiedDocumentCount,0);
 pass('concurrent correction commits once, preserves asset identity and file evidence, returns verification to review and persists receipt after reread');
 assert.equal((await call(other,'marine-operations/admin/documents/'+pending.id+'/decision','POST',{outcome:'VERIFIED',expectedRevision:oldReview.reviewRevision})).status,409);
 assert.equal((await db.marineAssetDocument.findUnique({where:{id:pending.id}})).status,'PENDING');
 const newReview=(await ok(other,'marine-operations/admin/documents/pending')).find(d=>d.id===pending.id);assert.notEqual(newReview.reviewRevision,oldReview.reviewRevision);assert.equal(newReview.marineAsset.registrationNumber,newNumber);
 await ok(other,'marine-operations/admin/documents/'+pending.id+'/decision','POST',{outcome:'REJECTED',expectedRevision:newReview.reviewRevision});pass('stale document decision cannot approve across a boat identity correction; a fresh separate decision remains available');
 const rev=await ok(owner,path(a.id));assert.equal((await call(owner,path(a.id),'POST',data(rev,newNumber))).status,409);
 assert.equal((await call(owner,path(a.id),'POST',data(view.data,'REPLAY-'+suffix))).status,409);assert.equal((await audit(a.id)).length,1);pass('same number and old saved confirmation cannot create duplicate corrections');
 const one=await asset(org,'RACE-A'),two=await asset(org,'RACE-B'),number='SAME-'+suffix;
 const [v1,v2]=await Promise.all([ok(owner,path(one.id)),ok(owner,path(two.id))]);const collision=await Promise.all([call(owner,path(one.id),'POST',data(v1,number)),call(owner,path(two.id),'POST',data(v2,number))]);assert.deepEqual(collision.map(r=>r.status).sort(),[201,409]);pass('cross-asset concurrent claim of one registration commits once');
 const arabic=await asset(org,'ARABIC');await ok(owner,path(arabic.id),'POST',data(await ok(owner,path(arabic.id)),'٠٠٧٥'));assert.equal((await state(arabic.id)).registrationNumber,'0075');
 const duplicate=await asset(org,'DIGIT-DUP');assert.equal((await call(owner,path(duplicate.id),'POST',data(await ok(owner,path(duplicate.id)),'۰۰۷۵'))).status,409);pass('Arabic and Persian digits normalize without losing leading zeroes and cannot alias an existing vessel');
 const active=await asset(org,'ACTIVE','ACTIVE'),activeView=await ok(owner,path(active.id));assert.equal(activeView.canCorrect,false);assert.equal((await call(owner,path(active.id),'POST',data(activeView,'NO-ACTIVE-'+suffix))).status,409);pass('active vessels cannot use the draft correction route');
 const revoked=await asset(org,'REVOKED'),rv=await ok(owner,path(revoked.id));await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await call(owner,path(revoked.id),'POST',data(rv,'NO-ROLE-'+suffix))).status,403);await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}});assert.equal((await audit(revoked.id)).length,0);pass('suspended owner authority prevents writes despite an existing read and session');
 const fail=await asset(org,'ROLLBACK');await db.marineAssetDocument.create({data:{marineAssetId:fail.id,documentType:'SAFETY_CERTIFICATE',status:'VERIFIED',verifiedAt:new Date()}});const failureBefore=await state(fail.id),failureView=await ok(owner,path(fail.id));
 await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger AS $$ BEGIN IF NEW."action"='MARINE_REGISTRATION_CORRECTED' AND NEW."resourceId"='${fail.id}' THEN RAISE EXCEPTION 'synthetic registration audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
 await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`);triggerInstalled=true;
 assert.equal((await call(owner,path(fail.id),'POST',data(failureView,'ROLLBACK-NEW-'+suffix))).status,500);assert.deepEqual(await state(fail.id),failureBefore);assert.equal((await audit(fail.id)).length,0);pass('audit failure rolls back number, document status and readiness snapshot together');
 console.log(`All ${checks} marine registration HTTP/PostgreSQL groups passed.`);
}finally{
 if(triggerInstalled)await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${trigger}" ON "AuditEvent"`);await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
 if(platformChanged){if(previousPlatform)await db.operationalSetting.update({where:{key:platformKey},data:{value:previousPlatform.value,updatedAt:previousPlatform.updatedAt}});else await db.operationalSetting.delete({where:{key:platformKey}});}
 await db.marineReadinessSnapshot.deleteMany({where:{marineAssetId:{in:assets}}});await db.marineAssetDocument.deleteMany({where:{marineAssetId:{in:assets}}});await db.marineAsset.deleteMany({where:{id:{in:assets}}});
 await db.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});await db.organization.deleteMany({where:{id:{in:organizations}}});await db.auditEvent.deleteMany({where:{actorId:{in:people}}});await db.notification.deleteMany({where:{accountId:{in:accounts}}});await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});await db.$disconnect();
}
