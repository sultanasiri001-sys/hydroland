import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {reviewSource}=require('../dist/document-forms/internal-document-review.domain');
const {digest}=require('../dist/integrations/provider-read-policy');
export function isolatedProviderFixture(){
  const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
  const name=decodeURIComponent(url.pathname.slice(1)),named=/^(white_d03_|hydroland_d03_)/.test(name),github=process.env.GITHUB_ACTIONS==='true'&&name==='hydroland'&&['5432','5433'].includes(url.port);
  if(process.env.NODE_ENV!=='test'||process.env.CI!=='true'||process.env.D03_DB_TEST_CONFIRM!=='DISPOSABLE_LOOPBACK_ONLY'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!named&&!github)throw new Error('D03 fixtures require CI, NODE_ENV=test, explicit disposable confirmation and a named isolated loopback database.');
}
export async function providerFixturePlatform(db){
  isolatedProviderFixture();
  const account=label=>db.account.create({data:{email:`d03-${label}-${randomUUID()}@example.invalid`,passwordHash:'isolated-no-login',status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'Synthetic',lastName:label}},roleAssignments:{create:{role:'ADMIN',status:'ACTIVE',scope:{}}}}});
  const owner=await account('owner'),creator=await account('creator');
  const org=await db.organization.create({data:{kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id,displayName:'D03 isolated synthetic source fixture'}});
  await db.operationalSetting.upsert({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'},create:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});
  await db.documentBrandSnapshot.create({data:{organizationId:org.id,brandVersion:1,brandNameAr:'اختبار اصطناعي معزول',brandNameEn:'Isolated synthetic test'}});
  const fields=[{key:'purpose',labelAr:'غرض المصدر',labelEn:'Source purpose',type:'SELECT',required:true,options:['D03_PROVIDER_ENTITLEMENT']},{key:'policy',labelAr:'نطاق المصدر وحدوده',labelEn:'Source scope and limits',type:'TEXTAREA',required:true}];
  const template=await db.documentTemplate.create({data:{organizationId:org.id,code:'TECH-PROVIDER-ENTITLEMENT',titleAr:'أدلة مصدر اصطناعية',titleEn:'Synthetic source evidence',department:'TECHNOLOGY_SECURITY',fields}});
  return {owner,creator,org,template};
}
export async function providerFixture(db,platform,key,overrides={}){
  isolatedProviderFixture();
  const docId=randomUUID(),attachmentId=randomUUID(),bytes=Buffer.from('%PDF-1.4\nSynthetic isolated D03 evidence; no provider license, owner approval or real acceptance.\n%%EOF');
  const sha=createHash('sha256').update(bytes).digest('hex');
  const policy={kind:'D03_PROVIDER_ENTITLEMENT',version:1,integration:key,provider:key==='WEATHER_MARINE'?'STORMGLASS':key==='DISTRESS_AIS'?'MARINETRAFFIC_AIS_ONLY':'E2E_MAPS',mode:'SANDBOX',enabled:true,validFrom:new Date(Date.now()-3600000).toISOString(),validUntil:new Date(Date.now()+86400000).toISOString(),attribution:'Isolated technical fixture; no real provider acceptance',termsUrl:'https://example.invalid/synthetic-terms',entitlementReference:'SYNTHETIC-NOT-A-LICENSE',attachmentId,attachmentSha256:sha,source:key==='WEATHER_MARINE'?'sg':key==='DISTRESS_AIS'?'AIS':'MAP_STYLE',maxDataAgeSeconds:3600,allowedAisDataSources:key==='DISTRESS_AIS'?['TER','SAT']:[],maxRequestsPerMinute:key==='MAPS_GEO'?0:100,maxRequestsPerDay:key==='MAPS_GEO'?0:1000,costMode:'NO_CHARGE',currency:'SAR',maxCostMicrosPerRequest:0,maxCostMicrosPerDay:0,allowedOrigins:[key==='WEATHER_MARINE'?'https://api.stormglass.io':key==='DISTRESS_AIS'?'https://services.marinetraffic.com':'https://maps.hydroland.test'],maxResourcesPerView:100,...overrides};
  const payload={purpose:'D03_PROVIDER_ENTITLEMENT',policy:JSON.stringify(policy)},contentHash='sha256:'+digest(payload);
  const doc=await db.managedDocument.create({data:{id:docId,organizationId:platform.org.id,templateId:platform.template.id,referenceNumber:'D03-TEST-'+randomUUID(),department:'TECHNOLOGY_SECURITY',version:1,documentBrandVersion:1,status:'PENDING_APPROVAL',contentHash,payload,createdByAccountId:platform.creator.id}});
  await db.documentRevision.create({data:{documentId:doc.id,version:1,contentHash,payload,createdByAccountId:platform.creator.id}});
  await db.managedDocumentAttachment.create({data:{id:attachmentId,documentId:doc.id,organizationId:platform.org.id,uploadedByAccountId:platform.creator.id,filename:'synthetic-entitlement.pdf',mimeType:'application/pdf',byteSize:bytes.length,sha256:sha,content:bytes}});
  // Native rows below are test setup, never evidence of a human decision.
  await db.managedDocument.update({where:{id:doc.id},data:{status:'APPROVED',approvedAt:new Date(),approvedByAccountId:platform.owner.id}});
  await db.documentLifecycleEvent.create({data:{documentId:doc.id,actorAccountId:platform.owner.id,action:'APPROVED',fromStatus:'PENDING_APPROVAL',toStatus:'APPROVED',version:1}});
  const source=await reviewSource(db,platform.org.id,doc.id),pin={documentId:doc.id,version:1,contentHash,sourceHash:source.sourceHash};
  const env={[`HYDROLAND_D03_${key}_DOCUMENT`]:JSON.stringify(pin),[`HYDROLAND_INTEGRATION_${key}_STATUS`]:'SANDBOX',...(key==='MAPS_GEO'?{HYDROLAND_MAP_PROVIDER:'E2E_MAPS',HYDROLAND_MAP_STYLE_URL:'https://maps.hydroland.test/style.json'}:{}),...(key==='DISTRESS_AIS'?{HYDROLAND_DISTRESS_AIS_PROVIDER:'MARINETRAFFIC_AIS_ONLY'}:{})};
  Object.assign(process.env,env);
  return {doc,policy,pin,env};
}
