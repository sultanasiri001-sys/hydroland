import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { activationFromSource, approvedRetentionActivation, parsePin, SourcePin, dispositionAuthorizationKey, dispositionAuthority, readDisposition } from './retention-source';
import { ErasureDomain, inspectNativeRecord } from './record-disposition';
import { erasureDigest } from './erasure-journal';
import { privacyTemplates } from './privacy-templates';
const setting='PRIVACY_RETENTION_ACTIVATION:v0.1';

@Injectable()
export class PrivacyAdministrationService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
  private async owner(tx:Prisma.TransactionClient,actor:string){const p=await reviewPlatform(tx);if(p.ownerId!==actor)throw new ForbiddenException();return p;}
  async options(actor:string){return this.db.serializable(async tx=>{
    const platform=await this.owner(tx,actor),active=await approvedRetentionActivation(tx),sources:Array<{label:string;source:SourcePin}>=[];
    const candidates=await tx.managedDocument.findMany({where:{organizationId:platform.id,status:{in:['APPROVED','SIGNED']},template:{code:privacyTemplates[0].code,status:'ACTIVE'}},orderBy:[{updatedAt:'desc'},{id:'asc'}],take:100});
    for(const d of candidates){try{const r=await reviewSource(tx,platform.id,d.id),source={documentId:d.id,version:d.version,contentHash:d.contentHash,sourceHash:r.sourceHash};
      await activationFromSource(tx,source);sources.push({label:d.referenceNumber+' · نفاذ الاحتفاظ · v'+d.version,source});
    }catch(error){if(!(error instanceof ConflictException||error instanceof ForbiddenException||error instanceof BadRequestException))throw error;}}
    const installed=await tx.documentTemplate.findMany({where:{organizationId:platform.id,code:{in:privacyTemplates.map(t=>t.code)},version:1},select:{code:true}});
    const dispositions=await tx.managedDocument.findMany({where:{organizationId:platform.id,status:{in:['APPROVED','SIGNED']},template:{code:{in:['LEGAL-A15-RECORD-DISPOSITION','FIN-A15-RECORD-DISPOSITION']},status:'ACTIVE'}},orderBy:[{updatedAt:'desc'},{id:'asc'}],take:100});
    const dispositionSources=[];
    for(const d of dispositions){try{const r=await reviewSource(tx,platform.id,d.id),source={documentId:d.id,version:d.version,contentHash:d.contentHash,sourceHash:r.sourceHash};
      const binding=await tx.operationalSetting.findUnique({where:{key:dispositionAuthorizationKey(d.id)}});
      dispositionSources.push({label:d.referenceNumber+' · قرار التصرف · v'+d.version,source,authorized:binding?.value===dispositionAuthority(source,platform)});
    }catch(error){if(!(error instanceof ConflictException||error instanceof ForbiddenException||error instanceof BadRequestException))throw error;}}
    return {canActivate:true,sources,dispositionSources,effectiveFrom:active?.effectiveFrom??null,activationSource:active?.pin??null,templatesReady:privacyTemplates.every(t=>installed.some(row=>row.code===t.code)),
      notice:'يُعد المالك القرار في مكتبة المستندات ويكلف مراجعًا مستقلاً. بعد اعتماد المراجع يربط المالك النسخة المحددة هنا. لا تنشئ القوالب موافقة أو تاريخ نفاذ.'};
  });}
  async activate(actor:string,body:unknown){
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).join(',')!=='source')throw new BadRequestException();
    const pin=parsePin((body as {source:unknown}).source);
    return this.db.serializable(async tx=>{
      const platform=await this.owner(tx,actor),activation=await activationFromSource(tx,pin),previous=await tx.operationalSetting.findUnique({where:{key:setting}});
      if(previous&&erasureDigest(previous.value)!==erasureDigest(pin))throw new ConflictException('سبق تثبيت النفاذ؛ تغيير الجدول يتطلب إصدار سياسة مستقلًا.');
      if(!previous){await tx.operationalSetting.create({data:{key:setting,value:pin}});await this.audit.record({actorId:actor,action:'privacy.retention_activation_bound',resource:'ManagedDocument',resourceId:pin.documentId,
        metadata:{organizationId:platform.id,source:pin,effectiveFrom:activation.effectiveFrom}},tx);}
      return {effectiveFrom:activation.effectiveFrom,source:pin,automaticDeletionAuthorized:false};
    });
  }
  async authorizeDisposition(actor:string,body:unknown){
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).join(',')!=='source')throw new BadRequestException();
    const pin=parsePin((body as {source:unknown}).source);
    return this.db.serializable(async tx=>{
      const platform=await this.owner(tx,actor),document=await reviewSource(tx,platform.id,pin.documentId),payload=document.d.payload as Record<string,unknown>;
      if(typeof payload.requestId!=='string')throw new BadRequestException('مرجع الطلب غير متاح.');
      const request=await tx.personalDataRequest.findUnique({where:{id:payload.requestId}});
      if(!request||request.kind!=='ERASURE'||!request.routingCenterId||!['ACCOUNT','BOOKINGS','PAYMENTS','SENT_MESSAGES'].includes(request.domain))throw new ConflictException('قرار التصرف لا يطابق طلبًا قائمًا.');
      const subject={accountId:request.accountId,domain:request.domain as ErasureDomain,recordRef:request.domain==='ACCOUNT'?request.accountId:request.recordRef??'',centerId:request.routingCenterId};
      const decision=await readDisposition(tx,pin,request.id,subject,false),plan=await inspectNativeRecord(tx,subject,decision.disposition);
      if(plan.sourceHash!==decision.expectedNativeHash)throw new ConflictException('تغير السجل بعد مراجعة القرار.');
      const key=dispositionAuthorizationKey(pin.documentId),value=dispositionAuthority(pin,platform),previous=await tx.operationalSetting.findUnique({where:{key}});
      if(previous?.value!==value){await tx.operationalSetting.upsert({where:{key},create:{key,value},update:{value}});await this.audit.record({actorId:actor,action:'privacy.record_disposition_bound',resource:'ManagedDocument',resourceId:pin.documentId,
        metadata:{requestId:request.id,source:pin,authorityDigest:value}},tx);}
      return {authorized:true,source:pin,requestId:request.id,executed:false};
    });
  }
  async prepareTemplates(actor:string,body:unknown){
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).join(',')!=='confirmed'||(body as {confirmed:unknown}).confirmed!==true)throw new BadRequestException();
    return this.db.serializable(async tx=>{
      const platform=await this.owner(tx,actor);await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'A15_TEMPLATES:'+platform.id})::bigint)`;
      let created=0;const templates=[];
      for(const definition of privacyTemplates){
        let existing=await tx.documentTemplate.findUnique({where:{organizationId_code_version:{organizationId:platform.id,code:definition.code,version:1}}});
        if(existing&&(existing.department!==definition.department||erasureDigest(existing.fields)!==erasureDigest(definition.fields)))throw new ConflictException('يوجد قالب بنفس الرمز يحتاج مراجعة؛ لم يُستبدل محتواه.');
        if(!existing){existing=await tx.documentTemplate.create({data:{organizationId:platform.id,...definition,fields:definition.fields as unknown as Prisma.InputJsonValue}});created++;}
        templates.push({id:existing.id,code:existing.code,titleAr:existing.titleAr});
      }
      if(created)await this.audit.record({actorId:actor,action:'privacy.retention_templates_prepared',resource:'Organization',resourceId:platform.id,metadata:{created,codes:privacyTemplates.map(t=>t.code)}},tx);
      return {created,templates,approvalsCreated:0,activationCreated:false};
    });
  }
}
