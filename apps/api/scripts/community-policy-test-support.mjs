import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export async function communityPolicyFixture({db,owner,creator,base,token,privateAudioEnabled=false,communityEnabled=true}){
  if(process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Community policy fixtures are isolated only.');
  const [tables]=await db.$queryRaw`SELECT to_regclass('public."CommunityPostLifecycle"')::text AS name`;
  if(!tables.name)execFileSync(process.execPath,[fileURLToPath(new URL('../../../node_modules/prisma/build/index.js',import.meta.url)),'db','execute','--url',process.env.DATABASE_URL,'--file',fileURLToPath(new URL('../prisma/migrations/20261127091000_yellow_community_content/migration.sql',import.meta.url))],{stdio:'inherit'});
  const keys=['PLATFORM_STAFFING_ORGANIZATION:v1','COMMUNITY_D16_POLICY:v1'],previous=await db.operationalSetting.findMany({where:{key:{in:keys}}});
  const org=await db.organization.create({data:{kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id,displayName:'Synthetic community D16 '+randomUUID()}});
  await db.operationalSetting.upsert({where:{key:keys[0]},create:{key:keys[0],value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});
  const payload={kind:'COMMUNITY_D16',enabled:communityEnabled,privateAudioEnabled,moderatorAccountId:owner.id,retentionDays:30,noticeAr:'هذه سياسة اصطناعية لاختبار تقني معزول فقط.',noticeEn:'This synthetic policy is for an isolated technical test only.'};
  const draftResponse=await fetch(base+'/community/admin/policy-drafts',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload)});
  if(draftResponse.status!==201)throw new Error('Native policy drafting failed '+draftResponse.status+' '+await draftResponse.text());
  const draft=await draftResponse.json(),created=await db.managedDocument.findUniqueOrThrow({where:{id:draft.documentId}}),template=await db.documentTemplate.findUniqueOrThrow({where:{id:created.templateId}});
  if(created.status!=='DRAFT'||created.createdByAccountId!==owner.id)throw new Error('Policy drafting must preserve native DRAFT ownership.');
  const submitted=await fetch(base+'/documents/'+created.id+'/submit',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:'{}'});
  if(submitted.status!==201)throw new Error('Native policy submission failed '+submitted.status+' '+await submitted.text());
  // The original independent-review suite owns reviewer assignment acceptance.
  // This isolated fixture records its synthetic independent approval only after
  // exercising real native authoring/submission; it does not claim human approval.
  const doc=await db.managedDocument.update({where:{id:created.id},data:{approvedByAccountId:creator.id,approvedAt:new Date(),status:'APPROVED'}}),contentHash=doc.contentHash;
  await db.documentLifecycleEvent.create({data:{documentId:doc.id,actorAccountId:creator.id,action:'APPROVED',toStatus:'APPROVED',fromStatus:'PENDING_APPROVAL',version:1}});
  const activation=await fetch(base+'/community/admin/policy',{method:'PUT',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({documentId:doc.id,expectedVersion:1,expectedHash:contentHash})});
  if(activation.status!==200)throw new Error('Synthetic D16 activation failed '+activation.status+' '+await activation.text());
  return {doc,org,template,payload,async cleanup(){
    for(const key of keys){const old=previous.find(row=>row.key===key);if(old)await db.operationalSetting.upsert({where:{key},create:{key,value:old.value},update:{value:old.value}});else await db.operationalSetting.deleteMany({where:{key}})}
    await db.documentLifecycleEvent.deleteMany({where:{documentId:doc.id}});await db.documentRevision.deleteMany({where:{documentId:doc.id}});await db.managedDocument.delete({where:{id:doc.id}});await db.documentTemplate.delete({where:{id:template.id}});await db.documentBrandSnapshot.deleteMany({where:{organizationId:org.id}});await db.documentReferenceCounter.deleteMany({where:{organizationId:org.id}});await db.organization.delete({where:{id:org.id}});
  }};
}
