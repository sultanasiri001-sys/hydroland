import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.PHASE5_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=async accountId=>{const session=await db.session.create({data:{accountId,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:accountId,sid:session.id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=token=>({authorization:'Bearer '+token,'content-type':'application/json'});
const request=async(path,token,options={})=>{const response=await fetch(base+path,{...options,headers:{...auth(token),...(options.headers||{})}});const text=await response.text();let body;try{body=JSON.parse(text)}catch{body=text}return{status:response.status,ok:response.ok,body};};
const expect=(condition,message)=>{if(!condition)throw new Error(message)};
const created={accounts:[],people:[],orgs:[]};
const make=async label=>{const person=await db.person.create({data:{firstName:'Phase5',lastName:label}});created.people.push(person.id);const account=await db.account.create({data:{personId:person.id,email:`phase5-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});created.accounts.push(account.id);return account;};
try{
 const ownerA=await make('OwnerA'),ownerB=await make('OwnerB'),invitee=await make('Invitee'),reviewer=await make('Reviewer');
 await db.roleAssignment.create({data:{accountId:reviewer.id,role:'REVIEWER',status:'ACTIVE',scope:{}}});
 const [ta,tb,ti,tr]=await Promise.all([tokenFor(ownerA.id),tokenFor(ownerB.id),tokenFor(invitee.id),tokenFor(reviewer.id)]);

 let r=await request('/organizations',ta,{method:'POST',body:JSON.stringify({displayName:'Phase5 Center A',legalName:'Phase5 Center A',kind:'DIVE_CENTER',registrationNumber:'P5-A-'+suffix,regionCode:'TEST'})});
 expect(r.status===201,'center A create expected 201, got '+r.status);const orgA=r.body;created.orgs.push(orgA.id);expect(orgA.status==='PENDING_REVIEW','center must await review');
 r=await request('/organizations',tb,{method:'POST',body:JSON.stringify({displayName:'Phase5 Center B',legalName:'Phase5 Center B',kind:'DIVE_CENTER',registrationNumber:'P5-B-'+suffix,regionCode:'TEST'})});
 expect(r.status===201,'center B create expected 201');const orgB=r.body;created.orgs.push(orgB.id);

 r=await request(`/organizations/${orgA.id}/members`,tb);expect(r.status===403,'other-center owner must not list members');
 r=await request(`/organizations/${orgA.id}`,tb,{method:'PATCH',body:JSON.stringify({displayName:'UNAUTHORIZED'})});expect(r.status===403,'other-center owner must not update center');
 r=await request(`/organizations/${orgA.id}/members`,tb,{method:'POST',body:JSON.stringify({accountId:invitee.id,role:'STAFF'})});expect(r.status===403,'other-center owner must not invite members');

 r=await request(`/organizations/${orgA.id}/members`,ta,{method:'POST',body:JSON.stringify({accountId:invitee.id,role:'STAFF'})});expect(r.status===201,'owner invite expected 201');
 r=await request(`/organizations/${orgA.id}/membership-response`,ti,{method:'POST',body:JSON.stringify({accept:true})});expect(r.status===409,'invitee must not activate before center approval');

 r=await request(`/organizations/${orgA.id}/decision`,ta,{method:'POST',body:JSON.stringify({outcome:'APPROVED'})});expect(r.status===403,'owner must not self-review center');
 r=await request(`/organizations/${orgA.id}/decision`,tr,{method:'POST',body:JSON.stringify({outcome:'APPROVED'})});expect(r.status===201,'reviewer approval expected 201, got '+r.status);expect(r.body.status==='ACTIVE','approved center must become ACTIVE');
 r=await request(`/organizations/${orgA.id}/membership-response`,ti,{method:'POST',body:JSON.stringify({accept:true})});expect(r.status===201&&r.body.status==='ACTIVE','invitee acceptance after approval failed');

 r=await request(`/organizations/${orgA.id}/members`,ti);expect(r.status===403,'ordinary staff must not list center members');
 r=await request(`/organizations/${orgA.id}/members`,ta);expect(r.status===200&&Array.isArray(r.body)&&r.body.length===2,'owner must see exactly owner+accepted staff');

 r=await request(`/organizations/${orgB.id}/decision`,tr,{method:'POST',body:JSON.stringify({outcome:'REJECTED',reason:'Phase 5 rejection fixture'})});expect(r.status===201&&r.body.status==='REJECTED','reviewer rejection failed');
 const audit=await db.auditEvent.findMany({where:{resource:'organization',resourceId:{in:[orgA.id,orgB.id]}},select:{action:true,resourceId:true}});
 for(const action of ['organization.submitted','organization.member_invited','organization.approved','organization.member_invitation_accepted','organization.rejected'])expect(audit.some(row=>row.action===action),'missing audit action '+action);
 console.log('Phase 5 center/organization isolation and approval HTTP E2E: PASS');
} finally {
 // AuditEvent is append-only by design. Cleanup removes mutable fixture rows only;
 // retained audit rows use onDelete: SetNull for actor and opaque resource ids.
 for(const orgId of created.orgs.reverse()){await db.organizationMember.deleteMany({where:{organizationId:orgId}}).catch(()=>{});await db.organization.delete({where:{id:orgId}}).catch(()=>{});}
 for(const accountId of created.accounts.reverse()){await db.roleAssignment.deleteMany({where:{accountId}}).catch(()=>{});await db.session.deleteMany({where:{accountId}}).catch(()=>{});await db.account.delete({where:{id:accountId}}).catch(()=>{});}
 for(const personId of created.people.reverse())await db.person.delete({where:{id:personId}}).catch(()=>{});
 await db.$disconnect();
}
