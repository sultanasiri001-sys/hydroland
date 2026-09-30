import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
const db=new PrismaClient(),base=process.env.PHASE5_ROLE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1',secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=async accountId=>{const session=await db.session.create({data:{accountId,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:accountId,sid:session.id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=t=>({authorization:'Bearer '+t,'content-type':'application/json'}),req=async(path,t,o={})=>{const r=await fetch(base+path,{...o,headers:{...auth(t),...(o.headers||{})}});const x=await r.text();let b;try{b=JSON.parse(x)}catch{b=x}return{status:r.status,body:b}};
const ok=(v,m)=>{if(!v)throw new Error(m)};const ids={accounts:[],people:[]};const suffix=Date.now();
const mk=async label=>{const p=await db.person.create({data:{firstName:'Phase5',lastName:label}});ids.people.push(p.id);const a=await db.account.create({data:{personId:p.id,email:`phase5-role-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});ids.accounts.push(a.id);return a};
try{
 const applicant=await mk('Applicant'),reviewer=await mk('Reviewer'),outsider=await mk('Outsider');
 await db.roleAssignment.create({data:{accountId:reviewer.id,role:'REVIEWER',status:'ACTIVE',scope:{}}});
 const [ta,tr,to]=await Promise.all([tokenFor(applicant.id),tokenFor(reviewer.id),tokenFor(outsider.id)]);
 let r=await req('/activation-requests',ta,{method:'POST',body:JSON.stringify({role:'INSTRUCTOR'})});ok(r.status===201,'request create '+r.status);const id=r.body.id;
 let role=await db.roleAssignment.findUnique({where:{accountId_role:{accountId:applicant.id,role:'INSTRUCTOR'}}});ok(role?.status==='PENDING_REVIEW','role must be pending');
 r=await req('/activation-requests/review-queue',to);ok(r.status===403,'ordinary account review queue must be 403');
 r=await req(`/activation-requests/${id}/decision`,ta,{method:'POST',body:JSON.stringify({outcome:'APPROVED'})});ok(r.status===403,'applicant self decision must be denied by reviewer guard');
 r=await req(`/activation-requests/${id}/decision`,tr,{method:'POST',body:JSON.stringify({outcome:'MORE_INFORMATION_REQUIRED',reason:'Need current credential evidence'})});ok(r.status===201&&r.body.status==='MORE_INFORMATION_REQUIRED','more-info decision failed');
 role=await db.roleAssignment.findUnique({where:{accountId_role:{accountId:applicant.id,role:'INSTRUCTOR'}}});ok(role?.status==='PENDING_REVIEW','more-info must not activate role');
 r=await req(`/activation-requests/${id}/resubmit`,to,{method:'POST'});ok(r.status===404,'outsider resubmit must be hidden');
 r=await req(`/activation-requests/${id}/resubmit`,ta,{method:'POST'});ok(r.status===201&&r.body.status==='RESUBMITTED','applicant resubmit failed');
 r=await req(`/activation-requests/${id}/decision`,tr,{method:'POST',body:JSON.stringify({outcome:'APPROVED'})});ok(r.status===201&&r.body.status==='APPROVED','reviewer approval failed');
 role=await db.roleAssignment.findUnique({where:{accountId_role:{accountId:applicant.id,role:'INSTRUCTOR'}}});ok(role?.status==='ACTIVE'&&role.activeAt,'approved role must be active');
 r=await req('/activation-requests',ta,{method:'POST',body:JSON.stringify({role:'INSTRUCTOR'})});ok(r.status===409,'duplicate active role request must conflict');
 const actions=await db.auditEvent.findMany({where:{resource:'ActivationRequest',resourceId:id},select:{action:true}});
 for(const action of ['ACTIVATION_REQUEST_SUBMITTED','ACTIVATION_REQUEST_DECIDED','ACTIVATION_REQUEST_RESUBMITTED'])ok(actions.some(x=>x.action===action),'missing '+action);
 const notices=await db.notification.findMany({where:{accountId:applicant.id,type:'ACTIVATION_REQUEST_DECIDED'}});ok(notices.length===2,'expected decision notifications for more-info and approval');
 console.log('Phase 5 professional role approval lifecycle HTTP/DB E2E: PASS');
}finally{
 for(const accountId of ids.accounts.reverse()){await db.notification.deleteMany({where:{accountId}}).catch(()=>{});await db.reviewDecision.deleteMany({where:{reviewerId:accountId}}).catch(()=>{});await db.activationRequest.deleteMany({where:{applicantId:accountId}}).catch(()=>{});await db.roleAssignment.deleteMany({where:{accountId}}).catch(()=>{});await db.session.deleteMany({where:{accountId}}).catch(()=>{});await db.account.delete({where:{id:accountId}}).catch(()=>{});}
 for(const personId of ids.people.reverse())await db.person.delete({where:{id:personId}}).catch(()=>{});await db.$disconnect();
}
