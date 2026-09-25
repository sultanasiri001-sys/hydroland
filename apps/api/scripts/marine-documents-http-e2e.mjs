import {PrismaClient} from '@prisma/client';
import {createHmac} from 'node:crypto';

const db=new PrismaClient();
const base=process.env.MARINE_DOCS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const headers=t=>({authorization:`Bearer ${t}`,'content-type':'application/json'});
const expectOk=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const persons=[],accounts=[];let org=null,member=null,adminRole=null,assetId=null,docId=null;
try{
 for(const name of ['owner','other','admin']){const person=await db.person.create({data:{firstName:name,lastName:'MarineDocsE2E'}});persons.push(person);const account=await db.account.create({data:{personId:person.id,email:`marine-${name}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);}
 const [owner,other,admin]=accounts;org=await db.organization.create({data:{displayName:'Marine E2E Org',kind:'MARINE_OPERATOR',status:'ACTIVE',ownerId:owner.id}});member=await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'MARINE_DOCS_E2E'}}});
 const ownerToken=tokenFor(owner.id),otherToken=tokenFor(other.id),adminToken=tokenFor(admin.id);
 let response=await fetch(base+'/marine-operations/assets/mine');if(response.status!==401)throw new Error(`Anonymous assets/mine expected 401, got ${response.status}`);
 response=await fetch(base+'/marine-operations/assets',{method:'POST',headers:headers(ownerToken),body:JSON.stringify({organizationId:org.id,name:'E2E Dive Boat',assetType:'DIVE_BOAT',registrationNumber:'MAR-E2E-01',passengerCapacity:10})});const asset=await expectOk(response);assetId=asset.id;if(asset.organizationId!==org.id||asset.name!=='E2E Dive Boat')throw new Error('Marine asset creation mismatch');
 response=await fetch(base+`/marine-operations/assets/${assetId}/documents`,{method:'POST',headers:headers(otherToken),body:JSON.stringify({documentType:'REGISTRATION',referenceNumber:'NOPE'})});if(response.status!==403)throw new Error(`Non-member document create expected 403, got ${response.status}`);
 response=await fetch(base+`/marine-operations/assets/${assetId}/documents`,{method:'POST',headers:headers(ownerToken),body:JSON.stringify({documentType:'UNKNOWN',referenceNumber:'BAD'})});if(response.status!==400)throw new Error(`Unsupported document type expected 400, got ${response.status}`);
 response=await fetch(base+`/marine-operations/assets/${assetId}/documents`,{method:'POST',headers:headers(ownerToken),body:JSON.stringify({documentType:'REGISTRATION',referenceNumber:'REG-E2E-7788',expiresAt:'2027-09-25'})});const doc=await expectOk(response);docId=doc.id;if(doc.status!=='PENDING'||doc.referenceNumber!=='REG-E2E-7788')throw new Error('Marine document submission mismatch');
 response=await fetch(base+`/marine-operations/assets/${assetId}/documents/${docId}`,{method:'PATCH',headers:headers(otherToken),body:JSON.stringify({referenceNumber:'HACK'})});if(response.status!==403)throw new Error(`Non-member document edit expected 403, got ${response.status}`);
 response=await fetch(base+'/marine-operations/admin/documents/pending',{headers:headers(ownerToken)});if(response.status!==403)throw new Error(`Non-admin pending review expected 403, got ${response.status}`);
 const pending=await expectOk(await fetch(base+'/marine-operations/admin/documents/pending',{headers:headers(adminToken)}));if(!Array.isArray(pending)||!pending.some(x=>x.id===docId&&x.marineAsset?.id===assetId))throw new Error('Admin pending list missing marine document');
 const verified=await expectOk(await fetch(base+`/marine-operations/admin/documents/${docId}/decision`,{method:'POST',headers:headers(adminToken),body:JSON.stringify({outcome:'VERIFIED'})}));if(verified.status!=='VERIFIED'||!verified.verifiedAt)throw new Error('Marine document verification did not persist');
 response=await fetch(base+`/marine-operations/assets/${assetId}/documents/${docId}`,{method:'PATCH',headers:headers(ownerToken),body:JSON.stringify({referenceNumber:'EDIT-AFTER-VERIFY'})});if(response.status!==400)throw new Error(`Verified document edit expected 400, got ${response.status}`);
 const mine=await expectOk(await fetch(base+'/marine-operations/assets/mine',{headers:headers(ownerToken)}));const persisted=mine.find(x=>x.id===assetId)?.documents?.find(x=>x.id===docId);if(!persisted||persisted.status!=='VERIFIED'||persisted.referenceNumber!=='REG-E2E-7788')throw new Error('Verified marine document missing from owner asset view');
 const otherMine=await expectOk(await fetch(base+'/marine-operations/assets/mine',{headers:headers(otherToken)}));if(otherMine.length)throw new Error('Unrelated account can see marine assets');
 console.log('Marine documents HTTP/DB E2E passed: authenticated ownership scope, asset create, document validation, non-member isolation, admin review, verified immutability and persistence.');
}finally{
 if(docId)await db.marineAssetDocument.deleteMany({where:{id:docId}}).catch(()=>{});
 if(assetId){await db.marineReadinessSnapshot.deleteMany({where:{marineAssetId:assetId}}).catch(()=>{});await db.marineMaintenanceRecord.deleteMany({where:{marineAssetId:assetId}}).catch(()=>{});await db.marineAsset.deleteMany({where:{id:assetId}}).catch(()=>{});}
 if(member)await db.organizationMember.deleteMany({where:{id:member.id}}).catch(()=>{});if(org)await db.organization.deleteMany({where:{id:org.id}}).catch(()=>{});if(adminRole)await db.roleAssignment.deleteMany({where:{id:adminRole.id}}).catch(()=>{});
 for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.deleteMany({where:{id:account.id}}).catch(()=>{});}for(const person of persons)await db.person.deleteMany({where:{id:person.id}}).catch(()=>{});await db.$disconnect();
}
