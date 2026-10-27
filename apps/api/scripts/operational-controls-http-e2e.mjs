import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {createHmac,randomUUID} from 'node:crypto';
const base=process.env.CONTROLS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Only isolated local test APIs are allowed.');
assert.equal(process.env.CI,'true','Operational control fixtures require CI');
assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname),'Operational control fixtures require loopback PostgreSQL');
// The existing HR runner leaves NODE_ENV unset. Mark only this guarded fixture
// process as test; never override a production/development environment.
process.env.NODE_ENV??='test';assert.equal(process.env.NODE_ENV,'test');
const db=new PrismaClient(),secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=id=>{const now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url')};
const people=[],accounts=[];
const originals=await db.$queryRaw`SELECT * FROM "PolicyControl" WHERE ("category"='WEATHER' AND "ruleKey"='WEATHER_GATE') OR ("category"='TRAINING' AND "ruleKey"='CAPACITY_LIMIT')`;
const weatherOriginal=await db.operationalSetting.findUnique({where:{key:'WEATHER_GATE'}});
const request=async(account,path='',body)=>{const r=await fetch(base+'/admin/operational-controls'+path,{method:body?'PATCH':'GET',headers:{'content-type':'application/json',...(account?{authorization:'Bearer '+token(account.id)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}};
try{
 for(const name of ['admin','reader']){const person=await db.person.create({data:{firstName:name,lastName:'OperationalControlsTest'}});people.push(person);accounts.push(await db.account.create({data:{personId:person.id,email:'control-'+randomUUID()+'@example.invalid',passwordHash:'test',status:'ACTIVE',emailVerifiedAt:new Date()}}));}
 const [admin,reader]=accounts;const role=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE'}});
 assert.equal((await request(null)).status,401);assert.equal((await request(reader)).status,403);
 const initial=await request(admin);assert.equal(initial.status,200);assert.equal(initial.body.length,29);
 const change=async(id,state)=>{const list=await request(admin),rule=list.body.find(r=>r.id===id);return request(admin,'/'+id,{state,reason:'Isolated runtime verification of operational control',expectedRevision:rule.revision})};
 let off=await change('WEATHER.WEATHER_GATE','DISABLED');assert.equal(off.status,200);
 const old=off.body.revision;
 const payload={state:'ENABLED',reason:'Concurrent runtime verification of weather control',expectedRevision:old};
 const concurrent=await Promise.all([request(admin,'/WEATHER.WEATHER_GATE',payload),request(admin,'/WEATHER.WEATHER_GATE',payload)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const weather=await db.operationalSetting.findUniqueOrThrow({where:{key:'WEATHER_GATE'}});assert.equal(weather.value.enabled,true);assert.equal(weather.value.mode,'ENFORCE');
 const [row]=await db.$queryRaw`SELECT "state" FROM "PolicyControl" WHERE "category"='WEATHER' AND "ruleKey"='WEATHER_GATE'`;assert.equal(row.state,'ENABLED');
 const audit=await db.auditEvent.findFirst({where:{action:'OPERATIONAL_CONTROL_CHANGED',resourceId:'WEATHER.WEATHER_GATE',metadata:{path:['accountId'],equals:admin.id}},orderBy:{occurredAt:'desc'}});assert(audit);assert.equal(audit.metadata.state,'ENABLED');assert.equal(audit.metadata.reason,payload.reason);
 const bad=await request(admin,'/WEATHER.WEATHER_GATE',{...payload,expectedRevision:concurrent.find(r=>r.status===200).body.revision,reason:'bad'});assert.equal(bad.status,400);
 assert.equal((await change('TRAINING.CAPACITY_LIMIT','DISABLED')).status,200);
 const {calendarExplicitBlocksAcceptance}=await import('./calendar-explicit-blocks-http.mjs');
 await calendarExplicitBlocksAcceptance({db,base,admin,reader,token});
 const revoked=(await request(admin)).body.find(r=>r.id==='TRAINING.CAPACITY_LIMIT');await db.roleAssignment.delete({where:{id:role.id}});
 assert.equal((await request(admin,'/TRAINING.CAPACITY_LIMIT',{state:'ENABLED',reason:'Revoked role cannot update operational controls',expectedRevision:revoked.revision})).status,403);
 console.log('Operational controls HTTP/PostgreSQL E2E passed: 29 controls, 401/403 guards, concurrent revision conflict, synchronized weather writes, attributed audit, reason validation and revoked role.');
}finally{
 for(const [category,ruleKey] of [['WEATHER','WEATHER_GATE'],['TRAINING','CAPACITY_LIMIT']]){
  const original=originals.find(row=>row.category===category&&row.ruleKey===ruleKey);
  if(original)await db.$executeRaw`UPDATE "PolicyControl" SET "state"=${original.state},"updatedByAccountId"=${original.updatedByAccountId}::uuid,"updatedAt"=${original.updatedAt} WHERE "category"=${category} AND "ruleKey"=${ruleKey}`;
  else await db.$executeRaw`DELETE FROM "PolicyControl" WHERE "category"=${category} AND "ruleKey"=${ruleKey}`;
 }
 if(weatherOriginal)await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:weatherOriginal.value,updatedAt:weatherOriginal.updatedAt}});else await db.operationalSetting.deleteMany({where:{key:'WEATHER_GATE'}});
 for(const account of accounts)await db.auditEvent.deleteMany({where:{action:'OPERATIONAL_CONTROL_CHANGED',metadata:{path:['accountId'],equals:account.id}}});
 await db.roleAssignment.deleteMany({where:{accountId:{in:accounts.map(a=>a.id)}}});await db.account.deleteMany({where:{id:{in:accounts.map(a=>a.id)}}});await db.person.deleteMany({where:{id:{in:people.map(p=>p.id)}}});await db.$disconnect();
}
