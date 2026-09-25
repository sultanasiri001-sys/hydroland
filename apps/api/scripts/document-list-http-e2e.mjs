import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.DOCUMENT_LIST_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const auth=t=>({authorization:`Bearer ${t}`});
const people=[],accounts=[];let org,other,template,document;
const mk=async label=>{const p=await db.person.create({data:{firstName:'DocumentList',lastName:label}});people.push(p);const a=await db.account.create({data:{personId:p.id,email:`doc-list-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(a);return a};
try{
  const owner=await mk('Owner'),viewer=await mk('Viewer'),outsider=await mk('Outsider');
  org=await db.organization.create({data:{displayName:'Document List E2E '+suffix,kind:'DIVE_CENTER',ownerId:owner.id,status:'ACTIVE'}});
  other=await db.organization.create({data:{displayName:'Other Document List E2E '+suffix,kind:'DIVE_CENTER',ownerId:outsider.id,status:'ACTIVE'}});
  await db.organizationMember.createMany({data:[{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'},{organizationId:org.id,accountId:viewer.id,role:'VIEWER',status:'ACTIVE'},{organizationId:other.id,accountId:outsider.id,role:'OWNER',status:'ACTIVE'}]});
  template=await db.documentTemplate.create({data:{organizationId:org.id,code:'LIST-'+suffix,titleAr:'نموذج قائمة',titleEn:'List Template',department:'OPERATIONS',fields:[{key:'summary',labelAr:'الملخص',labelEn:'Summary',type:'TEXT',required:true}]}});
  document=await db.managedDocument.create({data:{organizationId:org.id,templateId:template.id,referenceNumber:'HYD-OPERATIONS-2026-999999',department:'OPERATIONS',contentHash:'sha256:list-'+suffix,payload:{summary:'list-e2e'},createdByAccountId:owner.id}});

  let r=await fetch(`${base}/documents/organizations/${org.id}/list`);if(r.status!==401)throw new Error('Anonymous document list expected 401, got '+r.status);
  r=await fetch(`${base}/documents/organizations/${org.id}/list`,{headers:auth(tokenFor(viewer.id))});if(!r.ok)throw new Error('VIEWER document list failed '+r.status+' '+await r.text());const rows=await r.json();
  if(rows.length!==1||rows[0].id!==document.id||rows[0].template?.id!==template.id||rows[0].payload?.summary!=='list-e2e')throw new Error('Organization document list payload mismatch');
  r=await fetch(`${base}/documents/organizations/${org.id}/list`,{headers:auth(tokenFor(outsider.id))});if(r.status!==403)throw new Error('Cross-organization document list expected 403, got '+r.status);
  console.log('Organization Document List HTTP/DB E2E passed: auth guard, viewer read, template payload, cross-organization denial.');
} finally {
  if(document)await db.managedDocument.delete({where:{id:document.id}}).catch(()=>{});
  if(template)await db.documentTemplate.delete({where:{id:template.id}}).catch(()=>{});
  for(const organization of [org,other].filter(Boolean)){await db.organizationMember.deleteMany({where:{organizationId:organization.id}}).catch(()=>{});await db.organization.delete({where:{id:organization.id}}).catch(()=>{})}
  for(const account of accounts.reverse()){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{})}
  for(const person of people.reverse())await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
