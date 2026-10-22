import assert from 'node:assert/strict';
import { randomUUID, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const base=process.env.ACCOUNTS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for(const value of [base,process.env.DATABASE_URL||'postgresql://missing'])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname),'Account lifecycle fixtures require loopback API and database');
assert(process.env.CI==='true'||process.env.NODE_ENV==='test','Account lifecycle fixtures are test-only');
const require=createRequire(import.meta.url),{DatabaseService}=require('../dist/database/database.service.js'),{AdminService}=require('../dist/admin/admin.service.js'),{AuditService}=require('../dist/audit/audit.service.js'),{AuthService}=require('../dist/auth/auth.service.js'),{MfaService}=require('../dist/auth/mfa.service.js');
const db=new PrismaClient(),runtimeDb=new DatabaseService(),mfa=new MfaService(runtimeDb),auth=new AuthService(runtimeDb,mfa,{}),adminService=new AdminService(runtimeDb,new AuditService(runtimeDb));
const accounts=[],people=[];let organization;
const suffix=randomUUID(),password='Account-lifecycle-fixture-only-2026!',salt='account-lifecycle-fixture',passwordHash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const call=async(path,token,body)=>{const response=await fetch(base+path,{method:body?'PATCH':'GET',headers:{...(token?{authorization:`Bearer ${token}`}:{ }),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json().catch(()=>null)}};
const login=async account=>{const response=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:account.email,password})});return{status:response.status,body:await response.json().catch(()=>null)}};
const refresh=async token=>{const response=await fetch(base+'/auth/refresh',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:token})});return response.status};
const fixture=async(label,role=null,status='ACTIVE')=>{const person=await db.person.create({data:{firstName:'Lifecycle',lastName:label}});people.push(person.id);const account=await db.account.create({data:{personId:person.id,email:`lifecycle-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash,status,emailVerifiedAt:status==='PENDING_VERIFICATION'?null:new Date()}});accounts.push(account.id);if(role)await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE'}});return account};
const safe=value=>{if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){assert(!/password|tokenhash|secret/i.test(key),`Private credential field returned: ${key}`);safe(child)}};
const revision=async accountId=>(await db.account.findUniqueOrThrow({where:{id:accountId},select:{updatedAt:true}})).updatedAt.toISOString();
const change=async(actor,id,status,extra={})=>call(`/admin/accounts/${id}/status`,actor,{status,reason:'Isolated account lifecycle review',expectedUpdatedAt:await revision(id),reviewed:true,...extra});
const auditCount=accountId=>db.auditEvent.count({where:{action:'ACCOUNT_STATUS_CHANGED',resourceId:accountId}});
try{
 const a=await fixture('AdminA','ADMIN'),b=await fixture('AdminB','ADMIN'),staff=await fixture('Staff','STAFF'),other=await fixture('Other'),pending=await fixture('Pending',null,'PENDING_VERIFICATION');
 const at=await login(a),bt=await login(b),st=await login(staff),second=await login(staff),ot=await login(other);
 for(const result of [at,bt,st,second,ot])assert.equal(result.status,200);
 const token=at.body.accessToken;
 organization=await db.organization.create({data:{ownerAccountId:a.id,kind:'DIVE_CENTER',displayName:`Lifecycle ${suffix}`,status:'ACTIVE'}});
 const membership=await db.organizationMember.create({data:{accountId:staff.id,organizationId:organization.id,role:'STAFF',status:'ACTIVE'}});
 const equipment=await db.diverEquipment.create({data:{accountId:staff.id,category:'Lifecycle fixture',ownership:'OWNED'}});
 assert.equal((await call('/admin/accounts')).status,401);
 assert.equal((await call('/admin/accounts',ot.body.accessToken)).status,403);
 assert.equal((await change(ot.body.accessToken,staff.id,'SUSPENDED')).status,403);
 const page=await call('/admin/accounts?search='+encodeURIComponent(suffix),token);assert.equal(page.status,200);safe(page.body);assert.equal(page.body.items.length,5);assert.equal(page.body.items.find(x=>x.id===a.id).isCurrentAccount,true);
 assert.equal((await change(token,staff.id,'ARCHIVED')).status,400);
 assert.equal((await change(token,staff.id,'SUSPENDED',{reviewed:false})).status,400);
 assert.equal((await change(token,staff.id,'SUSPENDED',{reason:''})).status,400);
 assert.equal((await change(token,staff.id,'SUSPENDED',{expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status,409);
 assert.equal((await change(token,pending.id,'ACTIVE')).status,409);
 assert.equal(await auditCount(staff.id),0);
 assert.equal((await call('/me',st.body.accessToken)).status,200);

 // A failure of the actual audit write rolls back status AND session revocation.
 const brokenAudit=new AdminService(runtimeDb,{record:async()=>{throw new Error('Injected audit failure')}});
 const liveBefore=await db.session.count({where:{accountId:staff.id,revokedAt:null}});
 const revisionBefore=await revision(staff.id);
 await assert.rejects(()=>brokenAudit.setAccountStatus(a.id,staff.id,'SUSPENDED','Rollback fixture',revisionBefore,true),/Injected audit failure/);
 assert.equal((await db.account.findUniqueOrThrow({where:{id:staff.id}})).status,'ACTIVE');
 assert.equal(await db.session.count({where:{accountId:staff.id,revokedAt:null}}),liveBefore);assert.equal(await auditCount(staff.id),0);

 const suspended=await change(token,staff.id,'SUSPENDED');assert.equal(suspended.status,200);safe(suspended.body);assert.equal(suspended.body.status,'SUSPENDED');assert(suspended.body.revokedSessionCount>=2);
 for(const old of [st.body,second.body]){assert.equal((await call('/me',old.accessToken)).status,401);assert.equal(await refresh(old.refreshToken),401);}
 assert.equal((await login(staff)).status,401);await assert.rejects(()=>mfa.beginChallenge(staff.id),e=>e.getStatus?.()===401);
 const repeated=await change(token,staff.id,'SUSPENDED');assert.equal(repeated.status,200);safe(repeated.body);assert.equal(await auditCount(staff.id),1);
 assert.equal((await change(token,staff.id,'ACTIVE',{expectedUpdatedAt:revisionBefore})).status,409);
 const activated=await change(token,staff.id,'ACTIVE');assert.equal(activated.status,200);safe(activated.body);
 for(const old of [st.body,second.body]){assert.equal((await call('/me',old.accessToken)).status,401);assert.equal(await refresh(old.refreshToken),401);}
 assert.equal((await login(staff)).status,200);
 assert.equal((await db.organizationMember.findUniqueOrThrow({where:{id:membership.id}})).status,'ACTIVE');
 assert.equal((await db.diverEquipment.findUniqueOrThrow({where:{id:equipment.id}})).accountId,staff.id);
 assert.equal((await db.roleAssignment.findUniqueOrThrow({where:{accountId_role:{accountId:staff.id,role:'STAFF'}}})).status,'ACTIVE');
 const events=await db.auditEvent.findMany({where:{action:'ACCOUNT_STATUS_CHANGED',resourceId:staff.id},orderBy:{occurredAt:'asc'}});
 assert.equal(events.length,2);for(const event of events){assert.equal(event.actorId,a.personId);assert.equal(event.metadata.reason,'Isolated account lifecycle review');assert.equal(event.metadata.adminAccountId,a.id)}
 assert.equal(events[0].metadata.previousStatus,'ACTIVE');assert.equal(events[0].metadata.status,'SUSPENDED');assert.equal(events[1].metadata.previousStatus,'SUSPENDED');assert.equal(events[1].metadata.status,'ACTIVE');

 const sameRevision=await revision(staff.id),beforeConcurrent=await auditCount(staff.id);
 const concurrent=await Promise.all([change(token,staff.id,'SUSPENDED',{expectedUpdatedAt:sameRevision}),change(bt.body.accessToken,staff.id,'SUSPENDED',{expectedUpdatedAt:sameRevision})]);
 assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);assert.equal(await auditCount(staff.id),beforeConcurrent+1);
 assert.equal((await change(token,staff.id,'ACTIVE')).status,200);
 const raceTokens=(await login(staff)).body,raceRevision=await revision(staff.id);
 const race=await Promise.allSettled([auth.issue(staff.id),auth.refresh(raceTokens.refreshToken),mfa.beginChallenge(staff.id),adminService.setAccountStatus(a.id,staff.id,'SUSPENDED','Concurrent session issuance fixture',raceRevision,true)]);
 assert.equal(race[3].status,'fulfilled');assert.equal(await db.session.count({where:{accountId:staff.id,revokedAt:null}}),0);
 assert.equal((await change(token,staff.id,'ACTIVE')).status,200);
 for(const result of race.slice(0,3))if(result.status==='fulfilled'&&result.value.accessToken)await assert.rejects(()=>auth.authenticateAccessToken(result.value.accessToken),e=>e.getStatus?.()===401);

 // Pagination must not silently omit accounts or duplicate a cursor boundary.
 for(let i=0;i<47;i++)await fixture(`Page${i}`);
 const first=await call('/admin/accounts?search='+encodeURIComponent(suffix),token);assert.equal(first.body.items.length,50);assert(first.body.nextCursor);safe(first.body);
 const last=await call('/admin/accounts?search='+encodeURIComponent(suffix)+'&cursor='+encodeURIComponent(first.body.nextCursor),token);safe(last.body);
 assert.equal(last.body.items.length,2);assert.equal(last.body.nextCursor,null);assert.equal(new Set([...first.body.items,...last.body.items].map(x=>x.id)).size,52);

 // Two administrators cannot suspend each other concurrently and strand the platform.
 const mutual=await Promise.all([change(token,b.id,'SUSPENDED'),change(bt.body.accessToken,a.id,'SUSPENDED')]);
 assert.equal(mutual.filter(x=>x.status===200).length,1);assert(mutual.some(x=>[401,403,409].includes(x.status)));
 const remaining=await db.account.findMany({where:{id:{in:[a.id,b.id]},status:'ACTIVE'}});assert.equal(remaining.length,1);
 const remainingToken=remaining[0].id===a.id?token:bt.body.accessToken;
 assert.equal((await change(remainingToken,remaining[0].id,'SUSPENDED')).status,400);
 await db.roleAssignment.update({where:{accountId_role:{accountId:remaining[0].id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
 const beforeRevoked=await revision(staff.id);
 await assert.rejects(()=>adminService.setAccountStatus(remaining[0].id,staff.id,'SUSPENDED','Revoked administrator fixture',beforeRevoked,true),e=>e.getStatus?.()===403);
 assert.equal(await revision(staff.id),beforeRevoked);
 console.log('Account lifecycle HTTP/PostgreSQL passed: private-field exclusion, paged search, audited atomic rollback, suspension and fresh-login reactivation, stale/replayed/concurrent changes, administrator revocation, session/refresh/MFA races, and independent center memberships.');
}finally{
 if(accounts.length){
  await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:people}},{action:'ACCOUNT_STATUS_CHANGED',resourceId:{in:accounts}}]}});
  await db.diverEquipment.deleteMany({where:{accountId:{in:accounts}}});
  await db.organizationMember.deleteMany({where:{accountId:{in:accounts}}});
  if(organization)await db.organization.delete({where:{id:organization.id}});
  await db.operationalSetting.deleteMany({where:{key:{in:accounts.map(id=>`auth.mfa.account.${id}`)}}});
  await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});
  await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});
 }
 await runtimeDb.$disconnect();await db.$disconnect();
}
