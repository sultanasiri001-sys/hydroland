import {PrismaClient} from '@prisma/client';
import {createHmac} from 'node:crypto';

const db=new PrismaClient();
const base=process.env.MARINE_READINESS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
const headers=token=>({authorization:'Bearer '+token,'content-type':'application/json'});
const expectOk=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error('HTTP '+response.status+': '+JSON.stringify(body));return body};
const people=[],accounts=[],documents=[],maintenance=[],snapshots=[];let organization=null,membership=null,adminRole=null,asset=null;
try{
 for(const name of ['owner','other','admin']){const person=await db.person.create({data:{firstName:name,lastName:'MarineReadinessE2E'}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:'marine-readiness-'+name+'-'+suffix+'@example.invalid',passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);}
 const owner=accounts[0],other=accounts[1],admin=accounts[2];
 organization=await db.organization.create({data:{displayName:'Marine Readiness E2E',kind:'MARINE_OPERATOR',status:'ACTIVE',ownerId:owner.id}});
 membership=await db.organizationMember.create({data:{organizationId:organization.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'MARINE_READINESS_E2E'}}});
 const ownerToken=tokenFor(owner.id),otherToken=tokenFor(other.id),adminToken=tokenFor(admin.id);
 const created=await expectOk(await fetch(base+'/marine-operations/assets',{method:'POST',headers:headers(ownerToken),body:JSON.stringify({organizationId:organization.id,name:'E2E Readiness Boat',assetType:'DIVE_BOAT',registrationNumber:'MR-'+suffix,passengerCapacity:8})}));asset=created;
 let response=await fetch(base+'/marine-operations/assets/'+asset.id+'/maintenance',{method:'POST',headers:headers(otherToken),body:JSON.stringify({maintenanceType:'Unauthorized'})});if(response.status!==403)throw new Error('Non-member maintenance create expected 403, got '+response.status);
 const firstMaintenance=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/maintenance',{method:'POST',headers:headers(ownerToken),body:JSON.stringify({maintenanceType:'Engine service',dueAt:'2030-01-01',notes:'E2E maintenance'})));maintenance.push(firstMaintenance);
 response=await fetch(base+'/marine-operations/assets/'+asset.id+'/maintenance/'+firstMaintenance.id+'/complete',{method:'POST',headers:headers(otherToken),body:'{}'});if(response.status!==403)throw new Error('Non-member maintenance completion expected 403, got '+response.status);
 const completed=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/maintenance/'+firstMaintenance.id+'/complete',{method:'POST',headers:headers(ownerToken),body:'{}'}));if(completed.status!=='COMPLETED'||!completed.completedAt)throw new Error('Maintenance completion did not persist');
 const beforeDocuments=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/readiness',{method:'POST',headers:headers(ownerToken),body:'{}'}));if(beforeDocuments.status!=='NOT_READY'||!beforeDocuments.reasonCodes.includes('ASSET_NOT_ACTIVE')||!beforeDocuments.reasonCodes.includes('DOCUMENT_REGISTRATION_INVALID'))throw new Error('Initial readiness must fail closed for inactive asset and documents');
 response=await fetch(base+'/marine-operations/admin/assets/review',{headers:headers(ownerToken)});if(response.status!==403)throw new Error('Non-admin marine review expected 403, got '+response.status);
 const types=['REGISTRATION','NAVIGATION_LICENSE','SAFETY_CERTIFICATE'];
 for(const type of types){const doc=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/documents',{method:'POST',headers:headers(ownerToken),body:JSON.stringify({documentType:type,referenceNumber:type+'-'+suffix,expiresAt:'2030-01-01'})}));documents.push(doc);const verified=await expectOk(await fetch(base+'/marine-operations/admin/documents/'+doc.id+'/decision',{method:'POST',headers:headers(adminToken),body:JSON.stringify({outcome:'VERIFIED'})}));if(verified.status!=='VERIFIED')throw new Error('Marine document verification failed for '+type);}
 const review=await expectOk(await fetch(base+'/marine-operations/admin/assets/review',{headers:headers(adminToken)}));if(!Array.isArray(review)||!review.some(item=>item.id===asset.id))throw new Error('Admin marine asset review missing owned asset');
 const active=await expectOk(await fetch(base+'/marine-operations/admin/assets/'+asset.id+'/status',{method:'POST',headers:headers(adminToken),body:JSON.stringify({status:'ACTIVE'})}));if(active.status!=='ACTIVE')throw new Error('Admin activation did not persist');
 const afterActivation=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/readiness',{method:'POST',headers:headers(ownerToken),body:'{}'}));if(afterActivation.status!=='NEEDS_REVIEW'||afterActivation.reasonCodes.length!==1||afterActivation.reasonCodes[0]!=='CALENDAR_RESOURCE_NOT_LINKED')throw new Error('Activated asset must expose unlinked calendar as review-only');
 const overdue=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/maintenance',{method:'POST',headers:headers(ownerToken),body:JSON.stringify({maintenanceType:'Overdue safety inspection',dueAt:'2020-01-01'})}));maintenance.push(overdue);
 const blocked=await expectOk(await fetch(base+'/marine-operations/assets/'+asset.id+'/readiness',{method:'POST',headers:headers(ownerToken),body:'{}'}));if(blocked.status!=='NOT_READY'||!blocked.reasonCodes.includes('MAINTENANCE_BLOCKING'))throw new Error('Overdue maintenance must block marine readiness');
 const mine=await expectOk(await fetch(base+'/marine-operations/assets/mine',{headers:headers(ownerToken)}));const persisted=mine.find(item=>item.id===asset.id);if(!persisted||persisted.maintenance.length<2||persisted.readiness.length!==1)throw new Error('Owner marine runtime view did not persist maintenance and readiness');
 console.log('Marine readiness HTTP/DB E2E passed: membership protection, maintenance lifecycle, fail-closed readiness, admin activation and blocking maintenance.');
}finally{
 if(asset){const records=await db.marineReadinessSnapshot.findMany({where:{marineAssetId:asset.id},select:{id:true}}).catch(()=>[]);snapshots.push(...records);await db.marineReadinessSnapshot.deleteMany({where:{marineAssetId:asset.id}}).catch(()=>{});await db.marineMaintenanceRecord.deleteMany({where:{marineAssetId:asset.id}}).catch(()=>{});await db.marineAssetDocument.deleteMany({where:{marineAssetId:asset.id}}).catch(()=>{});await db.marineAsset.deleteMany({where:{id:asset.id}}).catch(()=>{});}
 if(membership)await db.organizationMember.deleteMany({where:{id:membership.id}}).catch(()=>{});if(organization)await db.organization.deleteMany({where:{id:organization.id}}).catch(()=>{});if(adminRole)await db.roleAssignment.deleteMany({where:{id:adminRole.id}}).catch(()=>{});
 for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.deleteMany({where:{id:account.id}}).catch(()=>{});}for(const person of people)await db.person.deleteMany({where:{id:person.id}}).catch(()=>{});await db.$disconnect();
}