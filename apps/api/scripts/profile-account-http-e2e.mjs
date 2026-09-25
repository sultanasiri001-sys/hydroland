import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.PROFILE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
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

  r=await fetch(base+'/me/diver-profile',{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({identityLast4:'12'})}); if(r.status!==400)throw new Error('Invalid identityLast4 expected 400, got '+r.status);

  r=await fetch(base+'/me/diver-profile/equipment',{method:'POST',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({category:'REGULATOR',ownership:'OWNED',brand:'E2E',model:'ProfileTest'})}); body=await json(r);
  const item=(body.equipment||[]).find(x=>x.category==='REGULATOR'&&x.brand==='E2E'); if(!item)throw new Error('Equipment create not returned'); equipmentId=item.id;
  r=await fetch(base+'/me/diver-profile/equipment/'+encodeURIComponent(equipmentId),{method:'PATCH',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({model:'PersistedModel',status:'INACTIVE'})}); body=await json(r);
  const updated=(body.equipment||[]).find(x=>x.id===equipmentId); if(!updated||updated.model!=='PersistedModel'||updated.status!=='INACTIVE')throw new Error('Equipment PATCH did not persist');

  r=await fetch(base+'/credentials'); if(r.status!==401)throw new Error('Anonymous GET /credentials expected 401, got '+r.status);
  r=await fetch(base+'/credentials',{headers:auth(token)}); body=await json(r); if(!Array.isArray(body))throw new Error('Credentials list expected array');

  console.log('Profile/Account HTTP/DB E2E passed: auth guard, profile read/update/persistence/validation, diver profile persistence/validation, equipment create/update, credentials guard.');
} finally {
  if(account){
    await db.auditEvent.deleteMany({where:{OR:[{resourceId:account.id},...(equipmentId?[{resourceId:equipmentId}]:[])]}}).catch(()=>{});
    await db.$executeRawUnsafe(`DELETE FROM "DiverEquipment" WHERE "accountId"=$1`,account.id).catch(()=>{});
    await db.$executeRawUnsafe(`DELETE FROM "DiverProfile" WHERE "accountId"=$1`,account.id).catch(()=>{});
    await db.credential.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});
    await db.account.delete({where:{id:account.id}}).catch(()=>{});
  }
  if(person)await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
