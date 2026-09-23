import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.FINANCE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000);const body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=(token)=>({'content-type':'application/json',authorization:`Bearer ${token}`});
let ids={};
try{
  const mk=async(label)=>{const p=await db.person.create({data:{firstName:'Finance',lastName:label}});const a=await db.account.create({data:{personId:p.id,email:`finance-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE',scope:{}}});return {p,a,t:tokenFor(a.id)};};
  const requester=await mk('Requester'), approver=await mk('Approver'), poster=await mk('Poster');
  ids.accounts=[requester.a.id,approver.a.id,poster.a.id]; ids.people=[requester.p.id,approver.p.id,poster.p.id];
  const org=await db.organization.create({data:{displayName:'Finance E2E '+suffix,kind:'DIVE_CENTER',regionCode:'ASIR',ownerId:requester.a.id}});ids.org=org.id;
  let r=await fetch(base+'/finance/admin/accounts',{method:'POST',headers:auth(requester.t),body:JSON.stringify({organizationId:org.id,name:'E2E Cash',currency:'SAR'})});
  if(!r.ok)throw new Error('Finance account create failed '+r.status+' '+await r.text()); const fa=await r.json();ids.fa=fa.id;
  r=await fetch(base+'/finance/admin/entries',{method:'POST',headers:auth(requester.t),body:JSON.stringify({organizationId:org.id,financeAccountId:fa.id,type:'REVENUE',amountMinor:25000,currency:'SAR',referenceType:'E2E',referenceId:suffix})});
  if(!r.ok)throw new Error('Finance entry create failed '+r.status+' '+await r.text());const entry=await r.json();ids.entry=entry.id;
  r=await fetch(base+`/finance/admin/entries/${entry.id}/decision`,{method:'POST',headers:auth(requester.t),body:JSON.stringify({approved:true})});
  if(r.status<400)throw new Error('Self approval was accepted');
  let state=await db.financeEntry.findUniqueOrThrow({where:{id:entry.id}});if(state.status!=='PENDING_APPROVAL')throw new Error('Denied self approval mutated entry');
  r=await fetch(base+`/finance/admin/entries/${entry.id}/decision`,{method:'POST',headers:auth(approver.t),body:JSON.stringify({approved:true,note:'E2E approval'})});
  if(!r.ok)throw new Error('Independent approval failed '+r.status+' '+await r.text());
  state=await db.financeEntry.findUniqueOrThrow({where:{id:entry.id}});if(state.status!=='APPROVED'||state.approvedByAccountId!==approver.a.id)throw new Error('Approval provenance invalid');
  r=await fetch(base+`/finance/admin/entries/${entry.id}/post`,{method:'POST',headers:auth(approver.t)});
  if(r.status<400)throw new Error('Approver was allowed to post');
  r=await fetch(base+`/finance/admin/entries/${entry.id}/post`,{method:'POST',headers:auth(poster.t)});
  if(!r.ok)throw new Error('Independent posting failed '+r.status+' '+await r.text());
  state=await db.financeEntry.findUniqueOrThrow({where:{id:entry.id}});if(state.status!=='POSTED'||state.postedByAccountId!==poster.a.id||!state.postedAt)throw new Error('Posting provenance invalid');
  const approvedAudit=await db.auditEvent.findFirst({where:{resource:'FinanceEntry',resourceId:entry.id,action:'FINANCE_ENTRY_APPROVED',actorId:approver.p.id}});
  const postedAudit=await db.auditEvent.findFirst({where:{resource:'FinanceEntry',resourceId:entry.id,action:'FINANCE_ENTRY_POSTED',actorId:poster.p.id}});
  if(!approvedAudit||!postedAudit)throw new Error('Finance audit evidence missing');
  console.log('Finance live HTTP/DB E2E passed');
} finally {
  if(ids.entry){await db.auditEvent.deleteMany({where:{resource:'FinanceEntry',resourceId:ids.entry}});await db.financeApproval.deleteMany({where:{financeEntryId:ids.entry}});await db.financeEntry.deleteMany({where:{id:ids.entry}});}
  if(ids.fa)await db.financeAccount.deleteMany({where:{id:ids.fa}});
  if(ids.org)await db.organization.deleteMany({where:{id:ids.org}});
  for(const id of ids.accounts||[]){await db.roleAssignment.deleteMany({where:{accountId:id}});await db.account.deleteMany({where:{id}});}
  for(const id of ids.people||[])await db.person.deleteMany({where:{id}});
  await db.$disconnect();
}
