import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid'),base=new URL(process.env.LEGAL_E2E_BASE_URL||'http://127.0.0.1:3183/api/v1');
assert(process.env.NODE_ENV==='test'&&process.env.CI==='true'&&process.env.LEGAL_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE');
assert(['localhost','127.0.0.1','[::1]'].includes(database.hostname)&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)&&/(?:_ci|_test)$/.test(database.pathname));
const db=new PrismaClient();let checks=0;
try{
  const actor=await db.account.findFirstOrThrow({where:{email:{startsWith:'legal-Manager-',endsWith:'@example.invalid'},status:'ACTIVE'},orderBy:{createdAt:'desc'}});
  const member=await db.organizationMember.findFirstOrThrow({where:{accountId:actor.id,role:'ADMIN',status:'ACTIVE',organization:{displayName:'B06 isolated organization'}}});
  const session=await db.session.create({data:{accountId:actor.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+300000)}}),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000),tokenBody=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:actor.id,sid:session.id,iat:now,exp:now+300}),token=tokenBody+'.'+createHmac('sha256',process.env.JWT_SECRET).update(tokenBody).digest('base64url');
  const rows=await db.$queryRaw`SELECT "id","revision","digest","state" FROM "LegalContractLifecycle" WHERE "organizationId"::text=${member.organizationId} AND "state"->>'status'='ARCHIVED'`;
  assert(rows.length>=2);checks++;
  for(const row of rows){const response=await fetch(base.href+`/legal/contracts/organizations/${member.organizationId}/records/${row.id}`,{headers:{authorization:'Bearer '+token}});assert.equal(response.status,200);const record=await response.json();assert.equal(record.digest,row.digest);assert.equal(record.revision,row.revision);assert.equal(record.events.length,row.revision);assert.equal(record.status,'ARCHIVED');checks+=5;}
  console.log(`PASS B06 restart persistence: ${checks} assertions; fresh API process reads retained state digests, full event revisions and archived status from PostgreSQL.`);
}finally{await db.$disconnect();}
