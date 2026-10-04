import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import assert from 'node:assert/strict';

const db=new PrismaClient();
const base=process.env.CREDENTIAL_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for(const url of [process.env.DATABASE_URL||'postgresql://missing',base])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname),'Credential HTTP E2E requires a local test database and API');
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString(),objects=new Map();let sawSigV4=false;
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=t=>({authorization:`Bearer ${t}`});
const json=async r=>{const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(`HTTP ${r.status}: ${JSON.stringify(b)}`);return b};
const storage=http.createServer((req,res)=>{const key=req.url?.split('?')[0]||'/';if(req.method==='PUT'){sawSigV4=String(req.headers.authorization||'').startsWith('AWS4-HMAC-SHA256 ');const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{objects.set(key,Buffer.concat(chunks));res.statusCode=200;res.end()});return}if(req.method==='HEAD'){res.statusCode=objects.has(key)?200:404;res.end();return}if(req.method==='GET'){const bytes=objects.get(key);if(!bytes){res.statusCode=404;res.end();return}res.statusCode=200;res.setHeader('content-type','application/octet-stream');res.end(bytes);return}if(req.method==='DELETE'){objects.delete(key);res.statusCode=204;res.end();return}res.statusCode=405;res.end()});
await new Promise((resolve,reject)=>{storage.once('error',reject);storage.listen(3199,'127.0.0.1',resolve)});
let ownerPerson,ownerAccount,reviewerPerson,reviewerAccount,outsiderPerson,outsiderAccount,credentialId,documentId,marineOrganization,marineMember,marineAssetId,marineDocumentId;
try{
  ownerPerson=await db.person.create({data:{firstName:'Credential',lastName:'Owner'}});
  ownerAccount=await db.account.create({data:{personId:ownerPerson.id,email:`credential-owner-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
  reviewerPerson=await db.person.create({data:{firstName:'Credential',lastName:'Reviewer'}});
  reviewerAccount=await db.account.create({data:{personId:reviewerPerson.id,email:`credential-reviewer-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
  outsiderPerson=await db.person.create({data:{firstName:'Credential',lastName:'Outsider'}});
  outsiderAccount=await db.account.create({data:{personId:outsiderPerson.id,email:`credential-outsider-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
  await db.roleAssignment.create({data:{accountId:reviewerAccount.id,role:'REVIEWER',status:'ACTIVE',activeAt:new Date()}});
  const ownerToken=tokenFor(ownerAccount.id),reviewerToken=tokenFor(reviewerAccount.id),outsiderToken=tokenFor(outsiderAccount.id);
  marineOrganization=await db.organization.create({data:{displayName:'Marine private docs E2E',kind:'MARINE_OPERATOR',status:'ACTIVE',ownerId:ownerAccount.id}});
  marineMember=await db.organizationMember.create({data:{organizationId:marineOrganization.id,accountId:ownerAccount.id,role:'OWNER',status:'ACTIVE'}});

  let r=await fetch(base+'/credentials',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({issuer:'HYDROLAND E2E',title:'Credential document test'})});if(r.status!==401)throw new Error('Anonymous credential create expected 401, got '+r.status);
  r=await fetch(base+'/credentials',{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({issuer:'HYDROLAND E2E',title:'Credential document test'})});let body=await json(r);credentialId=body.id;if(!credentialId)throw new Error('Credential id missing');

  const fakePng=Buffer.from('not-a-real-png').toString('base64');
  r=await fetch(`${base}/credentials/${credentialId}/documents`,{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({originalName:'spoof.png',mimeType:'image/png',base64:fakePng})});if(r.status!==400)throw new Error('Spoofed PNG expected 400, got '+r.status);

  r=await fetch(`${base}/credentials/${credentialId}/submit`,{method:'POST',headers:auth(ownerToken)});if(r.status!==409)throw new Error('Submit without document expected 409, got '+r.status);

  const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from('hydroland-e2e')]);
  r=await fetch(`${base}/credentials/${credentialId}/documents`,{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({originalName:'certificate.png',mimeType:'image/png',base64:png.toString('base64')})});body=await json(r);documentId=body.id;if(!documentId)throw new Error('Document id missing');if('storageKey'in body)throw new Error('Upload response leaked storageKey');if(body.byteSize!==png.length)throw new Error('Server byteSize mismatch');if(!sawSigV4)throw new Error('Object upload was not SigV4 signed');

  r=await fetch(base+'/credentials',{headers:auth(ownerToken)});body=await json(r);const mine=body.find(c=>c.id===credentialId);if(!mine)throw new Error('Credential missing from owner list');const listed=mine.documents?.find(d=>d.id===documentId);if(!listed)throw new Error('Document missing from credential list');if('storageKey'in listed)throw new Error('Credential list leaked storageKey');

  r=await fetch(`${base}/credentials/${credentialId}/documents/${documentId}/access`,{headers:auth(outsiderToken)});if(r.status!==404)throw new Error('Cross-account owner access expected 404, got '+r.status);
  r=await fetch(`${base}/credentials/${credentialId}/documents/${documentId}/access`,{headers:auth(ownerToken)});body=await json(r);if(!body.url||!body.url.includes('X-Amz-Signature=')||!body.expiresAt)throw new Error('Signed owner document access missing');const downloaded=Buffer.from(await (await fetch(body.url)).arrayBuffer());if(!downloaded.equals(png))throw new Error('Signed owner URL did not return original bytes');

  r=await fetch(`${base}/credentials/${credentialId}/submit`,{method:'POST',headers:auth(ownerToken)});body=await json(r);if(body.status!=='PENDING')throw new Error('Credential did not enter PENDING review');
  r=await fetch(base+'/credentials/admin/pending',{headers:auth(reviewerToken)});body=await json(r);let pending=body.find(c=>c.id===credentialId);if(!pending)throw new Error('Pending credential missing for reviewer');if(pending.documents?.some(d=>'storageKey'in d))throw new Error('Reviewer pending list leaked storageKey');if(pending.externalVerificationEvidenceRecordedAt!==null)throw new Error('Fresh pending credential unexpectedly has external verification evidence');
  r=await fetch(`${base}/credentials/admin/${credentialId}/documents/${documentId}/access`,{headers:auth(outsiderToken)});if(r.status!==403)throw new Error('Non-reviewer admin document access expected 403, got '+r.status);
  r=await fetch(`${base}/credentials/admin/${credentialId}/documents/${documentId}/access`,{headers:auth(reviewerToken)});body=await json(r);if(!body.url?.includes('X-Amz-Signature='))throw new Error('Reviewer signed document access missing');

  r=await fetch(`${base}/credentials/admin/${credentialId}/decision`,{method:'POST',headers:{...auth(reviewerToken),'content-type':'application/json'},body:JSON.stringify({outcome:'VERIFIED'})});if(r.status!==400)throw new Error('Credential approval without official verification evidence expected 400, got '+r.status);

  r=await fetch(`${base}/credentials/admin/${credentialId}/external-verification-evidence`,{method:'POST',headers:{...auth(reviewerToken),'content-type':'application/json'},body:JSON.stringify({source:'SWSDF',method:'PRO_LICENSE_VALIDATION',reference:`SWSDF-E2E-${suffix}`,verificationUrl:'https://swsdf.sa/diving/license-validation'})});body=await json(r);if(body.credentialId!==credentialId||body.evidence?.source!=='SWSDF'||body.evidence?.method!=='PRO_LICENSE_VALIDATION'||body.decisionRequired!==true)throw new Error('Official verification evidence was not recorded correctly');

  r=await fetch(base+'/credentials/admin/pending',{headers:auth(reviewerToken)});body=await json(r);pending=body.find(c=>c.id===credentialId);if(!pending?.externalVerificationEvidenceRecordedAt)throw new Error('Pending review did not restore recorded verification evidence state');

  r=await fetch(`${base}/credentials/admin/${credentialId}/decision`,{method:'POST',headers:{...auth(reviewerToken),'content-type':'application/json'},body:JSON.stringify({outcome:'VERIFIED'})});body=await json(r);if(body.verificationStatus!=='VERIFIED')throw new Error('Reviewer did not verify credential after recording official evidence');

  const persisted=await db.document.findUnique({where:{id:documentId}});if(!persisted||persisted.byteSize!==png.length||!persisted.sha256||!persisted.storageKey.startsWith(`credentials/${ownerAccount.id}/${credentialId}/`))throw new Error('Document metadata was not persisted from server-computed upload');
  // Marine asset documents use the same private object-store contract with a distinct namespace.
  r=await fetch(base+'/marine-operations/assets',{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({organizationId:marineOrganization.id,name:'E2E private marine asset',assetType:'DIVE_BOAT',registrationNumber:`MARINE-${suffix}`})});body=await json(r);marineAssetId=body.id;if(!marineAssetId)throw new Error('Marine asset id missing');
  const marinePng=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from('marine-private-e2e')]);
  r=await fetch(`${base}/marine-operations/assets/${marineAssetId}/documents`,{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({documentType:'OPERATING_LICENSE',originalName:'spoof.png',mimeType:'image/png',base64:Buffer.from('not-png').toString('base64')})});if(r.status!==400)throw new Error('Spoofed marine PNG expected 400, got '+r.status);
  r=await fetch(`${base}/marine-operations/assets/${marineAssetId}/documents`,{method:'POST',headers:{...auth(ownerToken),'content-type':'application/json'},body:JSON.stringify({documentType:'OPERATING_LICENSE',referenceNumber:'OP-E2E',expiresAt:'2027-12-31',originalName:'operating-license.png',mimeType:'image/png',base64:marinePng.toString('base64')})});body=await json(r);marineDocumentId=body.id;if(!marineDocumentId||body.hasFile!==true||'storageKey'in body)throw new Error('Marine evidence response mismatch or leaked private storage key');
  if(!sawSigV4)throw new Error('Marine object upload was not SigV4 signed');
  const storedMarineDoc=await db.marineAssetDocument.findUnique({where:{id:marineDocumentId}});if(!storedMarineDoc||storedMarineDoc.byteSize!==marinePng.length||!storedMarineDoc.sha256||!storedMarineDoc.storageKey.startsWith(`marine-assets/${ownerAccount.id}/${marineAssetId}/`))throw new Error('Marine document private metadata or namespace mismatch');
  const marineList=await json(await fetch(base+'/marine-operations/assets/mine',{headers:auth(ownerToken)}));const listedMarineDoc=marineList.find(x=>x.id===marineAssetId)?.documents?.find(x=>x.id===marineDocumentId);if(!listedMarineDoc?.hasFile||'storageKey'in listedMarineDoc)throw new Error('Marine asset list leaked storage key or missed attachment metadata');
  r=await fetch(`${base}/marine-operations/assets/${marineAssetId}/documents/${marineDocumentId}/access`,{headers:auth(outsiderToken)});if(r.status!==403)throw new Error('Non-member marine file access expected 403, got '+r.status);
  r=await fetch(`${base}/marine-operations/assets/${marineAssetId}/documents/${marineDocumentId}/access`,{headers:auth(ownerToken)});body=await json(r);if(!body.url?.includes('X-Amz-Signature='))throw new Error('Marine owner signed access missing');const marineDownloaded=Buffer.from(await(await fetch(body.url)).arrayBuffer());if(!marineDownloaded.equals(marinePng))throw new Error('Marine signed owner URL did not return original bytes');
  await db.roleAssignment.create({data:{accountId:reviewerAccount.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date()}});
  r=await fetch(`${base}/marine-operations/admin/documents/${marineDocumentId}/access`,{headers:auth(reviewerToken)});body=await json(r);if(!body.url?.includes('X-Amz-Signature='))throw new Error('Marine reviewer signed access missing');
  r=await fetch(`${base}/marine-operations/admin/documents/${marineDocumentId}/access`,{headers:auth(outsiderToken)});if(r.status!==403)throw new Error('Non-admin marine review access expected 403, got '+r.status);
  const readinessPath=base+'/health/integrations/credential-storage';
  r=await fetch(readinessPath);assert.equal(r.status,401,'Storage diagnostics require authentication');
  r=await fetch(readinessPath,{headers:auth(ownerToken)});assert.equal(r.status,403,'Storage diagnostics require admin scope');
  r=await fetch(readinessPath,{headers:auth(reviewerToken)});assert.equal(r.status,403,'Review permission does not grant storage diagnostics');
  await db.roleAssignment.create({data:{accountId:reviewerAccount.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date()}});
  r=await fetch(readinessPath,{headers:auth(reviewerToken)});body=await json(r);
  assert.equal(body.sandboxReady,true,'Readiness must match the working local upload');assert.equal(body.productionReady,false);
  assert.equal(body.provider,'S3_COMPATIBLE');assert.equal(body.checks.endpointValid,true);
  for(const value of Object.values(body.checks))assert.equal(typeof value,'boolean');
  for(const key of ['HYDROLAND_OBJECT_STORAGE_ENDPOINT','HYDROLAND_OBJECT_STORAGE_BUCKET','HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID','HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY']){
    const value=process.env[key];if(value)assert(!JSON.stringify(body).includes(value),'Storage diagnostics leaked configuration');
  }
  await db.roleAssignment.update({where:{accountId_role:{accountId:reviewerAccount.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
  r=await fetch(readinessPath,{headers:auth(reviewerToken)});assert.equal(r.status,403,'Revoked admin scope immediately blocks diagnostics');
  console.log('Credential storage readiness HTTP E2E passed: guest/user/reviewer denial, admin access, runtime parity, sanitized checks and revoked-admin denial.');
  console.log('Credential Documents HTTP/DB E2E passed: auth, spoof rejection, real private upload, server metadata, storageKey redaction, owner/reviewer signed access, cross-account denial, evidence-gated approval, audit-backed evidence restoration and review.');
} finally {
  if(marineAssetId){await db.marineAssetDocument.deleteMany({where:{marineAssetId}}).catch(()=>{});await db.marineMaintenanceRecord.deleteMany({where:{marineAssetId}}).catch(()=>{});await db.marineAsset.deleteMany({where:{id:marineAssetId}}).catch(()=>{});}
  if(marineOrganization){await db.organizationMember.deleteMany({where:{organizationId:marineOrganization.id}}).catch(()=>{});await db.organization.delete({where:{id:marineOrganization.id}}).catch(()=>{});}
  if(credentialId){await db.document.deleteMany({where:{credentialId}}).catch(()=>{});await db.credential.deleteMany({where:{id:credentialId}}).catch(()=>{});}
  for(const account of [ownerAccount,reviewerAccount,outsiderAccount].filter(Boolean)){await db.notification.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});}
  const resourceIds=[credentialId,documentId,marineDocumentId].filter(Boolean);if(resourceIds.length)await db.auditEvent.deleteMany({where:{resourceId:{in:resourceIds}}}).catch(()=>{});
  for(const account of [ownerAccount,reviewerAccount,outsiderAccount].filter(Boolean))await db.account.delete({where:{id:account.id}}).catch(()=>{});
  for(const person of [ownerPerson,reviewerPerson,outsiderPerson].filter(Boolean))await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();await new Promise(resolve=>storage.close(resolve));
}
