import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{binding}=require('./mandatory-policy-fixture.cjs');

export async function policyControlAtomicityAcceptance({db,base,admin,reader,token}){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
 assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 assert.match(admin.id,/^[a-f0-9-]{36}$/i);
 const category='SYNTHETIC_ATOMIC_'+randomUUID().replaceAll('-','').toUpperCase(),ruleKey='TEST';
 const trigger='synthetic_policy_'+randomUUID().replaceAll('-','');
 let installed=false;
 const call=async(account,method,path,body)=>{
  const res=await fetch(base+'/admin/policies'+path,{method,headers:{'content-type':'application/json',...(account?{authorization:'Bearer '+token(account.id)}:{})},body:JSON.stringify(body)});
  return {status:res.status,body:await res.json()};
 };
 const input={category,ruleKey,labelAr:'Synthetic atomicity fixture',state:'ENABLED'};
 const audits=()=>db.auditEvent.findMany({where:{resource:'PolicyControl',metadata:{path:['category'],equals:category}},orderBy:{id:'asc'}});
 const snapshot=async()=>({rows:await db.policyControl.findMany({where:{category},orderBy:{ruleKey:'asc'}}),audits:await audits()});
 try{
  assert.equal((await call(null,'POST','',input)).status,401);
  assert.equal((await call(reader,'POST','',input)).status,403);
  assert.equal((await call(admin,'POST','',input)).status,201);
  assert.equal((await call(admin,'PATCH','/'+category+'/'+ruleKey+'/state',{state:'REVIEW',reason:'Synthetic audit attribution'})).status,200);
  const saved=await audits();assert.equal(saved.length,2);assert(saved.every(a=>a.actorId===admin.personId&&a.metadata.accountId===admin.id));
  await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('POLICY_STATE_CHANGED','POLICY_RULE_UPSERTED') AND NEW.metadata->>'accountId'='${admin.id}' THEN RAISE EXCEPTION 'synthetic policy audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`);installed=true;
  const before=await snapshot();
  for(const [method,path,body] of [
   ['PATCH','/'+category+'/'+ruleKey+'/state',{state:'DISABLED',reason:'Synthetic audit failure'}],
   ['POST','',{...input,labelAr:'Rejected replacement',state:'DISABLED'}],
   ['POST','',{...input,ruleKey:'NEW',labelAr:'Rejected creation'}],
  ]){assert.equal((await call(admin,method,path,body)).status,500);assert.deepEqual(await snapshot(),before);}
  await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);installed=false;
  await db.policyControl.updateMany({where:{category,ruleKey},data:{metadata:binding(category,ruleKey),state:'ENABLED'}});
  const adopted=await snapshot();
  assert.equal((await call(admin,'PATCH','/'+category+'/'+ruleKey+'/state',{state:'DISABLED'})).status,403);
  assert.equal((await call(admin,'POST','',{...input,state:'REVIEW'})).status,403);
  assert.deepEqual(await snapshot(),adopted);
  console.log('Policy atomicity HTTP/PostgreSQL: PASS; authentication, actor attribution, state/upsert/create audit-failure rollback, mandatory-boundary preservation.');
 }finally{
  if(installed)await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);
  await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
  const ids=(await audits()).map(a=>a.id);if(ids.length)await db.auditEvent.deleteMany({where:{id:{in:ids}}});
  await db.policyControl.deleteMany({where:{category}});
 }
}
