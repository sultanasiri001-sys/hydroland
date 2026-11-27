import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { DocumentPersistenceService } from '../document-forms/document-persistence.service';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { reviewSource } from '../document-forms/internal-document-review.domain';
import { DatabaseService } from '../database/database.service';
import { PLATFORM_STAFFING_KEY, platformOrganization, record } from '../hr/staffing-catalog';

export const COMMUNITY_POLICY_KEY='COMMUNITY_D16_POLICY:v1';
const privateAudioTerms={key:'privateAudioTerms',labelAr:'شروط الصوت الخاص القائمة',labelEn:'Existing private audio terms',type:'STATEMENT',required:false,contentAr:'يتبع الصوت الخاص سياسة الرسائل الخاصة القائمة: يُحجب عن المشاركين عند الحذف، ويحتفظ به 30 يومًا بعد الحذف، ويستمر حفظ الدليل المحجوز حتى الإفراج المصرح به. حدود الصوت: دقيقتان و4 ميبيبايت للملف و32 ميبيبايت مخزنة لكل مرسل. مدة منشورات المجتمع لا تغير هذه القواعد.',contentEn:'Private audio follows the existing private-message policy: withdrawal hides it from participants; retention is 30 days after withdrawal, with held evidence retained until authorized release. Limits: two minutes, 4 MiB per file and 32 MiB stored per sender. Community post retention does not change these rules.'};
@Injectable()
export class CommunityPolicyService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly documents:DocumentPersistenceService){}
  private async approved(tx:Prisma.TransactionClient){
    const setting=await tx.operationalSetting.findUnique({where:{key:COMMUNITY_POLICY_KEY}}),pin=record(setting?.value);
    if(typeof pin.documentId!=='string')return null;
    const doc=await tx.managedDocument.findUnique({where:{id:pin.documentId}}),platform=await platformOrganization(tx);
    if(!doc||!platform||doc.organizationId!==platform.id||!['APPROVED','SIGNED'].includes(doc.status)||!doc.approvedAt||!doc.approvedByAccountId||doc.version!==pin.version||doc.contentHash!==pin.contentHash)return null;
    try{const source=await reviewSource(tx,platform.id,doc.id);if(source.d.template.status!=='ACTIVE'||source.sourceHash!==pin.sourceHash||platform.ownerId!==pin.ownerId)return null;await requireVerifiedAdmin(tx,platform.ownerId);}catch{return null;}
    const policy=record(doc.payload),template=await tx.documentTemplate.findUniqueOrThrow({where:{id:doc.templateId}});
    try{validateDocumentPayload(template.fields,policy);}catch{return null;}
    if([true,'true'].includes(policy.privateAudioEnabled as never)){
      const fields=template.fields as Array<Record<string,unknown>>,terms=fields.find(field=>field.key==='privateAudioTerms'),choice=fields.find(field=>field.key==='privateAudioEnabled');
      if(template.code!=='HYD-CONTENT-D16'||choice?.type!=='BOOLEAN'||choice.required!==true||!terms||terms.type!=='STATEMENT'||terms.contentAr!==privateAudioTerms.contentAr||terms.contentEn!==privateAudioTerms.contentEn)return null;
    }
    if(policy.kind!=='COMMUNITY_D16'||![true,false,'true','false'].includes(policy.enabled as never)||typeof policy.moderatorAccountId!=='string'||!Number.isInteger(Number(policy.retentionDays))||Number(policy.retentionDays)<1||Number(policy.retentionDays)>3650||typeof policy.noticeAr!=='string'||policy.noticeAr.length<10||typeof policy.noticeEn!=='string'||policy.noticeEn.length<10)return null;
    const moderator=await tx.account.findFirst({where:{id:policy.moderatorAccountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}});
    if(!moderator)return null;
    return {documentId:doc.id,templateId:doc.templateId,organizationId:platform.id,version:doc.version,contentHash:doc.contentHash,moderatorAccountId:moderator.id,ownerId:platform.ownerId,retentionDays:Number(policy.retentionDays),noticeAr:policy.noticeAr,noticeEn:policy.noticeEn,communityEnabled:[true,'true'].includes(policy.enabled as never),privateAudioEnabled:[true,'true'].includes(policy.privateAudioEnabled as never)};
  }
  async active(tx:Prisma.TransactionClient){const policy=await this.approved(tx);return policy?.communityEnabled?policy:null;}
  async audioCurrent(){const policy=await this.approved(this.db);return policy?.privateAudioEnabled?{active:true,documentId:policy.documentId,version:policy.version,noticeAr:policy.noticeAr,noticeEn:policy.noticeEn}:{active:false,reason:'D16_AUDIO_POLICY_REQUIRED'};}
  async requirePrivateAudio(tx:Prisma.TransactionClient,accountId:string){
    const candidate=await this.approved(tx);if(!candidate?.privateAudioEnabled)throw new ConflictException('D16_AUDIO_POLICY_REQUIRED');
    await lockAccountIdentities(tx,[accountId,candidate.ownerId,candidate.moderatorAccountId]);
    await tx.$queryRaw`SELECT key FROM "OperationalSetting" WHERE key IN (${COMMUNITY_POLICY_KEY},${PLATFORM_STAFFING_KEY}) ORDER BY key FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id::text=${candidate.organizationId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${candidate.documentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentTemplate" WHERE id::text=${candidate.templateId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentRevision" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentLifecycleEvent" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
    const policy=await this.approved(tx);if(!policy?.privateAudioEnabled||policy.documentId!==candidate.documentId||policy.contentHash!==candidate.contentHash)throw new ConflictException('D16_AUDIO_POLICY_REQUIRED');return policy;
  }
  async requireActive(tx:Prisma.TransactionClient){const policy=await this.active(tx);if(!policy)throw new ConflictException('Community activation requires the approved current D16 policy.');return policy;}
  async moderator(tx:Prisma.TransactionClient,actor:string){
    await requireVerifiedAdmin(tx,actor);const policy=await this.requireActive(tx);
    if(actor!==policy.ownerId&&actor!==policy.moderatorAccountId)throw new ForbiddenException('The designated community moderator is required.');return policy;
  }
  async current(){const policy=await this.active(this.db);return policy?{active:true,documentId:policy.documentId,version:policy.version,noticeAr:policy.noticeAr,noticeEn:policy.noticeEn,retentionDays:policy.retentionDays}:{active:false,reason:'D16_POLICY_REQUIRED'};}
  private async owner(actor:string){await requireVerifiedAdmin(this.db,actor);const platform=await platformOrganization(this.db);if(!platform||platform.ownerId!==actor)throw new ForbiddenException();return platform;}
  async authoring(actor:string){
    const platform=await this.owner(actor),moderators=await this.db.account.findMany({where:{status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}},take:100});
    return {organizationId:platform.id,moderators:moderators.map(m=>({id:m.id,label:(m.person.firstName+' '+m.person.lastName).trim()||m.email}))};
  }
  async draft(actor:string,input:{moderatorAccountId?:unknown;retentionDays?:unknown;noticeAr?:unknown;noticeEn?:unknown;enabled?:unknown;privateAudioEnabled?:unknown}){
    const platform=await this.owner(actor);
    const fields=[
      {key:'kind',labelAr:'نوع السياسة',labelEn:'Policy kind',type:'SELECT',required:true,options:['COMMUNITY_D16']},
      {key:'enabled',labelAr:'إتاحة المجتمع بعد الاعتماد والتفعيل',labelEn:'Enable community after approval and activation',type:'BOOLEAN',required:true},
      {key:'privateAudioEnabled',labelAr:'إتاحة تسجيل ورفع الصوت الخاص بعد الاعتماد والتفعيل',labelEn:'Enable private audio recording and upload after approval and activation',type:'BOOLEAN',required:true},
      {key:'moderatorAccountId',labelAr:'المشرف المسمى',labelEn:'Named moderator',type:'TEXT',required:true},
      {key:'retentionDays',labelAr:'مدة الاحتفاظ بمنشورات المجتمع بالأيام',labelEn:'Community post retention days',type:'NUMBER',required:true},
      privateAudioTerms,
      {key:'noticeAr',labelAr:'إشعار السياسة بالعربية',labelEn:'Policy notice in Arabic',type:'TEXTAREA',required:true},
      {key:'noticeEn',labelAr:'إشعار السياسة بالإنجليزية',labelEn:'Policy notice in English',type:'TEXTAREA',required:true}
    ];
    const payload={kind:'COMMUNITY_D16',enabled:input.enabled,privateAudioEnabled:input.privateAudioEnabled,moderatorAccountId:input.moderatorAccountId,retentionDays:input.retentionDays,noticeAr:input.noticeAr,noticeEn:input.noticeEn};validateDocumentPayload(fields,payload);
    if(typeof payload.moderatorAccountId!=='string'||!Number.isInteger(Number(payload.retentionDays))||Number(payload.retentionDays)<1||Number(payload.retentionDays)>3650||typeof payload.noticeAr!=='string'||payload.noticeAr.length<10||typeof payload.noticeEn!=='string'||payload.noticeEn.length<10)throw new BadRequestException('Complete the proposed moderator, retention and notices.');
    await requireVerifiedAdmin(this.db,payload.moderatorAccountId);
    // The explicit audio choice uses a new native schema. Existing community-only
    // templates/documents remain immutable and never acquire audio permission.
    const code='HYD-CONTENT-D16';let template=await this.db.documentTemplate.findFirst({where:{organizationId:platform.id,code,status:'ACTIVE'},orderBy:{version:'desc'}});
    if(!template)template=await this.documents.createTemplate(actor,{organizationId:platform.id,code,titleAr:'سياسة المجتمع والصوت الخاص والإشراف والاحتفاظ',titleEn:'Community, private audio, moderation and retention policy',department:'EXECUTIVE_GOVERNANCE',fields});
    validateDocumentPayload(template.fields,payload);const contentHash='sha256:'+createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing=await this.db.managedDocument.findFirst({where:{organizationId:platform.id,templateId:template.id,createdByAccountId:actor,status:'DRAFT',contentHash}});const document=existing??await this.documents.createDocument(actor,{organizationId:platform.id,templateId:template.id,department:'EXECUTIVE_GOVERNANCE',contentHash,payload});
    return {organizationId:platform.id,documentId:document.id,referenceNumber:document.referenceNumber,status:document.status};
  }
  async candidates(actor:string){
    await requireVerifiedAdmin(this.db,actor);const platform=await platformOrganization(this.db);if(!platform||platform.ownerId!==actor)throw new ForbiddenException();
    const docs=await this.db.managedDocument.findMany({where:{organizationId:platform.id,status:{in:['APPROVED','SIGNED']}},include:{template:true},orderBy:{updatedAt:'desc'},take:100}),result=[];
    for(const doc of docs){if(record(doc.payload).kind!=='COMMUNITY_D16')continue;try{await reviewSource(this.db,platform.id,doc.id);if(doc.template.status!=='ACTIVE')continue;result.push({id:doc.id,organizationId:platform.id,referenceNumber:doc.referenceNumber,titleAr:doc.template.titleAr,titleEn:doc.template.titleEn,version:doc.version,contentHash:doc.contentHash})}catch{continue}}
    return result;
  }
  configure(actor:string,input:{documentId?:unknown;expectedVersion?:unknown;expectedHash?:unknown}){
    return this.db.serializable(async tx=>{
      await lockAccountIdentities(tx,[actor]);await requireVerifiedAdmin(tx,actor);const platform=await platformOrganization(tx);if(!platform||platform.ownerId!==actor)throw new ForbiddenException('The platform owner must activate the approved policy.');
      if(typeof input.documentId!=='string'||!Number.isInteger(input.expectedVersion)||typeof input.expectedHash!=='string')throw new BadRequestException('Pin the approved document version and hash.');
      const doc=await tx.managedDocument.findUnique({where:{id:input.documentId}});
      if(!doc||doc.organizationId!==platform.id||doc.version!==input.expectedVersion||doc.contentHash!==input.expectedHash)throw new ConflictException('The policy source changed or is out of scope.');
      const source=await reviewSource(tx,platform.id,doc.id),pin={documentId:doc.id,version:doc.version,contentHash:doc.contentHash,sourceHash:source.sourceHash,ownerId:platform.ownerId};
      await tx.operationalSetting.upsert({where:{key:COMMUNITY_POLICY_KEY},create:{key:COMMUNITY_POLICY_KEY,value:pin},update:{value:pin}});
      const policy=await this.approved(tx);if(!policy)throw new ConflictException('D16_POLICY_REQUIRED');
      await this.audit.record({actorId:actor,action:'COMMUNITY_POLICY_ACTIVATED',resource:'ManagedDocument',resourceId:doc.id,metadata:{version:doc.version,contentHash:doc.contentHash}},tx);
      return {active:policy.communityEnabled,privateAudioActive:policy.privateAudioEnabled,documentId:doc.id,version:doc.version,retentionDays:policy.retentionDays};
    });
  }
}
