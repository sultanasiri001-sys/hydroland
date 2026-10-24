import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';

const db=new PrismaClient();
const base=process.env.PROFILE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for(const url of [new URL(base),new URL(process.env.DATABASE_URL||'postgresql://missing')]){
  assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Profile E2E requires a local API and test database');
}
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=t=>({authorization:`Bearer ${t}`});
const json=async r=>{const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(`HTTP ${r.status}: ${JSON.stringify(b)}`);return b};
let account,person,equipmentId;
try{
  person=await db.person.create({data:{firstName:'Profile',lastName:'Before'}});
  account=await db.account.create({data:{personId:person.id,email:`profile-e2e-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
  const token=tokenFor(account.id);

  let r=await fetch(base+'/me'); if(r.status!==401)throw new Error('Anonymous GET /me expected 401, got '+r.status);
  r=await fetch(base+'/me',{headers:auth(token)}); let body=await json(r); if(body.person?.firstName!=='Profile')throw new Error('Initial profile read mismatch');

  r=await fetch(base+'/me',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({firstName:'ProfileUpdated',lastName:'Persisted',headline:'Diver',regionCode:'ASIR'})}); await json(r);
  r=await fetch(base+'/me',{headers:auth(token)}); body=await json(r);
  if(body.person?.firstName!=='ProfileUpdated'||body.person?.lastName!=='Persisted'||body.person?.professional?.headline!=='Diver'||body.person?.professional?.regionCode!=='ASIR')throw new Error('Profile PATCH did not persist');

  r=await fetch(base+'/me',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({firstName:'   '})}); if(r.status!==400)throw new Error('Blank firstName expected 400, got '+r.status);

  r=await fetch(base+'/me/diver-profile',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({nationality:'SA',primaryPhone:'0500000000',emergencyName:'Emergency Contact',emergencyPhone:'0500000001',bloodType:'O+',medicalFitnessStatus:'FIT',preferredLanguage:'ar'})}); body=await json(r);
  if(body.profile?.nationality!=='SA'||body.profile?.emergencyName!=='Emergency Contact')throw new Error('Diver profile update mismatch');
  r=await fetch(base+'/me/diver-profile',{headers:auth(token)}); body=await json(r);
  if(body.profile?.primaryPhone!=='0500000000'||body.profile?.medicalFitnessStatus!=='FIT')throw new Error('Diver profile did not persist');

  const patchDiver=input=>fetch(base+'/me/diver-profile',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify(input)});
  const storedDiver=()=>db.diverProfile.findUniqueOrThrow({where:{accountId:account.id}});
  const extra={dateOfBirth:'1995-05-20',identityType:'NATIONAL_ID',identityLast4:'1234',secondaryPhone:'0500000002',preferredContact:'EMAIL',emergencyAltPhone:'0500000003',preferredLanguage:'en',notes:'Preserve fields outside the compact editor',medicalClearanceExpiresAt:'2030-05-20'};
  await json(await patchDiver(extra));
  const beforePartial=await storedDiver();
  await json(await patchDiver({primaryPhone:' 0555555555 '}));
  const afterPartial=await storedDiver();
  assert.equal(afterPartial.primaryPhone,'0555555555');
  for(const key of Object.keys(beforePartial).filter(key=>!['primaryPhone','updatedAt'].includes(key))){
    assert.deepEqual(afterPartial[key],beforePartial[key],`Omitted ${key} must survive a partial PATCH`);
  }
  await json(await patchDiver({emergencyName:'Updated Emergency'}));
  assert.equal((await storedDiver()).emergencyPhone,'0500000001','Editing a contact name preserves its omitted phone');
  const beforeInvalid=await storedDiver();
  for(const input of [{emergencyName:null},{emergencyPhone:'   '},{nationality:42},{primaryPhone:[]},{notes:{}},{dateOfBirth:'invalid-date'},{medicalFitnessStatus:true}]){
    assert.equal((await patchDiver(input)).status,400,'Malformed or incomplete profile changes must be rejected');
    assert.deepEqual(await storedDiver(),beforeInvalid,'Rejected PATCH must not change existing data');
  }
  await json(await patchDiver({notes:null,secondaryPhone:null,dateOfBirth:null}));
  const afterClear=await storedDiver();
  for(const key of ['notes','secondaryPhone','dateOfBirth'])assert.equal(afterClear[key],null,'Explicit null clears optional fields');
  assert.equal(afterClear.identityLast4,'1234');assert.equal(afterClear.preferredLanguage,'en');
  assert.equal(afterClear.medicalFitnessStatus,'FIT');
  const audit=await db.auditEvent.findFirstOrThrow({where:{action:'DIVER_PROFILE_UPDATED',resourceId:account.id},orderBy:{occurredAt:'desc'}});
  assert.equal(audit.metadata.medicalFitnessStatus,'FIT','Audit reflects the persisted medical status');
  assert.equal(audit.metadata.preferredLanguage,'en','Audit reflects the persisted language');
  await Promise.all([patchDiver({nationality:'SA-UPDATED'}).then(json),patchDiver({primaryPhone:'0566666666'}).then(json)]);
  const afterConcurrent=await storedDiver();
  assert.equal(afterConcurrent.nationality,'SA-UPDATED');assert.equal(afterConcurrent.primaryPhone,'0566666666');
  const [clearContact,editContact]=await Promise.all([patchDiver({emergencyName:null,emergencyPhone:null}),patchDiver({emergencyName:'Concurrent Contact'})]);
  assert.equal(clearContact.status,200);assert([200,400].includes(editContact.status),'A racing contact update must succeed consistently or be rejected');
  assert.equal((await storedDiver()).emergencyName,null);assert.equal((await storedDiver()).emergencyPhone,null);
  assert.equal((await patchDiver({emergencyName:'Orphan'})).status,400,'A new emergency contact requires a phone');
  await json(await patchDiver({accountId:'not-the-owner',identityVerifiedAt:new Date().toISOString()}));
  const protectedFields=await storedDiver();
  assert.equal(protectedFields.accountId,account.id);assert.equal(protectedFields.identityVerifiedAt,null);

  r=await fetch(base+'/me/diver-profile',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({identityLast4:'12'})}); if(r.status!==400)throw new Error('Invalid identityLast4 expected 400, got '+r.status);

  r=await fetch(base+'/me/diver-profile/equipment',{method:'POST',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({category:'REGULATOR',ownership:'OWNED',brand:'E2E',model:'ProfileTest'})}); body=await json(r);
  const item=(body.equipment||[]).find(x=>x.category==='REGULATOR'&&x.brand==='E2E'); if(!item)throw new Error('Equipment create not returned'); equipmentId=item.id;
  r=await fetch(base+'/me/diver-profile/equipment/'+encodeURIComponent(equipmentId),{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({model:'PersistedModel',status:'INACTIVE'})}); body=await json(r);
  const updated=(body.equipment||[]).find(x=>x.id===equipmentId); if(!updated||updated.model!=='PersistedModel'||updated.status!=='INACTIVE')throw new Error('Equipment PATCH did not persist');

  r=await fetch(base+'/credentials'); if(r.status!==401)throw new Error('Anonymous GET /credentials expected 401, got '+r.status);
  r=await fetch(base+'/credentials',{headers:auth(token)}); body=await json(r); if(!Array.isArray(body))throw new Error('Credentials list expected array');

  console.log('Profile/Account HTTP/DB E2E passed: auth guard, profile persistence, partial diver PATCH preserves omitted fields, explicit clearing, atomic contact validation, concurrent updates, accurate audit, protected fields, equipment create/update, credentials guard.');
} finally {
  if(account){
    await db.auditEvent.deleteMany({where:{OR:[{resourceId:account.id},...(equipmentId?[{resourceId:equipmentId}]:[])]}}).catch(()=>{});
    await db.diverEquipment.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.diverProfile.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});
  }
  if(person){
    await db.credential.deleteMany({where:{personId:person.id}}).catch(()=>{});
    await db.professionalProfile.deleteMany({where:{personId:person.id}}).catch(()=>{});
  }
  if(account)await db.account.delete({where:{id:account.id}}).catch(()=>{});
  if(person)await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
