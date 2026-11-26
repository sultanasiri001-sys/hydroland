import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {checkCenterLicenses} from './center-license-http-checks.mjs';
import {checkCenterLicenseCreation} from './center-license-create-http-checks.mjs';
import {checkCenterLicensePlatformReview} from './center-license-platform-review-http-checks.mjs';
import {checkCenterLicenseReview} from './center-license-review-http-checks.mjs';
import {checkCenterLicenseRegistrationRace} from './center-license-registration-race-checks.mjs';

const base=process.env.C12_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const databaseUrl=process.env.DATABASE_URL,secret=process.env.JWT_SECRET;
const loopback=host=>['127.0.0.1','localhost','[::1]'].includes(host);
if(process.env.CI!=='true'||process.env.C12_DB_TEST_CONFIRM!=='DISPOSABLE_LOOPBACK_ONLY'||!databaseUrl||!secret
 ||!loopback(new URL(base).hostname)||!loopback(new URL(databaseUrl).hostname)
 ||!/^hydroland_c12_test(?:_[a-z0-9]+)?$/.test(new URL(databaseUrl).pathname.slice(1))){
 throw new Error('C12 acceptance requires CI, explicit disposable confirmation, a hydroland_c12_test database and loopback API/PostgreSQL.');
}

const db=new PrismaClient(),tag=randomUUID(),ids={people:[],accounts:[],organizations:[]},sections=[];
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const personAccount=async label=>{
 const person=await db.person.create({data:{firstName:'Synthetic C12',lastName:label}});ids.people.push(person.id);
 const account=await db.account.create({data:{personId:person.id,email:`c12-${label}-${tag}@example.invalid`,passwordHash:'synthetic-fixture',status:'ACTIVE',emailVerifiedAt:new Date()}});ids.accounts.push(account.id);
 await db.roleAssignment.create({data:{accountId:account.id,role:'DIVE_CENTER',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'C12_SYNTHETIC_CI'}}});
 return account;
};
const tokenFor=async accountId=>{
 const session=await db.session.create({data:{accountId,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
 const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:accountId,sid:session.id,iat:now,exp:now+900});
 return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');
};
const centerFor=async owner=>{
 const org=await db.organization.create({data:{displayName:'Synthetic C12 '+tag,kind:'DIVE_CENTER',status:'ACTIVE',ownerId:owner.id}});ids.organizations.push(org.id);
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 const unit=await db.orgUnit.create({data:{organizationId:org.id,type:'CENTER',code:'C12-SYNTHETIC',nameAr:'وحدة اختبار اصطناعية'}});
 for(const type of ['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL','INTERNAL_MEMO']){
  await db.administrativeRecord.create({data:{organizationId:org.id,unitId:unit.id,ownerAccountId:owner.id,type,referenceNumber:`${tag}-${type}`,subject:'Synthetic '+type,status:'REGISTERED'}});
 }
 return {org};
};
async function section(name,run){
 const before=checks;await run();sections.push({name,checks:checks-before,status:'passed'});
 console.log(`C12 ${name}: ${checks-before} assertions passed`);
}

try{
 const ownerA=await personAccount('owner-a'),ownerB=await personAccount('owner-b'),staff=await personAccount('staff');
 const a=await centerFor(ownerA),b=await centerFor(ownerB);
 await db.organizationMember.create({data:{organizationId:a.org.id,accountId:staff.id,role:'STAFF',status:'ACTIVE'}});
 const [ta,tb,ts]=await Promise.all([tokenFor(ownerA.id),tokenFor(ownerB.id),tokenFor(staff.id)]);
 const context={base,a,b,ownerA,staff,ta,tb,ts,personAccount,tokenFor};
 await section('private upload, download and integrity',()=>checkCenterLicenses(db,context,check));
 await section('creation, renewal and source preservation',()=>checkCenterLicenseCreation(db,context,check));
 await section('platform review authority and expiry',()=>checkCenterLicensePlatformReview(db,context,check));
 await section('separate internal reviewer and irreversible decisions',()=>checkCenterLicenseReview(db,context,check));
 await section('concurrent attachment and date changes',()=>checkCenterLicenseRegistrationRace(context,check));
 const result={schema:'HYDROLAND_C12_SYNTHETIC_HTTP_ACCEPTANCE_V1',recordedAt:new Date().toISOString(),sourceCommit:process.env.C12_SOURCE_COMMIT||null,checks,sections,
  scope:'Actual HTTP and PostgreSQL with synthetic accounts and documents; not real user acceptance, an issuer check or a regulator approval.'};
 if(process.env.C12_EVIDENCE_PATH)await writeFile(process.env.C12_EVIDENCE_PATH,JSON.stringify(result,null,2)+'\n');
 console.log(`C12 synthetic HTTP/PostgreSQL acceptance: ${checks}/${checks} assertions passed across ${sections.length} sections.`);
}finally{
 try{
  await db.administrativeRecord.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.orgUnit.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organizationDocumentAsset.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organizationMember.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organization.deleteMany({where:{id:{in:ids.organizations}}});
  await db.notification.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.session.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.account.deleteMany({where:{id:{in:ids.accounts}}});
  // Append-only audit actors remain only in the disposable test database.
  await db.person.deleteMany({where:{id:{in:ids.people},auditEvents:{none:{}}}});
 }finally{await db.$disconnect();}
}
