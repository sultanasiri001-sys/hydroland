import { PrismaClient } from '@prisma/client';
import { createHmac, scryptSync } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.HR_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const person=await db.person.create({data:{firstName:'HR',lastName:'E2E'}});
const account=await db.account.create({data:{personId:person.id,email:`hr-e2e-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
const org=await db.organization.create({data:{displayName:'HR E2E '+suffix,kind:'DIVE_CENTER',regionCode:'ASIR',ownerId:account.id}});
await db.organizationMember.create({data:{organizationId:org.id,accountId:account.id,role:'STAFF',status:'ACTIVE'}});
await db.roleAssignment.create({data:{accountId:account.id,role:'HR_MANAGER',status:'ACTIVE',scope:{organizationIds:[org.id]}}});
const employment=await db.employment.create({data:{accountId:account.id,organizationId:org.id,status:'DRAFT',workerClass:'EMPLOYEE'}});
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);
const body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:account.id,iat:now,exp:now+900})}`;
const token=`${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
const patch=(payload,t=token)=>fetch(`${base}/hr/employments/${employment.id}/status`,{method:'PATCH',headers:{'content-type':'application/json',authorization:`Bearer ${t}`},body:JSON.stringify(payload)});
try{
 let r=await patch({action:'STAFFING_REQUEST',status:'PENDING_APPROVAL',context:{organizationId:org.id}},'invalid'); if(r.status!==401)throw new Error('Expected 401, got '+r.status);
 r=await patch({action:'STAFFING_REQUEST',status:'PENDING_APPROVAL',context:{organizationId:org.id}}); if(!r.ok)throw new Error('Allowed HR transition failed '+r.status+' '+await r.text());
 const persisted=await db.employment.findUniqueOrThrow({where:{id:employment.id}}); if(persisted.status!=='PENDING_APPROVAL')throw new Error('Employment status was not persisted');
 const audit=await db.auditEvent.findFirst({where:{actorId:person.id,resource:'Employment',resourceId:employment.id,action:'HR_EMPLOYMENT_STATUS_CHANGED'}}); if(!audit)throw new Error('HR audit evidence missing');
 const beforeDenied=(await db.auditEvent.count({where:{resourceId:employment.id}}));
 r=await patch({action:'STAFFING_REQUEST',status:'ACTIVE',context:{organizationId:org.id}}); if(r.status<400)throw new Error('Invalid privileged transition was accepted');
 const afterDenied=await db.employment.findUniqueOrThrow({where:{id:employment.id}}); if(afterDenied.status!=='PENDING_APPROVAL')throw new Error('Denied transition mutated employment state');
 const afterDeniedAudit=await db.auditEvent.count({where:{resourceId:employment.id}}); if(afterDeniedAudit!==beforeDenied)throw new Error('Denied transition emitted success audit evidence');
 console.log('HR HTTP/DB E2E passed: auth, persisted transition, audit, denial non-mutation, fail-closed transition.');
} finally {
 await db.auditEvent.deleteMany({where:{resourceId:employment.id}});
 await db.employment.deleteMany({where:{id:employment.id}});
 await db.roleAssignment.deleteMany({where:{accountId:account.id}});
 await db.organizationMember.deleteMany({where:{accountId:account.id}});
 await db.account.delete({where:{id:account.id}}); await db.person.delete({where:{id:person.id}}); await db.organization.delete({where:{id:org.id}}); await db.$disconnect();
}
