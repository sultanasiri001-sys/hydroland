import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.CREDENTIAL_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=t=>({authorization:`Bearer ${t}`});
let owner,outsider,people=[],credentialId,documentId,metadataCredentialId;
try{
  const mk=async(label)=>{const p=await db.person.create({data:{firstName:'Credential',lastName:label}});people.push(p);return db.account.create({data:{personId:p.id,email:`credential-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}})};
  owner=await mk('Owner'); outsider=await mk('Outsider');
  const ownerToken=tokenFor(owner.id),outsiderToken=tokenFor(outsider.id);

  let r=await fetch(base+'/credentials',{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({issuer:'E2E Issuer',title:'E2E Credential'})});
  if(!r.ok)throw new Error('Credential create failed '+r.status+' '+await r.text());
  credentialId=(await r.json()).id;

  const fake=new FormData(); fake.append('file',new Blob([Buffer.from('not-a-real-pdf')],{type:'application/pdf'}),'fake.pdf');
  r=await fetch(base+`/credentials/${credentialId}/documents/upload`,{method:'POST',headers:auth(ownerToken),body:fake});
  if(r.status!==400)throw new Error('MIME-spoofed PDF expected 400, got '+r.status);

  const pdf=Buffer.from('%PDF-1.4\n% HYDROLAND credential E2E\n%%EOF\n');
  const form=new FormData(); form.append('file',new Blob([pdf],{type:'application/pdf'}),'credential.pdf');
  r=await fetch(base+`/credentials/${credentialId}/documents/upload`,{method:'POST',headers:auth(ownerToken),body:form});
  if(!r.ok)throw new Error('Credential upload failed '+r.status+' '+await r.text());
  const uploaded=await r.json(); documentId=uploaded.id;
  const persisted=await db.document.findUniqueOrThrow({where:{id:documentId},select:{credentialId:true,ownerId:true,content:true,sha256:true,status:true}});
  if(persisted.credentialId!==credentialId||persisted.ownerId!==owner.personId||!persisted.content||persisted.status!=='UPLOADED')throw new Error('Uploaded credential document was not durably persisted');

  r=await fetch(base+`/credentials/documents/${documentId}/content`,{headers:auth(outsiderToken)});
  if(r.status!==404)throw new Error('Cross-user document read expected 404, got '+r.status);
  r=await fetch(base+`/credentials/documents/${documentId}/content`,{headers:auth(ownerToken)});
  if(!r.ok)throw new Error('Owner document read failed '+r.status+' '+await r.text());
  const returned=Buffer.from(await r.arrayBuffer());
  if(!returned.equals(pdf))throw new Error('Retrieved credential bytes differ from uploaded bytes');

  r=await fetch(base+`/credentials/${credentialId}/submit`,{method:'POST',headers:auth(ownerToken)});
  if(!r.ok)throw new Error('Credential submit failed '+r.status+' '+await r.text());
  const submitted=await db.credential.findUniqueOrThrow({where:{id:credentialId},select:{verificationStatus:true}});
  if(submitted.verificationStatus!=='PENDING')throw new Error('Credential was not moved to PENDING after real upload');

  r=await fetch(base+'/credentials',{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({issuer:'Metadata Issuer',title:'Metadata Only'})});
  if(!r.ok)throw new Error('Metadata credential create failed '+r.status+' '+await r.text());
  metadataCredentialId=(await r.json()).id;
  r=await fetch(base+`/credentials/${metadataCredentialId}/documents`,{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({storageKey:`legacy/${suffix}`,originalName:'legacy.pdf',mimeType:'application/pdf',byteSize:10,sha256:'a'.repeat(64)})});
  if(!r.ok)throw new Error('Legacy metadata attach setup failed '+r.status+' '+await r.text());
  r=await fetch(base+`/credentials/${metadataCredentialId}/submit`,{method:'POST',headers:auth(ownerToken)});
  if(r.status!==409)throw new Error('Metadata-only submit expected 409, got '+r.status);

  console.log('Credential document HTTP/DB E2E passed: spoof rejection, durable upload, owner retrieval, cross-user denial, submit, metadata bypass denial.');
} finally {
  for(const id of [credentialId,metadataCredentialId].filter(Boolean)){
    await db.auditEvent.deleteMany({where:{resource:'Credential',resourceId:id}});
    await db.document.deleteMany({where:{credentialId:id}});
    await db.credential.delete({where:{id}}).catch(()=>{});
  }
  for(const a of [outsider,owner].filter(Boolean)){await db.session.deleteMany({where:{accountId:a.id}});await db.account.delete({where:{id:a.id}}).catch(()=>{});}
  for(const p of people.reverse())await db.person.delete({where:{id:p.id}}).catch(()=>{});
  await db.$disconnect();
}
