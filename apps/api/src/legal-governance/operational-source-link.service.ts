import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { OPERATIONAL_CONTROLS } from '../trips/operational-controls.catalog';
import { plain, readSourceLinkBatch, sourceLinkInput, sourceLinkKey, sourceLinkPointer, SOURCE_LINK_DEPARTMENT, SOURCE_LINK_FIELD, SOURCE_LINK_NOTICE, SOURCE_LINK_POLICY, SOURCE_LINK_TEMPLATE } from './operational-source-link.domain';
import { operationalMatrixSource, operationalSourceReviewStatuses } from './operational-source-link-source';
type Tx=Prisma.TransactionClient;
type Input=ReturnType<typeof sourceLinkInput>;
const controlSelect={id:true,category:true,ruleKey:true,labelAr:true,state:true,metadata:true,updatedAt:true} as const;
const controlWhere={OR:OPERATIONAL_CONTROLS.map(c=>({category:c.category,ruleKey:c.ruleKey}))};

@Injectable()
export class OperationalSourceLinkService {
  constructor(private readonly db:DatabaseService){}
  private async owner(tx:Tx,actorId:string){const p=await reviewPlatform(tx);if(p.ownerId!==actorId)throw new ForbiddenException('ربط نسخ المصفوفات متاح لمالك الجهة الداخلية المتحقق فقط.');return p;}
  private async view(tx:Tx,p:Awaited<ReturnType<typeof reviewPlatform>>){
    const documents=await tx.managedDocument.findMany({where:{organizationId:p.id,department:SOURCE_LINK_DEPARTMENT,status:{not:'ARCHIVED'},template:{organizationId:p.id,department:SOURCE_LINK_DEPARTMENT,code:SOURCE_LINK_TEMPLATE}},select:{id:true,referenceNumber:true,version:true,status:true,updatedAt:true},orderBy:[{updatedAt:'desc'},{id:'asc'}],take:51});
    const controls=await tx.policyControl.findMany({where:controlWhere,select:controlSelect,orderBy:[{category:'asc'},{ruleKey:'asc'}]});
    const statuses=await operationalSourceReviewStatuses(tx,p.id,controls);
    return {schemaVersion:1,policy:SOURCE_LINK_POLICY,organizationId:p.id,observedAt:new Date().toISOString(),canRecord:true,canActivate:false,notice:SOURCE_LINK_NOTICE,documents:documents.slice(0,50),hasMoreDocuments:documents.length>50,
      controls:controls.map(c=>({controlId:c.category+'.'+c.ruleKey,labelAr:c.labelAr,sourceReviewStatus:statuses.get(c.category+'.'+c.ruleKey)}))};
  }
  async list(actorId:string){return this.db.serializable(async tx=>this.view(tx,await this.owner(tx,actorId)));}
  private async prepare(tx:Tx,actorId:string,input:Input){
    const p=await this.owner(tx,actorId),source=await operationalMatrixSource(tx,p.id,input.documentId);
    if(source.d.version!==input.version)throw new ConflictException('تغير إصدار المصفوفة؛ أعد القراءة والمعاينة.');
    const all=await tx.policyControl.findMany({where:controlWhere,select:controlSelect,orderBy:[{category:'asc'},{ruleKey:'asc'}]});
    const controls=source.rows.map(r=>{const c=all.find(c=>c.category+'.'+c.ruleKey===r.controlId);if(!c)throw new ConflictException('يوجد ضابط في المصفوفة لم يسجل في النظام.');return c;});
    for(const c of controls){
      if(c.metadata!==null&&(typeof c.metadata!=='object'||Array.isArray(c.metadata)))throw new ConflictException('بيانات الضابط ليست كائنًا صالحًا؛ يلزم تصحيحها دون إسقاطها.');
      const pointer=sourceLinkPointer(c.metadata);
      if(pointer){const row=await tx.operationalSetting.findUnique({where:{key:sourceLinkKey(p.id,pointer.id)},select:{value:true}});const batch=readSourceLinkBatch(row?.value,p.id,pointer.id);
        if(batch.digest!==pointer.digest||batch.documentId!==source.d.id||!batch.controls.some(v=>v.id===c.id&&v.controlId===c.category+'.'+c.ruleKey))throw new ConflictException('يوجد ربط آخر أو مؤشر غير متسق؛ راجع الربط الحالي أولًا.');}
    }
    const statuses=await operationalSourceReviewStatuses(tx,p.id,controls);
    if(controls.every(c=>statuses.get(c.category+'.'+c.ruleKey)==='LINKED_FOR_REVIEW'))throw new ConflictException('هذه النسخة مرتبطة بالفعل؛ لا يلزم تكرار الحفظ.');
    const authority=decisionDigest(JSON.parse(JSON.stringify(p))),expectedPlanHash=decisionDigest({policy:SOURCE_LINK_POLICY,actorId,organizationId:p.id,authority,documentId:source.d.id,version:source.d.version,sourceDigest:source.digest,reason:input.reason,controls:controls.map(c=>({...c,updatedAt:c.updatedAt.toISOString()}))});
    return {p,source,controls,authority,expectedPlanHash};
  }
  private planView(plan:Awaited<ReturnType<OperationalSourceLinkService['prepare']>>){return {schemaVersion:1,policy:SOURCE_LINK_POLICY,organizationId:plan.p.id,canActivate:false,notice:SOURCE_LINK_NOTICE,source:{documentId:plan.source.d.id,version:plan.source.d.version,referenceNumber:plan.source.d.referenceNumber,status:plan.source.d.status},rows:plan.source.rows,expectedPlanHash:plan.expectedPlanHash};}
  async preview(actorId:string,body:unknown){const input=sourceLinkInput(body);return this.db.serializable(async tx=>this.planView(await this.prepare(tx,actorId,input)));}
  async record(actorId:string,body:unknown){
    const input=sourceLinkInput(body,true);
    return this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
      const initial=await this.owner(tx,actorId);await lockAccountIdentities(tx,[actorId]);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${initial.id} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${initial.id} AND "accountId"::text=${actorId} FOR SHARE`;
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`operational-source-links:${initial.id}`},0))`;
      await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${input.documentId} AND "organizationId"::text=${initial.id} FOR SHARE`;
      await tx.$queryRaw`SELECT t."id" FROM "DocumentTemplate" t JOIN "ManagedDocument" d ON d."templateId"=t."id" WHERE d."id"::text=${input.documentId} AND d."organizationId"::text=${initial.id} FOR SHARE OF t`;
      await tx.$queryRaw`SELECT "id" FROM "DocumentRevision" WHERE "documentId"::text=${input.documentId} AND "version"=${input.version} FOR SHARE`;
      await tx.$queryRaw`SELECT b."id" FROM "DocumentBrandSnapshot" b JOIN "ManagedDocument" d ON b."organizationId"=d."organizationId" AND b."brandVersion"=d."documentBrandVersion" WHERE d."id"::text=${input.documentId} AND d."organizationId"::text=${initial.id} FOR SHARE OF b`;
      const ids=OPERATIONAL_CONTROLS.map(c=>c.id);
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "PolicyControl" WHERE ("category"||'.'||"ruleKey") IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`);
      const plan=await this.prepare(tx,actorId,input);
      if(plan.expectedPlanHash!==input.expectedPlanHash)throw new ConflictException('تغير المصدر أو الضوابط أو صلاحية المالك؛ أعد القراءة والمعاينة.');
      const id=randomUUID(),recordedAt=new Date().toISOString();
      const body={policy:SOURCE_LINK_POLICY,id,organizationId:plan.p.id,documentId:plan.source.d.id,documentVersion:plan.source.d.version,referenceNumber:plan.source.d.referenceNumber,sourceDigest:plan.source.digest,authorityDigest:plan.authority,controls:plan.controls.map(c=>({id:c.id,controlId:c.category+'.'+c.ruleKey})),createdByAccountId:actorId,recordedAt,reason:input.reason};
      const batch={...body,digest:decisionDigest(body)};
      await tx.operationalSetting.create({data:{key:sourceLinkKey(plan.p.id,id),value:batch as unknown as Prisma.InputJsonValue}});
      for(const c of plan.controls){
        const metadata={...plain(c.metadata),[SOURCE_LINK_FIELD]:{policy:SOURCE_LINK_POLICY,id,digest:batch.digest}};
        await tx.$executeRaw`UPDATE "PolicyControl" SET "metadata"=${JSON.stringify(metadata)}::jsonb,"updatedByAccountId"=(SELECT "id" FROM "Account" WHERE "id"::text=${actorId} LIMIT 1),"updatedAt"=clock_timestamp() WHERE "id"::text=${c.id}`;
      }
      await tx.auditEvent.create({data:{actorId:plan.p.ownerPersonId,action:'OPERATIONAL_SOURCE_REVIEW_LINKED',resource:'OperationalSourceReview',resourceId:id,metadata:{organizationId:plan.p.id,documentId:plan.source.d.id,version:plan.source.d.version,controlIds:body.controls.map(c=>c.controlId),digest:batch.digest,canActivate:false,accountId:actorId}}});
      return {schemaVersion:1,policy:SOURCE_LINK_POLICY,reference:'SRL-'+id,recordedAt,linkedControlCount:plan.controls.length,source:this.planView(plan).source,canActivate:false,notice:SOURCE_LINK_NOTICE};
    });
  }
}
