import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketingCampaignDraft, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { scopeId } from '../document-forms/owner-administrative-decision.domain';
import { draftDigest, MARKETING_DRAFT_NOTICE, MARKETING_DRAFT_POLICY, marketingDraftCreate, marketingDraftEdit, marketingDraftRecordDigest, marketingDraftTransition, validateMarketingDraftRecord } from './marketing-draft.domain';
type Tx=Prisma.TransactionClient;
type Row=MarketingCampaignDraft;
type Platform=Awaited<ReturnType<typeof reviewPlatform>>;
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

@Injectable()
export class MarketingDraftService{
  constructor(private readonly db:DatabaseService){}
  private async owner(tx:Tx,actorId:string){
    const p=await reviewPlatform(tx);
    if(p.ownerId!==actorId)throw new ForbiddenException('سجل مسودات الحملات الداخلية متاح لمالك هيدرولاند فقط.');
    return p;
  }
  private async row(tx:Tx,org:string,id:string){
    const row=await tx.marketingCampaignDraft.findFirst({where:{id,organizationId:org}});
    if(!row)throw new NotFoundException('مسودة الحملة غير متاحة.');
    validateMarketingDraftRecord(row);
    const history=await tx.marketingCampaignDraftRevision.findUnique({where:{campaignDraftId_revision:{campaignDraftId:id,revision:row.revision}}});
    if(!history)throw new ConflictException('تاريخ المسودة غير متاح.');
    const {recordDigest,...value}=history;
    if(draftDigest(value)!==recordDigest||draftDigest(history.snapshot)!==draftDigest(json(row)))throw new ConflictException('تاريخ المسودة لا يطابق الإصدار الحالي.');
    return row;
  }
  private async lock(tx:Tx,actorId:string,org:string,id?:string){
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,[actorId]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${org} AND "accountId"::text=${actorId} FOR SHARE`;
    if(id)await tx.$queryRaw`SELECT "id" FROM "MarketingCampaignDraft" WHERE "id"=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private async conflict<T>(work:()=>Promise<T>){
    try{return await work();}catch(e){if(e&&typeof e==='object'&&'code' in e&&['P2002','P2034'].includes(String(e.code)))throw new ConflictException('تكرر الطلب أو تغير السجل؛ أعد القراءة.');throw e;}
  }
  private async append(tx:Tx,p:Platform,actorId:string,row:Row,action:string,reason:string){
    const previous=row.revision>1?await tx.marketingCampaignDraftRevision.findUniqueOrThrow({where:{campaignDraftId_revision:{campaignDraftId:row.id,revision:row.revision-1}}}):null;
    const entry={id:randomUUID(),campaignDraftId:row.id,revision:row.revision,snapshot:json(row),action,reason,actorAccountId:actorId,previousDigest:previous?.recordDigest??null,createdAt:new Date()};
    await tx.marketingCampaignDraftRevision.create({data:{...entry,recordDigest:draftDigest(entry)}});
    await tx.auditEvent.create({data:{actorId:p.ownerPersonId,action,resource:'MarketingCampaignDraft',resourceId:row.id,metadata:json({policy:MARKETING_DRAFT_POLICY,organizationId:p.id,accountId:actorId,revision:row.revision,status:row.status,recordDigest:row.recordDigest})}});
  }
  private summary(row:Row){return {id:row.id,revision:row.revision,status:row.status,title:row.title,channels:row.channels,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()};}
  private async view(tx:Tx,p:Platform,row:Row){
    const history=await tx.marketingCampaignDraftRevision.findMany({where:{campaignDraftId:row.id},orderBy:{revision:'desc'},take:51,select:{revision:true,action:true,reason:true,recordDigest:true,createdAt:true}});
    return {schemaVersion:1,policy:MARKETING_DRAFT_POLICY,organizationId:p.id,record:{...this.summary(row),objective:row.objective,recordDigest:row.recordDigest},history:history.slice(0,50),historyTruncated:history.length>50,notice:MARKETING_DRAFT_NOTICE};
  }
  async list(actorId:string,cursor?:string,status?:string){
    if(cursor!==undefined)scopeId(cursor);
    if(status!==undefined&&!['DRAFT','ARCHIVED'].includes(status))throw new BadRequestException('حالة المسودة غير صالحة.');
    return this.db.serializable(async tx=>{
      const p=await this.owner(tx,actorId),before=cursor?await tx.marketingCampaignDraft.findFirst({where:{id:cursor,organizationId:p.id,...(status?{status}:{})}}):null;
      if(cursor&&!before)throw new BadRequestException('مؤشر القائمة خارج النطاق الحالي.');
      const rows=await tx.marketingCampaignDraft.findMany({where:{organizationId:p.id,...(status?{status}:{}),...(before?{OR:[{createdAt:{lt:before.createdAt}},{createdAt:before.createdAt,id:{lt:before.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:51});
      for(const row of rows)validateMarketingDraftRecord(row);
      return {schemaVersion:1,policy:MARKETING_DRAFT_POLICY,items:rows.slice(0,50).map(r=>this.summary(r)),hasMore:rows.length>50,nextCursor:rows.length>50?rows[49].id:null,notice:MARKETING_DRAFT_NOTICE};
    });
  }
  async detail(actorId:string,id:string){scopeId(id);return this.db.serializable(async tx=>{const p=await this.owner(tx,actorId);return this.view(tx,p,await this.row(tx,p.id,id));});}
  async create(actorId:string,body:unknown){
    const input=marketingDraftCreate(body),requestDigest=draftDigest(input.content);
    return this.conflict(()=>this.db.serializable(async tx=>{
      const initial=await this.owner(tx,actorId);await this.lock(tx,actorId,initial.id);const p=await this.owner(tx,actorId);
      if(p.id!==initial.id)throw new ConflictException('تغيرت الجهة الداخلية؛ أعد القراءة.');
      const old=await tx.marketingCampaignDraft.findUnique({where:{organizationId_createdByAccountId_requestKey:{organizationId:p.id,createdByAccountId:actorId,requestKey:input.requestKey}}});
      if(old){if(old.requestDigest!==requestDigest)throw new ConflictException('معرف الطلب مستخدم لمسودة مختلفة.');return {...await this.view(tx,p,await this.row(tx,p.id,old.id)),created:false};}
      const now=new Date(),value={id:randomUUID(),organizationId:p.id,requestKey:input.requestKey,requestDigest,revision:1,status:'DRAFT',...input.content,createdByAccountId:actorId,createdAt:now,updatedAt:now};
      const row=await tx.marketingCampaignDraft.create({data:{...value,recordDigest:marketingDraftRecordDigest({...value,recordDigest:''})}});
      await this.append(tx,p,actorId,row,'MARKETING_CAMPAIGN_DRAFT_CREATED','إنشاء مسودة تخطيط داخلية');return {...await this.view(tx,p,row),created:true};
    }));
  }
  private async mutate(actorId:string,id:string,revision:number,change:Partial<Pick<Row,'title'|'objective'|'channels'|'status'>>,action:string,reason:string){
    scopeId(id);return this.conflict(()=>this.db.serializable(async tx=>{
      const initial=await this.owner(tx,actorId);await this.lock(tx,actorId,initial.id,id);const p=await this.owner(tx,actorId);
      if(p.id!==initial.id)throw new ConflictException('تغيرت الجهة الداخلية؛ أعد القراءة.');
      const old=await this.row(tx,p.id,id);
      if(old.revision>=1000000)throw new ConflictException('بلغ سجل المسودة الحد الأقصى للإصدارات.');
      if(old.revision!==revision)throw new ConflictException('تغير إصدار المسودة؛ أعد القراءة قبل الإجراء.');
      if(change.status?change.status===old.status:old.status!=='DRAFT')throw new ConflictException('الإجراء غير متاح لحالة المسودة الحالية.');
      const value={...old,...change,revision:old.revision+1,updatedAt:new Date()},recordDigest=marketingDraftRecordDigest(value);
      const count=await tx.marketingCampaignDraft.updateMany({where:{id,organizationId:p.id,revision,recordDigest:old.recordDigest},data:{...change,channels:change.channels as Prisma.InputJsonValue|undefined,revision:value.revision,updatedAt:value.updatedAt,recordDigest}});
      if(count.count!==1)throw new ConflictException('تغيرت المسودة أثناء الإجراء؛ أعد القراءة.');
      const row=await tx.marketingCampaignDraft.findUniqueOrThrow({where:{id}});await this.append(tx,p,actorId,row,action,reason);return this.view(tx,p,row);
    }));
  }
  async edit(actorId:string,id:string,body:unknown){const x=marketingDraftEdit(body);return this.mutate(actorId,id,x.expectedRevision,x.content,'MARKETING_CAMPAIGN_DRAFT_EDITED',x.reason);}
  async transition(actorId:string,id:string,body:unknown,status:'DRAFT'|'ARCHIVED'){const x=marketingDraftTransition(body);return this.mutate(actorId,id,x.expectedRevision,{status},status==='ARCHIVED'?'MARKETING_CAMPAIGN_DRAFT_ARCHIVED':'MARKETING_CAMPAIGN_DRAFT_RESTORED',x.reason);}
}
